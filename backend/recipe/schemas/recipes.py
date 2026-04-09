"""Recipe and recipe list schemas."""

import datetime as dt

from ninja import Schema

from content.base_schemas import (
    ContentCreateIn,
    ContentDetailOut,
    ContentListOut,
    ContentSimilarOut,
    ContentUpdateIn,
)
from .items import RecipeItemCreateIn, RecipeItemOut


# --- Reuse NutritionalTag schema ---


class NutritionalTagOut(Schema):
    id: int
    name: str
    name_opposite: str
    description: str
    rank: int
    is_dangerous: bool


# --- Recipe List Schema (extends ContentListOut) ---


class RecipeListOut(ContentListOut):
    """Schema for recipe list (compact)."""

    recipe_type: str
    servings: int | None
    cached_energy_kj: float | None = None
    cached_protein_g: float | None = None
    cached_fat_g: float | None = None
    cached_carbohydrate_g: float | None = None
    cached_sugar_g: float | None = None
    cached_fibre_g: float | None = None
    cached_salt_g: float | None = None
    cached_nutri_class: int | None = None
    cached_price_total: float | None = None
    cached_at: dt.datetime | None = None


# --- Similar Recipes ---


class RecipeSimilarOut(ContentSimilarOut):
    """Compact schema for similar recipes."""

    pass


# --- Recipe Detail Schema (extends ContentDetailOut) ---


class RecipeDetailOut(ContentDetailOut):
    """Schema for single recipe detail."""

    recipe_type: str
    servings: int | None
    cached_energy_kj: float | None = None
    cached_protein_g: float | None = None
    cached_fat_g: float | None = None
    cached_carbohydrate_g: float | None = None
    cached_sugar_g: float | None = None
    cached_fibre_g: float | None = None
    cached_salt_g: float | None = None
    cached_nutri_class: int | None = None
    cached_price_total: float | None = None
    cached_at: dt.datetime | None = None
    nutritional_tags: list[NutritionalTagOut] = []
    recipe_items: list[RecipeItemOut] = []
    next_best_recipes: list[RecipeSimilarOut] = []

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


# --- Recipe Create / Update Schemas (extend Content base) ---


class RecipeCreateIn(ContentCreateIn):
    """Schema for creating a recipe."""

    recipe_type: str = ""
    servings: int = 1
    nutritional_tag_ids: list[int] = []
    recipe_items: list[RecipeItemCreateIn] = []
    # Bot protection fields
    website: str = ""  # honeypot – must be empty
    form_loaded_at: float = 0  # JS timestamp – must be > 5s ago


class RecipeUpdateIn(ContentUpdateIn):
    """Schema for updating a recipe."""

    recipe_type: str | None = None
    servings: int | None = None
    nutritional_tag_ids: list[int] | None = None
    recipe_items: list[RecipeItemCreateIn] | None = None


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
