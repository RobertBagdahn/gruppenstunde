"""Catalog enrichment: specific retail names, synonyms, packages and portions for system ingredients.

Two phases so AI costs arise only once and the target database is changed
only after review:

1. ``propose_enrichment`` reads ingredient master data, asks Gemini in
   batches and returns JSON-serialisable proposals keyed by slug.
2. ``apply_enrichment`` applies proposals (dry-run unless ``apply``).

Backward compatibility: slugs never change, the previous name becomes an
alias, existing packages/portions are never modified or deleted, and
user-owned ingredients are skipped.
"""

from __future__ import annotations

import logging
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from datetime import datetime
from typing import TYPE_CHECKING, Any

from django.db import connection, transaction
from django.db.models import Max
from django.utils import timezone
from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL, GeminiUnavailableError, gemini_call
from supply.services.ingredient_ai_review_service import (
    AI_NUTRITION_FIELDS,
    ReviewedIngredient,
    apply_review,
    build_review_prompt,
)

if TYPE_CHECKING:
    from supply.models import Ingredient, RetailSection

logger = logging.getLogger(__name__)

ENRICH_PROMPT_VERSION = "2026-09-27.1"
ENRICH_BATCH_SIZE = 10
MIN_RENAME_CONFIDENCE = 0.6
MAX_SYNONYMS = 6
MAX_PACKAGES = 3
MAX_PORTIONS = 4
GRAM_PORTION_RANK = 9999
# Each batch is its own short transaction so row locks on production are held only briefly.
APPLY_BATCH_SIZE = 50
APPLY_LOCK_TIMEOUT = "5s"
_DIGIT_RE = re.compile(r"\d")


class PackageProposal(BaseModel):
    name: str = Field(description="Packungsname OHNE Ziffern, z. B. 'Packung', 'Großpackung', 'Netz', 'Dose', 'Glas'")
    weight_g: float = Field(description="Füllgewicht der Packung in Gramm (Getränke: ml ≈ g)")


class PortionProposal(BaseModel):
    name: str = Field(description="Portionsname OHNE Ziffern, z. B. 'Stück', 'Scheibe', 'Handvoll', 'Portion'")
    weight_g: float = Field(description="Gewicht einer Portion in Gramm")
    measuring_unit_name: str = Field(description="Gramm, Milliliter, Esslöffel oder Teelöffel")


class EnrichedIngredient(ReviewedIngredient):
    retail_name: str = Field(
        description="Präziser deutscher Artikelname wie im Supermarktregal, ohne Marke und ohne Mengenangabe"
    )
    synonyms: list[str] = Field(
        default_factory=list, description="2–6 gebräuchliche Synonyme/Suchbegriffe, inkl. regionaler Bezeichnungen"
    )
    packages: list[PackageProposal] = Field(default_factory=list, description="1–3 typische Packungsgrößen")
    portions: list[PortionProposal] = Field(
        default_factory=list, description="Nur wenn 'portionen: fehlen': 1–4 praktische Rezeptportionen"
    )


class EnrichBatchSchema(BaseModel):
    items: list[EnrichedIngredient]


def _current_extras(ingredient: Ingredient) -> str:
    aliases = [a.name for a in ingredient.aliases.all()]
    portions = [p.name for p in ingredient.portions.active() if p.rank != GRAM_PORTION_RANK]
    packages = [p.name for p in ingredient.packages.filter(deleted_at__isnull=True)]
    return (
        f"- id={ingredient.id}: synonyme={aliases or 'keine'} | "
        f"portionen={portions or 'fehlen'} | packungen={packages or 'fehlen'}"
    )


