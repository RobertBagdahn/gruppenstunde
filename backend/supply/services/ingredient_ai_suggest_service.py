"""KI-Gesamtvorschläge für Zutaten via Gemini ("Zauberstab").

Provides:
- suggest_all_fields(): All fields in one call for existing ingredients. The
  prompt includes the current values, the rule-based plausibility findings and
  the retail section catalog, so the model corrects instead of guessing blind.
- ai_create_ingredient(): Create a complete ingredient from just a name.

Both share ``INGREDIENT_DATA_RULES`` with the batch review
(``ingredient_ai_review_service``) so single and batch results agree.
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Literal, cast

from django.contrib.auth.models import AbstractBaseUser, User
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import DEFAULT_TEXT_MODEL, GeminiUnavailableError, gemini_call
from supply.data.retail_sections import RETAIL_SECTIONS
from supply.services.nutrition_plausibility import (
    detect_nutrition_issues,
    ingredient_nutrition_values,
)
from supply.services.portion_knowledge import (
    IngredientPortionSuggestSchema,
    PortionSuggestion,
    build_portion_prompt_section,
)

if TYPE_CHECKING:
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = DEFAULT_TEXT_MODEL

SectionName = Literal[tuple(entry["name"] for entry in RETAIL_SECTIONS)]  # type: ignore[valid-type]

# Shared data rules for the single-ingredient wand, AI create and batch review.
INGREDIENT_DATA_RULES = """BEZUG UND PLAUSIBILITÄT
- Nährwerte immer pro 100 g des Produkts im Verkaufszustand (roh/ungekocht, Pulver als Pulver,
  TK-Ware gefroren; Getränke pro 100 ml ≈ 100 g). Quelle: BLS/Souci-Fachmann-Kraut, deutsche Etiketten.
- Energie IMMER in kcal (nie kJ). Über 900 kcal/100 g ist unmöglich (reines Öl ≈ 900).
- sugar_g <= carbohydrate_g, fat_sat_g <= fat_g, protein+fat+carbohydrate+fibre <= 100.
- Kohlenhydrate nach EU-Definition OHNE Ballaststoffe (nicht US-"total carbs").
- energy_kcal ≈ 4·Eiweiß + 4·Kohlenhydrate + 9·Fett + 2·Ballaststoffe (±15 %).
- salt_g = Natrium × 2,5 / 1000; sodium_mg = salt_g × 400.
- 0 nur, wenn der Wert wirklich 0 ist. Unsicher? Realistisch schätzen statt 0 oder null.
- Nutri-Score-Punkte (-15 bis 40) und NOVA (1–4) passend zur Verarbeitung (Saft/Limonade ≠ frisches Obst).

WARENGRUPPE: entscheidend ist die Verkaufsform, nicht die Zutat darin.
Orangensaft → Säfte & Smoothies (nicht Obst); getrocknete Aprikosen → Nüsse, Samen & Trockenobst;
TK-Erbsen → TK Obst & Gemüse; Paprikapulver → Gewürze & Trockenkräuter; Kichererbsen (Dose) → Konserven & Gläser;
Erdbeerjoghurt → Joghurt, Quark & Desserts; Schokolade Erdbeere → Süßwaren & Kekse."""

# Re-exported for backward compatibility with existing callers/tests that
# import PortionSuggestion from this module. Single Source of Truth lives in
# `portion_knowledge.py`.
__all__ = [
    "IngredientAiCreateSchema",
    "IngredientPortionSuggestSchema",
    "IngredientSuggestAllSchema",
    "PortionSuggestion",
    "ai_create_ingredient",
    "suggest_all_fields",
]


def _ingredient_portion_tags(ingredient: Ingredient) -> tuple[bool, bool]:
    """Return (is_spread_topping, is_baking_ingredient) for an ingredient's tags."""
    if not ingredient.pk:
        return False, False
    tag_slugs = set(ingredient.tags.values_list("slug", flat=True))
    is_topping = bool(tag_slugs & {"buffet-savory", "buffet-sweet"})
    return is_topping, "baking-ingredient" in tag_slugs


# ---------------------------------------------------------------------------
# Pydantic schemas for structured output
# ---------------------------------------------------------------------------


