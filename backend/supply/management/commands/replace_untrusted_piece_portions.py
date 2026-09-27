"""Replace untrusted piece-like portions referenced by recipes.

Recipe items pointing at a piece-like portion without a trusted weight render
as "0 g · Gewicht unbekannt". Two cases are handled:

- The legacy piece weight is realistic (e.g. "Speisezwiebeln / Stück = 100 g",
  "Knoblauchzehe / Zehe = 5 g"): the weight is confirmed in place, recipes keep
  their piece-based quantity.
- The portion is a placeholder (e.g. "Dinkelmehl / 1 Scheibe (50g)",
  "Apfelsaft / 1 Stück (150g)", "Gorgonzola / Scheibe"): the recipe items are
  moved onto the ingredient's gram portion, preserving the gram amount the
  recipe author implicitly used (quantity × legacy weight_g).

Dry-run by default; pass --apply to write changes.
"""

from __future__ import annotations

from dataclasses import dataclass, field

from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from recipe.models import Recipe, RecipeItem
from recipe.services.recipe_checks import recalculate_recipe_cache
from supply.choices import PortionWeightSource, PortionWeightStatus
from supply.models import Portion
from supply.services.portion_integrity import get_or_create_gram_portion
from supply.services.portion_resolution import (
    is_piece_like_name,
    resolve_trusted_weight,
    resolve_trusted_weight_result,
)

# (ingredient name, portion name) pairs whose legacy piece weight is realistic.
REALISTIC_PIECE_WEIGHTS: set[tuple[str, str]] = {
    ("Aubergine (Eierfrucht)", "Stück"),
    ("Auberginen", "Stück"),
    ("Babykartoffeln", "Stück"),
    ("Baguette (aufback)", "Stück"),
    ("Blumenkohl groß", "Stück"),
    ("Brokkoli (Röschen)", "Stück"),
    ("Cherrytomaten", "Stück"),
    ("Cocktailtomaten", "Stück"),
    ("Datteln", "Stück"),
    ("Datteln entkernt", "Stück"),
    ("Eier (Größe M)", "Stück"),
    ("Eier gekocht", "Stück"),
    ("Eigelb", "Stück"),
    ("Eiweiß", "Stück"),
    ("Fleischtomaten", "Stück"),
    ("Gekochte Eier", "Stück"),
    ("Gekochte Kartoffeln", "Stück"),
    ("Gelbe Paprika", "Stück"),
    ("Gelbe Paprikaschote", "1 Stück (150g)"),
    ("Gelbe Paprikaschote groß", "Stück"),
    ("Gemüsepaprika rot", "1 Stück (150g)"),
    ("Gemüsezwiebel", "1 Stück (150g)"),
    ("Gemüsezwiebeln", "Stück"),
    ("Gemüsezwiebeln groß", "Stück"),
    ("Grüne Chili (Ringe)", "Stück"),
    ("Grüne Paprika", "Stück"),
    ("Grüne Paprika entkernt", "Stück"),
    ("High Protein Wrap", "Stück"),
    ("Hühnerei", "Stück"),
    ("Hühnereier", "Stück"),
    ("Jalapeño eingelegt", "Stück"),
    ("Jalapeños", "Stück"),
    ("Karotten", "Stück"),
    ("Karotten geraspelt", "Stück"),
    ("Kartoffel", "1 mittelgroße Kartoffel"),
    ("Kartoffeln festkochend", "Stück"),
    ("Kartoffeln geviertelt", "Stück"),
    ("Kekse", "Stück"),
    ("Kleine Auberginen", "Stück"),
    ("Kleine Zwiebel", "Stück"),
    ("Knoblauchzehe", "Zehe"),
    ("Knoblauchzehe gehackt", "Zehe"),
    ("Knoblauchzehe gepresst", "Zehe"),
    ("Knoblauchzehe klein", "Zehe"),
    ("Knoblauchzehen gehackt", "Zehe"),
    ("Knoblauchzehen geraspelt", "Zehe"),
    ("Kochschinken", "2 Scheiben (30g)"),
    ("Kopfsalat", "Stück"),
    ("Lauchzwiebel", "Stück"),
    ("Lauchzwiebeln", "Stück"),
    ("Limettenspalten", "Stück"),
    ("Möhre", "Stück"),
    ("Naturjoghurt 3,5 % Fett", "Großer Becher Joghurt"),
    ("Noriblatt", "Blatt"),
    ("Paprikaschoten", "Stück"),
    ("Protein-Wraps", "Stück"),
    ("Reiswaffeln", "Stück"),
    ("Rohe Kartoffeln", "Stück"),
    ("Rote Paprikaschote groß", "Stück"),
    ("Rote Peperoni", "Stück"),
    ("Rote Zwiebel gehackt", "Stück"),
    ("Römersalat", "Stück"),
    ("Schalotte groß", "Stück"),
    ("Softdatteln", "Stück"),
    ("Speisemöhren", "1 Stück (100g)"),
    ("Speisezwiebeln", "Stück"),
    ("Spekulatius Kekse", "Stück"),
    ("Spitzkohl", "Stück"),
    ("Tomaten", "Stück"),
    ("Weizen-Wraps", "Stück"),
    ("Zitronenhälfte", "Stück"),
    ("Zitronenspalte", "Stück"),
    ("Zwiebel gehackt", "Stück"),
    ("festkochende Kartoffeln", "1 mittelgroße (150g)"),
    ("frischer Knoblauch", "1 Knolle (50g)"),
    ("grüne Zucchini", "1 Stück (250g)"),
}

# Portions without any weight: quantities at or above this value were entered
# as grams, smaller ones as pieces.
GRAM_QUANTITY_THRESHOLD = 5.0


