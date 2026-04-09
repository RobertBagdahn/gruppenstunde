"""Recipe CRUD, image upload, similar recipes, comments, and emotions."""

import logging
import time

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from content.base_api import (
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    get_emotion_counts,
    get_user_emotion,
    paginate_queryset,
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    PaginatedRecipeOut,
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeFilterIn,
    RecipeListOut,
    RecipeSimilarOut,
    RecipeUpdateIn,
)

logger = logging.getLogger(__name__)

router = Router()


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _can_edit_recipe(request, recipe: Recipe) -> bool:
    """Check if user can edit this recipe."""
    if not request.user.is_authenticated:
        return False
    if request.user.is_staff:
        return True
    if recipe.created_by_id == request.user.id:
        return True
    if recipe.authors.filter(id=request.user.id).exists():
        return True
    return False


# ==========================================================================
# Recipe CRUD
# ==========================================================================


@router.get("/", response=PaginatedRecipeOut)
def list_recipes(request, filters: Query[RecipeFilterIn]):
    """List recipes with pagination and filters."""
    qs = Recipe.objects.filter(status="approved").prefetch_related("scout_levels", "tags__parent", "authors")

    # Show drafts to authenticated users
    if request.user.is_authenticated:
        if request.user.is_staff:
            qs = Recipe.objects.all().prefetch_related("scout_levels", "tags__parent", "authors")
        else:
            qs = Recipe.objects.filter(Q(status="approved") | Q(created_by=request.user)).prefetch_related(
                "scout_levels", "tags__parent", "authors"
            )

    if filters.q:
        qs = qs.filter(
            Q(title__icontains=filters.q) | Q(summary__icontains=filters.q) | Q(description__icontains=filters.q)
        )

    if filters.recipe_type:
        qs = qs.filter(recipe_type=filters.recipe_type)

    if filters.scout_level_ids:
        qs = qs.filter(scout_levels__id__in=filters.scout_level_ids).distinct()

    if filters.tag_slugs:
        for slug in filters.tag_slugs:
            qs = qs.filter(tags__slug=slug)

    if filters.difficulty:
        qs = qs.filter(difficulty=filters.difficulty)

    if filters.costs_rating:
        qs = qs.filter(costs_rating=filters.costs_rating)

    if filters.execution_time:
        qs = qs.filter(execution_time=filters.execution_time)

    # Sorting
    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "most_liked": "-like_score",
        "popular": "-view_count",
    }
    order = sort_map.get(filters.sort, "-created_at")
    if filters.sort == "random":
        qs = qs.order_by("?")
    else:
        qs = qs.order_by(order)

    result = paginate_queryset(qs, filters.page, filters.page_size)
    enrich_list_with_permissions(request, result["items"])
    return result


@router.get("/{recipe_id}/", response=RecipeDetailOut)
def get_recipe(request, recipe_id: int):
    """Get recipe detail by ID."""
    recipe = get_object_or_404(
        Recipe.objects.prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient__portions__measuring_unit",
            "recipe_items__portion__measuring_unit",
            "recipe_items__ingredient__portions__measuring_unit",
            "recipe_items__measuring_unit",
            "authors__profile",
        ),
        id=recipe_id,
    )

    enrich_content_with_interactions(request, recipe, Recipe)
    record_view(Recipe, recipe.id, request)
    recipe.can_edit = _can_edit_recipe(request, recipe)
    recipe.can_delete = request.user.is_authenticated and request.user.is_staff

    # Similar recipes
    _attach_similar_recipes(recipe)

    return recipe


@router.get("/by-slug/{slug}/", response=RecipeDetailOut)
def get_recipe_by_slug(request, slug: str):
    """Get recipe detail by slug (SEO-friendly)."""
    recipe = get_object_or_404(
        Recipe.objects.prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient__portions__measuring_unit",
            "recipe_items__portion__measuring_unit",
            "recipe_items__ingredient__portions__measuring_unit",
            "recipe_items__measuring_unit",
            "authors__profile",
        ),
        slug=slug,
    )

    enrich_content_with_interactions(request, recipe, Recipe)
    record_view(Recipe, recipe.id, request)
    recipe.can_edit = _can_edit_recipe(request, recipe)
    recipe.can_delete = request.user.is_authenticated and request.user.is_staff

    # Similar recipes
    _attach_similar_recipes(recipe)

    return recipe


def _attach_similar_recipes(recipe: Recipe):
    """Attach similar recipes to a recipe object."""
    tag_ids = list(recipe.tags.values_list("id", flat=True))
    similar_qs = Recipe.objects.filter(status="approved").exclude(id=recipe.id)
    if tag_ids:
        similar_qs = (
            similar_qs.filter(tags__id__in=tag_ids)
            .annotate(shared_tags=Count("tags", filter=Q(tags__id__in=tag_ids)))
            .order_by("-shared_tags", "-like_score")
        )
    else:
        if recipe.recipe_type:
            similar_qs = similar_qs.filter(recipe_type=recipe.recipe_type)
        similar_qs = similar_qs.order_by("-like_score")
    recipe.next_best_recipes = list(similar_qs.distinct()[:6])


