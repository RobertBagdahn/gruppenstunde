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


class NutritionalTagIn(Schema):
    """Input schema for creating/updating a nutritional tag."""

    name: str
    name_opposite: str = ""
    description: str = ""
    rank: int = 1
    is_dangerous: bool = False


class NutritionalTagUpdateIn(Schema):
    """Partial update schema for a nutritional tag."""

    name: str | None = None
    name_opposite: str | None = None
    description: str | None = None
    rank: int | None = None
    is_dangerous: bool | None = None


class RetailSectionOut(Schema):
    """Output schema for a retail section."""

    id: int
    name: str
    description: str
    rank: int


class RetailSectionIn(Schema):
    """Input schema for creating/updating a retail section."""

    name: str
    description: str = ""
    rank: int = 0


class RetailSectionUpdateIn(Schema):
    """Partial update schema for a retail section."""

    name: str | None = None
    description: str | None = None
    rank: int | None = None


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
    vitamin_c_mg: float | None
