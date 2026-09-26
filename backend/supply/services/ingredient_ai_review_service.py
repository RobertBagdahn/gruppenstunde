"""Batch AI review of ingredient master data ("Zauberstab" for many ingredients at once).

One Gemini call reviews up to ``MAX_BATCH_SIZE`` ingredients. The prompt gets
the current values plus the plausibility issues found by the rule engine, so
the model only has to deliver what rules cannot: missing values, conflicting
values and a classification judgement.

Application policy (conservative, verified data wins):
- Nutrition: fill ``None`` fields and replace fields involved in a detected
  issue. Other differences are stored as suggestions in ``ai_review_notes``.
- Hard constraints (sugar <= carbs, sat fat <= fat, Atwater energy) are
  enforced after applying so no implausible profile is written.
- Retail section: applied unless it was set manually.
- Price/description/viscosity: filled only when missing or implausible.
- Renames and "not an ingredient" verdicts are never auto-applied; the
  cockpit offers bulk actions for them.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from decimal import Decimal
from typing import TYPE_CHECKING, Any, Literal

from django.contrib.auth.models import AbstractBaseUser
from django.utils import timezone
from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL, GeminiUnavailableError, gemini_call
from supply.choices import AiReviewVerdictChoices, RetailSectionSourceChoices
from supply.data.retail_sections import RETAIL_SECTIONS
from supply.services.nutrition_plausibility import (
    KJ_PER_KCAL,
    SODIUM_MG_PER_G_SALT,
    atwater_kcal,
    detect_nutrition_issues,
    ingredient_nutrition_values,
)
from supply.services.price_service import is_missing_price

if TYPE_CHECKING:
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

PROMPT_VERSION = "2026-09-26.1"
MAX_BATCH_SIZE = 15
AI_NUTRITION_FIELDS: tuple[str, ...] = (
    "energy_kcal",
    "protein_g",
    "fat_g",
    "fat_sat_g",
    "carbohydrate_g",
    "sugar_g",
    "fibre_g",
    "salt_g",
)
SUGGESTION_THRESHOLD = 0.3
MIN_PLAUSIBLE_PRICE_PER_KG = 0.1
MAX_PLAUSIBLE_PRICE_PER_KG = 500.0
MIN_DESCRIPTION_LENGTH = 40

SectionName = Literal[tuple(entry["name"] for entry in RETAIL_SECTIONS)]  # type: ignore[valid-type]


class ReviewedIngredient(BaseModel):
    """AI verdict and corrected values for a single ingredient."""

    id: int = Field(description="Die id aus der Eingabe, unverändert")
    verdict: Literal["ok", "corrected", "rename", "duplicate", "not_an_ingredient"] = Field(
        description=(
            "ok = alle Werte plausibel; corrected = Werte ergänzt/korrigiert; rename = Name ungeeignet; "
            "duplicate = gleiche Zutat wie eine andere id in diesem Stapel; not_an_ingredient = Testdaten, "
            "Non-Food oder keine Kochzutat"
        )
    )
    suggested_name: str | None = Field(
        None, description="Nur bei rename: generischer deutscher Name ohne Marke/Menge, z. B. 'Skyr Vanille'"
    )
    duplicate_of_id: int | None = Field(None, description="Nur bei duplicate: id der besseren Zutat im Stapel")
    retail_section: SectionName = Field(description="Genau eine Warengruppe aus der Liste")  # type: ignore[valid-type]
    physical_viscosity: Literal["solid", "beverage", "powder"] = Field(
        description="solid = fest/cremig, beverage = trinkbar/flüssig, powder = Pulver/Granulat"
    )
    energy_kcal: float | None = Field(None, description="kcal pro 100 g (niemals kJ)")
    protein_g: float | None = Field(None, description="Eiweiß g/100 g")
    fat_g: float | None = Field(None, description="Fett g/100 g")
    fat_sat_g: float | None = Field(None, description="davon gesättigte Fettsäuren g/100 g, <= fat_g")
    carbohydrate_g: float | None = Field(None, description="Kohlenhydrate g/100 g, >= sugar_g")
    sugar_g: float | None = Field(None, description="davon Zucker g/100 g")
    fibre_g: float | None = Field(None, description="Ballaststoffe g/100 g")
    salt_g: float | None = Field(None, description="Salz g/100 g")
    price_per_kg: float | None = Field(None, description="Typischer Supermarktpreis EUR/kg in Deutschland")
    description: str | None = Field(None, description="Nur wenn Beschreibung fehlt: 1–2 sachliche Sätze")
    confidence: float = Field(description="Sicherheit der Nährwerte 0.0–1.0")
    reason: str = Field(description="Kurze Begründung auf Deutsch, max. 120 Zeichen")


class ReviewBatchSchema(BaseModel):
    items: list[ReviewedIngredient]


@dataclass
class ReviewOutcome:
    """What the review changed on one ingredient."""

    ingredient_id: int
    name: str
    verdict: str
    applied: dict[str, tuple[Any, Any]] = field(default_factory=dict)
    suggestions: dict[str, Any] = field(default_factory=dict)


def _format_value(value: Any) -> str:
    if value is None:
        return "?"
    if isinstance(value, float):
        return f"{value:g}"
    return str(value)


def _describe_ingredient(ingredient: Ingredient) -> str:
    values = ingredient_nutrition_values(ingredient)
    issues = detect_nutrition_issues(values, name=ingredient.name)
    nutrition = ", ".join(f"{f}={_format_value(values.get(f))}" for f in AI_NUTRITION_FIELDS)
    issue_text = "; ".join(issue.label for issue in issues) or "keine"
    section = ingredient.retail_section.name if ingredient.retail_section else "?"
    price = _format_value(float(ingredient.price_per_kg) if ingredient.price_per_kg is not None else None)
    description = (ingredient.description or "").strip().replace("\n", " ")[:160]
    if len(description) < MIN_DESCRIPTION_LENGTH:
        # Too short to be useful for search/embeddings: ask for a new one.
        description = f"(fehlt){' – bisher: ' + description if description else ''}"
    return (
        f"- id={ingredient.id} | name={ingredient.name!r} | warengruppe={section} | "
        f"viskosität={ingredient.physical_viscosity or '?'} | preis_eur_kg={price}\n"
        f"  nährwerte: {nutrition}\n"
        f"  auffällig: {issue_text}\n"
        f"  beschreibung: {description}"
    )


def build_review_prompt(ingredients: list[Ingredient]) -> str:
    """Build the batch review prompt. Public for tests and prompt reviews."""
    sections = "\n".join(f"- {entry['name']}: {entry['description']}" for entry in RETAIL_SECTIONS)
    listing = "\n".join(_describe_ingredient(ingredient) for ingredient in ingredients)
    return f"""Du bist Lebensmittel-Datenkurator für eine deutsche Koch- und Einkaufsplattform für Pfadfinderlager.
