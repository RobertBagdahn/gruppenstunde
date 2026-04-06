"""Pydantic schemas for the Recipe API (Django Ninja)."""

from datetime import datetime

from ninja import Schema


# --- Reuse Tag/ScoutLevel schemas from idea app ---


class TagOut(Schema):
    id: int
    name: str
    slug: str
    icon: str
    sort_order: int
    parent_id: int | None
    parent_name: str | None = None

    class Config:
        from_attributes = True


class ScoutLevelOut(Schema):
    id: int
    name: str
    icon: str


class NutritionalTagOut(Schema):
    id: int
    name: str
    name_opposite: str
    description: str
    rank: int
    is_dangerous: bool


# --- Author Schema ---


class RecipeAuthorOut(Schema):
    id: int | None = None
    display_name: str
    scout_name: str = ""
    profile_picture_url: str | None = None
    is_registered: bool = False


# --- RecipeItem Schemas ---


class RecipeItemOut(Schema):
    id: int
    portion_id: int | None = None
    portion_name: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str | None = None
    quantity: float
    measuring_unit_id: int | None = None
    measuring_unit_name: str | None = None
    sort_order: int
    note: str
    quantity_type: str

    @staticmethod
    def resolve_portion_name(obj) -> str | None:
        if obj.portion:
            return str(obj.portion)
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str | None:
        if obj.ingredient:
            return obj.ingredient.name
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.name
        return None

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        if obj.ingredient_id:
            return obj.ingredient_id
        if obj.portion and obj.portion.ingredient_id:
            return obj.portion.ingredient_id
        return None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        if obj.measuring_unit:
            return obj.measuring_unit.name
        if obj.portion and obj.portion.measuring_unit:
            return obj.portion.measuring_unit.name
        return None

    @staticmethod
    def resolve_measuring_unit_id(obj) -> int | None:
        if obj.measuring_unit_id:
            return obj.measuring_unit_id
        if obj.portion and obj.portion.measuring_unit_id:
            return obj.portion.measuring_unit_id
        return None


class RecipeItemCreateIn(Schema):
    portion_id: int | None = None
    ingredient_id: int | None = None
    quantity: float = 1
    measuring_unit_id: int | None = None
    sort_order: int = 0
    note: str = ""
    quantity_type: str = "once"


class RecipeItemUpdateIn(Schema):
    portion_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    sort_order: int | None = None
    note: str | None = None
    quantity_type: str | None = None


# --- Recipe Schemas ---


class RecipeListOut(Schema):
    """Schema for recipe list (compact)."""

    id: int
    title: str
    slug: str
    recipe_type: str
    summary: str
    costs_rating: str
    execution_time: str
    difficulty: str
    image_url: str | None
    like_score: int
    view_count: int
    servings: int | None
    created_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]


class RecipeSimilarOut(Schema):
    """Compact schema for similar recipes."""

    id: int
    title: str
    slug: str
    summary: str
    image_url: str | None
    difficulty: str
    execution_time: str

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None


class RecipeDetailOut(Schema):
    """Schema for single recipe detail."""

    id: int
    title: str
    slug: str
    recipe_type: str
    summary: str
    summary_long: str
    description: str
    costs_rating: str
    execution_time: str
    preparation_time: str
    difficulty: str
    status: str
    image_url: str | None
    like_score: int
    view_count: int
    servings: int | None
    created_at: datetime
    updated_at: datetime
    scout_levels: list[ScoutLevelOut]
    tags: list[TagOut]
    nutritional_tags: list[NutritionalTagOut] = []
    recipe_items: list[RecipeItemOut] = []
    authors: list[RecipeAuthorOut] = []
    emotion_counts: dict[str, int] = {}
    user_emotion: str | None = None
    can_edit: bool = False
    next_best_recipes: list[RecipeSimilarOut] = []

    @staticmethod
    def resolve_image_url(obj) -> str | None:
        if obj.image:
            return obj.image.url
        return None

    @staticmethod
    def resolve_authors(obj) -> list:
        authors = obj.authors.select_related("profile").all()
        if authors:
            result = []
            for user in authors:
                profile = getattr(user, "profile", None)
                display = ""
                scout_name = ""
                pic_url = None
                if profile:
                    scout_name = profile.scout_name or ""
                    display = scout_name or profile.full_name or user.first_name or user.email.split("@")[0]
                    if profile.profile_picture:
                        pic_url = profile.profile_picture.url
                else:
                    display = user.first_name or user.email.split("@")[0]
                result.append(
                    {
                        "id": user.id,
                        "display_name": display,
                        "scout_name": scout_name,
                        "profile_picture_url": pic_url,
                        "is_registered": True,
                    }
                )
            return result
        # Fallback: use created_by
        if obj.created_by_id:
            user = obj.created_by
            profile = getattr(user, "profile", None)
            display = ""
            scout_name = ""
            pic_url = None
            if profile:
                scout_name = profile.scout_name or ""
                display = scout_name or profile.full_name or user.first_name or user.email.split("@")[0]
                if profile.profile_picture:
                    pic_url = profile.profile_picture.url
            else:
                display = user.first_name or user.email.split("@")[0]
            return [
                {
                    "id": user.id,
                    "display_name": display,
                    "scout_name": scout_name,
                    "profile_picture_url": pic_url,
                    "is_registered": True,
                }
            ]
        return []

    @staticmethod
    def resolve_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "slug": t.slug,
                "icon": t.icon,
                "sort_order": t.sort_order,
                "parent_id": t.parent_id,
                "parent_name": t.parent.name if t.parent else None,
            }
            for t in obj.tags.select_related("parent").all()
        ]

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "name_opposite": t.name_opposite,
                "description": t.description,
                "rank": t.rank,
                "is_dangerous": t.is_dangerous,
            }
            for t in obj.nutritional_tags.all()
        ]

    @staticmethod
    def resolve_recipe_items(obj) -> list:
        return [
            {
                "id": ri.id,
                "portion_id": ri.portion_id,
                "portion_name": str(ri.portion) if ri.portion else None,
                "ingredient_id": ri.ingredient_id,
                "ingredient_name": ri.ingredient.name if ri.ingredient else None,
                "quantity": ri.quantity,
                "measuring_unit_id": ri.measuring_unit_id,
                "measuring_unit_name": ri.measuring_unit.name if ri.measuring_unit else None,
                "sort_order": ri.sort_order,
                "note": ri.note,
                "quantity_type": ri.quantity_type,
            }
            for ri in obj.recipe_items.select_related("portion", "ingredient", "measuring_unit").all()
        ]