class IngredientSuggestAllSchema(BaseModel):
    """Complete suggestion schema for all ingredient fields."""

    # Name suggestion
    name_suggestion: str | None = Field(None, description="Spezifischerer Name, falls aktuell generisch. Keine Marken.")

    # Beschreibung
    description: str | None = Field(
        None,
        description=(
            "Aussagekräftige, detaillierte Beschreibung der Zutat. Mindestens 100 Zeichen. "
            "Beschreibe Geschmack, Textur, typische Verwendung, Herkunft, Lagerung und "
            "Besonderheiten. Wird für semantische Suche und Embeddings verwendet."
        ),
    )

    # Nährwerte pro 100g
    energy_kcal: float | None = Field(None, description="Energie in kcal pro 100g")
    protein_g: float | None = Field(None, description="Eiweiß in g pro 100g")
    fat_g: float | None = Field(None, description="Fett in g pro 100g")
    fat_sat_g: float | None = Field(None, description="Gesättigte Fettsäuren in g pro 100g")
    carbohydrate_g: float | None = Field(None, description="Kohlenhydrate in g pro 100g")
    sugar_g: float | None = Field(None, description="Zucker in g pro 100g")
    fibre_g: float | None = Field(None, description="Ballaststoffe in g pro 100g")
    salt_g: float | None = Field(None, description="Salz in g pro 100g")
    sodium_mg: float | None = Field(None, description="Natrium in mg pro 100g")
    fructose_g: float | None = Field(None, description="Fructose in g pro 100g")
    lactose_g: float | None = Field(None, description="Laktose in g pro 100g")

    # Bewertungen
    nutri_score: int | None = Field(None, description="Nutri-Score Punkte (-15 bis 40, NICHT der Buchstabe)")
    nova_score: int | None = Field(None, description="NOVA-Verarbeitungsgrad (1-4)")
    child_score: int | None = Field(None, description="Kinderfreundlichkeit (1-10)")
    scout_score: int | None = Field(None, description="Pfadfindereignung (1-10)")
    environmental_score: int | None = Field(None, description="Umweltfreundlichkeit (1-10)")
    fruit_factor: float | None = Field(None, description="Obst-/Gemüse-Anteil (0.0-1.0)")

    # Physikalische Eigenschaften
    physical_density: float | None = Field(None, description="Dichte in g/ml")
    physical_viscosity: Literal["solid", "beverage", "powder"] | None = Field(
        None, description="Aggregatzustand: solid, beverage oder powder"
    )
    durability_in_days: int | None = Field(None, description="Haltbarkeit in Tagen (ungeöffnet)")
    max_storage_temperature: int | None = Field(None, description="Maximale Lagertemperatur in °C")

    # Scout/camp fields
    storage_type: Literal["dry", "refrigerated", "frozen", "ambient"] | None = Field(None, description="Lagerungsart")
    cooking_factor: float | None = Field(None, description="Multiplikator Roh→Gekocht. Z.B. 2.5 für Nudeln")
    camp_suitable: bool | None = Field(None, description="Fürs Zeltlager geeignet (haltbar, kein Kühlschrank)")
    preparation_time_min: int | None = Field(None, description="Zubereitungsdauer in Minuten (Koch-/Backzeit)")
    season_start: int | None = Field(None, description="Saisonbeginn (Monat 1-12). null = ganzjährig.")
    season_end: int | None = Field(None, description="Saisonende (Monat 1-12). null = ganzjährig.")

    # Preis
    price_per_kg: float | None = Field(None, description="Geschätzter Preis in EUR pro kg")

    # Klassifikation
    retail_section: SectionName | None = Field(  # type: ignore[valid-type]
        None, description="Supermarkt-Warengruppe aus der Liste (Verkaufsform entscheidet)"
    )

    # Create portion info as commentary in the prompt
    portions: IngredientPortionSuggestSchema = Field(description="Strukturierte Portions- und Package-Vorschläge")

    # Aliase
    aliases: list[str] = Field(default_factory=list, description="Mind. 3 spezifische Aliase")

    # Ernährungstags
    nutritional_tags: list[str] = Field(default_factory=list, description="Ernährungstags wie 'vegan', 'laktosefrei'")