def build_enrich_prompt(ingredients: list[Ingredient]) -> str:
    extras = "\n".join(_current_extras(ingredient) for ingredient in ingredients)
    return f"""{build_review_prompt(ingredients)}
ZUSÄTZLICHE AUFGABEN (für JEDE id)
- retail_name: präziser, eindeutiger Artikelname, wie ihn ein Einkäufer im deutschen Supermarkt findet.
  Nicht oberflächlich: statt "Tomaten" → "Frische Rispentomaten" oder "Frische Cocktailtomaten";
  statt "Nudeln" → "Fusilli (Hartweizengrieß)"; statt "Milch" → "Frische Vollmilch 3,5 % Fett";
  statt "Käse" → "Gouda jung, am Stück". Zustand/Verkaufsform nennen (frisch, TK, Dose, getrocknet, gemahlen),
  wenn relevant. Keine Marke, keine Packungsmenge, keine Werbesprache. Ist der Name schon präzise, unverändert lassen.
  Der Name muss die bisherigen Nährwerte/Warengruppe treffen (nicht aus Frischware eine Konserve machen).
- synonyms: 2–6 gebräuchliche Alternativnamen und Suchbegriffe (auch der bisherige kurze Name, regionale
  Begriffe wie "Paradeiser", Singular/Plural). Keine Namen anderer Produkte.
- packages: 1–3 typische Supermarkt-Packungen (Name ohne Ziffern, Gewicht in g). Nur wenn "packungen: fehlen".
- portions: nur wenn "portionen: fehlen": 1–4 praktische Portionen für Rezepte. Zählbares → "Stück" mit
  Stückgewicht; sonst z. B. "Portion", "Esslöffel", "Scheibe". Name ohne Ziffern.

BESTEHENDE SYNONYME, PORTIONEN, PACKUNGEN
{extras}
"""


def request_enrichment(ingredients: list[Ingredient], *, bypass_limits: bool = True) -> dict[int, EnrichedIngredient]:
    """One Gemini call for up to ``ENRICH_BATCH_SIZE`` ingredients."""
    from google.genai import types

    if not ingredients:
        return {}
    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=EnrichBatchSchema,
        temperature=0.2,
    )
    response, _interaction_id = gemini_call(
        user=None,
        model=DEFAULT_TEXT_MODEL,
        contents=build_enrich_prompt(ingredients),
        config=config,
        context="ingredient_catalog_enrichment",
        bypass_limits=bypass_limits,
        is_background=bypass_limits,
    )
    if response is None:
        raise GeminiUnavailableError("KI-Dienst nicht verfügbar")
    parsed = EnrichBatchSchema.model_validate_json(response.text)
    batch_ids = {ingredient.id for ingredient in ingredients}
    return {item.id: item for item in parsed.items if item.id in batch_ids}


def enrichment_queryset():
    from supply.models import Ingredient

    return Ingredient.objects.filter(deleted_at__isnull=True, owner__isnull=True).order_by("-usage_count", "id")


def propose_enrichment(ingredients: list[Ingredient]) -> list[dict[str, Any]]:
    """Return proposals as JSON-ready dicts (``slug``, ``source_name``, ``proposal``)."""
    proposals = request_enrichment(ingredients)
    return [
        {
            "slug": ingredient.slug,
            "source_name": ingredient.name,
            "prompt_version": ENRICH_PROMPT_VERSION,
            "proposal": proposals[ingredient.id].model_dump(mode="json"),
        }
        for ingredient in ingredients
        if ingredient.id in proposals
    ]


@dataclass
class EnrichReport:
    ingredients: int = 0
    missing: int = 0
    renamed: int = 0
    renames_skipped: int = 0
    aliases_created: int = 0
    packages_created: int = 0
    portions_created: int = 0
    nutrition_changed: int = 0
    prices_changed: int = 0
    rename_examples: list[str] = field(default_factory=list)
    messages: list[str] = field(default_factory=list)


def _clean(name: str) -> str:
    return " ".join(name.split()).strip()


