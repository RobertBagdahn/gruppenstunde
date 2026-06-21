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
from content.schemas import ImageFromUrlIn

from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    ForkRecipeIn,
    PaginatedRecipeOut,
    RecipeAiCreateIn,
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeFilterIn,
    RecipeListOut,
    RecipeSimilarOut,
    RecipeSuggestAllOut,
    RecipeUpdateIn,
    VisibilityUpdateIn,
)
from recipe.schemas.import_schemas import (
    RecipeImportPreviewOut,
    RecipeImportRequestIn,
    RecipeImportUrlResponseOut,
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
    if recipe.owner_id and recipe.owner_id == request.user.id:
        return True
    if recipe.authors.filter(id=request.user.id).exists():
        return True
    return False


def _get_visible_recipes_qs(request):
    """
    Return a Recipe queryset filtered by visibility rules.

    Rules:
    - System recipes (owner=null) with status=approved are always visible
    - User's own recipes (owner=current_user) are always visible to them
    - Public community recipes (visibility=public, status=approved) are visible
    - Group recipes (visibility=group) visible to group members (TODO: implement group membership)
    - Staff sees everything
    """
    base_prefetch = ("scout_levels", "tags__parent", "authors")
    base_select = ("owner", "forked_from")

    if request.user.is_authenticated and request.user.is_staff:
        return Recipe.objects.all().select_related(*base_select).prefetch_related(*base_prefetch)

    # System recipes (Inspi-verified): owner is null, status approved
    system_q = Q(owner__isnull=True, status="approved")
    # Public community recipes: owner set, public visibility, approved
    community_q = Q(owner__isnull=False, visibility="public", status="approved")

    if request.user.is_authenticated:
        # Own recipes (any status/visibility)
        own_q = Q(owner=request.user)
        # Also show own drafts (created_by, for backward compat)
        created_q = Q(created_by=request.user)
        visibility_q = system_q | community_q | own_q | created_q
    else:
        visibility_q = system_q | community_q

    return Recipe.objects.filter(visibility_q).select_related(*base_select).prefetch_related(*base_prefetch)


# ==========================================================================
# Recipe CRUD
# ==========================================================================


@router.get("/", response=PaginatedRecipeOut)
def list_recipes(request, filters: Query[RecipeFilterIn]):
    """List recipes with pagination and filters."""
    qs = _get_visible_recipes_qs(request)

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

    if filters.costs_min is not None:
        qs = qs.filter(cached_price_total__gte=filters.costs_min)
    if filters.costs_max is not None:
        qs = qs.filter(cached_price_total__lte=filters.costs_max)

    if filters.execution_time:
        qs = qs.filter(execution_time=filters.execution_time)

    # Origin filter (verified/community/mine)
    if filters.origin and filters.origin != "all":
        if filters.origin == "verified":
            qs = qs.filter(owner__isnull=True)
        elif filters.origin == "community":
            qs = qs.filter(owner__isnull=False, visibility="public", status="approved")
        elif filters.origin == "mine" and request.user.is_authenticated:
            qs = qs.filter(owner=request.user)

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


@router.get("/my-recipes/", response=PaginatedRecipeOut)
def list_my_recipes(request, page: int = 1, page_size: int = 20, folder: int | None = None):
    """List current user's personal recipes."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Anmeldung erforderlich")

    qs = (
        Recipe.objects.filter(owner=request.user)
        .prefetch_related("scout_levels", "tags__parent", "authors")
        .order_by("-created_at")
    )

    if folder is not None:
        qs = qs.filter(folder_id=folder) if folder > 0 else qs.filter(folder__isnull=True)

    result = paginate_queryset(qs, page, page_size)
    enrich_list_with_permissions(request, result["items"])
    return result


# ===========================================================================
# URL Import (must be before /{recipe_id}/ to avoid path conflict)
# ===========================================================================


@router.post("/import-from-url/", response=RecipeImportPreviewOut)
def import_recipe_from_url(request, payload: RecipeImportRequestIn):
    """Import a recipe from an external URL and return a preview."""
    _require_auth(request)

    from recipe.services.import_service import ImportedRecipe, import_from_url

    try:
        result: ImportedRecipe = import_from_url(payload.url)
    except ValueError as e:
        raise HttpError(422, str(e))
    except Exception as e:
        logger.exception("Recipe import failed for URL: %s", payload.url)
        raise HttpError(422, f"Import fehlgeschlagen: {e}")

    return RecipeImportPreviewOut(
        title=result.title,
        description=result.description,
        servings=result.servings,
        ingredients=[
            {"name": i.name, "quantity": i.quantity, "unit": i.unit}
            for i in result.ingredients
        ],
        steps=result.steps,
        image_url=result.image_url,
        source_url=result.source_url,
        prep_time_minutes=result.prep_time_minutes,
        cook_time_minutes=result.cook_time_minutes,
    )


@router.post("/import-from-url-enhanced/", response=RecipeImportUrlResponseOut)
def import_recipe_from_url_enhanced(request, payload: RecipeImportRequestIn):
    """Import a recipe from URL with Gemini-based ingredient matching and creation."""
    _require_auth(request)

    from recipe.services.url_import_service import import_recipe_from_url

    try:
        result = import_recipe_from_url(payload.url, request.user)
    except ValueError as e:
        raise HttpError(422, str(e))
    except Exception as e:
        logger.exception("Enhanced recipe import failed for URL: %s", payload.url)
        raise HttpError(422, f"Import fehlgeschlagen: {e}")

    return RecipeImportUrlResponseOut(
        recipe_draft={
            "title": result.title,
            "description": result.description,
            "summary": result.summary,
            "servings": result.servings,
            "preparation_time": result.preparation_time,
            "execution_time": result.execution_time,
            "recipe_type": result.recipe_type,
            "difficulty": result.difficulty,
            "execution_time_choice": result.execution_time_choice,
            "preparation_time_choice": result.preparation_time_choice,
            "scout_level_ids": result.scout_level_ids,
            "tag_ids": result.tag_ids,
            "steps": result.steps,
            "source_url": result.source_url,
        },
        recipe_items=[
            {
                "ingredient_id": item.ingredient_id,
                "ingredient_name": item.ingredient_name,
                "quantity": item.quantity,
                "measuring_unit_id": item.measuring_unit_id,
                "measuring_unit_name": item.measuring_unit_name,
                "note": item.note,
                "is_new_ingredient": item.is_new_ingredient,
                "portion_id": item.portion_id,
            }
            for item in result.recipe_items
        ],
        created_ingredients=[
            {
                "id": ci.id,
                "name": ci.name,
                "aliases": ci.aliases,
                "nutri_class": ci.nutri_class,
            }
            for ci in result.created_ingredients
        ],
    )


# ===========================================================================
# AI Create (must be before /{recipe_id}/ to avoid path conflict)
# ===========================================================================


@router.post("/ai-create/", response=RecipeDetailOut)
def ai_create(request, payload: RecipeAiCreateIn):
    """Create a complete recipe from title/description using AI."""
    _require_auth(request)

    from recipe.services.recipe_ai_suggest_service import ai_create_recipe

    recipe = ai_create_recipe(payload.title, payload.description or None, user=request.user)
    return recipe


@router.get("/{recipe_id}/", response=RecipeDetailOut)
def get_recipe(request, recipe_id: int):
    """Get recipe detail by ID."""
    recipe = get_object_or_404(
        _get_visible_recipes_qs(request).prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient__portions__measuring_unit",
            "recipe_items__portion__measuring_unit",
            "authors__profile",
        ),
        id=recipe_id,
    )

    enrich_content_with_interactions(request, recipe, Recipe)
    record_view(Recipe, recipe.id, request)
    recipe.can_edit = _can_edit_recipe(request, recipe)
    recipe.can_delete = request.user.is_authenticated and request.user.is_staff
    recipe.is_owner = (
        request.user.is_authenticated and recipe.owner_id is not None and recipe.owner_id == request.user.id
    )

    # Similar recipes
    _attach_similar_recipes(recipe)

    return recipe


@router.get("/by-slug/{slug}/", response=RecipeDetailOut)
def get_recipe_by_slug(request, slug: str):
    """Get recipe detail by slug (SEO-friendly)."""
    recipe = get_object_or_404(
        _get_visible_recipes_qs(request).prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient__portions__measuring_unit",
            "recipe_items__portion__measuring_unit",
            "authors__profile",
        ),
        slug=slug,
    )

    enrich_content_with_interactions(request, recipe, Recipe)
    record_view(Recipe, recipe.id, request)
    recipe.can_edit = _can_edit_recipe(request, recipe)
    recipe.can_delete = request.user.is_authenticated and request.user.is_staff
    recipe.is_owner = (
        request.user.is_authenticated and recipe.owner_id is not None and recipe.owner_id == request.user.id
    )

    # Similar recipes
    _attach_similar_recipes(recipe)

    return recipe


def _attach_similar_recipes(recipe: Recipe):
    """Attach similar recipes to a recipe object (embedding-based)."""
    from content.services.embedding_service import find_similar_recipes

    recipe.next_best_recipes = find_similar_recipes(recipe, limit=6)


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
        portions=1,  # Always store per-1-portion
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        created_by=request.user,
        owner=request.user,
        visibility="private",
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
            quantity=item_data.quantity,
            sort_order=item_data.sort_order,
            note=item_data.note,
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
    data.pop("portions", None)  # Always enforce portions=1
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
                portion_id=item_data["portion_id"],
                quantity=item_data["quantity"],
                sort_order=item_data["sort_order"],
                note=item_data["note"],
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
        raise HttpError(403, "Nur Admins dürfen Rezepte löschen")

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
    # Use update() instead of save() to avoid triggering signals
    Recipe.objects.filter(pk=recipe.pk).update(like_score=score)


# ==========================================================================
# Similar Recipes (embedding-based)
# ==========================================================================


@router.get("/{recipe_id}/similar/", response=list[RecipeSimilarOut])
def get_similar_recipes(request, recipe_id: int):
    """Get similar recipes using vector embedding similarity."""
    from content.services.embedding_service import find_similar_recipes

    recipe = get_object_or_404(Recipe, id=recipe_id)
    return find_similar_recipes(recipe, limit=6)


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


@router.delete("/{recipe_id}/image/")
def delete_recipe_image(request, recipe_id: int):
    """Remove the title image from a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    recipe.image = None
    recipe.save(update_fields=["image"])
    return {"image_url": None}


@router.post("/{recipe_id}/image-from-url/")
def set_recipe_image_from_url(request, recipe_id: int, payload: ImageFromUrlIn):
    """Set the title image from an existing storage URL."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from content.services.image_service import download_and_save_image, validate_image_url

    if not validate_image_url(payload.image_url):
        raise HttpError(400, "URL verweist nicht auf den eigenen Speicher.")

    try:
        saved_path = download_and_save_image(payload.image_url, "content/")
    except RuntimeError as exc:
        raise HttpError(500, str(exc))

    recipe.image = saved_path
    recipe.save(update_fields=["image"])
    return {"image_url": recipe.image.url if recipe.image else None}


# ==========================================================================
# Personal Recipes (Fork, My Recipes, Visibility)
# ==========================================================================


@router.post("/{recipe_id}/fork/", response=RecipeDetailOut)
def fork_recipe(request, recipe_id: int, payload: ForkRecipeIn = None):
    """Create a personal copy (fork) of a recipe.

    Copies the recipe and all its RecipeItems, setting owner to the current user.
    Accepts an optional custom title for the clone.
    """
    _require_auth(request)

    if payload is None:
        payload = ForkRecipeIn()

    original = get_object_or_404(
        Recipe.objects.prefetch_related(
            "recipe_items__portion",
            "tags",
            "scout_levels",
            "nutritional_tags",
        ),
        id=recipe_id,
    )

    # Create the fork
    fork = Recipe(
        title=payload.title or original.title,
        summary=original.summary,
        summary_long=original.summary_long,
        description=original.description,
        recipe_type=original.recipe_type,
        portions=original.portions,
        execution_time=original.execution_time,
        preparation_time=original.preparation_time,
        difficulty=original.difficulty,
        owner=request.user,
        forked_from=original,
        visibility="private",
        status="draft",
        created_by=request.user,
    )
    fork.save()

    # Copy M2M relations
    fork.tags.set(original.tags.all())
    fork.scout_levels.set(original.scout_levels.all())
    fork.nutritional_tags.set(original.nutritional_tags.all())
    fork.authors.add(request.user)

    # Copy all RecipeItems
    for item in original.recipe_items.all():
        RecipeItem.objects.create(
            recipe=fork,
            portion_id=item.portion_id,
            quantity=item.quantity,
            sort_order=item.sort_order,
            note=item.note,
        )

    fork.emotion_counts = {}
    fork.user_emotion = None
    fork.can_edit = True
    fork.next_best_recipes = []

    return fork


@router.patch("/{recipe_id}/visibility/")
def update_recipe_visibility(request, recipe_id: int, payload: VisibilityUpdateIn):
    """Update the visibility of a personal recipe. Only the owner can change visibility."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)

    if recipe.owner_id != request.user.id:
        raise HttpError(403, "Nur der Besitzer kann die Sichtbarkeit ändern")

    if payload.visibility not in ("private", "group", "public"):
        raise HttpError(400, "Ungültige Sichtbarkeit. Erlaubt: private, group, public")

    recipe.visibility = payload.visibility

    # When setting to public, require moderation
    if payload.visibility == "public" and recipe.status != "approved":
        recipe.status = "submitted"

    recipe.save(update_fields=["visibility", "status"])

    return {
        "success": True,
        "visibility": recipe.visibility,
        "status": recipe.status,
    }


# ===========================================================================
# AI Suggest
# ===========================================================================


@router.post("/{recipe_id}/ai-suggest-all/", response=RecipeSuggestAllOut)
def ai_suggest_all(request, recipe_id: int):
    """Get AI-powered suggestions for missing recipe metadata."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.recipe_ai_suggest_service import suggest_recipe_metadata

    result = suggest_recipe_metadata(recipe, user=request.user)
    return result
