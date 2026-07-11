"""Recipe CRUD, image upload, similar recipes, comments, and emotions."""

import json
import logging
import time

from django.db.models import Q
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from content.base_api import (
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    paginate_queryset,
    record_view,
    toggle_emotion,
)
from content.base_schemas import ContentCommentIn, ContentCommentOut, ContentEmotionIn
from content.schemas import ImageFromUrlIn
from content.services.search_service import log_search, log_search_structured
from recipe.models import Recipe, RecipeItem
from recipe.schemas import (
    ForkRecipeIn,
    PaginatedRecipeOut,
    RecipeAiCreateIn,
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeFilterIn,
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
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


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
    - Shared recipes (visibility=shared) visible to members of shared_groups
    - Staff sees everything
    """
    base_prefetch = ("scout_levels", "tags__parent", "authors")
    base_select = ("owner", "forked_from")

    if request.user.is_authenticated and request.user.is_staff:
        return Recipe.objects.all().select_related(*base_select).prefetch_related(*base_prefetch, "shared_groups")

    # System recipes (Inspi-verified): owner is null, status approved
    system_q = Q(owner__isnull=True, status="approved")
    # Public community recipes: owner set, public visibility, approved
    community_q = Q(owner__isnull=False, visibility="public", status="approved")

    if request.user.is_authenticated:
        # Own recipes (any status/visibility)
        own_q = Q(owner=request.user)
        # Also show own drafts (created_by, for backward compat)
        created_q = Q(created_by=request.user)
        
        # Recipes shared with user's groups (new breakfast wizard model)
        from profiles.models import UserGroup
        user_groups = UserGroup.objects.filter(memberships__user=request.user)
        shared_q = Q(visibility="shared", shared_groups__in=user_groups)
        
        visibility_q = system_q | community_q | own_q | created_q | shared_q
    else:
        visibility_q = system_q | community_q

    return Recipe.objects.filter(visibility_q).select_related(*base_select).prefetch_related(*base_prefetch, "shared_groups").distinct()


def _get_visible_recipe_or_404(request, recipe_id: int, require_auth: bool = False) -> Recipe:
    """Return a Recipe visible to the current user, or raise 403/404.

    Used by all sub-resource endpoints (comments, emotions, images, etc.)
    to enforce visibility consistently.

    Args:
        require_auth: If True, unauthenticated users always get 403.
                      If False, unauthenticated users can see approved public/system recipes.
    """
    if require_auth:
        _require_auth(request)
    recipe = _get_visible_recipes_qs(request).filter(id=recipe_id).first()
    if recipe is None:
        raise HttpError(404, "Rezept nicht gefunden")
    return recipe


def _is_transitively_visible_recipe(recipe: Recipe, request) -> bool:
    """Whether `recipe` is visible to the requesting user via a shared MealPlan."""
    if not request.user.is_authenticated:
        return False
    from content.services.transitive_visibility import recipe_visible_transitively

    return recipe_visible_transitively(recipe, request.user)


# ==========================================================================
# Breakfast Wizard Visibility Functions
# ==========================================================================
# New visibility model for breakfast wizard user-generated items


def _can_view_recipe_breakfast(recipe: Recipe, user) -> bool:
    """Check if user can view recipe in breakfast wizard context.
    
    Rules:
    - System recipes (owner=None, status=approved) are always visible
    - User-owned recipes (owner=user) are visible to owner
    - Recipes shared with user's groups (visibility=shared, shared_groups contains user's groups)
    - Staff can see everything
    """
    if not user.is_authenticated:
        # Unauthenticated users can only see system recipes
        return recipe.owner_id is None and recipe.status == "approved"
    
    # Staff can see everything
    if user.is_staff:
        return True
    
    # System recipes are always visible
    if recipe.owner_id is None:
        return recipe.status == "approved"
    
    # Owner can always see their own recipe
    if recipe.owner_id == user.id:
        return True
    
    # Check shared groups
    if recipe.visibility in ("group", "public"):
        # Old visibility model (group/public) - handled by existing logic
        if recipe.visibility == "public" and recipe.status == "approved":
            return True
        if recipe.visibility == "group":
            # Group visibility - need to check if user is in recipe's group
            # This requires additional logic
            return False
    
    # New shared_groups model
    from profiles.models import UserGroup
    user_groups = UserGroup.objects.filter(memberships__user=user)
    return recipe.shared_groups.filter(id__in=user_groups).exists()


def _get_visible_recipes_for_breakfast_qs(user, group_ids: list[int] | None = None):
    """Get recipes visible to user for breakfast wizard.
    
    Args:
        user: The requesting user
        group_ids: Optional list of group IDs to filter for
    
    Returns:
        Queryset of visible Recipe objects
    """
    from profiles.models import UserGroup
    
    qs = Recipe.objects.select_related("owner", "forked_from").prefetch_related("shared_groups", "scout_levels", "tags")
    
    if user.is_authenticated and user.is_staff:
        return qs
    
    # System recipes (owner=None, status=approved) are always visible
    system_q = Q(owner__isnull=True, status="approved")
    
    if not user.is_authenticated:
        return qs.filter(system_q)
    
    # User's own recipes
    own_q = Q(owner=user)
    
    # Get user's groups
    user_groups = UserGroup.objects.filter(memberships__user=user)
    
    # Recipes shared with user's groups
    shared_q = Q(visibility="shared", shared_groups__in=user_groups)
    
    # Public recipes
    public_q = Q(visibility="public", status="approved")
    
    # For "group" visibility, check if user is in recipe's group context
    # This would require knowing which group the recipe belongs to
    # For now, we only handle explicit shared_groups model
    
    visibility_q = system_q | own_q | shared_q | public_q
    
    if group_ids:
        # If specific groups are requested, also include recipes shared with those groups
        visibility_q = visibility_q | Q(
            visibility="shared",
            shared_groups__in=UserGroup.objects.filter(id__in=group_ids)
        )
    
    return qs.filter(visibility_q).distinct()


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
    if filters.q:
        user = request.user if request.user.is_authenticated else None
        log_search(filters.q, result["total"], user)
        log_search_structured(filters.q, result["total"], "recipe_list", user)
    return result


@router.get("/my-recipes/", response=PaginatedRecipeOut)
def list_my_recipes(request, page: int = 1, page_size: int = 20, folder: int | None = None):
    """List current user's personal recipes."""
    if not request.user.is_authenticated:
        raise HttpError(401, "Sitzung nicht gefunden. Bitte erneut anmelden.")

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
        ingredients=[{"name": i.name, "quantity": i.quantity, "unit": i.unit} for i in result.ingredients],
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

    from core.services.gemini import GeminiAuthError, GeminiUnavailableError
    from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError
    from recipe.services.url_import_service import import_recipe_from_url

    def _error_response(status: int, error_code: str, detail: str) -> HttpResponse:
        return HttpResponse(
            json.dumps({"error_code": error_code, "detail": detail}),
            status=status,
            content_type="application/json",
        )

    try:
        result = import_recipe_from_url(payload.url, request.user)
    except SourceUnreachableError:
        return _error_response(
            422,
            "IMPORT_SOURCE_UNREACHABLE",
            "Die Seite konnte nicht geladen werden. Manche Rezeptseiten blockieren den automatischen Abruf — "
            "bitte kopiere die Zutaten manuell oder versuche eine andere Quelle.",
        )
    except (GeminiUnavailableError, GeminiAuthError):
        return _error_response(
            503,
            "IMPORT_AI_UNAVAILABLE",
            "Der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.",
        )
    except NoRecipeFoundError:
        return _error_response(
            422,
            "IMPORT_NO_RECIPE_FOUND",
            "Auf der Seite wurden keine Rezeptdaten gefunden. Bitte prüfe den Link oder gib das Rezept manuell ein.",
        )
    except HttpError:
        raise
    except Exception:
        logger.exception("Enhanced recipe import failed for URL: %s", payload.url)
        return _error_response(
            500,
            "INTERNAL_ERROR",
            "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
        )

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
    """Create a complete recipe from a free-text prompt using AI."""
    _require_auth(request)

    from recipe.services.recipe_ai_suggest_service import ai_create_recipe

    recipe = ai_create_recipe(payload.prompt, user=request.user)
    return recipe


