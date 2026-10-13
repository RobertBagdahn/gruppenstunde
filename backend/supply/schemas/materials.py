"""Pydantic schemas for Material and ContentMaterialItem."""

from datetime import datetime
from typing import cast

from ninja import Schema
from pydantic import Field


class MaterialOut(Schema):
    """Material output schema."""

    id: int
    name: str
    slug: str
    description: str
    material_category: str
    is_consumable: bool
    image_url: str | None
    purchase_links: list
    package_size: float | None = None
    package_unit: str = "Stück"
    price_per_package: float | None = None
    price_per_piece: float | None = None
    retail_section_id: int | None = None
    retail_section_name: str | None = None
    created_at: datetime
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return cast(str, obj.image.url)
        return None

    @staticmethod
    def resolve_price_per_package(obj) -> float | None:
        return float(obj.price_per_package) if obj.price_per_package is not None else None

    @staticmethod
    def resolve_retail_section_name(obj) -> str | None:
        return obj.retail_section.name if obj.retail_section_id else None


class MaterialCreateIn(Schema):
    """Input schema for creating a material."""

    name: str
    description: str = ""
    material_category: str = "other"
    is_consumable: bool = False
    package_size: float | None = Field(None, gt=0)
    package_unit: str = "Stück"
    price_per_package: float | None = Field(None, ge=0)
    retail_section_id: int | None = None


class MaterialUpdateIn(Schema):
    """Input schema for updating a material."""

    name: str | None = None
    description: str | None = None
    material_category: str | None = None
    is_consumable: bool | None = None
    package_size: float | None = Field(None, gt=0)
    package_unit: str | None = None
    price_per_package: float | None = Field(None, ge=0)
    retail_section_id: int | None = None


class MaterialMergeIn(Schema):
    """Input schema for merging a material into another one."""

    target_id: int


class MaterialListOut(Schema):
    """Compact material for list views."""

    id: int
    name: str
    slug: str
    material_category: str
    is_consumable: bool
    package_size: float | None = None
    package_unit: str = "Stück"
    price_per_piece: float | None = None
    can_edit: bool = False
    can_delete: bool = False


class ContentMaterialItemOut(Schema):
    """Output schema for a material assigned to content."""

    id: int
    material_id: int
    material_name: str
    material_slug: str
    material_category: str
    quantity: str
    sort_order: int


class ContentMaterialItemIn(Schema):
    """Input schema for assigning material to content."""

    material_id: int
    quantity: str = ""
    sort_order: int = 0


class PaginatedMaterialOut(Schema):
    """Paginated material response."""

    items: list[MaterialOut]
    total: int
    page: int
    page_size: int
    total_pages: int