Prüfe jede Zutat und liefere korrigierte Stammdaten. Antworte für JEDE id genau einmal.

BEZUG DER NÄHRWERTE
- Immer pro 100 g des Produkts im Verkaufszustand: roh/ungekocht, Pulver als Pulver, TK-Ware gefroren,
  Getränke pro 100 ml ≈ 100 g. Nutze typische Werte aus BLS/Souci-Fachmann-Kraut und deutschen Etiketten.
- Energie IMMER in kcal. Werte über 900 kcal sind unmöglich (reines Öl ≈ 900). Ein Wert, der etwa
  {KJ_PER_KCAL:g}-mal zu hoch ist, war kJ.
- "?" bedeutet unbekannt: dann einen realistischen Wert schätzen. 0 nur, wenn wirklich 0 (z. B. Fett in Zucker).
- Werte, die unter "auffällig" genannt sind, sind verdächtig und müssen neu bestimmt werden. Übrige plausible
  Werte übernehmen (nicht grundlos ändern).

HARTE REGELN (müssen in deiner Antwort gelten)
1. sugar_g <= carbohydrate_g und fat_sat_g <= fat_g.
2. protein_g + fat_g + carbohydrate_g + fibre_g <= 100. Kohlenhydrate nach EU-Definition OHNE Ballaststoffe
   (Chiasamen ≈ 2 g KH / 34 g Ballaststoffe, nicht US-"total carbs").
