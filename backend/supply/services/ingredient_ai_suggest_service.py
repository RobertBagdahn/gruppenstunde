"""KI-Gesamtvorschläge für Zutaten via Gemini mit Google Search Grounding.

Provides:
- suggest_all_fields(): All fields in one call for existing ingredients
- ai_create_ingredient(): Create a complete ingredient from just a name
"""

from __future__ import annotations

import logging
from typing import TYPE_CHECKING

from django.contrib.auth.models import AbstractBaseUser
from django.utils.text import slugify
from pydantic import BaseModel, Field

from core.services.gemini import GeminiUnavailableError, gemini_call

if TYPE_CHECKING:
    from supply.models import Ingredient

logger = logging.getLogger(__name__)

GEMINI_MODEL = "gemini-3.1-flash-lite-preview"

# Model that supports structured output + Google Search together
GEMINI_MODEL_WITH_SEARCH = "gemini-3.1-flash-lite-preview"


# ---------------------------------------------------------------------------
# Pydantic schemas for structured output
# ---------------------------------------------------------------------------


class PortionSuggestion(BaseModel):
    """A suggested portion for an ingredient."""

    name: str = Field(description="Name der Portion, z.B. '1 Packung (500g)' oder '125g'")
    weight_g: float = Field(description="Gewicht dieser Portion in Gramm")
    measuring_unit_name: str = Field(
        description="Maßeinheit, z.B. 'Gramm', 'Milliliter', 'Tasse', 'Esslöffel', 'Stück'"
    )
    rank: int = Field(
        default=1,
        description=(
            "Rang (Sortierung): 1 = Standard/Normalportion, 2,3,... = weitere Portionen in Sortierreihenfolge"
        ),
    )


class IngredientSuggestAllSchema(BaseModel):
    """Complete suggestion schema for all ingredient fields."""

    # Name suggestion
    name_suggestion: str | None = Field(None, description="Spezifischerer Name, falls aktuell generisch. Keine Marken.")

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
    physical_viscosity: str | None = Field(None, description="Aggregatzustand: 'solid', 'beverage', oder 'powder'")
    durability_in_days: int | None = Field(None, description="Haltbarkeit in Tagen")
    max_storage_temperature: int | None = Field(None, description="Maximale Lagertemperatur in °C")

    # Scout/camp fields
    storage_type: str | None = Field(None, description="Lagerungsart: dry/refrigerated/frozen/ambient")
    cooking_factor: float | None = Field(None, description="Multiplikator Roh→Gekocht. Z.B. 2.5 für Nudeln")
    camp_suitable: bool | None = Field(None, description="Fürs Zeltlager geeignet (haltbar, kein Kühlschrank)")
    preparation_time_min: int | None = Field(None, description="Zubereitungsdauer in Minuten (Koch-/Backzeit)")
    season_start: int | None = Field(None, description="Saisonbeginn (Monat 1-12). null = ganzjährig.")
    season_end: int | None = Field(None, description="Saisonende (Monat 1-12). null = ganzjährig.")

    # Preis
    price_per_kg: float | None = Field(None, description="Geschätzter Preis in EUR pro kg")

    # Portionen
    portions: list[PortionSuggestion] = Field(
        default_factory=list, description="Typische Portionsgrößen (erste Portion = Normalportion/rank=1)"
    )
    stueck_weight_g: float | None = Field(
        None, description="Geschätztes Gewicht für 1 Stück (null wenn nicht sinnvoll, z.B. Salz)"
    )
    packung_weight_g: float | None = Field(
        None, description="Geschätztes Gewicht für 1 Packung (null wenn nicht sinnvoll, z.B. Wasser)"
    )

    # Aliase
    aliases: list[str] = Field(default_factory=list, description="Mind. 3 spezifische Aliase")

    # Ernährungstags
    nutritional_tags: list[str] = Field(default_factory=list, description="Ernährungstags wie 'vegan', 'laktosefrei'")


class IngredientAiCreateSchema(BaseModel):
    """Schema for creating a complete ingredient from a name."""

    name: str = Field(description="Standardisierter Name der Zutat")
    description: str = Field(description="Kurzbeschreibung (1-2 Sätze)")

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

    # Portionen
    portions: list[PortionSuggestion] = Field(
        default_factory=list, description="Typische Portionsgrößen (erste = Normalportion/rank=1)"
    )
    stueck_weight_g: float | None = Field(
        None, description="Geschätztes Gewicht für 1 Stück (null wenn nicht sinnvoll)"
    )
    packung_weight_g: float | None = Field(
        None, description="Geschätztes Gewicht für 1 Packung (null wenn nicht sinnvoll)"
    )

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