@router.get("/{recipe_id}/", response=RecipeDetailOut)
def get_recipe(request, recipe_id: int):
    """Get recipe detail by ID."""
    prefetches = (
        "scout_levels",
        "tags__parent",
        "nutritional_tags",
        "recipe_items__portion__ingredient__retail_section",
        "recipe_items__portion__ingredient__portions__measuring_unit",
        "recipe_items__portion__measuring_unit",
        "steps__step_ingredients__recipe_item__portion__ingredient",
        "authors__profile",
    )
    recipe = _get_visible_recipes_qs(request).prefetch_related(*prefetches).filter(id=recipe_id).first()
    transitive = False
    if recipe is None:
        recipe = Recipe.objects.prefetch_related(*prefetches).filter(id=recipe_id).first()
        if recipe is None or not _is_transitively_visible_recipe(recipe, request):
            raise HttpError(404, "Rezept nicht gefunden")
        transitive = True

    enrich_content_with_interactions(request, recipe, Recipe)
    record_view(Recipe, recipe.id, request)
    recipe.can_edit = False if transitive else _can_edit_recipe(request, recipe)
    recipe.can_delete = False if transitive else (request.user.is_authenticated and request.user.is_staff)
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
            "recipe_items__portion__ingredient__retail_section",
            "recipe_items__portion__ingredient__portions__measuring_unit",
            "recipe_items__portion__measuring_unit",
            "steps__step_ingredients__recipe_item__portion__ingredient",
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
    """Create a new recipe.
    
    For breakfast wizard items, sets owner to current user and handles visibility/sharing.
    """
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

    # Set M2M relations (except nutritional tags — handled after items)
    if payload.scout_level_ids:
        from content.models.tags import ScoutLevel

        valid_ids = set(ScoutLevel.objects.filter(id__in=payload.scout_level_ids).values_list("id", flat=True))
        recipe.scout_levels.set(valid_ids)
    if payload.tag_ids:
        recipe.tags.set(payload.tag_ids)

    recipe.authors.add(request.user)

    # Create recipe items first (triggers sync_recipe_nutritional_tags via signal)
    for item_data in payload.recipe_items:
        RecipeItem.objects.create(
            recipe=recipe,
            portion_id=item_data.portion_id,
            quantity=item_data.quantity,
            sort_order=item_data.sort_order,
            note=item_data.note,
            is_optional=item_data.is_optional,
        )

    # Store manually-set nutritional tags after sync (M2M .set() does NOT trigger post_save)
    if payload.nutritional_tag_ids:
        recipe.manual_nutritional_tags.set(payload.nutritional_tag_ids)
    
    # Handle shared_group_ids for breakfast wizard recipes
    if payload.shared_group_ids:
        from profiles.models import UserGroup
        
        # Validate that user is member of all shared groups
        user_group_ids = set(UserGroup.objects.filter(memberships__user=request.user).values_list("id", flat=True))
        invalid_group_ids = set(payload.shared_group_ids) - user_group_ids
        if invalid_group_ids:
            raise HttpError(400, f"User is not a member of groups: {invalid_group_ids}")
        
        recipe.shared_groups.set(payload.shared_group_ids)

    recipe.emotion_counts = {}
    recipe.user_emotion = None
    recipe.can_edit = True
    recipe.next_best_recipes = []

    return recipe