def shared_synonym_keys(entries: list[dict[str, Any]]) -> set[str]:
    """Casefolded synonyms proposed for more than one ingredient in this input.

    Such names are ambiguous (e.g. "Schokolade" for 40 chocolates) and must become generic
    aliases; otherwise the first ingredient processed would claim the unique alias.
    """
    counts: dict[str, int] = {}
    for entry in entries:
        own = entry["source_name"].casefold()
        keys = {_clean(raw)[:100].casefold() for raw in entry["proposal"].get("synonyms", [])[:MAX_SYNONYMS]}
        for key in keys - {own, ""}:
            counts[key] = counts.get(key, 0) + 1
    return {key for key, count in counts.items() if count > 1}


def _add_aliases(
    ingredient: Ingredient,
    names: list[str],
    report: EnrichReport,
    *,
    shared_keys: frozenset[str] | set[str] = frozenset(),
) -> None:
    """Add aliases; names also used elsewhere (another ingredient/alias, or proposed for
    several ingredients in this run — ``shared_keys``) are added as generic.

    Uses ``iexact``/DB-side ``Lower()`` consistently instead of Python ``casefold()`` for the
    "is this name taken" pre-check, because Python's casefold (ß → ss) and Postgres' ``Lower()``
    (ß stays ß) disagree for names containing "ß" — a naive pre-check can miss a real conflict.
    The final ``IntegrityError`` fallback (retry as generic) is the real safety net.
    """
    from django.db import IntegrityError
    from django.db import transaction as db_transaction

    from supply.models import Ingredient as IngredientModel
    from supply.models import IngredientAlias
    from supply.services.generic_terms import get_generic_terms

    generic_terms = get_generic_terms()
    existing = {a.name.casefold() for a in ingredient.aliases.all()}
    rank = (ingredient.aliases.aggregate(m=Max("rank"))["m"] or 0) + 1
    for raw in names:
        name = _clean(raw)[:100]
        key = name.casefold()
        if not name or key == ingredient.name.casefold() or key in existing:
            continue
        taken = (
            IngredientModel.objects.filter(deleted_at__isnull=True, owner__isnull=True)
            .exclude(id=ingredient.id)
            .filter(name__iexact=name)
            .exists()
            or IngredientAlias.objects.filter(name__iexact=name, is_generic=False)
            .exclude(ingredient=ingredient)
            .exists()
        )
        is_generic = taken or key in generic_terms or key in shared_keys
        try:
            with db_transaction.atomic():
                IngredientAlias.objects.create(ingredient=ingredient, name=name, rank=rank, is_generic=is_generic)
        except IntegrityError:
            if is_generic:
                raise
            IngredientAlias.objects.create(ingredient=ingredient, name=name, rank=rank, is_generic=True)
        existing.add(key)
        rank += 1
        report.aliases_created += 1


def _add_packages(ingredient: Ingredient, packages: list[dict[str, Any]], report: EnrichReport) -> None:
    from supply.models import Package

    if ingredient.packages.filter(deleted_at__isnull=True).exists():
        return
    seen: set[str] = set()
    rank = 1
    for package in packages[:MAX_PACKAGES]:
        name = _clean(package.get("name") or "")
        weight = package.get("weight_g") or 0
        if not name or _DIGIT_RE.search(name) or name.casefold() in seen or not 0 < weight <= 50000:
            continue
        Package.objects.create(ingredient=ingredient, name=name[:255], weight_g=round(float(weight), 1), rank=rank)
        seen.add(name.casefold())
        rank += 1
        report.packages_created += 1


