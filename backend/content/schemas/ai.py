"""
AI-related schemas (extracted from api.py inline schemas).
"""

from ninja import Schema


class AiImproveTextIn(Schema):
    text: str
    context: str = ""


class AiImproveTextOut(Schema):
    improved_text: str


class AiSuggestTagsIn(Schema):
    title: str = ""
    description: str = ""


class AiSuggestTagsOut(Schema):
    tag_ids: list[int]
    tag_names: list[str]


class AiRefurbishIn(Schema):
    raw_text: str
    content_type: str = "session"  # session, blog, game, recipe


class SuggestedTagOut(Schema):
    id: int
    name: str
    slug: str
    icon: str = ""
    sort_order: int = 0
    parent_id: int | None = None
    parent_name: str | None = None


class SuggestedMaterialOut(Schema):
    quantity: str
    material_name: str
    material_unit: str


class AiRefurbishOut(Schema):
    title: str
    summary: str
    summary_long: str
    description: str
    content_type: str = "session"
    suggested_tag_ids: list[int]
    suggested_tag_names: list[str]
    suggested_tags: list[SuggestedTagOut] = []
    costs_rating: str
    execution_time: str
    preparation_time: str
    difficulty: str
    suggested_scout_level_ids: list[int] = []
    suggested_materials: list[SuggestedMaterialOut] = []
    location: str = ""
    season: str = ""
    image_prompt: str = ""
    processing_time_seconds: float = 0


class AiErrorOut(Schema):
    detail: str
    error_code: str


class AiGenerateImageIn(Schema):
    prompt: str
    title: str = ""
    summary: str = ""
    content_type: str = "session"


class AiGenerateImageOut(Schema):
    image_urls: list[str] = []


class AiSuggestSuppliesIn(Schema):
    title: str
    description: str = ""
    content_type: str = "session"  # session, game, recipe


class AiMaterialSuggestionOut(Schema):
    name: str
    quantity: str = "1"
    unit: str = "Stück"
    category: str = "other"
    is_consumable: bool = False
    material_id: int | None = None
    material_slug: str | None = None
    matched_name: str | None = None


class AiIngredientSuggestionOut(Schema):
    name: str
    quantity: str = "100"
    unit: str = "g"
    ingredient_id: int | None = None
    ingredient_slug: str | None = None
    matched_name: str | None = None


class AiSuggestSuppliesOut(Schema):
    materials: list[AiMaterialSuggestionOut] = []
    ingredients: list[AiIngredientSuggestionOut] = []
    kitchen_equipment: list[AiMaterialSuggestionOut] = []
