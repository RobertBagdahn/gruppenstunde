"""Pydantic schemas for Material and ContentMaterialItem."""

from datetime import datetime

from ninja import Schema


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
    created_at: datetime

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class MaterialCreateIn(Schema):
    """Input schema for creating a material."""

    name: str
    description: str = ""
    material_category: str = "other"
    is_consumable: bool = False


class MaterialUpdateIn(Schema):
    """Input schema for updating a material."""

    name: str | None = None
    description: str | None = None
    material_category: str | None = None
    is_consumable: bool | None = None


class MaterialListOut(Schema):
    """Compact material for list views."""

    id: int
    name: str
    slug: str
    material_category: str
    is_consumable: bool


class ContentMaterialItemOut(Schema):
    """Output schema for a material assigned to content."""

    id: int
    material_id: int
    material_name: str
    material_slug: str
    material_category: str
    quantity: str
    quantity_type: str
    sort_order: int


class ContentMaterialItemIn(Schema):
    """Input schema for assigning material to content."""

    material_id: int
    quantity: str = ""
    quantity_type: str = "once"
    sort_order: int = 0


class PaginatedMaterialOut(Schema):
    """Paginated material response."""

    items: list[MaterialOut]
    total: int
    page: int
    page_size: int
    total_pages: int