def suggest_all_fields(ingredient: Ingredient, user: AbstractBaseUser | None = None) -> dict:
    """Suggest all fields for an existing ingredient using Gemini + Search Grounding.

    Returns a dict with suggested values (None for fields that couldn't be determined).
    """
    from google.genai import types

    prompt = (
        f"Recherchiere die vollständigen Nährwerte, Bewertungen und physikalischen Eigenschaften "
        f"für das Lebensmittel '{ingredient.name}'. "
        f"Verwende offizielle Nährwert-Datenbanken und Produktinformationen.\n\n"
        f"Schlage einen präziseren Namen vor, falls aktuell zu generisch. "
        f"Keine Marken, keine Mengenangaben. Z.B. 'Kuhmilch 3,5% Fett' statt 'Milch'.\n\n"
        f"Gib außerdem typische Portionsgrößen mit dem jeweiligen Gewicht in Gramm an. "
        f"Die ERSTE Portion im Array ist immer die Normalportion (rank=1): die typische Menge pro Person in einem Standardrezept. "
        f"Z.B. für Nudeln: '80g', für Hähnchenbrust: '150g', für Butter: '10g'.\n"
        f"Weitere Portionen (rank=2,3,...) sind zusätzliche gängige Größen wie Packungen, Stücke oder Haushaltsmaße.\n\n"
        f"Gib für jede Portion folgendes an:\n"
        f"- name: Z.B. '80g Portion', '1 Packung (500g)', '1 Stück (150g)', '1 Esslöffel (15g)'\n"
        f"- weight_g: Gewicht in Gramm (PFLICHTFELD, auch für Getränke in Gramm konvertieren)\n"
        f"- measuring_unit_name: Z.B. 'Gramm', 'Milliliter', 'Stück', 'Esslöffel', 'Tasse'\n"
        f"- rank: Startet mit 1 für Normalportion, dann 2,3,... (NICHT 'priority'!)\n\n"
        f"Wichtig: Generiere mindestens 3-5 Portionen pro Zutat.\n\n"
        f"Zusätzlich gib Schätzungen an für:\n"
        f"- stueck_weight_g: Durchschnittliches Gewicht von 1 Stück dieser Zutat (null wenn nicht sinnvoll, z.B. Salz, Öl)\n"
        f"- packung_weight_g: Durchschnittliches Gewicht einer Standardpackung (null wenn nicht sinnvoll, z.B. Wasser, Obst)\n\n"
        f"Gib mindestens 3 alternative Bezeichnungen/Aliase für die Zutat an. "
        f"Die Aliase sollen spezifischer sein als der Zutatenname. "
        f"Z.B. für 'Nudeln': 'Nudeln (Fusilli)', 'Nudeln (Makkaroni)', 'Nudeln (Spaghetti)'.\n\n"
        f"Recherchiere zutreffende Ernährungstags für das Lebensmittel "
        f"(z.B. 'vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei', 'nussfrei', 'eifrei', 'sojafrei', "
        f"'Halal', 'Koscher', 'Scharf', 'Knoblauch', 'Koffeinhaltig').\n\n"
        f"Gib auch die Lagereigenschaften an:\n"
        f"- storage_type: 'dry' (Trocken), 'refrigerated', 'frozen', 'ambient' (Raumtemperatur)\n"
        f"- cooking_factor: Multiplikator Roh→Gekocht. Z.B. 2.5 für Nudeln (100g→250g). 1.0 wenn kein Aufquellen.\n"
        f"- camp_suitable: Ob die Zutat fürs Zeltlager geeignet ist (haltbar, kein Kühlschrank)\n"
        f"- preparation_time_min: Zubereitungsdauer in Minuten (Kochzeit, Backzeit). 0 wenn roh genießbar.\n"
        f"- season_start/end: Saison in Monaten (1-12), z.B. 4-6 für Spargel. null = ganzjährig.\n\n"
        f"Schätze den typischen Preis in EUR pro kg (price_per_kg) basierend auf "
        f"durchschnittlichen Supermarktpreisen in Deutschland.\n\n"
        f"Wenn du einen Wert nicht sicher bestimmen kannst, setze ihn auf null."
    )

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