@dataclass
class Plan:
    confirm: list[Portion] = field(default_factory=list)
    to_grams: list[tuple[RecipeItem, float]] = field(default_factory=list)
    to_piece: list[tuple[RecipeItem, Portion]] = field(default_factory=list)
    skipped: list[tuple[RecipeItem, str]] = field(default_factory=list)
    sub_gram: list[tuple[RecipeItem, float]] = field(default_factory=list)


class Command(BaseCommand):
    help = "Confirm realistic piece weights and move placeholder portions in recipes onto grams."

    def add_arguments(self, parser):
        parser.add_argument("--apply", action="store_true")

    def handle(self, *args, **options):
        plan = self._build_plan()

        for portion in plan.confirm:
            self.stdout.write(f"CONFIRM  {portion.ingredient.name} / {portion.name} = {portion.weight_g:g} g")
        for item, grams in plan.to_grams:
            self.stdout.write(
                f"GRAMS    {item.recipe.slug}: {item.quantity:g} × {item.portion.ingredient.name} / "
                f"{item.portion.name} → {grams:g} g"
            )
        for item, target in plan.to_piece:
            self.stdout.write(
                f"PIECE    {item.recipe.slug}: {item.quantity:g} × {item.portion.ingredient.name} / "
                f"{item.portion.name} → {target.name}"
            )
        for item, reason in plan.skipped:
            self.stdout.write(
                f"SKIPPED  {item.recipe.slug}: {item.portion.ingredient.name} / {item.portion.name} ({reason})"
            )
        for item, grams in plan.sub_gram:
            self.stdout.write(
                f"CHECK    {item.recipe.slug}: {item.portion.ingredient.name} only {grams:.3g} g — quantity looks wrong"
            )

        self.stdout.write(
            f"SUMMARY confirm={len(plan.confirm)} grams={len(plan.to_grams)} piece={len(plan.to_piece)} "
            f"skipped={len(plan.skipped)} check={len(plan.sub_gram)}"
        )
        if not options["apply"]:
            self.stdout.write("DRY_RUN no changes written")
            return

        recipe_ids = self._apply(plan)
        for recipe in Recipe.objects.filter(id__in=recipe_ids):
            recalculate_recipe_cache(recipe)
        self.stdout.write(f"APPLIED recipes_recalculated={len(recipe_ids)}")

    def _build_plan(self) -> Plan:
        plan = Plan()
        items = (
            RecipeItem.objects.filter(
                portion__isnull=False, portion__deleted_at__isnull=True, portion__superseded_by__isnull=True
            )
            .select_related("portion", "portion__ingredient", "portion__measuring_unit", "recipe")
            .order_by("portion_id", "id")
        )
        confirmed_ids: set[int] = set()
        for item in items:
            portion = item.portion
            if resolve_trusted_weight_result(portion).is_trusted:
                continue
            key = (portion.ingredient.name, portion.name)
            if key in REALISTIC_PIECE_WEIGHTS and portion.weight_g:
                if portion.id not in confirmed_ids:
                    confirmed_ids.add(portion.id)
                    plan.confirm.append(portion)
                grams = item.quantity * portion.weight_g
            elif portion.weight_g:
                grams = item.quantity * portion.weight_g
                plan.to_grams.append((item, grams))
            elif item.quantity >= GRAM_QUANTITY_THRESHOLD:
                grams = item.quantity
                plan.to_grams.append((item, grams))
            else:
                target = self._trusted_piece_portion(portion)
                if target is None:
                    plan.skipped.append((item, "no weight and no trusted piece portion"))
                    continue
                plan.to_piece.append((item, target))
                grams = item.quantity * target.weight_g
            if grams < 1:
                plan.sub_gram.append((item, grams))
        return plan

    def _trusted_piece_portion(self, portion: Portion) -> Portion | None:
        candidates = [
            candidate
            for candidate in portion.ingredient.portions.active().exclude(pk=portion.pk).order_by("rank", "id")
            if is_piece_like_name(candidate.name) and resolve_trusted_weight(candidate) is not None
        ]
        # Prefer "1 Stück (150g)" over fractions like "1/2 Stück (75g)".
        whole = [c for c in candidates if "/" not in c.name]
        same_unit = [c for c in whole if portion.name.lower() in c.name.lower()]
        return (same_unit or whole or candidates or [None])[0]

    @transaction.atomic
    def _apply(self, plan: Plan) -> set[int]:
        recipe_ids: set[int] = set()
        now = timezone.now()
        for portion in plan.confirm:
            portion.weight_status = PortionWeightStatus.CONFIRMED
            portion.weight_source = PortionWeightSource.MANUAL
            portion.weight_confirmed_at = now
            portion.save(update_fields=["weight_status", "weight_source", "weight_confirmed_at", "updated_at"])
            recipe_ids.update(RecipeItem.objects.filter(portion=portion).values_list("recipe_id", flat=True))
        placeholders: dict[int, Portion] = {}
        for item, grams in plan.to_grams:
            placeholders[item.portion.id] = item.portion
            item.portion = get_or_create_gram_portion(item.portion.ingredient)
            item.quantity = max(round(grams, 2), 0.0001)
            item.save(update_fields=["portion", "quantity"])
            recipe_ids.add(item.recipe_id)
        for item, target in plan.to_piece:
            placeholders[item.portion.id] = item.portion
            item.portion = target
            item.save(update_fields=["portion"])
            recipe_ids.add(item.recipe_id)
        # Placeholders are no longer referenced; hide them from the portion picker.
        for portion in placeholders.values():
            if not RecipeItem.objects.filter(portion=portion).exists():
                portion.deleted_at = now
                portion.save(update_fields=["deleted_at", "updated_at"])
        return recipe_ids