@router.post("/", response=RecipeDetailOut)
def create_recipe(request, payload: RecipeCreateIn):
    """Create a new recipe."""
    _require_auth(request)

    # Bot protection
    if payload.website:
        raise HttpError(400, "Ungültige Anfrage")
    if payload.form_loaded_at and (time.time() - payload.form_loaded_at < 5):
        raise HttpError(400, "Bitte warten Sie einen Moment")

    recipe = Recipe(
        title=payload.title,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        recipe_type=payload.recipe_type,
        servings=payload.servings,
        costs_rating=payload.costs_rating,
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        created_by=request.user,
        status="draft",
    )
    recipe.save()

    # Set M2M relations
    if payload.scout_level_ids:
        recipe.scout_levels.set(payload.scout_level_ids)
    if payload.tag_ids:
        recipe.tags.set(payload.tag_ids)
    if payload.nutritional_tag_ids:
        recipe.nutritional_tags.set(payload.nutritional_tag_ids)

    recipe.authors.add(request.user)

    # Create recipe items
    for item_data in payload.recipe_items:
        RecipeItem.objects.create(
            recipe=recipe,
            portion_id=item_data.portion_id,
            ingredient_id=item_data.ingredient_id,
            quantity=item_data.quantity,
            measuring_unit_id=item_data.measuring_unit_id,
            sort_order=item_data.sort_order,
            note=item_data.note,
            quantity_type=item_data.quantity_type,
        )

    recipe.emotion_counts = {}
    recipe.user_emotion = None
    recipe.can_edit = True
    recipe.next_best_recipes = []

    return recipe


@router.patch("/{recipe_id}/", response=RecipeDetailOut)
def update_recipe(request, recipe_id: int, payload: RecipeUpdateIn):
    """Update a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    data = payload.dict(exclude_unset=True)
    scout_level_ids = data.pop("scout_level_ids", None)
    tag_ids = data.pop("tag_ids", None)
    nutritional_tag_ids = data.pop("nutritional_tag_ids", None)
    recipe_items_data = data.pop("recipe_items", None)

    for field, value in data.items():
        setattr(recipe, field, value)

    recipe.updated_by = request.user
    recipe.save()

    if scout_level_ids is not None:
        recipe.scout_levels.set(scout_level_ids)
    if tag_ids is not None:
        recipe.tags.set(tag_ids)
    if nutritional_tag_ids is not None:
        recipe.nutritional_tags.set(nutritional_tag_ids)

    # Replace recipe items if provided
    if recipe_items_data is not None:
        recipe.recipe_items.all().delete()
        for item_data in recipe_items_data:
            RecipeItem.objects.create(
                recipe=recipe,
                portion_id=item_data.portion_id,
                ingredient_id=item_data.ingredient_id,
                quantity=item_data.quantity,
                measuring_unit_id=item_data.measuring_unit_id,
                sort_order=item_data.sort_order,
                note=item_data.note,
                quantity_type=item_data.quantity_type,
            )

    enrich_content_with_interactions(request, recipe, Recipe)
    recipe.can_edit = True
    recipe.next_best_recipes = []

    return recipe


@router.delete("/{recipe_id}/")
def delete_recipe(request, recipe_id: int):
    """Soft-delete a recipe."""
    _require_auth(request)

    if not request.user.is_staff:
        raise HttpError(403, "Nur Admins duerfen Rezepte loeschen")

    recipe = get_object_or_404(Recipe, id=recipe_id)

    recipe.soft_delete()
    return {"success": True}


# ==========================================================================
# Comments (using generic ContentComment)
# ==========================================================================


@router.get("/{recipe_id}/comments/", response=list[ContentCommentOut])
def list_recipe_comments(request, recipe_id: int):
    """List approved comments for a recipe."""
    get_object_or_404(Recipe, id=recipe_id)
    return get_comments(Recipe, recipe_id)


@router.post("/{recipe_id}/comments/", response=ContentCommentOut)
def create_recipe_comment(request, recipe_id: int, payload: ContentCommentIn):
    """Create a comment on a recipe."""
    get_object_or_404(Recipe, id=recipe_id)
    return create_comment(
        Recipe,
        recipe_id,
        text=payload.text,
        request=request,
        author_name=payload.author_name,
        parent_id=payload.parent_id,
    )


# ==========================================================================
# Emotions (using generic ContentEmotion)
# ==========================================================================


@router.post("/{recipe_id}/emotions/")
def toggle_recipe_emotion(request, recipe_id: int, payload: ContentEmotionIn):
    """Add or toggle emotion on a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    counts = toggle_emotion(Recipe, recipe.id, payload.emotion_type, request)

    # Update like_score
    _update_like_score(recipe, counts)

    return counts


def _update_like_score(recipe: Recipe, emotion_counts: dict[str, int]):
    """Recalculate like_score from emotion counts."""
    score = 0
    score += emotion_counts.get("in_love", 0)
    score += emotion_counts.get("happy", 0)
    score -= emotion_counts.get("disappointed", 0)
    recipe.like_score = score
    recipe.save(update_fields=["like_score"])


# ==========================================================================
# Similar Recipes (tag-based)
# ==========================================================================


@router.get("/{recipe_id}/similar/", response=list[RecipeSimilarOut])
def get_similar_recipes(request, recipe_id: int):
    """Get similar recipes based on shared tags and recipe type."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    tag_ids = list(recipe.tags.values_list("id", flat=True))

    # Find recipes sharing the most tags
    qs = Recipe.objects.filter(status="approved").exclude(id=recipe_id).prefetch_related("tags")

    if tag_ids:
        qs = qs.filter(tags__id__in=tag_ids).annotate(shared_tags=Count("tags", filter=Q(tags__id__in=tag_ids)))
        # Prefer same recipe type
        qs = qs.order_by("-shared_tags", "-like_score")
    else:
        # No tags: fallback to same recipe type, then popularity
        if recipe.recipe_type:
            qs = qs.filter(recipe_type=recipe.recipe_type)
        qs = qs.order_by("-like_score")

    return qs.distinct()[:6]


@router.post("/{recipe_id}/image/")
def upload_recipe_image(request, recipe_id: int):
    """Upload an image for a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    if "image" not in request.FILES:
        raise HttpError(400, "Kein Bild hochgeladen")

    recipe.image = request.FILES["image"]
    recipe.save(update_fields=["image"])

    return {"image_url": recipe.image.url}