@router.patch("/{recipe_id}/", response=RecipeDetailOut)
def update_recipe(request, recipe_id: int, payload: RecipeUpdateIn):
    """Update a recipe.
    
    Staff-only fields: status, source_url, authors_ids
    Owner-only fields: shared_group_ids, visibility (for breakfast wizard)
    Non-staff users attempting to modify staff-only fields will receive a 403 Forbidden error.
    
    Example staff request:
    {
        "title": "New Title",
        "status": "approved",
        "source_url": "https://example.com/recipe",
        "authors_ids": [1, 2, 3]
    }
    
    Non-staff users can only modify: title, summary, description, recipe_type,
    execution_time, preparation_time, difficulty, tag_ids, scout_level_ids,
    nutritional_tag_ids, recipe_items, shared_group_ids (breakfast wizard).
    """
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    data = payload.dict(exclude_unset=True)
    
    # Staff-only field protection
    if "status" in data and not request.user.is_staff:
        raise HttpError(403, "Nur Admins können den Rezept-Status ändern")
    if "authors_ids" in data and not request.user.is_staff:
        raise HttpError(403, "Nur Admins können die Autoren ändern")
    
    # Owner-only field protection (breakfast wizard)
    if recipe.owner and ("shared_group_ids" in data):
        if recipe.owner_id != request.user.id and not request.user.is_staff:
            raise HttpError(403, "Nur der Owner darf Sharing-Einstellungen ändern")
    
    data.pop("portions", None)  # Always enforce portions=1
    scout_level_ids = data.pop("scout_level_ids", None)
    tag_ids = data.pop("tag_ids", None)
    nutritional_tag_ids = data.pop("nutritional_tag_ids", None)
    recipe_items_data = data.pop("recipe_items", None)
    authors_ids = data.pop("authors_ids", None)
    shared_group_ids = data.pop("shared_group_ids", None)

    for field, value in data.items():
        setattr(recipe, field, value)

    recipe.updated_by = request.user
    recipe.save()

    if scout_level_ids is not None:
        from content.models.tags import ScoutLevel

        valid_ids = set(ScoutLevel.objects.filter(id__in=scout_level_ids).values_list("id", flat=True))
        recipe.scout_levels.set(valid_ids)
    if tag_ids is not None:
        recipe.tags.set(tag_ids)
    if authors_ids is not None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        try:
            valid_authors = User.objects.filter(id__in=authors_ids)
            recipe.authors.set(valid_authors)
        except User.DoesNotExist:
            raise HttpError(400, "Eine oder mehrere Autoren-IDs existieren nicht")

    # Replace recipe items FIRST (triggers sync_recipe_nutritional_tags via signal)
    if recipe_items_data is not None:
        if not recipe_items_data and recipe.status != "draft":
            raise HttpError(400, "Bei veröffentlichten Rezepten können nicht alle Zutaten entfernt werden")
        recipe.recipe_items.all().delete()
        for item_data in recipe_items_data:
            RecipeItem.objects.create(
                recipe=recipe,
                portion_id=item_data["portion_id"],
                quantity=item_data["quantity"],
                sort_order=item_data["sort_order"],
                note=item_data["note"],
                is_optional=item_data.get("is_optional", False),
            )

    # Store manually-set nutritional tags AFTER items (M2M .set() does NOT trigger post_save)
    if nutritional_tag_ids is not None:
        recipe.manual_nutritional_tags.set(nutritional_tag_ids)
    
    # Handle shared_group_ids for breakfast wizard recipes
    if shared_group_ids is not None:
        if recipe.visibility == "shared" or data.get("visibility") == "shared":
            from profiles.models import UserGroup
            
            # Validate that user is member of all shared groups
            user_group_ids = set(UserGroup.objects.filter(memberships__user=request.user).values_list("id", flat=True))
            invalid_group_ids = set(shared_group_ids) - user_group_ids
            if invalid_group_ids:
                raise HttpError(400, f"User is not a member of groups: {invalid_group_ids}")
            
            recipe.shared_groups.set(shared_group_ids)
        else:
            # Clear shared groups if not sharing
            recipe.shared_groups.clear()

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

    # Protect recipes that are used in active meal plans.
    from planner.models import MealItem

    if MealItem.objects.filter(recipe=recipe).exists():
        raise HttpError(
            409,
            "Dieses Rezept wird in Essensplänen verwendet und kann nicht gelöscht werden.",
        )

    recipe.soft_delete()
    return {"success": True}