class IngredientAiCreateSchema(BaseModel):
    """Schema for creating a complete ingredient from a name."""

    name: str = Field(description="Standardisierter Name der Zutat")
    description: str = Field(
        min_length=100,
        description=(
            "Aussagekräftige, detaillierte Beschreibung (mindestens 100 Zeichen). "
            "Beschreibe Geschmack, Textur, typische Verwendung, Herkunft, Lagerung und "
            "Besonderheiten. Wird für semantische Suche und Embeddings verwendet."
        ),
    )

    # Nährwerte pro 100g
    energy_kcal: float = Field(description="Energie in kcal pro 100g")
    protein_g: float = Field(description="Eiweiß in g pro 100g")
    fat_g: float = Field(description="Fett in g pro 100g")
    fat_sat_g: float = Field(description="Gesättigte Fettsäuren in g pro 100g")
    carbohydrate_g: float = Field(description="Kohlenhydrate in g pro 100g")
    sugar_g: float = Field(description="Zucker in g pro 100g")
    fibre_g: float = Field(description="Ballaststoffe in g pro 100g")
    salt_g: float = Field(description="Salz in g pro 100g")
    sodium_mg: float = Field(description="Natrium in mg pro 100g")
    fructose_g: float = Field(default=0, description="Fructose in g pro 100g")
    lactose_g: float = Field(default=0, description="Laktose in g pro 100g")

    # Bewertungen
    nova_score: int = Field(description="NOVA-Verarbeitungsgrad (1-4)")
    child_score: int = Field(description="Kinderfreundlichkeit (1-10)")
    scout_score: int = Field(description="Pfadfindereignung (1-10)")
    environmental_score: int = Field(description="Umweltfreundlichkeit (1-10)")
    fruit_factor: float = Field(description="Obst-/Gemüse-Anteil (0.0-1.0)")

    # Physik
    physical_density: float = Field(description="Dichte in g/ml")
    physical_viscosity: str = Field(description="'solid', 'beverage', oder 'powder'")
    durability_in_days: int = Field(description="Haltbarkeit in Tagen")
    max_storage_temperature: int = Field(description="Maximale Lagertemperatur in °C")

    # Preis
    price_per_kg: float = Field(
        description="Geschätzter Preis in EUR pro kg, basierend auf typischen Supermarktpreisen"
    )

    # Klassifikation
    retail_section: SectionName = Field(  # type: ignore[valid-type]
        description="Supermarkt-Warengruppe aus der Liste (Verkaufsform entscheidet)"
    )

    # Portionen + Packages (strukturiert)
    portions: IngredientPortionSuggestSchema = Field(description="Strukturierte Portions- und Package-Vorschläge")

    # Aliase
    aliases: list[str] = Field(default_factory=list, description="Alternative Bezeichnungen")

    # Ernährungstags
    nutritional_tags: list[str] = Field(
        default_factory=list,
        description="Zutreffende Ernährungstags (z.B. 'vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei', 'nussfrei', 'eifrei', 'sojafrei')",
    )


# ---------------------------------------------------------------------------
# Service functions
# ---------------------------------------------------------------------------


def _current_values_block(ingredient: Ingredient) -> str:
    """Current master data and rule findings as prompt context."""
    values = ingredient_nutrition_values(ingredient)
    issues = detect_nutrition_issues(values, name=ingredient.name)
    nutrition = ", ".join(f"{k}={'?' if v is None else f'{v:g}'}" for k, v in values.items())
    section = ingredient.retail_section.name if ingredient.retail_section_id else "?"
    price = "?" if ingredient.price_per_kg is None else f"{float(ingredient.price_per_kg):g}"
    issue_text = "; ".join(issue.label for issue in issues) or "keine"
    return (
        f"Aktuelle Werte: {nutrition}\n"
        f"Warengruppe: {section} | Preis EUR/kg: {price} | Viskosität: {ingredient.physical_viscosity or '?'}\n"
        f"Regelprüfung auffällig: {issue_text}\n"
        f"Beschreibung: {(ingredient.description or '(fehlt)')[:300]}"
    )