3. energy_kcal ≈ 4·protein + 4·carbohydrate + 9·fat + 2·fibre (±15 %; Alkohol zusätzlich 7 kcal/g).
4. salt_g ist Kochsalz (Natrium × 2,5 / 1000). Frisches Obst/Gemüse hat fast kein Salz.

WARENGRUPPE (genau eine aus der Liste; entscheidend ist die Verkaufsform, nicht die Zutat darin)
{sections}
Beispiele: Orangensaft → Säfte & Smoothies (nicht Obst). Getrocknete Aprikosen → Nüsse, Samen & Trockenobst.
TK-Erbsen → TK Obst & Gemüse. Paprikapulver → Gewürze & Trockenkräuter. Kichererbsen (Dose) → Konserven & Gläser.
Erdbeerjoghurt → Joghurt, Quark & Desserts. Schokolade Erdbeere → Süßwaren & Kekse. Vegane Wurst → Fleischersatz & Tofu.

URTEIL (verdict)
- not_an_ingredient: Testdaten (z. B. "E2E", "Test", Zahlenketten), Non-Food, Nahrungsergänzungsmittel.
- rename: Name enthält Marke, Werbesprache, Mengenangabe, Tippfehler oder ist unverständlich. suggested_name:
  generischer deutscher Name im Stil "Produkt Variante" (z. B. "Vollmilchschokolade Haselnuss").
- duplicate: dieselbe Zutat wie eine andere id IN DIESEM STAPEL (nur Schreibvariante/Plural). duplicate_of_id = die
  Zutat mit dem besseren Namen. Geschmacksrichtungen oder Fettstufen sind KEINE Duplikate.
- corrected: du hast Werte ergänzt oder korrigiert. ok: alles plausibel, nichts geändert.

WEITERE FELDER
- price_per_kg: realistischer Durchschnittspreis (Discounter/Supermarkt Deutschland 2026) in EUR/kg; bei Gewürzen
  und Kräutern hochgerechnet auf 1 kg.
- description: nur wenn "(fehlt)": 1–2 sachliche Sätze zu Art, Geschmack und Verwendung, keine Werbung, keine Marke.
- confidence: 0.9+ bei Standardlebensmitteln, 0.5–0.7 bei Markenprodukten mit unklarer Rezeptur.

