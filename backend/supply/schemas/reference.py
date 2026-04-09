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