def _clamp_suggested_nutrition(data: dict) -> None:
    """Enforce hard nutrition constraints on AI output before it reaches the UI."""
    carbs, sugar = data.get("carbohydrate_g"), data.get("sugar_g")
    if carbs is not None and sugar is not None and sugar > carbs:
        data["sugar_g"] = carbs
    fat, sat = data.get("fat_g"), data.get("fat_sat_g")
    if fat is not None and sat is not None and sat > fat:
        data["fat_sat_g"] = fat
    if data.get("salt_g") is not None:
        data["sodium_mg"] = round(data["salt_g"] * 400, 1)


def _retail_section_list() -> str:
    return "\n".join(f"- {entry['name']}: {entry['description']}" for entry in RETAIL_SECTIONS)


def suggest_all_fields(ingredient: Ingredient, user: AbstractBaseUser | None = None) -> dict:
    """Suggest all fields for an existing ingredient (single-ingredient magic wand).

    Returns a dict with suggested values (None for fields that couldn't be determined).
    """
    from google.genai import types

    from core.services.prompt_context import build_prompt_context

    is_breakfast_topping, is_baking_ingredient = _ingredient_portion_tags(ingredient)

    prompt = (
        f"Du bist Lebensmittel-Datenkurator für eine deutsche Koch- und Einkaufsplattform für Pfadfinderlager.\n"
        f"Prüfe und vervollständige die Stammdaten der Zutat '{ingredient.name}'.\n\n"
        f"{_current_values_block(ingredient)}\n\n"
        f"AUFGABE\n"
        f"- Übernimm plausible aktuelle Werte. Korrigiere Werte, die die Regelprüfung als auffällig meldet oder die "
        f"den Regeln widersprechen, und ergänze fehlende ('?').\n"
        f"- Schreibe eine sachliche Beschreibung (100–400 Zeichen): Art, Geschmack, Textur, typische Verwendung, "
        f"Lagerung. Keine Marken, keine Werbung. Der Text dient der semantischen Suche.\n"
        f"- name_suggestion nur, wenn der Name eine Marke, Menge, Werbesprache oder einen Tippfehler enthält oder "
        f"zu vage ist (z. B. 'Milch' → 'Kuhmilch 3,5 % Fett'). Sonst null.\n"
        f"- Mindestens 3 Aliase: gängige Synonyme, regionale Namen, Singular/Plural (z. B. 'Möhre', 'Karotte', "
        f"'Mohrrübe'). Keine Marken.\n"
        f"- Ernährungstags nur, wenn sicher (z. B. 'vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei', 'nussfrei', "
        f"'eifrei', 'sojafrei', 'Halal', 'Koscher', 'Scharf', 'Knoblauch', 'Koffeinhaltig').\n"
        f"- Lagerung: storage_type, cooking_factor (Roh→Gekocht, 1.0 ohne Aufquellen), camp_suitable (ohne Kühlung "
        f"mehrere Tage haltbar), preparation_time_min (0 wenn roh essbar), Saison nur für frisches Obst/Gemüse.\n"
        f"- price_per_kg: realistischer Durchschnittspreis im deutschen Supermarkt 2026.\n\n"
        f"{INGREDIENT_DATA_RULES}\n\n"
        f"WARENGRUPPEN (retail_section, genau eine):\n{_retail_section_list()}\n\n"
        f"{build_portion_prompt_section(is_breakfast_topping=is_breakfast_topping, is_baking_ingredient=is_baking_ingredient)}\n\n"
        f"Wenn du einen Wert nicht bestimmen kannst, setze ihn auf null."
    )
    prompt_context = build_prompt_context(user)
    if prompt_context:
        prompt = f"{prompt}\n\n{prompt_context}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=IngredientSuggestAllSchema,
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="ingredient_suggest_all",
    )

    if response is None:
        raise GeminiUnavailableError("KI nicht verfügbar")

    result = IngredientSuggestAllSchema.model_validate_json(response.text)
    data = result.model_dump()

    _clamp_suggested_nutrition(data)
    section_name = data.pop("retail_section", None)
    data["retail_section_id"] = None
    data["retail_section_name"] = None
    if section_name:
        from supply.models import RetailSection

        section = RetailSection.objects.filter(name=section_name).first()
        if section is not None:
            data["retail_section_id"] = section.id
            data["retail_section_name"] = section.name

    portions_raw = data.pop("portions")
    data["portions"] = portions_raw
    data["ai_suggest"] = {
        "portions": [*portions_raw["rezeptportionen"], *portions_raw["belag"], *portions_raw.get("backmengen", [])],
        "packages": [
            {"name": p["name"], "weight_g": p["weight_g"], "rank": p.get("rank", 1), "package_type": "packung"}
            for p in portions_raw["packungen"]
        ],
    }

    # Resolve nutritional tags names/opposites to database objects
    from supply.models import NutritionalTag

    tags_resolved = []
    if result.nutritional_tags:
        for t_name in result.nutritional_tags:
            name_stripped = t_name.strip()
            if not name_stripped:
                continue
            tag = NutritionalTag.objects.filter(name__iexact=name_stripped).first()
            if not tag:
                tag = NutritionalTag.objects.filter(name_opposite__iexact=name_stripped).first()
            if tag:
                tags_resolved.append(
                    {
                        "id": tag.id,
                        "name": tag.name,
                        "name_opposite": tag.name_opposite,
                        "description": tag.description,
                        "rank": tag.rank,
                        "is_dangerous": tag.is_dangerous,
                    }
                )
    data["nutritional_tags"] = tags_resolved
    data["ai_interaction_id"] = str(interaction_id) if interaction_id else None
    return data