def _add_portions(ingredient: Ingredient, portions: list[dict[str, Any]], report: EnrichReport) -> None:
    from supply.choices import PortionWeightSource, PortionWeightStatus
    from supply.models import Portion
    from supply.services.portion_integrity import validate_active_portion_weight
    from supply.services.portion_magic_wand import _resolve_suggestion_unit

    active = list(ingredient.portions.active())
    if any(p.rank != GRAM_PORTION_RANK for p in active):
        return
    names = {p.name.casefold() for p in active}
    rank = 1
    for proposal in portions[:MAX_PORTIONS]:
        name = _clean(proposal.get("name") or "")
        weight = proposal.get("weight_g") or 0
        if not name or _DIGIT_RE.search(name) or name.casefold() in names or not 0 < weight <= 5000:
            continue
        unit = _resolve_suggestion_unit(proposal.get("measuring_unit_name") or "Gramm")
        if unit is None:
            continue
        portion = Portion(
            ingredient=ingredient,
            name=name[:255],
            quantity=1,
            measuring_unit=unit,
            weight_g=round(float(weight), 1),
            rank=rank,
            weight_status=PortionWeightStatus.AI_PROPOSED,
            weight_source=PortionWeightSource.AI,
            weight_confidence=0.7,
        )
        try:
            validate_active_portion_weight(portion)
        except ValueError:
            continue
        portion.save()
        names.add(name.casefold())
        rank += 1
        report.portions_created += 1


def _rename(
    ingredient: Ingredient, proposal: EnrichedIngredient, report: EnrichReport, *, reserved_names: set[str]
) -> str | None:
    """Rename to the retail name if it is new and unique. Returns the old name.

    ``reserved_names`` tracks new names already claimed earlier in this same run, so two
    ingredients batched together can't both rename to the same retail name.
    """
    from supply.models import Ingredient as IngredientModel

    new = _clean(proposal.retail_name)[:255]
    old = ingredient.name
    if not new or new.casefold() == old.casefold():
        if new and new != old:
            ingredient.name = new
        return None
    if proposal.confidence < MIN_RENAME_CONFIDENCE:
        report.renames_skipped += 1
        return None
    key = new.casefold()
    if key in reserved_names:
        report.renames_skipped += 1
        report.messages.append(f"Name in diesem Lauf bereits vergeben, nicht umbenannt: {old} → {new}")
        return None
    # iexact (not Python casefold + Lower()) so "ß" is compared the same way on both sides.
    clash = (
        IngredientModel.objects.filter(deleted_at__isnull=True, owner__isnull=True)
        .exclude(id=ingredient.id)
        .filter(name__iexact=new)
        .exists()
    )
    if clash:
        report.renames_skipped += 1
        report.messages.append(f"Name belegt, nicht umbenannt: {old} → {new}")
        return None
    ingredient.name = new
    reserved_names.add(key)
    report.renamed += 1
    if len(report.rename_examples) < 60:
        report.rename_examples.append(f"{old} → {new}")
    return old


def apply_enrichment(
    entries: list[dict[str, Any]],
    *,
    apply: bool,
    skip_renames: bool = False,
    skip_synonyms: bool = False,
    batch_size: int = APPLY_BATCH_SIZE,
    offset: int = 0,
    on_progress: Callable[[int, int, EnrichReport], None] | None = None,
) -> EnrichReport:
    """Apply proposals by slug. Dry-run unless ``apply`` (every batch is rolled back).

    Works in batches of ``batch_size`` ingredients, each in its own transaction, so locks
    are never held for long on a live database. With ``apply`` every finished batch is
    committed; an aborted run can simply be restarted (the apply steps are idempotent).
    In dry-run mode later batches do not see rows written by earlier (rolled back) batches;
    renames stay consistent across batches via ``reserved_names``. With ``skip_renames``
    names stay untouched and ``skip_synonyms`` adds no synonyms; both can be applied in a later run.

    Ingredients are processed in slug order; ``offset`` skips the first N of them so an
    interrupted run can be resumed. ``on_progress(done, total, report)`` runs after each batch.
    """
    from supply.models import Ingredient, RetailSection

    report = EnrichReport()
    sections = {section.name: section for section in RetailSection.objects.all()}
    by_slug = {entry["slug"]: entry for entry in entries}
    ingredients = {
        i.slug: i
        for i in Ingredient.objects.filter(slug__in=by_slug, deleted_at__isnull=True, owner__isnull=True)
        .select_related("retail_section")
        .prefetch_related("aliases")
    }
    report.missing = len(by_slug) - len(ingredients)
    now = timezone.now()
    reserved_names: set[str] = set()
    shared_keys = shared_synonym_keys(entries)
    items = sorted(ingredients.items())
    step = max(1, batch_size)

    for start in range(max(0, offset), len(items), step):
        batch = items[start : start + step]
        with transaction.atomic():
            if connection.vendor == "postgresql":
                with connection.cursor() as cursor:
                    cursor.execute(f"SET LOCAL lock_timeout = '{APPLY_LOCK_TIMEOUT}'")
            for slug, ingredient in batch:
                _apply_one(
                    ingredient,
                    by_slug[slug],
                    report,
                    sections=sections,
                    now=now,
                    reserved_names=reserved_names,
                    skip_renames=skip_renames,
                    skip_synonyms=skip_synonyms,
                    shared_keys=shared_keys,
                )
            if not apply:
                transaction.set_rollback(True)
        if on_progress is not None:
            on_progress(start + len(batch), len(items), report)
    return report