class RecipeCreateIn(Schema):
    """Schema for creating a recipe."""

    title: str
    summary: str = ""
    summary_long: str = ""
    description: str = ""
    recipe_type: str = ""
    servings: int = 4
    costs_rating: str = "free"
    execution_time: str = "less_30"
    preparation_time: str = "none"
    difficulty: str = "easy"
    scout_level_ids: list[int] = []
    tag_ids: list[int] = []
    nutritional_tag_ids: list[int] = []
    recipe_items: list[RecipeItemCreateIn] = []
    # Bot protection fields
    website: str = ""  # honeypot – must be empty
    form_loaded_at: float = 0  # JS timestamp – must be > 5s ago


class RecipeUpdateIn(Schema):
    """Schema for updating a recipe."""

    title: str | None = None
    summary: str | None = None
    summary_long: str | None = None
    description: str | None = None
    recipe_type: str | None = None
    servings: int | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    preparation_time: str | None = None
    difficulty: str | None = None
    status: str | None = None
    scout_level_ids: list[int] | None = None
    tag_ids: list[int] | None = None
    nutritional_tag_ids: list[int] | None = None
    recipe_items: list[RecipeItemCreateIn] | None = None


# --- Comment Schemas ---


class RecipeCommentOut(Schema):
    id: int
    text: str
    author_name: str
    user_id: int | None
    created_at: datetime
    parent_id: int | None
    status: str


class RecipeCommentIn(Schema):
    text: str
    author_name: str = ""
    parent_id: int | None = None


# --- Emotion Schemas ---


class RecipeEmotionOut(Schema):
    id: int
    emotion_type: str
    created_at: datetime


class RecipeEmotionIn(Schema):
    emotion_type: str


# --- Search/Filter ---


class RecipeFilterIn(Schema):
    q: str | None = None
    recipe_type: str | None = None
    scout_level_ids: list[int] | None = None
    tag_slugs: list[str] | None = None
    difficulty: str | None = None
    costs_rating: str | None = None
    execution_time: str | None = None
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


# --- Pagination ---


class PaginatedRecipeOut(Schema):
    items: list[RecipeListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Recipe Hint Schemas ---


class RecipeHintOut(Schema):
    id: int
    name: str
    description: str
    parameter: str
    min_value: float | None
    max_value: float | None
    min_max: str
    hint_level: str
    recipe_type: str
    recipe_objective: str


class RecipeHintMatchOut(Schema):
    """A hint that matched against recipe nutritional values."""

    hint: RecipeHintOut
    actual_value: float
    message: str


class RecipeCheckOut(Schema):
    """Recipe check result for one dimension."""

    label: str
    value: str
    color: str
    score: float


class NutriScoreDetailOut(Schema):
    """Detailed Nutri-Score breakdown."""

    negative_points: int
    positive_points: int
    total_points: int
    nutri_class: int
    nutri_label: str
    details: dict = {}


class RecipeItemNutritionOut(Schema):
    """Nutritional breakdown for a single recipe item."""

    recipe_item_id: int
    ingredient_id: int | None
    ingredient_name: str
    quantity: float
    portion_name: str
    weight_g: float
    price_eur: float | None
    energy_kj: float
    energy_kcal: float
    protein_g: float
    fat_g: float
    fat_sat_g: float
    carbohydrate_g: float
    sugar_g: float
    fibre_g: float
    salt_g: float
    weight_pct: float  # percentage of total recipe weight


class RecipeNutritionBreakdownOut(Schema):
    """Complete nutritional breakdown for a recipe."""

    total_weight_g: float
    total_price_eur: float | None
    total_energy_kj: float
    total_energy_kcal: float
    total_protein_g: float
    total_fat_g: float
    total_fat_sat_g: float
    total_carbohydrate_g: float
    total_sugar_g: float
    total_fibre_g: float
    total_salt_g: float
    per_serving_energy_kcal: float | None
    per_serving_protein_g: float | None
    per_serving_fat_g: float | None
    per_serving_carbohydrate_g: float | None
    items: list[RecipeItemNutritionOut]
