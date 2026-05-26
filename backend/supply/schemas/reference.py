"""Pydantic schemas for reference/lookup models."""

from ninja import Schema


class MeasuringUnitOut(Schema):
    """Output schema for a measuring unit."""

    id: int
    name: str
    description: str
    quantity: float
    unit: str


class NutritionalTagOut(Schema):
    """Output schema for a nutritional tag."""

    id: int
    name: str
    name_opposite: str
    description: str
    rank: int
    is_dangerous: bool


class RetailSectionOut(Schema):
    """Output schema for a retail section."""

    id: int
    name: str
    description: str
    rank: int


class DgeReferenceOut(Schema):
    """Output schema for a DGE reference value entry."""

    id: int
    age_min: int
    age_max: int
    gender: str
    # Macronutrients
    energy_kj: float | None
    protein_g: float | None
    fat_g: float | None
    carbohydrate_g: float | None
    fibre_g: float | None
    # Max limits
    sugar_g_max: float | None
    salt_g_max: float | None
    fat_sat_g_max: float | None
    sodium_mg_max: float | None
    # Vitamins
    vitamin_a_mg: float | None
    vitamin_b1_mg: float | None
    vitamin_b2_mg: float | None
    vitamin_b6_mg: float | None
    vitamin_b12_ug: float | None
    vitamin_c_mg: float | None
    vitamin_d_ug: float | None
    vitamin_e_mg: float | None
    vitamin_k_ug: float | None
    niacin_mg: float | None
    folate_ug: float | None
    pantothenic_acid_mg: float | None
    biotin_ug: float | None
    # Minerals
    calcium_mg: float | None
    iron_mg: float | None
    magnesium_mg: float | None
    zinc_mg: float | None
    potassium_mg: float | None
    phosphorus_mg: float | None
    iodine_ug: float | None
    selenium_ug: float | None
    copper_mg: float | None
    manganese_mg: float | None
    chromium_ug: float | None
    fluoride_mg: float | None