ZUTATEN
{listing}
"""


def _float(value: Any) -> float | None:
    return None if value is None else float(value)


def _round(value: float | None) -> float | None:
    return None if value is None else round(float(value), 2)


def _differs(current: float | None, proposed: float | None) -> bool:
    if current is None or proposed is None:
        return current != proposed
    return abs(current - proposed) > max(2.0, SUGGESTION_THRESHOLD * max(abs(current), abs(proposed)))


def _enforce_constraints(ingredient: Ingredient) -> None:
    """Clamp sub-values to their parents and repair the energy if still inconsistent."""
    if ingredient.carbohydrate_g is not None and ingredient.sugar_g is not None:
        ingredient.sugar_g = min(ingredient.sugar_g, ingredient.carbohydrate_g)
    if ingredient.fat_g is not None and ingredient.fat_sat_g is not None:
        ingredient.fat_sat_g = min(ingredient.fat_sat_g, ingredient.fat_g)
    expected = atwater_kcal(ingredient_nutrition_values(ingredient))
    energy = ingredient.energy_kcal
    if expected is not None and (energy is None or abs(energy - expected) > max(40.0, 0.25 * expected)):
        ingredient.energy_kcal = round(expected, 1)
    if ingredient.salt_g is not None:
        ingredient.sodium_mg = round(ingredient.salt_g * SODIUM_MG_PER_G_SALT, 1)


def apply_review(ingredient: Ingredient, review: ReviewedIngredient, *, sections: dict[str, Any]) -> ReviewOutcome:
    """Apply one AI review to an ingredient in memory (caller persists)."""
    outcome = ReviewOutcome(ingredient_id=ingredient.id, name=ingredient.name, verdict=review.verdict)
    values = ingredient_nutrition_values(ingredient)
    issue_fields = {f for issue in detect_nutrition_issues(values, name=ingredient.name) for f in issue.fields}

    if review.verdict != AiReviewVerdictChoices.NOT_AN_INGREDIENT:
        proposed_profile = {f: _round(getattr(review, f)) for f in AI_NUTRITION_FIELDS}
        for field_name in AI_NUTRITION_FIELDS:
            current = _float(values.get(field_name))
            proposed = proposed_profile[field_name]
            if proposed is None or proposed < 0:
                continue
            # 0 is the import placeholder in this dataset; a clearly positive AI value replaces it.
            placeholder_zero = current == 0 and proposed >= 0.5
            if current is None or field_name in issue_fields or placeholder_zero:
                if current != proposed:
                    setattr(ingredient, field_name, proposed)
                    outcome.applied[field_name] = (current, proposed)
            elif _differs(current, proposed) and review.confidence >= 0.8:
                outcome.suggestions[field_name] = proposed

        # Partial application can leave a mixed, still implausible profile (e.g. a
        # wrong fat value that happened to match the energy). Then the AI profile,
        # which is internally consistent, replaces the whole nutrition block.
        still_broken = detect_nutrition_issues(ingredient_nutrition_values(ingredient), name=ingredient.name)
        ai_profile_ok = not detect_nutrition_issues(proposed_profile, name=ingredient.name)
        if still_broken and ai_profile_ok and all(v is not None for v in proposed_profile.values()):
            for field_name, proposed in proposed_profile.items():
                current = _float(values.get(field_name))
                if getattr(ingredient, field_name) != proposed:
                    setattr(ingredient, field_name, proposed)
                    outcome.applied[field_name] = (current, proposed)
                outcome.suggestions.pop(field_name, None)

        before = {f: getattr(ingredient, f) for f in (*AI_NUTRITION_FIELDS, "sodium_mg")}
        _enforce_constraints(ingredient)
        for field_name, old in before.items():
            new = getattr(ingredient, field_name)
            if new != old:
                original = outcome.applied.get(field_name, (old, None))[0]
                outcome.applied[field_name] = (original, new)

        section = sections.get(review.retail_section)
        if (
            section is not None
            and ingredient.retail_section_source != RetailSectionSourceChoices.MANUAL
            and ingredient.retail_section_id != section.id
        ):
            old_section = ingredient.retail_section.name if ingredient.retail_section else None
            ingredient.retail_section = section
            ingredient.retail_section_source = RetailSectionSourceChoices.AI
            outcome.applied["retail_section"] = (old_section, section.name)
        elif section is not None and ingredient.retail_section_id == section.id:
            if ingredient.retail_section_source == "":
                ingredient.retail_section_source = RetailSectionSourceChoices.AI

        if not ingredient.physical_viscosity and review.physical_viscosity:
            ingredient.physical_viscosity = review.physical_viscosity
            outcome.applied["physical_viscosity"] = (None, review.physical_viscosity)

        current_price = _float(ingredient.price_per_kg)
        if review.price_per_kg and MIN_PLAUSIBLE_PRICE_PER_KG <= review.price_per_kg <= MAX_PLAUSIBLE_PRICE_PER_KG:
            if is_missing_price(ingredient.price_per_kg) or not (
                MIN_PLAUSIBLE_PRICE_PER_KG <= (current_price or 0) <= MAX_PLAUSIBLE_PRICE_PER_KG
            ):
                ingredient.price_per_kg = Decimal(str(round(review.price_per_kg, 2)))
                outcome.applied["price_per_kg"] = (current_price, round(review.price_per_kg, 2))
            elif current_price and _differs(current_price, review.price_per_kg):
                outcome.suggestions["price_per_kg"] = round(review.price_per_kg, 2)

        description = (review.description or "").strip()
        if len((ingredient.description or "").strip()) < MIN_DESCRIPTION_LENGTH and len(description) >= 40:
            ingredient.description = description
            outcome.applied["description"] = (None, description)

    if review.suggested_name and review.suggested_name.strip() != ingredient.name:
        outcome.suggestions["name"] = review.suggested_name.strip()
    elif review.verdict == AiReviewVerdictChoices.RENAME:
        # "Rename" without a different name is not actionable; the data was still corrected.
        outcome.verdict = AiReviewVerdictChoices.CORRECTED
    if review.verdict == AiReviewVerdictChoices.DUPLICATE and not review.duplicate_of_id:
        outcome.verdict = AiReviewVerdictChoices.CORRECTED

    ingredient.ai_reviewed_at = timezone.now()
    ingredient.ai_review_verdict = outcome.verdict
    ingredient.ai_review_notes = {
        "reason": review.reason[:300],
        "confidence": round(review.confidence, 2),
        "suggested_name": outcome.suggestions.get("name"),
        "duplicate_of_id": review.duplicate_of_id,
        "applied": {k: [v[0], v[1]] for k, v in outcome.applied.items() if k != "description"},
        "suggestions": {k: v for k, v in outcome.suggestions.items() if k != "name"},
        "prompt_version": PROMPT_VERSION,
        "model": DEFAULT_TEXT_MODEL,
    }
    return outcome


def request_batch_review(
    ingredients: list[Ingredient],
    *,
    user: AbstractBaseUser | None = None,
    bypass_limits: bool = False,
) -> dict[int, ReviewedIngredient]:
    """Run one Gemini call for up to ``MAX_BATCH_SIZE`` ingredients."""
    from google.genai import types

    if not ingredients:
        return {}
    if len(ingredients) > MAX_BATCH_SIZE:
        raise ValueError(f"Maximal {MAX_BATCH_SIZE} Zutaten pro KI-Aufruf")

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=ReviewBatchSchema,
        temperature=0.2,
    )
    response, _interaction_id = gemini_call(
        user=user,
        model=DEFAULT_TEXT_MODEL,
        contents=build_review_prompt(ingredients),
        config=config,
        context="ingredient_ai_review_batch",
        bypass_limits=bypass_limits,
        is_background=bypass_limits,
    )
    if response is None:
        raise GeminiUnavailableError("KI-Dienst nicht verfügbar")

    parsed = ReviewBatchSchema.model_validate_json(response.text)
    # Ignore ids the model invented; missing ids are simply retried in a later run.
    batch_ids = {ingredient.id for ingredient in ingredients}
    return {item.id: item for item in parsed.items if item.id in batch_ids}


def review_ingredients(
    ingredients: list[Ingredient],
    *,
    user: AbstractBaseUser | None = None,
    bypass_limits: bool = False,
    persist: bool = True,
) -> list[ReviewOutcome]:
    """Review a batch with AI, apply the policy and persist without per-row signals."""
    from supply.models import Ingredient, RetailSection
    from supply.services.nutri_service import calculate_nutri_score
    from supply.services.quality_score import calculate_ingredient_quality_score

    reviews = request_batch_review(ingredients, user=user, bypass_limits=bypass_limits)
    sections = {section.name: section for section in RetailSection.objects.all()}
    outcomes: list[ReviewOutcome] = []
    now = timezone.now()

    for ingredient in ingredients:
        review = reviews.get(ingredient.id)
        if review is None:
            logger.warning("AI review returned no entry for ingredient #%s", ingredient.id)
            continue
        outcomes.append(apply_review(ingredient, review, sections=sections))
        ingredient.nutri_score, ingredient.nutri_class = calculate_nutri_score(ingredient)
        ingredient.quality_score = calculate_ingredient_quality_score(ingredient)
        ingredient.quality_score_updated_at = now

    if persist:
        Ingredient.objects.bulk_update(
            [i for i in ingredients if i.id in reviews],
            [
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
    return outcomes