# ==========================================================================
# Comments (using generic ContentComment)
# ==========================================================================


@router.get("/{recipe_id}/comments/", response=list[ContentCommentOut])
def list_recipe_comments(request, recipe_id: int):
    """List approved comments for a recipe."""
    _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return get_comments(Recipe, recipe_id)


@router.post("/{recipe_id}/comments/", response=ContentCommentOut)
def create_recipe_comment(request, recipe_id: int, payload: ContentCommentIn):
    """Create a comment on a recipe."""
    _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
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
    recipe = _get_visible_recipe_or_404(request, recipe_id)
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

    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return find_similar_recipes(recipe, limit=6)


@router.post("/{recipe_id}/image/")
def upload_recipe_image(request, recipe_id: int):
    """Upload an image for a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
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

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    recipe.image = None
    recipe.save(update_fields=["image"])
    return {"image_url": None}


@router.post("/{recipe_id}/image-from-url/")
def set_recipe_image_from_url(request, recipe_id: int, payload: ImageFromUrlIn):
    """Set the title image from an existing storage URL."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
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
            "exchange_groups",
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
        portions=1,  # Always normalize to 1 portion (consistent with create_recipe)
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

    # Copy exchange groups first, mapping original group id -> new group.
    from recipe.models import RecipeItemExchangeGroup

    group_map: dict[int, RecipeItemExchangeGroup] = {}
    for group in original.exchange_groups.all():
        group_map[group.id] = RecipeItemExchangeUserGroup.objects.create(
            recipe=fork,
            name=group.name,
        )

    # Copy all RecipeItems, preserving optional flag and exchange membership.
    for item in original.recipe_items.all():
        RecipeItem.objects.create(
            recipe=fork,
            portion_id=item.portion_id,
            quantity=item.quantity,
            sort_order=item.sort_order,
            note=item.note,
            is_optional=item.is_optional,
            exchange_group=group_map.get(item.exchange_group_id),
            exchange_position=item.exchange_position,
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
        if not recipe.recipe_items.exists():
            raise HttpError(400, "Rezept benötigt mindestens eine Zutat zum Veröffentlichen")
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

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.recipe_ai_suggest_service import suggest_recipe_metadata

    result = suggest_recipe_metadata(recipe, user=request.user)
    return result
