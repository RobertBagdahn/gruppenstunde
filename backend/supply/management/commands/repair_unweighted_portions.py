"""Repair all active portions that render as "Kein Gewicht".

A portion shows "Kein Gewicht" when `resolve_trusted_weight` returns None:
the weight is missing, or it is a piece-like portion ("Stück", "Zehe",
"1 Scheibe (50g)") whose legacy weight was never confirmed. Most of these are
import placeholders ("1 Stück (150g)" on pesto, "1 Scheibe (50g)" on rolls).

The command asks Gemini, in batches, to judge every such portion:

- keep: the portion makes sense — store a realistic weight (and a clean name
  without digits, e.g. "1 Stück (150g)" → "Stück") as confirmed AI weight.
- delete: the portion is meaningless for the ingredient, a package
  ("Packung") or a duplicate of an already weighted portion — soft-delete it.

Guard-rails for portions referenced by RecipeItems: they are never deleted or
renamed, and an existing weight is only confirmed when the estimate agrees
within ±50 % (otherwise reported for manual review).

Dry-run by default. `--output plan.json` stores the plan, `--from-plan
plan.json --apply` applies a reviewed plan without new AI calls.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from pydantic import BaseModel, Field

from recipe.models import Recipe, RecipeItem
from recipe.services.recipe_checks import recalculate_recipe_cache
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.models import Portion
from supply.services.portion_resolution import resolve_trusted_weight

GEMINI_MODEL = "gemini-3.1-flash-lite"
DEFAULT_BATCH_SIZE = 40
# Referenced portions keep their weight; the estimate only confirms it when close enough.
REFERENCED_CONFIRM_TOLERANCE = 0.5


class PortionVerdict(BaseModel):
    portion_id: int
    action: str = Field(description="keep or delete")
    name: str = ""
    weight_g: float | None = None
    confidence: float | None = Field(default=None, ge=0, le=1)
    reason: str = ""


class VerdictResponse(BaseModel):
    verdicts: list[PortionVerdict] = Field(default_factory=list)


@dataclass
class PlannedChange:
    portion_id: int
    ingredient: str
    old_name: str
    old_weight_g: float | None
    action: str  # keep | delete | review
    new_name: str
    new_weight_g: float | None
    confidence: float | None
    reason: str


def unweighted_portions() -> list[Portion]:
    """Return all active portions without a trusted weight."""
    portions = (
        Portion.objects.filter(deleted_at__isnull=True)
        .select_related("ingredient", "measuring_unit")
        .order_by("ingredient_id", "rank", "id")
    )
    return [p for p in portions if resolve_trusted_weight(p) is None]


def _portion_context(portion: Portion) -> dict:
    siblings = [
        {"name": s.name, "weight_g": resolve_trusted_weight(s)}
        for s in portion.ingredient.portions.filter(deleted_at__isnull=True).exclude(pk=portion.pk)
        if resolve_trusted_weight(s) is not None and s.name.casefold() not in {"g", "gramm"}
    ]
    return {
        "portion_id": portion.id,
        "ingredient": portion.ingredient.name,
        "portion_name": portion.name,
        "current_weight_g": portion.weight_g,
        "weighted_siblings": siblings,
    }


def _prompt(batch: list[dict]) -> str:
    return (
        "Du prüfst Portionen von Lebensmitteln, deren Gewicht in Gramm fehlt oder unbestätigt ist. "
        "Entscheide für jede Portion:\n"
        "- action='keep': Die Portion ist für diese Zutat sinnvoll (z. B. Stück Zwiebel, Zehe Knoblauch, "
        "Scheibe Käse, Blatt Lorbeer). Gib weight_g als realistisches Gewicht EINER Portion in Gramm an. "
        "current_weight_g ist oft ein falscher Import-Platzhalter (z. B. 150 g für jedes 'Stück'); "
        "übernimm ihn nur, wenn er realistisch ist. name ist ein kurzer deutscher Name im Singular für "
        "GENAU EINE Einheit, ohne Ziffern, ohne Grammangabe und ohne den Zutatennamen (z. B. 'Stück', "
        "'kleines Stück', 'Zehe', 'Scheibe', 'Knolle', 'Tafel', 'Würfel'). Ganze zählbare Lebensmittel "
        "heißen 'Stück' (nicht 'Zitrone' oder 'Zwiebel'). Mehrfachangaben wie '2 Scheiben (30g)' werden "
        "auf eine Einheit umgerechnet: name='Scheibe', weight_g=15.\n"
        "- action='delete': Die Portion ergibt für diese Zutat keinen Sinn (z. B. 'Stück' bei Pesto, "
        "Aufstrich, Saft, Mehl oder Gewürzpulver), ist eine Packung/Dose (Packungen werden separat "
        "gepflegt) oder doppelt eine bereits gewichtete Portion aus weighted_siblings.\n"
        "confidence ist deine Sicherheit (0–1), reason eine sehr kurze Begründung. "
        "Antworte für jede portion_id genau einmal als strukturiertes JSON.\n" + json.dumps(batch, ensure_ascii=False)
    )


def _ask_ai(batch: list[dict]) -> list[PortionVerdict]:
    from google.genai import types

    from core.services.gemini import gemini_call

    response, _ = gemini_call(
        model=GEMINI_MODEL,
        contents=_prompt(batch),
        config=types.GenerateContentConfig(response_mime_type="application/json", response_schema=VerdictResponse),
        bypass_limits=True,
        is_background=True,
        context="repair_unweighted_portions",
    )
    if response is None:
        return []
    return VerdictResponse.model_validate_json(response.text).verdicts


def plan_change(portion: Portion, verdict: PortionVerdict | None, *, referenced: bool) -> PlannedChange:
    """Turn an AI verdict into a guarded, applicable change."""
    change = PlannedChange(
        portion_id=portion.id,
        ingredient=portion.ingredient.name,
        old_name=portion.name,
        old_weight_g=portion.weight_g,
        action="review",
        new_name=portion.name,
        new_weight_g=None,
        confidence=verdict.confidence if verdict else None,
        reason=verdict.reason if verdict else "keine KI-Antwort",
    )
    if verdict is None:
        return change

    if verdict.action == "delete":
        if referenced:
            change.reason = f"in Rezepten verwendet, Löschvorschlag: {verdict.reason}"
            return change
        change.action = "delete"
        return change

    weight = verdict.weight_g
    if verdict.action != "keep" or weight is None or weight <= 0:
        change.reason = f"kein gültiges Gewicht: {verdict.reason}"
        return change

    if referenced:
        # Never rename or re-weigh a portion recipes depend on.
        old = portion.weight_g
        if old is None or old <= 0:
            change.action, change.new_weight_g = "keep", round(weight, 2)
        elif abs(old - weight) / weight <= REFERENCED_CONFIRM_TOLERANCE:
            change.action, change.new_weight_g = "keep", old
        else:
            change.reason = f"in Rezepten verwendet, {old:g} g weicht von {weight:g} g ab"
        return change

    change.action = "keep"
    change.new_name = verdict.name.strip() or portion.name
    change.new_weight_g = round(weight, 2)
    return change


class Command(BaseCommand):
    help = "Estimate weights for or remove all portions shown as 'Kein Gewicht'."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true", help="Write changes.")
        parser.add_argument("--limit", type=int, default=None, help="Only process the first N portions.")
        parser.add_argument("--batch-size", type=int, default=DEFAULT_BATCH_SIZE)
        parser.add_argument("--output", type=str, default=None, help="Write the plan as JSON.")
        parser.add_argument("--from-plan", type=str, default=None, help="Use a saved plan instead of AI calls.")

    def handle(self, *args, **options):
        if options["from_plan"]:
            data = json.loads(Path(options["from_plan"]).read_text())
            changes = [PlannedChange(**row) for row in data]
        else:
            changes = self._build_plan(options["limit"], options["batch_size"])

        for change in changes:
            if change.action == "keep":
                self.stdout.write(
                    f"KEEP    {change.ingredient} / {change.old_name} → {change.new_name} = {change.new_weight_g:g} g"
                )
            elif change.action == "delete":
                self.stdout.write(f"DELETE  {change.ingredient} / {change.old_name} ({change.reason})")
            else:
                self.stdout.write(f"REVIEW  {change.ingredient} / {change.old_name} ({change.reason})")

        counts = {action: sum(c.action == action for c in changes) for action in ("keep", "delete", "review")}
        self.stdout.write(f"SUMMARY keep={counts['keep']} delete={counts['delete']} review={counts['review']}")

        if options["output"]:
            Path(options["output"]).write_text(json.dumps([asdict(c) for c in changes], ensure_ascii=False, indent=2))
            self.stdout.write(f"PLAN written to {options['output']}")

        if not options["apply"]:
            self.stdout.write("DRY_RUN no changes written")
            return

        recipe_ids = self._apply(changes)
        for recipe in Recipe.objects.filter(id__in=recipe_ids):
            recalculate_recipe_cache(recipe)
        self.stdout.write(f"APPLIED recipes_recalculated={len(recipe_ids)}")

    def _build_plan(self, limit: int | None, batch_size: int) -> list[PlannedChange]:
        portions = unweighted_portions()
        if limit is not None:
            portions = portions[: max(limit, 0)]
        referenced_ids = set(RecipeItem.objects.filter(portion__in=portions).values_list("portion_id", flat=True))
        changes: list[PlannedChange] = []
        for start in range(0, len(portions), batch_size):
            batch = portions[start : start + batch_size]
            verdicts = {v.portion_id: v for v in _ask_ai([_portion_context(p) for p in batch])}
            changes.extend(plan_change(p, verdicts.get(p.id), referenced=p.id in referenced_ids) for p in batch)
            self.stderr.write(f"… {min(start + batch_size, len(portions))}/{len(portions)} geprüft")
        return changes

    @transaction.atomic
    def _apply(self, changes: list[PlannedChange]) -> set[int]:
        if not changes:
            return set()
        now = timezone.now()
        portions = {
            p.id: p
            for p in Portion.objects.select_for_update().filter(
                id__in=[c.portion_id for c in changes], deleted_at__isnull=True
            )
        }
        missing = [c.portion_id for c in changes if c.action != "review" and c.portion_id not in portions]
        if missing:
            raise CommandError(f"Portionen existieren nicht mehr oder sind gelöscht: {missing[:10]}")

        recipe_ids: set[int] = set()
        # Deletions first so renamed portions may take over a freed name.
        for change in sorted(changes, key=lambda c: c.action != "delete"):
            portion = portions.get(change.portion_id)
            if portion is None or change.action == "review":
                continue
            referenced = RecipeItem.objects.filter(portion=portion)
            if change.action == "delete":
                if referenced.exists():
                    continue
                portion.deleted_at = now
                portion.save(update_fields=["deleted_at", "updated_at"])
                continue

            name = change.new_name
            name_taken = (
                Portion.objects.filter(ingredient_id=portion.ingredient_id, name__iexact=name, deleted_at__isnull=True)
                .exclude(pk=portion.pk)
                .exists()
            )
            if name_taken:
                if referenced.exists():
                    name = portion.name
                else:
                    # Same portion already exists under the clean name — drop the duplicate.
                    portion.deleted_at = now
                    portion.save(update_fields=["deleted_at", "updated_at"])
                    continue
            portion.name = name
            portion.weight_g = change.new_weight_g
            portion.weight_status = PortionWeightStatus.CONFIRMED
            portion.weight_source = PortionWeightSource.AI
            portion.weight_confirmed_at = now
            portion.weight_confidence = change.confidence
            portion.save(
                update_fields=[
                    "name",
                    "weight_g",
                    "weight_status",
                    "weight_source",
                    "weight_confirmed_at",
                    "weight_confidence",
                    "updated_at",
                ]
            )
            recipe_ids.update(referenced.values_list("recipe_id", flat=True))
        return recipe_ids
