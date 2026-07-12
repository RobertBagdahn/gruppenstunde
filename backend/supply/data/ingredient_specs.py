"""Curated ingredient specifications for seed data enrichment.

Each IngredientSpec defines the canonical, authoritative data for one ingredient.
During enrichment, fixture ingredients are matched against these specs and
missing data is filled in from the spec.

Data sources (priority order):
    1. REWE product data (extracted from existing fixture)
    2. BLS (Bundeslebensmittelschlüssel) reference values
    3. Gemini AI estimation (with range validation)

The ~500 specs are extracted from the best REWE-scraped ingredients
in the existing fixture — those with complete nutritional data, prices,
and non-generic names.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal


@dataclass
class PortionSpec:
    """A curated portion definition for an ingredient."""

    name: str
    quantity: float
    weight_g: float
    rank: int = 1
    measuring_unit: str = "g"  # "g", "ml", or "stk"


@dataclass
class IngredientSpec:
    """Curated data for one canonical ingredient."""

    canonical_name: str
    generic_names: list[str] = field(default_factory=list)
    description: str = ""
    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fat_sat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    sodium_mg: float | None = None
    fructose_g: float | None = None
    lactose_g: float | None = None
    vitamin_c_mg: float | None = None
    price_per_kg: Decimal | None = None
    physical_density: float = 1.0
    physical_viscosity: str = "solid"
    retail_section: str | None = None
    nutritional_tags: list[str] = field(default_factory=list)
    portions: list[PortionSpec] = field(default_factory=list)
    aliases: list[str] = field(default_factory=list)
    nutri_score: int | None = None
    nutri_class: int | None = None
    rewe_product_names: list[str] = field(default_factory=list)
    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    nova_score: int | None = None
    fruit_factor: float | None = None


# ---------------------------------------------------------------------------
# Generic term → canonical ingredient mapping
# Each generic term maps to a list of concrete ingredient names that the
# term's is_generic=True alias should be attached to (1:N mapping).
# ---------------------------------------------------------------------------

GENERIC_TERM_MAP: dict[str, list[str]] = {
    "Salz": ["Jodsalz"],
    "Pfeffer": ["gemahlener schwarzer Pfeffer"],
    "Butter": ["Deutsche Markenbutter"],
    "Mehl": ["Weizenmehl Type 405"],
    "Eier": ["Hühnereier Größe M"],
    "Wasser": ["Leitungswasser"],
    "Zucker": ["weißer Haushaltszucker"],
    "Öl": ["raffiniertes Sonnenblumenöl"],
    "Milch": ["Kuhmilch 3,5 % Fett"],
    "Nudeln": [],
    "Reis": ["Langkornreis parboiled"],
    "Kartoffeln": ["festkochende Kartoffeln"],
    "Zwiebeln": ["Speisezwiebeln"],
    "Knoblauch": ["frischer Knoblauch"],
    "Sahne": ["Schlagsahne 30 % Fett"],
    "Honig": ["Blütenhonig"],
    "Käse": ["Gouda jung 48% F.i.Tr."],
    "Joghurt": ["Naturjoghurt 3,5 % Fett"],
    "Quark": ["Magerquark"],
    "Frischkäse": ["Frischkäse Doppelrahmstufe"],
    "Zitrone": ["Zitrone frisch"],
    "Tomate": ["Tomate frisch"],
    "Paprika": ["rote Paprika"],
    "Gurke": ["Salatgurke"],
    "Möhren": ["frische Möhren"],
    "Spinat": ["frischer Blattspinat"],
    "Zucchini": ["grüne Zucchini"],
    "Hähnchen": ["Hähnchenbrustfilet"],
    "Lachs": ["Lachsfilet"],
    "Schokolade": ["Zartbitterschokolade 70% Kakao"],
    "Brot": ["Vollkornbrot geschnitten"],
    "Brötchen": [],
    "Senf": ["mittelscharfer Senf"],
    "Ketchup": ["Tomaten-Ketchup"],
    "Essig": ["Weißweinessig"],
    "Bier": ["Pilsner Bier"],
    "Wein": ["trockener Weißwein"],
    "Apfel": ["frischer Apfel"],
    "Banane": ["frische Banane"],
    "Orange": ["frische Orange"],
    "Erdbeeren": ["frische Erdbeeren"],
    "Mandeln": ["Mandeln ganz"],
    "Walnüsse": ["Walnusskerne"],
    "Haselnüsse": ["Haselnusskerne"],
    "Erdnüsse": ["Erdnusskerne geröstet"],
    "Nüsse": [],
    "Kräuter": [],
    "Gewürze": [],
}

# ---------------------------------------------------------------------------
# Curated ingredient specs (~500 entries extracted from REWE fixture data)
# Populated by _extract_specs_from_fixtures() during enrich_seeds runtime.
# The build-time list below contains the ~100 most critical staples with
# manually verified data. The remaining ~400 are auto-extracted.
# ---------------------------------------------------------------------------

INGREDIENT_SPECS: list[IngredientSpec] = []


# ---------------------------------------------------------------------------
# Runtime spec extraction from fixture data
# ---------------------------------------------------------------------------

def extract_specs_from_fixtures(data_dir: str, max_specs: int = 500) -> list[IngredientSpec]:
    """Extract IngredientSpec entries from the REWE fixture data.

    Prioritizes ingredients that have:
        - nan_art_id_rewe (REWE product)
        - Complete nutritional data (energy_kcal > 0)
        - price_per_kg set
        - Non-generic name (multiple words or contains qualifiers)
    """
    import json
    import os
    from pathlib import Path

    fixture_path = Path(data_dir) / "food" / "supply_ingredient.json"
    if not fixture_path.exists():
        return []

    with open(fixture_path) as f:
        ingredients = json.load(f)

    retail_section_map = _load_retail_section_map(data_dir)
    specs = []

    for ing in ingredients:
        fields = ing["fields"]
        name = fields.get("name", "")

        if _is_generic_name(name):
            continue

        if not fields.get("nan_art_id_rewe"):
            continue

        if not (fields.get("energy_kcal") and fields["energy_kcal"] > 0):
            continue

        if not fields.get("price_per_kg"):
            continue

        spec = _ingredient_to_spec(name, fields, retail_section_map)
        specs.append(spec)

        if len(specs) >= max_specs:
            break

    return specs


def _is_generic_name(name: str) -> bool:
    """Check if a name is too generic (single common food word)."""
    generic_words = {
        name.lower() for name in GENERIC_TERM_MAP
    }
    return name.strip().lower() in generic_words


def _load_retail_section_map(data_dir: str) -> dict[int, str]:
    import json
    from pathlib import Path

    path = Path(data_dir) / "masterdata" / "supply_retailsection.json"
    if not path.exists():
        return {}
    with open(path) as f:
        data = json.load(f)
    return {item["pk"]: item["fields"]["name"] for item in data}


def _ingredient_to_spec(
    name: str, fields: dict, retail_section_map: dict
) -> IngredientSpec:
    rs_id = fields.get("retail_section_id")
    return IngredientSpec(
        canonical_name=name,
        description=fields.get("description", ""),
        energy_kcal=fields.get("energy_kcal"),
        protein_g=fields.get("protein_g"),
        fat_g=fields.get("fat_g"),
        fat_sat_g=fields.get("fat_sat_g"),
        carbohydrate_g=fields.get("carbohydrate_g"),
        sugar_g=fields.get("sugar_g"),
        fibre_g=fields.get("fibre_g"),
        salt_g=fields.get("salt_g"),
        sodium_mg=fields.get("sodium_mg"),
        fructose_g=fields.get("fructose_g"),
        lactose_g=fields.get("lactose_g"),
        vitamin_c_mg=fields.get("vitamin_c_mg"),
        price_per_kg=_decimal_or_none(fields.get("price_per_kg")),
        physical_density=fields.get("physical_density", 1.0),
        physical_viscosity=fields.get("physical_viscosity", "solid"),
        retail_section=retail_section_map.get(rs_id) if rs_id else None,
        child_score=fields.get("child_score"),
        scout_score=fields.get("scout_score"),
        environmental_score=fields.get("environmental_score"),
        nova_score=fields.get("nova_score"),
        fruit_factor=fields.get("fruit_factor"),
        nutri_score=fields.get("nutri_score"),
        nutri_class=fields.get("nutri_class"),
        rewe_product_names=[name],
        portions=[],
        aliases=[],
    )


def _decimal_or_none(val) -> Decimal | None:
    if val is None:
        return None
    return Decimal(str(val))


# ---------------------------------------------------------------------------
# Manual curated specs for the 100 most critical staple ingredients
# These provide canonical data when REWE data is incomplete.
# Nutrients per 100g, price per kg (EUR, German supermarket avg 2024/2025).
# ---------------------------------------------------------------------------

STAPLE_SPECS: list[IngredientSpec] = [
    IngredientSpec(
        canonical_name="Jodsalz",
        generic_names=["Salz"],
        description="Jodiertes Speisesalz",
        physical_density=1.2,
        physical_viscosity="solid",
        energy_kcal=0.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=100.0,
        price_per_kg=Decimal("0.49"),
        retail_section="Gewürze & Kräuter",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 TL (5g)", 5.0, 5.0, 1),
            PortionSpec("1 Prise (0,5g)", 0.5, 0.5, 2),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Speisesalz", "Kochsalz"],
    ),
    IngredientSpec(
        canonical_name="gemahlener schwarzer Pfeffer",
        generic_names=["Pfeffer"],
        description="Schwarzer Pfeffer, gemahlen",
        physical_density=0.5,
        physical_viscosity="powder",
        energy_kcal=253.0,
        protein_g=10.0,
        fat_g=3.3,
        fat_sat_g=1.4,
        carbohydrate_g=44.0,
        sugar_g=0.6,
        fibre_g=25.0,
        salt_g=0.04,
        price_per_kg=Decimal("19.80"),
        retail_section="Gewürze & Kräuter",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 TL (2g)", 2.0, 2.0, 1),
            PortionSpec("1 Prise (0,5g)", 0.5, 0.5, 2),
            PortionSpec("1 EL (5g)", 5.0, 5.0, 3),
        ],
        aliases=["schwarzer Pfeffer", "Pfeffer gemahlen"],
    ),
    IngredientSpec(
        canonical_name="Deutsche Markenbutter",
        generic_names=["Butter"],
        description="Deutsche Markenbutter, mindestens 82% Fett",
        physical_density=0.95,
        physical_viscosity="solid",
        energy_kcal=741.0,
        protein_g=0.7,
        fat_g=82.0,
        fat_sat_g=51.0,
        carbohydrate_g=0.6,
        sugar_g=0.6,
        fibre_g=0.0,
        salt_g=0.03,
        price_per_kg=Decimal("10.76"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 EL (10g)", 10.0, 10.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("250g (Packung)", 250.0, 250.0, 3),
        ],
        aliases=["Butter", "Markenbutter"],
    ),
    IngredientSpec(
        canonical_name="Weizenmehl Type 405",
        generic_names=["Mehl"],
        description="Weizenmehl Type 405",
        physical_density=0.6,
        physical_viscosity="powder",
        energy_kcal=344.0,
        protein_g=10.0,
        fat_g=1.0,
        fat_sat_g=0.2,
        carbohydrate_g=72.0,
        sugar_g=0.7,
        fibre_g=3.0,
        salt_g=0.01,
        price_per_kg=Decimal("0.89"),
        retail_section="Nudeln & Reis & Getreide",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("100g", 100.0, 100.0, 1),
            PortionSpec("1 EL (15g)", 15.0, 15.0, 2),
            PortionSpec("500g", 500.0, 500.0, 3),
        ],
        aliases=["Mehl Type 405", "Haushaltsmehl", "Weizenmehl"],
    ),
    IngredientSpec(
        canonical_name="Hühnereier Größe M",
        generic_names=["Eier"],
        description="Hühnereier, Größe M (53-63g)",
        physical_density=1.03,
        physical_viscosity="solid",
        energy_kcal=142.0,
        protein_g=12.6,
        fat_g=10.6,
        fat_sat_g=3.3,
        carbohydrate_g=0.3,
        sugar_g=0.3,
        fibre_g=0.0,
        salt_g=0.37,
        price_per_kg=Decimal("4.95"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "sojafrei"],
        portions=[
            PortionSpec("1 Ei (60g)", 1.0, 60.0, 1, "stk"),
            PortionSpec("2 Eier", 2.0, 120.0, 2, "stk"),
            PortionSpec("6 Eier", 6.0, 360.0, 3, "stk"),
        ],
        aliases=["Eier Größe M", "Hühnerei"],
    ),
    IngredientSpec(
        canonical_name="Leitungswasser",
        generic_names=["Wasser"],
        description="Leitungswasser",
        physical_density=1.0,
        physical_viscosity="beverage",
        energy_kcal=0.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=0.0,
        price_per_kg=Decimal("0.00"),
        retail_section="Getränke",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("100 ml", 100.0, 100.0, 1, "ml"),
            PortionSpec("200 ml", 200.0, 200.0, 2, "ml"),
            PortionSpec("1 Liter", 1000.0, 1000.0, 3, "ml"),
        ],
        aliases=["Wasser"],
    ),
    IngredientSpec(
        canonical_name="weißer Haushaltszucker",
        generic_names=["Zucker"],
        description="Weißer Haushaltszucker (Saccharose)",
        physical_density=0.85,
        physical_viscosity="solid",
        energy_kcal=406.0,
        protein_g=0.0,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=100.0,
        sugar_g=100.0,
        fibre_g=0.0,
        salt_g=0.0,
        price_per_kg=Decimal("1.15"),
        retail_section="Brot & Backwaren",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 TL (5g)", 5.0, 5.0, 1),
            PortionSpec("1 EL (15g)", 15.0, 15.0, 2),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Zucker", "Haushaltszucker", "Kristallzucker"],
    ),
    IngredientSpec(
        canonical_name="raffiniertes Sonnenblumenöl",
        generic_names=["Öl"],
        description="Raffiniertes Sonnenblumenöl",
        physical_density=0.92,
        physical_viscosity="liquid",
        energy_kcal=884.0,
        protein_g=0.0,
        fat_g=100.0,
        fat_sat_g=11.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=0.0,
        price_per_kg=Decimal("2.29"),
        retail_section="Öle & Soßen",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 EL (10ml)", 10.0, 9.2, 1, "ml"),
            PortionSpec("100 ml", 100.0, 92.0, 2, "ml"),
            PortionSpec("1 Liter", 1000.0, 920.0, 3, "ml"),
        ],
        aliases=["Sonnenblumenöl", "Speiseöl", "Pflanzenöl"],
    ),
    IngredientSpec(
        canonical_name="Kuhmilch 3,5 % Fett",
        generic_names=["Milch"],
        description="Frische Vollmilch 3,5% Fett",
        physical_density=1.03,
        physical_viscosity="beverage",
        energy_kcal=65.0,
        protein_g=3.4,
        fat_g=3.5,
        fat_sat_g=2.1,
        carbohydrate_g=4.8,
        sugar_g=4.8,
        fibre_g=0.0,
        salt_g=0.11,
        price_per_kg=Decimal("1.09"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("100 ml", 100.0, 103.0, 1, "ml"),
            PortionSpec("200 ml", 200.0, 206.0, 2, "ml"),
            PortionSpec("1 Liter", 1000.0, 1030.0, 3, "ml"),
        ],
        aliases=["Vollmilch", "Frische Milch", "Milch 3,5%"],
    ),
    IngredientSpec(
        canonical_name="Fusilli Nudeln trocken",
        generic_names=["Nudeln"],
        description="Fusilli aus Hartweizengrieß",
        physical_density=0.5,
        physical_viscosity="solid",
        energy_kcal=360.0,
        protein_g=12.5,
        fat_g=1.8,
        fat_sat_g=0.3,
        carbohydrate_g=70.0,
        sugar_g=3.2,
        fibre_g=3.0,
        salt_g=0.01,
        price_per_kg=Decimal("1.98"),
        retail_section="Nudeln & Reis & Getreide",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "nussfrei", "sojafrei"],
        portions=[
            PortionSpec("1 Portion trocken (125g)", 125.0, 125.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("500g (Packung)", 500.0, 500.0, 3),
        ],
        aliases=["Fusilli", "Spiralnudeln", "Hartweizennudeln", "Pasta"],
    ),
    IngredientSpec(
        canonical_name="Langkornreis parboiled",
        generic_names=["Reis"],
        description="Langkornreis, parboiled",
        physical_density=0.85,
        physical_viscosity="solid",
        energy_kcal=360.0,
        protein_g=7.0,
        fat_g=0.6,
        fat_sat_g=0.2,
        carbohydrate_g=78.0,
        sugar_g=0.2,
        fibre_g=1.4,
        salt_g=0.01,
        price_per_kg=Decimal("1.98"),
        retail_section="Nudeln & Reis & Getreide",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Portion trocken (75g)", 75.0, 75.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("500g (Packung)", 500.0, 500.0, 3),
        ],
        aliases=["Reis parboiled", "Langkornreis"],
    ),
    IngredientSpec(
        canonical_name="festkochende Kartoffeln",
        generic_names=["Kartoffeln"],
        description="Festkochende Speisekartoffeln",
        physical_density=1.1,
        physical_viscosity="solid",
        energy_kcal=71.0,
        protein_g=2.0,
        fat_g=0.1,
        fat_sat_g=0.0,
        carbohydrate_g=15.0,
        sugar_g=0.8,
        fibre_g=2.1,
        salt_g=0.01,
        price_per_kg=Decimal("1.29"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 mittelgroße (150g)", 1.0, 150.0, 1, "stk"),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("1 kg", 1000.0, 1000.0, 3),
        ],
        aliases=["Kartoffeln festkochend", "Speisekartoffeln"],
    ),
    IngredientSpec(
        canonical_name="Speisezwiebeln",
        generic_names=["Zwiebeln"],
        description="Braune Speisezwiebeln",
        physical_density=0.95,
        physical_viscosity="solid",
        energy_kcal=27.0,
        protein_g=1.3,
        fat_g=0.3,
        fat_sat_g=0.0,
        carbohydrate_g=5.0,
        sugar_g=4.2,
        fibre_g=1.4,
        salt_g=0.01,
        price_per_kg=Decimal("1.49"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (100g)", 1.0, 100.0, 1, "stk"),
            PortionSpec("1 kleine (50g)", 1.0, 50.0, 2, "stk"),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Zwiebel", "Küchenzwiebeln", "Gemüsezwiebeln"],
    ),
    IngredientSpec(
        canonical_name="frischer Knoblauch",
        generic_names=["Knoblauch"],
        description="Frische Knoblauchknolle",
        physical_density=0.8,
        physical_viscosity="solid",
        energy_kcal=141.0,
        protein_g=6.4,
        fat_g=0.5,
        fat_sat_g=0.1,
        carbohydrate_g=28.0,
        sugar_g=1.0,
        fibre_g=2.1,
        salt_g=0.02,
        price_per_kg=Decimal("7.90"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Zehe (3g)", 1.0, 3.0, 1, "stk"),
            PortionSpec("1 Knolle (50g)", 1.0, 50.0, 2, "stk"),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Knoblauchzehe", "Knoblauch frisch"],
    ),
    IngredientSpec(
        canonical_name="Schlagsahne 30 % Fett",
        generic_names=["Sahne"],
        description="Frische Schlagsahne mit 30% Fett",
        physical_density=1.0,
        physical_viscosity="liquid",
        energy_kcal=294.0,
        protein_g=2.4,
        fat_g=30.0,
        fat_sat_g=19.0,
        carbohydrate_g=3.4,
        sugar_g=3.4,
        fibre_g=0.0,
        salt_g=0.07,
        price_per_kg=Decimal("5.49"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("100 ml", 100.0, 100.0, 1, "ml"),
            PortionSpec("200 ml (Becher)", 200.0, 200.0, 2, "ml"),
            PortionSpec("1 EL (15ml)", 15.0, 15.0, 3, "ml"),
        ],
        aliases=["Sahne", "Schlagsahne", "Süße Sahne"],
    ),
    IngredientSpec(
        canonical_name="Blütenhonig",
        generic_names=["Honig"],
        description="Deutscher Blütenhonig, flüssig",
        physical_density=1.4,
        physical_viscosity="liquid",
        energy_kcal=304.0,
        protein_g=0.4,
        fat_g=0.0,
        fat_sat_g=0.0,
        carbohydrate_g=82.0,
        sugar_g=80.0,
        fibre_g=0.0,
        salt_g=0.0,
        price_per_kg=Decimal("13.96"),
        retail_section="Brot & Backwaren",
        nutritional_tags=["vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 TL (10g)", 10.0, 10.0, 1),
            PortionSpec("1 EL (20g)", 20.0, 20.0, 2),
            PortionSpec("250g (Glas)", 250.0, 250.0, 3),
        ],
        aliases=["Honig flüssig", "Bienenhonig"],
    ),
    IngredientSpec(
        canonical_name="Gouda jung 48% F.i.Tr.",
        generic_names=["Käse"],
        description="Gouda jung, 48% Fett i.Tr.",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=359.0,
        protein_g=24.0,
        fat_g=27.0,
        fat_sat_g=17.0,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=2.0,
        price_per_kg=Decimal("8.90"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Scheibe (25g)", 25.0, 25.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Gouda jung", "Schnittkäse Gouda"],
    ),
    IngredientSpec(
        canonical_name="Naturjoghurt 3,5 % Fett",
        generic_names=["Joghurt"],
        description="Naturjoghurt mit 3,5% Fett",
        physical_density=1.03,
        physical_viscosity="liquid",
        energy_kcal=62.0,
        protein_g=4.0,
        fat_g=3.5,
        fat_sat_g=2.3,
        carbohydrate_g=4.7,
        sugar_g=4.7,
        fibre_g=0.0,
        salt_g=0.13,
        price_per_kg=Decimal("1.58"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("150g (Becher)", 150.0, 150.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("500g (Becher)", 500.0, 500.0, 3),
        ],
        aliases=["Joghurt natur", "Naturjoghurt"],
    ),
    IngredientSpec(
        canonical_name="Magerquark",
        generic_names=["Quark"],
        description="Magerquark unter 10% Fett i.Tr.",
        physical_density=1.05,
        physical_viscosity="solid",
        energy_kcal=68.0,
        protein_g=11.0,
        fat_g=0.3,
        fat_sat_g=0.2,
        carbohydrate_g=4.5,
        sugar_g=4.5,
        fibre_g=0.0,
        salt_g=0.1,
        price_per_kg=Decimal("3.00"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("250g (Becher)", 250.0, 250.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("500g (Becher)", 500.0, 500.0, 3),
        ],
        aliases=["Quark mager", "Speisequark"],
    ),
    IngredientSpec(
        canonical_name="Frischkäse Doppelrahmstufe",
        generic_names=["Frischkäse"],
        description="Frischkäse Doppelrahmstufe",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=249.0,
        protein_g=6.0,
        fat_g=24.0,
        fat_sat_g=15.0,
        carbohydrate_g=3.0,
        sugar_g=3.0,
        fibre_g=0.0,
        salt_g=0.7,
        price_per_kg=Decimal("4.95"),
        retail_section="Milchprodukte & Käse",
        nutritional_tags=["vegetarisch", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 EL (20g)", 20.0, 20.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("200g (Packung)", 200.0, 200.0, 3),
        ],
        aliases=["Frischkäse natur"],
    ),
    IngredientSpec(
        canonical_name="Zitrone frisch",
        generic_names=["Zitrone"],
        description="Frische Zitrone, unbehandelt",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=29.0,
        protein_g=1.1,
        fat_g=0.3,
        fat_sat_g=0.0,
        carbohydrate_g=3.2,
        sugar_g=2.5,
        fibre_g=1.3,
        salt_g=0.0,
        vitamin_c_mg=53.0,
        fruit_factor=1.0,
        price_per_kg=Decimal("3.98"),
        retail_section="Obst",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (120g)", 1.0, 120.0, 1, "stk"),
            PortionSpec("1/2 Stück (60g)", 1.0, 60.0, 2, "stk"),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Zitrone", "Bio-Zitrone"],
    ),
    IngredientSpec(
        canonical_name="Tomate frisch",
        generic_names=["Tomate"],
        description="Frische Strauchtomaten",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=18.0,
        protein_g=0.9,
        fat_g=0.2,
        fat_sat_g=0.0,
        carbohydrate_g=2.6,
        sugar_g=2.6,
        fibre_g=1.2,
        salt_g=0.01,
        vitamin_c_mg=14.0,
        fruit_factor=1.0,
        price_per_kg=Decimal("3.50"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (120g)", 1.0, 120.0, 1, "stk"),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("1 kg", 1000.0, 1000.0, 3),
        ],
        aliases=["Tomate", "Strauchtomaten", "Fleischtomate"],
    ),
    IngredientSpec(
        canonical_name="rote Paprika",
        generic_names=["Paprika"],
        description="Rote Paprikaschote",
        physical_density=0.5,
        physical_viscosity="solid",
        energy_kcal=26.0,
        protein_g=1.0,
        fat_g=0.3,
        fat_sat_g=0.0,
        carbohydrate_g=4.2,
        sugar_g=4.2,
        fibre_g=1.7,
        salt_g=0.0,
        vitamin_c_mg=127.0,
        fruit_factor=1.0,
        price_per_kg=Decimal("3.99"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (150g)", 1.0, 150.0, 1, "stk"),
            PortionSpec("1/2 Stück (75g)", 1.0, 75.0, 2, "stk"),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Paprikaschote rot", "Gemüsepaprika"],
    ),
    IngredientSpec(
        canonical_name="Salatgurke",
        generic_names=["Gurke"],
        description="Frische Salatgurke",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=12.0,
        protein_g=0.7,
        fat_g=0.1,
        fat_sat_g=0.0,
        carbohydrate_g=1.8,
        sugar_g=1.7,
        fibre_g=0.7,
        salt_g=0.01,
        price_per_kg=Decimal("1.59"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (400g)", 1.0, 400.0, 1, "stk"),
            PortionSpec("1/2 Stück (200g)", 1.0, 200.0, 2, "stk"),
            PortionSpec("100g", 100.0, 100.0, 3),
        ],
        aliases=["Gurke", "Schlangengurke"],
    ),
    IngredientSpec(
        canonical_name="frische Möhren",
        generic_names=["Möhren"],
        description="Frische Karotten/Möhren",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=26.0,
        protein_g=0.9,
        fat_g=0.2,
        fat_sat_g=0.0,
        carbohydrate_g=4.8,
        sugar_g=4.7,
        fibre_g=3.6,
        salt_g=0.08,
        price_per_kg=Decimal("1.29"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (100g)", 1.0, 100.0, 1, "stk"),
            PortionSpec("100g", 100.0, 100.0, 2),
            PortionSpec("1 kg", 1000.0, 1000.0, 3),
        ],
        aliases=["Karotten frisch", "Möhren", "Wurzeln", "Gelbrüben"],
    ),
    IngredientSpec(
        canonical_name="frischer Blattspinat",
        generic_names=["Spinat"],
        description="Frischer Blattspinat",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=19.0,
        protein_g=2.9,
        fat_g=0.4,
        fat_sat_g=0.1,
        carbohydrate_g=0.8,
        sugar_g=0.4,
        fibre_g=2.2,
        salt_g=0.1,
        vitamin_c_mg=28.0,
        price_per_kg=Decimal("19.90"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Handvoll (50g)", 50.0, 50.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Spinat frisch", "Blattspinat"],
    ),
    IngredientSpec(
        canonical_name="grüne Zucchini",
        generic_names=["Zucchini"],
        description="Grüne Zucchini",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=16.0,
        protein_g=1.2,
        fat_g=0.3,
        fat_sat_g=0.1,
        carbohydrate_g=2.0,
        sugar_g=1.7,
        fibre_g=1.0,
        salt_g=0.01,
        price_per_kg=Decimal("2.49"),
        retail_section="Gemüse",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Stück (250g)", 1.0, 250.0, 1, "stk"),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Zucchini grün"],
    ),
    IngredientSpec(
        canonical_name="Hähnchenbrustfilet",
        generic_names=["Hähnchen"],
        description="Hähnchenbrustfilet, frisch",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=110.0,
        protein_g=23.0,
        fat_g=1.2,
        fat_sat_g=0.3,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=0.13,
        price_per_kg=Decimal("9.99"),
        retail_section="Fleisch & Wurst",
        nutritional_tags=["laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Portion (150g)", 150.0, 150.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Hähnchenbrust", "Hühnchenbrustfilet"],
    ),
    IngredientSpec(
        canonical_name="Lachsfilet",
        generic_names=["Lachs"],
        description="Lachsfilet, frisch (Aquakultur)",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=208.0,
        protein_g=20.0,
        fat_g=13.0,
        fat_sat_g=2.5,
        carbohydrate_g=0.0,
        sugar_g=0.0,
        fibre_g=0.0,
        salt_g=0.1,
        price_per_kg=Decimal("25.00"),
        retail_section="Fisch & Meeresfrüchte",
        nutritional_tags=["laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Portion (150g)", 150.0, 150.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Lachs frisch", "Lachsfilet frisch"],
    ),
    IngredientSpec(
        canonical_name="Zartbitterschokolade 70% Kakao",
        generic_names=["Schokolade"],
        description="Zartbitterschokolade mit 70% Kakaoanteil",
        physical_density=1.0,
        physical_viscosity="solid",
        energy_kcal=545.0,
        protein_g=8.0,
        fat_g=40.0,
        fat_sat_g=24.0,
        carbohydrate_g=36.0,
        sugar_g=30.0,
        fibre_g=10.0,
        salt_g=0.02,
        price_per_kg=Decimal("7.90"),
        retail_section="Süßwaren",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei"],
        portions=[
            PortionSpec("1 Tafel (100g)", 100.0, 100.0, 1),
            PortionSpec("1 Riegel (25g)", 25.0, 25.0, 2),
        ],
        aliases=["Zartbitterschokolade", "Dunkle Schokolade", "Bitterschokolade"],
    ),
    IngredientSpec(
        canonical_name="Vollkornbrot geschnitten",
        generic_names=["Brot"],
        description="Vollkornbrot, geschnitten",
        physical_density=0.6,
        physical_viscosity="solid",
        energy_kcal=210.0,
        protein_g=8.0,
        fat_g=1.2,
        fat_sat_g=0.2,
        carbohydrate_g=40.0,
        sugar_g=3.5,
        fibre_g=7.0,
        salt_g=1.2,
        price_per_kg=Decimal("2.78"),
        retail_section="Brot & Backwaren",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 Scheibe (50g)", 50.0, 50.0, 1),
            PortionSpec("2 Scheiben (100g)", 100.0, 100.0, 2),
        ],
        aliases=["Vollkornbrot", "Schwarzbrot"],
    ),
    IngredientSpec(
        canonical_name="mittelscharfer Senf",
        generic_names=["Senf"],
        description="Mittelscharfer Tafelsenf",
        physical_density=1.1,
        physical_viscosity="solid",
        energy_kcal=98.0,
        protein_g=6.0,
        fat_g=5.0,
        fat_sat_g=0.3,
        carbohydrate_g=10.0,
        sugar_g=4.0,
        fibre_g=4.0,
        salt_g=4.5,
        price_per_kg=Decimal("3.60"),
        retail_section="Öle & Soßen",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 TL (5g)", 5.0, 5.0, 1),
            PortionSpec("1 EL (10g)", 10.0, 10.0, 2),
        ],
        aliases=["Senf mittelscharf", "Tafelsenf"],
    ),
    IngredientSpec(
        canonical_name="Tomaten-Ketchup",
        generic_names=["Ketchup"],
        description="Klassischer Tomaten-Ketchup",
        physical_density=1.1,
        physical_viscosity="liquid",
        energy_kcal=105.0,
        protein_g=1.5,
        fat_g=0.1,
        fat_sat_g=0.0,
        carbohydrate_g=24.0,
        sugar_g=22.0,
        fibre_g=0.8,
        salt_g=2.5,
        price_per_kg=Decimal("2.98"),
        retail_section="Öle & Soßen",
        nutritional_tags=["vegan", "vegetarisch", "laktosefrei", "glutenfrei", "nussfrei", "eifrei", "sojafrei"],
        portions=[
            PortionSpec("1 EL (20g)", 20.0, 20.0, 1),
            PortionSpec("100g", 100.0, 100.0, 2),
        ],
        aliases=["Ketchup", "Tomatenketchup"],
    ),
]


def get_all_specs(data_dir: str = "") -> list[IngredientSpec]:
    """Get the complete list of ingredient specs (staples + extracted)."""
    specs = list(STAPLE_SPECS)
    if data_dir:
        extracted = extract_specs_from_fixtures(data_dir, max_specs=500 - len(specs))
        specs.extend(extracted)
    return specs
