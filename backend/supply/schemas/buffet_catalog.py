"""Schemas for the buffet catalog grouped by role."""

from typing import Literal

from ninja import Schema


class BuffetCatalogItemOut(Schema):
    kind: Literal["ingredient", "recipe"]
    id: int
    name: str
    energy_kcal_per_100g: float | None = None
    price_per_kg: float | None = None
    weight_per_serving_g: float | None = None
    default_selected: bool = False


class BuffetCatalogRoleInfoOut(Schema):
    slug: str
    name: str
    icon: str = ""


class BuffetCatalogRoleOut(Schema):
    role: BuffetCatalogRoleInfoOut
    amount_per_person: float | None = None
    unit: Literal["g", "ml"] | None = None
    enabled_by_default: bool = True
    items: list[BuffetCatalogItemOut] = []


class BuffetCatalogOut(Schema):
    template_slug: str | None = None
    roles: list[BuffetCatalogRoleOut] = []
    gram_unit_id: int | None = None
    ml_unit_id: int | None = None