def _apply_one(
    ingredient: Ingredient,
    entry: dict[str, Any],
    report: EnrichReport,
    *,
    sections: dict[str, RetailSection],
    now: datetime,
    reserved_names: set[str],
    skip_renames: bool = False,
    skip_synonyms: bool = False,
    shared_keys: set[str] | None = None,
) -> None:
    """Apply one proposal to one ingredient (caller owns the transaction)."""
    from supply.models import Ingredient as IngredientModel
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    proposal = EnrichedIngredient.model_validate(entry["proposal"])
    report.ingredients += 1

    old_price = ingredient.price_per_kg
    outcome = apply_review(ingredient, proposal, sections=sections)
    if any(f in outcome.applied for f in AI_NUTRITION_FIELDS):
        report.nutrition_changed += 1
    if ingredient.price_per_kg != old_price:
        report.prices_changed += 1

    old_name = None
    if not skip_renames and ingredient.name == entry["source_name"]:
        old_name = _rename(ingredient, proposal, report, reserved_names=reserved_names)
    ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
    ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
    ingredient.quality_score_updated_at = now
    ingredient.ai_review_notes = {**(ingredient.ai_review_notes or {}), "enrich_version": ENRICH_PROMPT_VERSION}
    # bulk_update skips signals: embeddings are refreshed afterwards by the embeddings step.
    IngredientModel.objects.bulk_update(
        [ingredient],
        [
            "name",
            *AI_NUTRITION_FIELDS,
            "sodium_mg",
            "retail_section",
            "retail_section_source",
            "physical_viscosity",
            "price_per_kg",
            "description",
            "nutri_score",
            "nutri_class",
            "quality_score",
            "quality_score_updated_at",
            "ai_reviewed_at",
            "ai_review_verdict",
            "ai_review_notes",
        ],
    )

    synonyms = [] if skip_synonyms else list(proposal.synonyms[:MAX_SYNONYMS])
    alias_names = ([old_name] if old_name else []) + synonyms
    _add_aliases(ingredient, alias_names, report, shared_keys=shared_keys or set())
    _add_packages(ingredient, [p.model_dump() for p in proposal.packages], report)
    _add_portions(ingredient, [p.model_dump() for p in proposal.portions], report)


def enrichment_candidates(*, done_slugs: set[str], limit: int | None) -> list[Ingredient]:
    base = enrichment_queryset().exclude(slug__in=done_slugs)
    # JSONField key-equality exclude() is unreliable across backends when the key is
    # missing (NULL comparisons); exclude by id from a plain filter instead.
    already_done_ids = list(
        base.filter(ai_review_notes__enrich_version=ENRICH_PROMPT_VERSION).values_list("id", flat=True)
    )
    queryset = base.exclude(id__in=already_done_ids) if already_done_ids else base
    queryset = queryset.select_related("retail_section").prefetch_related("aliases")
    return list(queryset[:limit] if limit else queryset)
