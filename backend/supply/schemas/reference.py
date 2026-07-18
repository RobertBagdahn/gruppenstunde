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


class IngredientGroupOut(Schema):
    """Output schema for an ingredient group."""

    id: int
    name: str
    slug: str


class EquipmentOut(Schema):
    """Output schema for kitchen equipment."""

    id: int
    name: str
    slug: str
    sort_order: int

    class Config:
        from_attributes = True


class EquipmentIn(Schema):
    """Input schema for creating/updating equipment."""

    name: str
    sort_order: int = 0
