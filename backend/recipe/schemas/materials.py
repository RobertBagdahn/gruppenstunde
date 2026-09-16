"""Pydantic schemas for recipe materials (ContentMaterialItem links)."""

from ninja import Schema


class RecipeMaterialOut(Schema):
    """Material linked to a recipe via ContentMaterialItem."""

    id: int
    material_id: int
    material_name: str
    material_slug: str
    material_category: str
    quantity: str
    sort_order: int

    @staticmethod
    def resolve_material_id(obj) -> int:
        return obj.material_id

    @staticmethod
    def resolve_material_name(obj) -> str:
        return obj.material.name

    @staticmethod
    def resolve_material_slug(obj) -> str:
        return obj.material.slug

    @staticmethod
    def resolve_material_category(obj) -> str:
        return obj.material.material_category


class RecipeMaterialCreateIn(Schema):
    """Input for linking a material to a recipe."""

    material_id: int
    quantity: str = ""


class RecipeMaterialUpdateIn(Schema):
    """Input for updating a recipe material link."""

    quantity: str | None = None
    sort_order: int | None = None


class RecipeMaterialReorderIn(Schema):
    """Input for reordering recipe material links."""

    item_ids: list[int]


class AiMaterialSuggestionOut(Schema):
    """Single AI-suggested recipe material with match status."""

    material_id: int | None = None
    suggested_name: str
    quantity: str = ""
    matched_name: str | None = None
    is_new: bool = False


class AiMaterialSuggestionsOut(Schema):
    """Wrapper for AI-suggested recipe materials including interaction id."""

    items: list[AiMaterialSuggestionOut]
    ai_interaction_id: str | None = None


class AiMaterialApplyIn(Schema):
    """Input for applying a matched AI material suggestion."""

    material_id: int
    quantity: str = ""
