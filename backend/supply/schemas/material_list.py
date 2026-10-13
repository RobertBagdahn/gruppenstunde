"""Pydantic schemas for the (unsaved) material list."""

from ninja import Schema


class MaterialListRecipeOut(Schema):
    id: int
    title: str
    slug: str
    amount: float


class MaterialListEntryOut(Schema):
    material_id: int
    name: str
    slug: str
    is_consumable: bool
    amount: float
    price_per_piece: float | None = None
    cost: float | None = None
    recipes: list[MaterialListRecipeOut]


class MaterialListResultOut(Schema):
    title: str
    devices: list[MaterialListEntryOut]
    consumables: list[MaterialListEntryOut]
    total_cost: float