def ai_create_ingredient(
    name: str,
    user: AbstractBaseUser | None = None,
    bypass_limits: bool = False,
    is_background: bool = False,
) -> Ingredient:
    """Create a complete ingredient from just a name using Gemini.

    Creates the Ingredient in the database with Portions and Aliases.
    Returns the created Ingredient instance, or an existing ingredient with the
    same (requested or AI-standardised) name to avoid duplicates.
    """
    from google.genai import types

    from core.services.prompt_context import build_prompt_context
    from supply.choices import IngredientStatusChoices, RetailSectionSourceChoices
    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Package, Portion, RetailSection

    existing = Ingredient.objects.filter(name__iexact=name.strip()).order_by("-usage_count", "id").first()
    if existing is not None:
        existing.ai_interaction_id = None
        return existing

    prompt = (
        f"Recherchiere alle Informationen zum Lebensmittel '{name}'. "
        f"Schreibe eine aussagekräftige, detaillierte Beschreibung (mindestens 100 Zeichen): "
        f"Geschmack, Textur/Konsistenz, Aussehen, typische Verwendung in der Küche, "
        f"Herkunft, Lagerungshinweise und kulinarische Besonderheiten. "
        f"Dieser Text wird für die semantische Suche (Embeddings) verwendet.\n\n"
        f"Gib vollständige Nährwerte pro 100g, Bewertungen, physikalische Eigenschaften, "
        f"typische Portionsgrößen, alternative Bezeichnungen, zutreffende Ernährungstags (z.B. 'vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei', 'nussfrei', 'eifrei', 'sojafrei', 'Halal', 'Koscher', 'Scharf', 'Knoblauch', 'Koffeinhaltig') und den geschätzten Preis pro kg (price_per_kg in EUR) an. "
        f"Verwende offizielle Nährwert-Datenbanken und Produktinformationen. "
        f"Der Preis soll auf durchschnittlichen Supermarktpreisen in Deutschland basieren.\n\n"
        f"{INGREDIENT_DATA_RULES}\n\n"
        f"WARENGRUPPEN (retail_section, genau eine):\n{_retail_section_list()}\n\n"
        f"{build_portion_prompt_section(is_breakfast_topping=False, is_baking_ingredient=False)}"
    )
    prompt_context = build_prompt_context(user)
    if prompt_context:
        prompt = f"{prompt}\n\n{prompt_context}"

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=IngredientAiCreateSchema,
    )

    response, interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="ingredient_ai_create",
        bypass_limits=bypass_limits,
        is_background=is_background,
    )

    if response is None:
        from ninja.errors import HttpError

        raise HttpError(503, "KI nicht verfügbar")

    data = IngredientAiCreateSchema.model_validate_json(response.text)

    existing = Ingredient.objects.filter(name__iexact=data.name.strip()).order_by("-usage_count", "id").first()
    if existing is not None:
        existing.ai_interaction_id = str(interaction_id) if interaction_id else None
        return existing

    # Generate unique slug
    base_slug = slugify(data.name)
    slug = base_slug
    counter = 1
    while Ingredient.objects.filter(slug=slug).exists():
        slug = f"{base_slug}-{counter}"
        counter += 1

    # Create ingredient
    ingredient = Ingredient.objects.create(
        name=data.name,
        slug=slug,
        description=data.description,
        status=IngredientStatusChoices.DRAFT,
        energy_kcal=data.energy_kcal,
        protein_g=data.protein_g,
        fat_g=data.fat_g,
        fat_sat_g=data.fat_sat_g,
        carbohydrate_g=data.carbohydrate_g,
        sugar_g=data.sugar_g,
        fibre_g=data.fibre_g,
        salt_g=data.salt_g,
        sodium_mg=data.sodium_mg,
        fructose_g=data.fructose_g,
        lactose_g=data.lactose_g,
        nova_score=data.nova_score,
        child_score=data.child_score,
        scout_score=data.scout_score,
        environmental_score=data.environmental_score,
        fruit_factor=data.fruit_factor,
        physical_density=data.physical_density,
        physical_viscosity=data.physical_viscosity,
        durability_in_days=data.durability_in_days,
        max_storage_temperature=data.max_storage_temperature,
        price_per_kg=data.price_per_kg,
        retail_section=RetailSection.objects.filter(name=data.retail_section).first(),
        retail_section_source=RetailSectionSourceChoices.AI,
        created_by=cast(User, user) if user and user.is_authenticated else None,
    )

    # Resolve measuring units
    mu_cache: dict[str, MeasuringUnit] = {}

    def _get_mu(name: str) -> MeasuringUnit:
        if name not in mu_cache:
            mu = MeasuringUnit.objects.filter(name__iexact=name).first()
            if mu is None:
                mu, _ = MeasuringUnit.objects.get_or_create(name="Gramm", defaults={"unit": "g", "quantity": 1.0})
            mu_cache[name] = mu
        return mu_cache[name]

    # Create portions from AI suggestions (rezeptportionen, belag, backmengen)
    portions_data = data.portions
    non_primary = [*portions_data.rezeptportionen[1:], *portions_data.belag, *portions_data.backmengen]

    if portions_data.rezeptportionen:
        primary = portions_data.rezeptportionen[0]
        mu = _get_mu(primary.measuring_unit_name)
        if primary.weight_g > 0:
            Portion.objects.create(
                ingredient=ingredient,
                name=primary.name,
                measuring_unit=mu,
                quantity=primary.quantity,
                weight_g=primary.weight_g,
                rank=1,
            )

    for i, portion in enumerate(non_primary):
        mu = _get_mu(portion.measuring_unit_name)
        if portion.weight_g > 0:
            Portion.objects.create(
                ingredient=ingredient,
                name=portion.name,
                measuring_unit=mu,
                quantity=portion.quantity,
                weight_g=portion.weight_g,
                rank=4 + i,
            )

    # Create packages from AI suggestions
    for i, pkg in enumerate(portions_data.packungen):
        Package.objects.create(
            ingredient=ingredient,
            name=pkg.name,
            weight_g=pkg.weight_g,
            rank=1 if i == 0 else i + 2,
        )

    # Create aliases
    for i, alias_name in enumerate(data.aliases):
        IngredientAlias.objects.create(
            ingredient=ingredient,
            name=alias_name,
            rank=i + 1,
        )

    # Set nutritional tags
    if data.nutritional_tags:
        from supply.models import NutritionalTag

        tag_ids = []
        for t_name in data.nutritional_tags:
            name_stripped = t_name.strip()
            if not name_stripped:
                continue
            tag = NutritionalTag.objects.filter(name__iexact=name_stripped).first()
            if not tag:
                tag = NutritionalTag.objects.filter(name_opposite__iexact=name_stripped).first()
            if tag:
                tag_ids.append(tag.id)
        if tag_ids:
            ingredient.nutritional_tags.set(tag_ids)

    # Calculate and save Nutri-Score points and class
    from supply.services.nutri_service import update_ingredient_nutri_score

    update_ingredient_nutri_score(ingredient)

    ingredient.ai_interaction_id = str(interaction_id) if interaction_id else None
    return ingredient
