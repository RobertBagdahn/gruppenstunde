"""Recipe and recipe list schemas."""

import datetime as dt

from ninja import Schema

from content.base_schemas import (
    ContentCreateIn,
    ContentDetailOut,
    ContentListOut,
    ContentUpdateIn,
)

from .items import RecipeItemCreateIn, RecipeItemOut
from .steps import RecipeStepOut

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
    portions: int | None
    cached_energy_kcal: float | None = None
    cached_protein_g: float | None = None
    cached_fat_g: float | None = None
    cached_carbohydrate_g: float | None = None
    cached_sugar_g: float | None = None
    cached_fibre_g: float | None = None
    cached_salt_g: float | None = None
    cached_nutri_class: int | None = None
    cached_price_total: float | None = None
    cached_at: dt.datetime | None = None
    # Cached micronutrients
    cached_vitamin_c_mg: float | None = None
    owner_name: str | None = None
    forked_from_title: str | None = None
    visibility: str | None = None
    shared_group_ids: list[int] = []
    source_url: str = ""
    recipe_badge: str | None = None  # "verified" | "community" | "personal"

    @staticmethod
    def resolve_owner_name(obj) -> str | None:
        if obj.owner_id:
            owner = obj.owner
            profile = getattr(owner, "profile", None)
            if profile:
                return profile.scout_name or profile.full_name or owner.first_name or None
            return owner.first_name or None
        return None

    @staticmethod
    def resolve_forked_from_title(obj) -> str | None:
        if obj.forked_from_id:
            return obj.forked_from.title if obj.forked_from else None
        return None

    @staticmethod
    def resolve_recipe_badge(obj) -> str | None:
        if obj.owner_id is None:
            return "verified"
        if obj.visibility == "public" and obj.status == "approved":
            return "community"
        return "personal"

    @staticmethod
    def resolve_shared_group_ids(obj) -> list:
        """Return list of shared group IDs."""
        return list(obj.shared_groups.values_list("id", flat=True))


# --- Similar Recipes ---


class RecipeSimilarOut(Schema):
    """Compact schema for similar recipes (embedding-based)."""

    id: int
    title: str
    slug: str
    distance: float


# --- Recipe Detail Schema (extends ContentDetailOut) ---


class RecipeDetailOut(ContentDetailOut):
    """Schema for single recipe detail."""

    recipe_type: str
    portions: int | None
    cached_energy_kcal: float | None = None
    cached_protein_g: float | None = None
    cached_fat_g: float | None = None
    cached_carbohydrate_g: float | None = None
    cached_sugar_g: float | None = None
    cached_fibre_g: float | None = None
    cached_salt_g: float | None = None
    cached_nutri_class: int | None = None
    cached_price_total: float | None = None
    cached_at: dt.datetime | None = None
    # Cached micronutrients
    cached_vitamin_c_mg: float | None = None
    cached_weight_g: float | None = None
    # Personal recipe fields
    owner_name: str | None = None
    forked_from_title: str | None = None
    forked_from_slug: str | None = None
    visibility: str | None = None
    shared_group_ids: list[int] = []
    shared_groups: list[dict] = []  # { id, name }
    source_url: str = ""
    recipe_badge: str | None = None  # "verified" | "community" | "personal"
    is_owner: bool = False
    usage_in_meal_plans_count: int = 0
    nutritional_tags: list[NutritionalTagOut] = []
    recipe_items: list[RecipeItemOut] = []
    has_structured_steps: bool = False
    steps: list[RecipeStepOut] = []
    steps_count: int = 0
    next_best_recipes: list[RecipeSimilarOut] = []

    @staticmethod
    def resolve_owner_name(obj) -> str | None:
        if obj.owner_id:
            owner = obj.owner
            profile = getattr(owner, "profile", None)
            if profile:
                return profile.scout_name or profile.full_name or owner.first_name or None
            return owner.first_name or None
        return None

    @staticmethod
    def resolve_forked_from_title(obj) -> str | None:
        if obj.forked_from_id:
            return obj.forked_from.title if obj.forked_from else None
        return None

    @staticmethod
    def resolve_forked_from_slug(obj) -> str | None:
        if obj.forked_from_id:
            return obj.forked_from.slug if obj.forked_from else None
        return None

    @staticmethod
    def resolve_recipe_badge(obj) -> str | None:
        if obj.owner_id is None:
            return "verified"
        if obj.visibility == "public" and obj.status == "approved":
            return "community"
        return "personal"

    @staticmethod
    def resolve_shared_groups(obj) -> list:
        """Return shared groups with id and name."""
        return [{"id": g.id, "name": g.name} for g in obj.shared_groups.all()]

    @staticmethod
    def resolve_shared_group_ids(obj) -> list:
        """Return list of shared group IDs for convenience."""
        return list(obj.shared_groups.values_list("id", flat=True))

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
                        "slug": profile.slug if profile else None,
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
        merged = {}
        for t in list(obj.nutritional_tags.all()) + list(obj.manual_nutritional_tags.all()):
            merged[t.id] = {
                "id": t.id,
                "name": t.name,
                "name_opposite": t.name_opposite,
                "description": t.description,
                "rank": t.rank,
                "is_dangerous": t.is_dangerous,
            }
        return list(merged.values())

    @staticmethod
    def resolve_usage_in_meal_plans_count(obj) -> int:
        """Count how many visible meal plans use this recipe."""
        from planner.models import MealItem

        # Count distinct meal plans that use this recipe
        # Only count meal plans visible to the requesting user (simplified: public/approved)
        return MealItem.objects.filter(recipe=obj).values("meal__meal_plan").distinct().count()

    @staticmethod
    def resolve_has_structured_steps(obj) -> bool:
        """Check if recipe has structured steps."""
        if hasattr(obj, 'steps'):
            return obj.steps.exists()
        return False

    @staticmethod
    def resolve_steps(obj) -> list:
        """Get all recipe steps ordered by sort_order."""
        if hasattr(obj, 'steps'):
            return list(obj.steps.all().order_by('sort_order'))
        return []

    @staticmethod
    def resolve_steps_count(obj) -> int:
        """Get count of structured recipe steps."""
        if hasattr(obj, 'steps'):
            return obj.steps.count()
        return 0