def ai_create_ingredient(name: str, user: AbstractBaseUser | None = None, bypass_limits: bool = False) -> Ingredient:
    """Create a complete ingredient from just a name using Gemini + Search Grounding.

    Creates the Ingredient in the database with Portions and Aliases.
    Returns the created Ingredient instance.
    """
    from google.genai import types

    from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion

    prompt = (
        f"Recherchiere alle Informationen zum Lebensmittel '{name}'. "
        f"Gib vollständige Nährwerte pro 100g, Bewertungen, physikalische Eigenschaften, "
        f"typische Portionsgrößen, alternative Bezeichnungen, zutreffende Ernährungstags (z.B. 'vegan', 'vegetarisch', 'laktosefrei', 'glutenfrei', 'nussfrei', 'eifrei', 'sojafrei', 'Halal', 'Koscher', 'Scharf', 'Knoblauch', 'Koffeinhaltig') und den geschätzten Preis pro kg (price_per_kg in EUR) an. "
        f"Verwende offizielle Nährwert-Datenbanken und Produktinformationen. "
        f"Der Preis soll auf durchschnittlichen Supermarktpreisen in Deutschland basieren.\n\n"
        f"PORTIONEN: Die ERSTE Portion im Array MUSS die Normalportion (rank=1) sein – die typische Menge pro Person in einem Standardrezept. "
        f"Z.B. für Nudeln: '80g Portion', für Hähnchenbrust: '150g Filet', für Butter: '10g Portion'. "
        f"Weitere Portionen (rank=2,3,...) sind zusätzliche gängige Größen wie Packungen, Stücke oder Haushaltsmaße.\n\n"
        f"Für JEDE Portion gib an:\n"
        f"- name: Aussagekräftiger Name, z.B. '125g', '1 Packung (500g)', '1 Stück (150g)', '1 Esslöffel (15g)'\n"
        f"- weight_g: Gewicht in Gramm (PFLICHTFELD, auch Flüssigkeiten als Gramm angeben)\n"
        f"- measuring_unit_name: 'Gramm', 'Milliliter', 'Stück', 'Esslöffel', 'Tasse', etc.\n"
        f"- rank: Startet mit 1 (Normalportion), dann 2, 3, ... (NICHT 'priority'!)\n\n"
        f"Gib mindestens 3-5 Portionen an.\n\n"
        f"ZUSÄTZLICH:\n"
        f"- stueck_weight_g: Geschätztes Durchschnittsgewicht von 1 Stück (null wenn nicht sinnvoll, z.B. für Salz, Öl)\n"
        f"- packung_weight_g: Geschätztes Gewicht einer Standardpackung (null wenn nicht sinnvoll, z.B. für Wasser, loses Obst)"
    )

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=IngredientAiCreateSchema,
    )

    response, _interaction_id = gemini_call(
        user=user,
        model=GEMINI_MODEL,
        contents=prompt,
        config=config,
        context="ingredient_ai_create",
        bypass_limits=bypass_limits,
    )

    if response is None:
        from ninja.errors import HttpError

        raise HttpError(503, "KI nicht verfügbar")

    data = IngredientAiCreateSchema.model_validate_json(response.text)

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
        status="user_content",
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
        created_by=user if user and user.is_authenticated else None,
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

    # Create portions from AI suggestions
    for i, portion in enumerate(data.portions):
        mu = _get_mu(portion.measuring_unit_name)
        Portion.objects.create(
            ingredient=ingredient,
            name=portion.name,
            measuring_unit=mu,
            quantity=1.0,
            weight_g=portion.weight_g,
            rank=i + 1,
        )

    # Ensure system portions (g/ml, Packung, Stück) exist
    from supply.signals import _create_system_portions

    _create_system_portions(ingredient)

    # Set weight_g for Stück and Packung system portions from AI suggestions
    if data.stueck_weight_g is not None and data.stueck_weight_g > 0:
        stueck_portion = Portion.objects.filter(ingredient=ingredient, name="Stück").first()
        if stueck_portion:
            stueck_portion.weight_g = data.stueck_weight_g
            stueck_portion.save(update_fields=["weight_g"])

    if data.packung_weight_g is not None and data.packung_weight_g > 0:
        packung_portion = Portion.objects.filter(ingredient=ingredient, name="Packung").first()
        if packung_portion:
            packung_portion.weight_g = data.packung_weight_g
            packung_portion.save(update_fields=["weight_g"])

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

    return ingredient