# --- Recipe Create / Update Schemas (extend Content base) ---


class RecipeCreateIn(ContentCreateIn):
    """Schema for creating a recipe."""

    recipe_type: str = ""
    portions: int = 1
    nutritional_tag_ids: list[int] = []
    recipe_items: list[RecipeItemCreateIn] = []
    # Ownership & Sharing (for breakfast wizard)
    shared_group_ids: list[int] = []
    # Bot protection fields
    website: str = ""  # honeypot – must be empty
    form_loaded_at: float = 0  # JS timestamp – must be > 5s ago


class RecipeUpdateIn(ContentUpdateIn):
    """Schema for updating a recipe.
    
    Staff-only fields (status, source_url, authors_ids):
    Non-staff attempts to modify these will be rejected with 403 Forbidden.
    """

    recipe_type: str | None = None
    portions: int | None = None
    nutritional_tag_ids: list[int] | None = None
    recipe_items: list[RecipeItemCreateIn] | None = None
    # Ownership & Sharing
    shared_group_ids: list[int] | None = None
    # Staff-only fields
    status: str | None = None
    source_url: str | None = None
    authors_ids: list[int] | None = None


# --- Search/Filter ---


class RecipeFilterIn(Schema):
    q: str | None = None
    recipe_type: str | None = None
    scout_level_ids: list[int] | None = None
    tag_slugs: list[str] | None = None
    difficulty: str | None = None
    costs_min: float | None = None
    costs_max: float | None = None
    execution_time: str | None = None
    origin: str | None = None  # "all" | "verified" | "community" | "mine"
    sort: str = "newest"
    page: int = 1
    page_size: int = 20


class ForkRecipeIn(Schema):
    """Schema for forking/cloning a recipe with optional new title."""

    title: str | None = None


class VisibilityUpdateIn(Schema):
    """Schema for updating recipe visibility."""

    visibility: str  # "private" | "group" | "public"


# --- Pagination ---


class PaginatedRecipeOut(Schema):
    items: list[RecipeListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedRecipeSimilarOut(Schema):
    """Paginated list of similar recipes for ingredient detail page."""

    items: list[RecipeSimilarOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- AI Suggest schemas ---


class RecipeSuggestAllOut(Schema):
    """Response schema for AI-powered recipe metadata suggestions."""

    description: str | None = None
    difficulty: str | None = None
    duration_minutes: int | None = None
    portions: int | None = None
    recipe_type: str | None = None
    scout_levels: list[str] = []
    tags: list[str] = []


class RecipeAiCreateIn(Schema):
    """Input for AI recipe creation."""

    prompt: str
