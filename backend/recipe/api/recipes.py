"""Recipe CRUD, image upload, similar recipes, comments, and emotions."""

import json
import logging
import time
from typing import cast

from django.db import transaction
from django.db.models import Q
from django.db.models.functions import Lower
from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError
from pydantic import BaseModel, Field

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
    VerifyRequestIn,
    VerifyStatusOut,
    VisibilityUpdateIn,
)
from recipe.schemas.import_schemas import (
    CreatedIngredientInfoOut,
    ImportedIngredientOut,
    RecipeDraftOut,
    RecipeImportPreviewOut,
    RecipeImportRequestIn,
    RecipeImportUrlResponseOut,
    RecipeItemDraftOut,
    SmartRecipeInputIn,
)
from recipe.schemas.ingredient_review import IngredientReviewPreviewOut, RecipeImportSourceIn

logger = logging.getLogger(__name__)

router = Router()


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


# Choice fields that must never be set to an empty string via PATCH.
EMPTY_REJECTING_CHOICE_FIELDS = {
    "difficulty": "Schwierigkeit",
    "execution_time": "Zubereitungszeit",
    "preparation_time": "Vorbereitungszeit",
}


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
    from content.services.food_access import visible_recipe_queryset

    return visible_recipe_queryset(request.user)


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
    return cast(Recipe, recipe)


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
            visibility="shared", shared_groups__in=UserGroup.objects.filter(id__in=group_ids)
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
        qs = qs.filter(recipe_type__in=filters.recipe_type)

    if filters.preparation_method:
        qs = qs.filter(preparation_method__in=filters.preparation_method)

    if filters.equipment_slug:
        qs = qs.filter(equipment__slug=filters.equipment_slug)

    if filters.scout_level_ids:
        qs = qs.filter(scout_levels__id__in=filters.scout_level_ids).distinct()

    if filters.tag_slugs:
        for slug in filters.tag_slugs:
            qs = qs.filter(tags__slug=slug)

    if filters.difficulty:
        qs = qs.filter(difficulty__in=filters.difficulty)

    if filters.costs_min is not None:
        qs = qs.filter(cached_price_total__gte=filters.costs_min)
    if filters.costs_max is not None:
        qs = qs.filter(cached_price_total__lte=filters.costs_max)

    if filters.execution_time:
        qs = qs.filter(execution_time__in=filters.execution_time)

    # Origin filter (verified/community/mine) — default to verified only
    origin_values = filters.origin if filters.origin else ["verified"]
    origin_q = Q()
    for origin in origin_values:
        if origin == "verified":
            origin_q |= Q(owner__isnull=True)
        elif origin == "community":
            origin_q |= Q(owner__isnull=False, visibility="public", status="approved")
        elif origin == "mine" and request.user.is_authenticated:
            origin_q |= Q(owner=request.user)
    if origin_q:
        qs = qs.filter(origin_q)

    # Sorting
    sort_map = {
        "newest": "-created_at",
        "oldest": "created_at",
        "most_liked": "-like_score",
        "popular": "-view_count",
        "use_count": "-usage_count",
    }
    if filters.sort == "random":
        qs = qs.order_by("?")
    elif filters.sort == "use_count":
        qs = qs.order_by("-usage_count", "-created_at")
    elif filters.sort in sort_map:
        qs = qs.order_by(sort_map[filters.sort])
    else:
        qs = qs.order_by("-usage_count", "-created_at")

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


class RecipeIngredientReviewSourcesIn(BaseModel):
    """Sources accepted by the side-effect-free review preview."""

    sources: list[RecipeImportSourceIn] = Field(default_factory=list)
    input: str = ""


@router.post("/ingredient-review/preview/", response=IngredientReviewPreviewOut)
def preview_recipe_ingredient_review(request, payload: RecipeIngredientReviewSourcesIn):
    """Return an ingredient review preview without persisting imported data."""
    _require_auth(request)
    from recipe.services.ingredient_review_service import preview_recipe_ingredients

    sources = payload.sources
    if not sources and payload.input.strip():
        source_type = "url" if payload.input.strip().startswith(("http://", "https://")) else "text"
        sources = [RecipeImportSourceIn(type=source_type, value=payload.input.strip())]
    if not sources:
        raise HttpError(422, "Bitte gib mindestens eine Quelle an")
    from recipe.services.exceptions import SourceUnreachableError

    try:
        return preview_recipe_ingredients(sources, request.user)
    except SourceUnreachableError:
        raise HttpError(
            422,
            "Die Seite konnte nicht geladen werden und auch die Websuche hat kein passendes Rezept gefunden. "
            "Bitte kopiere den Rezepttext oder versuche eine andere Quelle.",
        ) from None
    except Exception as exc:
        logger.exception("Recipe ingredient review preview failed")
        raise HttpError(422, f"Zutaten konnten nicht analysiert werden: {exc}") from exc


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
        ingredients=[ImportedIngredientOut(name=i.name, quantity=i.quantity, unit=i.unit) for i in result.ingredients],
        steps=result.steps,
        image_url=result.image_url,
        source_url=result.source_url,
        prep_time_minutes=result.prep_time_minutes,
        cook_time_minutes=result.cook_time_minutes,
    )


def _recipe_import_response(result) -> RecipeImportUrlResponseOut:
    """Serialize every smart-input source through one response contract."""
    return RecipeImportUrlResponseOut(
        recipe_draft=RecipeDraftOut(
            title=result.title,
            description=result.description,
            summary=result.summary,
            servings=result.servings,
            preparation_time=result.preparation_time,
            execution_time=result.execution_time,
            image_url=getattr(result, "image_url", ""),
            recipe_type=result.recipe_type,
            difficulty=result.difficulty,
            execution_time_choice=result.execution_time_choice,
            preparation_time_choice=result.preparation_time_choice,
            scout_level_ids=result.scout_level_ids,
            tag_ids=result.tag_ids,
            steps=result.steps,
            source_url=result.source_url,
        ),
        recipe_items=[
            RecipeItemDraftOut(
                ingredient_id=item.ingredient_id,
                ingredient_name=item.ingredient_name,
                ingredient_slug=getattr(item, "ingredient_slug", ""),
                quantity=item.quantity,
                measuring_unit_id=item.measuring_unit_id,
                measuring_unit_name=item.measuring_unit_name,
                note=item.note,
                is_new_ingredient=item.is_new_ingredient,
                portion_id=item.portion_id,
                needs_unit_clarification=getattr(item, "needs_unit_clarification", False),
                suggested_unit_name=getattr(item, "suggested_unit_name", ""),
                suggested_portion_weight_g=getattr(item, "suggested_portion_weight_g", None),
                available_portions=getattr(item, "available_portions", []),
                weight_status=getattr(item, "weight_status", None),
                weight_proposal_g=getattr(item, "weight_proposal_g", None),
                suggested_portion_name=getattr(item, "suggested_portion_name", ""),
                confirmation_required=getattr(item, "confirmation_required", False),
            )
            for item in result.recipe_items
        ],
        created_ingredients=[
            CreatedIngredientInfoOut(
                id=ci.id,
                name=ci.name,
                aliases=ci.aliases,
                nutri_class=ci.nutri_class,
                name_warning=getattr(ci, "name_warning", None),
            )
            for ci in result.created_ingredients
        ],
        input_type=getattr(result, "input_type", "url"),
        is_reconstructed=getattr(result, "is_reconstructed", False),
        ai_interaction_id=getattr(result, "ai_interaction_id", None),
    )


def _import_error_response(status: int, error_code: str, detail: str) -> HttpResponse:
    return HttpResponse(
        json.dumps({"error_code": error_code, "detail": detail}),
        status=status,
        content_type="application/json",
    )


def _handle_smart_import_error(exc: Exception, source: str) -> HttpResponse:
    from core.services.gemini import GeminiAuthError, GeminiUnavailableError
    from recipe.services.exceptions import NoRecipeFoundError, SourceUnreachableError

    if isinstance(exc, SourceUnreachableError):
        return _import_error_response(
            422,
            "IMPORT_SOURCE_UNREACHABLE",
            "Die Seite konnte nicht geladen werden und auch die Websuche hat kein passendes Rezept gefunden. "
            "Bitte kopiere den Rezepttext oder versuche eine andere Quelle.",
        )
    if isinstance(exc, GeminiUnavailableError | GeminiAuthError):
        return _import_error_response(
            503,
            "IMPORT_AI_UNAVAILABLE",
            "Der KI-Dienst ist gerade nicht erreichbar. Bitte versuche es in ein paar Minuten erneut.",
        )
    if isinstance(exc, NoRecipeFoundError):
        return _import_error_response(
            422,
            "IMPORT_NO_RECIPE_FOUND",
            "Es wurden keine verwertbaren Rezeptdaten gefunden. Bitte prüfe deine Eingabe.",
        )
    if isinstance(exc, ValueError):
        return _import_error_response(422, "IMPORT_INVALID_URL", str(exc))
    logger.exception("Smart recipe import failed for %s", source)
    return _import_error_response(
        500,
        "INTERNAL_ERROR",
        "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut.",
    )


@router.post("/import-from-url-enhanced/", response=RecipeImportUrlResponseOut)
def import_recipe_from_url_enhanced(request, payload: RecipeImportRequestIn):
    """Import a recipe from URL with Gemini-based ingredient matching and creation."""
    _require_auth(request)
    from recipe.services.url_import_service import import_recipe_from_url

    try:
        result = import_recipe_from_url(payload.url, request.user)
    except Exception as exc:
        return _handle_smart_import_error(exc, payload.url)
    return _recipe_import_response(result)


@router.post("/smart-input/", response=RecipeImportUrlResponseOut)
def import_recipe_from_smart_input(request, payload: SmartRecipeInputIn):
    """Analyze a URL, copied recipe text, or recipe idea through one contract."""
    _require_auth(request)
    from recipe.services.url_import_service import (
        classify_smart_input,
        extract_smart_recipe_input,
        import_recipe_from_url,
    )

    value = payload.input.strip()
    if not value:
        return _import_error_response(422, "IMPORT_EMPTY_INPUT", "Bitte gib einen Link, Rezepttext oder eine Idee ein.")

    input_type = classify_smart_input(value)
    try:
        if input_type == "url":
            result = import_recipe_from_url(value, request.user, input_type="url")
        else:
            detected_type, parsed, gemini_result = extract_smart_recipe_input(value, request.user)
            result = import_recipe_from_url(
                value,
                request.user,
                parsed_override=parsed,
                gemini_result_override=gemini_result,
                input_type=detected_type,
                source_url="",
            )
    except Exception as exc:
        return _handle_smart_import_error(exc, value[:120])
    return _recipe_import_response(result)


# ===========================================================================
# AI Create (must be before /{recipe_id}/ to avoid path conflict)
# ===========================================================================


@router.post("/ai-create/", response=RecipeDetailOut)
def ai_create(request, payload: RecipeAiCreateIn):
    """Create a complete recipe from a free-text prompt using AI."""
    _require_auth(request)

    from recipe.services.recipe_ai_suggest_service import ai_create_recipe

    recipe = ai_create_recipe(payload.prompt, user=request.user)
    # `can_edit` defaults to False on the schema, so the freshly created draft
    # would be reported as read-only to its own creator.
    recipe.can_edit = _can_edit_recipe(request, recipe)
    recipe.can_delete = request.user.is_staff
    recipe.is_owner = recipe.owner_id == request.user.id
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
    from content.services.audit_service import log_private_staff_food_access

    log_private_staff_food_access(request.user, recipe, request.path)

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
    from content.services.audit_service import log_private_staff_food_access

    log_private_staff_food_access(request.user, recipe, request.path)

    # Similar recipes
    _attach_similar_recipes(recipe)

    return recipe


@router.get("/by-slug/{slug}/export/pdf/")
def export_recipe_pdf(request, slug: str, page_format: str = "A4", servings: int = 1):
    """Export recipe as PDF, scaled to a temporary target serving count."""
    _require_auth(request)

    if page_format not in ("A4", "letter"):
        raise HttpError(422, "Ungültiges Seitenformat. Erlaubt: A4, letter")
    if not 1 <= servings <= 100:
        raise HttpError(422, "Ungültige Personenzahl. Erlaubt: 1–100")

    from django.http import HttpResponse

    from recipe.services.pdf_export import generate_recipe_pdf

    recipe = get_object_or_404(
        _get_visible_recipes_qs(request),
        slug=slug,
    )
    from content.services.audit_service import log_private_staff_food_access

    log_private_staff_food_access(request.user, recipe, request.path)

    pdf_bytes = generate_recipe_pdf(recipe, page_format=page_format, servings=servings)

    response = HttpResponse(pdf_bytes, content_type="application/pdf")
    response["Content-Disposition"] = f'inline; filename="{recipe.slug}-rezept.pdf"'
    return response


def _attach_similar_recipes(recipe: Recipe):
    """Attach similar recipes to a recipe object (embedding-based)."""
    from content.services.embedding_service import find_similar_recipes

    recipe.next_best_recipes = find_similar_recipes(recipe, limit=6)


def _resolve_tag_ids(tag_identifiers: list[str]) -> list:
    """Resolve a mixed list of Tag UUIDs and slugs to Tag UUIDs."""
    import uuid

    from content.models.tags import Tag

    resolved = []
    slugs = []
    for item in tag_identifiers:
        try:
            val = uuid.UUID(str(item))
            resolved.append(val)
        except (ValueError, AttributeError):
            slugs.append(str(item))
    if slugs:
        resolved.extend(list(Tag.objects.filter(slug__in=slugs).values_list("id", flat=True)))
    return resolved


@router.post("/", response=RecipeDetailOut)
@transaction.atomic
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

    if payload.ingredient_review_rows is not None:
        if not payload.ingredient_review_rows:
            raise HttpError(422, "Die Zutatenprüfung enthält keine bestätigten Zutaten")
        if any(row.status != "confirmed" for row in payload.ingredient_review_rows):
            raise HttpError(422, "Alle Zutaten müssen vor dem Speichern bestätigt werden")
        review_by_key = {row.key: row for row in payload.ingredient_review_rows}
        if len(review_by_key) != len(payload.ingredient_review_rows):
            raise HttpError(422, "Die Zutatenprüfung enthält doppelte Zeilen")
        missing_portions = [
            f"rows.{index}.selected_portion_id"
            for index, row in enumerate(payload.ingredient_review_rows)
            if row.selected_portion_id is None and row.temporary_ingredient is None
        ]
        if missing_portions:
            raise HttpError(422, f"Jede bestätigte Zutat benötigt eine Portion: {', '.join(missing_portions)}")

    recipe = Recipe(
        title=payload.title,
        summary=payload.summary,
        summary_long=payload.summary_long,
        description=payload.description,
        recipe_type=payload.recipe_type,
        preparation_method=payload.preparation_method,
        portions=1,  # Always store per-1-portion
        execution_time=payload.execution_time,
        preparation_time=payload.preparation_time,
        difficulty=payload.difficulty,
        created_by=request.user,
        owner=request.user,
        visibility="private",
        status="draft",
        source_url=payload.source_url.strip(),
    )
    recipe.save()

    if payload.image_url:
        from content.services.image_service import download_external_image

        try:
            saved_image_path = download_external_image(payload.image_url, "content/")
        except (RuntimeError, ValueError) as exc:
            raise HttpError(422, "Das Rezeptbild konnte nicht übernommen werden") from exc
        recipe.image.name = saved_image_path
        recipe.save(update_fields=["image"])

    # Set M2M relations (except nutritional tags — handled after items)
    if payload.scout_level_ids:
        from content.models.tags import ScoutLevel

        valid_ids = set(ScoutLevel.objects.filter(id__in=payload.scout_level_ids).values_list("id", flat=True))
        recipe.scout_levels.set(valid_ids)
    if payload.tag_ids:
        recipe.tags.set(_resolve_tag_ids(payload.tag_ids))
    if payload.equipment_ids:
        recipe.equipment.set(payload.equipment_ids)

    recipe.authors.add(request.user)

    # Create recipe items first (triggers sync_recipe_nutritional_tags via signal)
    for index, item_data in enumerate(payload.recipe_items):
        portion_id = item_data.portion_id
        if payload.ingredient_review_rows is not None:
            review = payload.ingredient_review_rows[index] if index < len(payload.ingredient_review_rows) else None
            if review is None:
                raise HttpError(422, "Rezeptposition fehlt in der Zutatenprüfung")
            if review.temporary_ingredient is not None:
                from django.utils.text import slugify

                from supply.choices import IngredientStatusChoices, PhysicalViscosityChoices
                from supply.models import Ingredient, IngredientAlias, MeasuringUnit, Portion

                draft = review.temporary_ingredient
                base_slug = slugify(draft.name) or "zutat"
                slug = base_slug
                counter = 1
                while Ingredient.objects.filter(slug=slug).exists():
                    slug = f"{base_slug}-{counter}"
                    counter += 1
                values = draft.values
                ingredient = Ingredient.objects.create(
                    name=draft.name.strip(),
                    slug=slug,
                    description=draft.description,
                    status=IngredientStatusChoices.DRAFT,
                    energy_kcal=values.get("energy_kcal"),
                    protein_g=values.get("protein_g"),
                    fat_g=values.get("fat_g"),
                    fat_sat_g=values.get("fat_sat_g"),
                    carbohydrate_g=values.get("carbohydrate_g"),
                    sugar_g=values.get("sugar_g"),
                    fibre_g=values.get("fibre_g"),
                    salt_g=values.get("salt_g"),
                    child_score=values.get("child_score"),
                    scout_score=values.get("scout_score"),
                    environmental_score=values.get("environmental_score"),
                    nova_score=values.get("nova_score"),
                    nutri_score=values.get("nutri_score"),
                    nutri_class=values.get("nutri_class"),
                    physical_density=values.get("physical_density") or 1,
                    physical_viscosity=values.get("physical_viscosity") or PhysicalViscosityChoices.SOLID,
                )
                aliases = values.get("aliases", [])
                if isinstance(aliases, list):
                    # Alias names are unique (case-insensitive); skip names that
                    # already point to another ingredient instead of failing.
                    alias_names: dict[str, str] = {}
                    for alias in aliases:
                        name = str(alias).strip()
                        if name:
                            alias_names.setdefault(name.lower(), name)
                    taken = set(
                        IngredientAlias.objects.annotate(name_lower=Lower("name"))
                        .filter(is_generic=False, name_lower__in=alias_names)
                        .values_list("name_lower", flat=True)
                    )
                    IngredientAlias.objects.bulk_create(
                        [
                            IngredientAlias(ingredient=ingredient, name=name)
                            for key, name in alias_names.items()
                            if key not in taken
                        ]
                    )
                temporary_portion = draft.portions[0] if draft.portions else None
                if temporary_portion is None or temporary_portion.weight_g is None or temporary_portion.weight_g <= 0:
                    raise HttpError(422, f"Für {draft.name} fehlt ein gültiges Portionsgewicht")
                unit_name = temporary_portion.measuring_unit_name or "Gramm"
                unit, _ = MeasuringUnit.objects.get_or_create(name=unit_name)
                portion = Portion.objects.create(
                    ingredient=ingredient,
                    name=temporary_portion.name,
                    measuring_unit=unit,
                    quantity=temporary_portion.quantity,
                    weight_g=temporary_portion.weight_g,
                    rank=1,
                    created_by=request.user,
                )
                portion_id = portion.id
        RecipeItem.objects.create(
            recipe=recipe,
            portion_id=portion_id,
            client_request_id=item_data.client_request_id,
            quantity=item_data.quantity,
            sort_order=item_data.sort_order,
            note=item_data.note,
            is_optional=item_data.is_optional,
        )

    from recipe.models import RecipeStep, RecipeStepIngredient

    for step_data in payload.steps:
        step = RecipeStep.objects.create(
            recipe=recipe,
            sort_order=step_data.sort_order,
            instruction=step_data.instruction,
            duration_minutes=step_data.duration_minutes,
            section=step_data.section,
        )
        for ingredient_data in step_data.step_ingredients:
            recipe_item = recipe.recipe_items.filter(id=ingredient_data.recipe_item_id).first()
            if recipe_item is None:
                raise HttpError(400, "Step verweist auf eine unbekannte Rezept-Zutat")
            RecipeStepIngredient.objects.create(
                step=step,
                recipe_item=recipe_item,
                quantity_modifier=ingredient_data.quantity_modifier,
                preparation=ingredient_data.preparation,
                sort_order=ingredient_data.sort_order,
            )

    if payload.source_url:
        recipe.source_url = payload.source_url
        recipe.save(update_fields=["source_url"])

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
@transaction.atomic
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

    # Choice fields have no meaningful empty value. Accepting "" would silently
    # wipe existing metadata, which is how the creation wizard used to destroy
    # AI-generated recipes. Free-text fields stay clearable on purpose.
    for field, label in EMPTY_REJECTING_CHOICE_FIELDS.items():
        if field in data and not (data[field] or "").strip():
            raise HttpError(422, f"{label} darf nicht leer sein")

    # Staff-only field protection
    if "status" in data and not request.user.is_staff:
        raise HttpError(403, "Nur Admins können den Rezept-Status ändern")
    if "authors_ids" in data and not request.user.is_staff:
        raise HttpError(403, "Nur Admins können die Autoren ändern")

    if "visibility" in data:
        if recipe.owner_id != request.user.id and not request.user.is_staff:
            raise HttpError(403, "Nur der Owner darf die Sichtbarkeit ändern")
        if data["visibility"] not in {"private", "group", "public"}:
            raise HttpError(400, "Ungültige Sichtbarkeit")

    # Owner-only field protection (breakfast wizard)
    if recipe.owner and ("shared_group_ids" in data):
        if recipe.owner_id != request.user.id and not request.user.is_staff:
            raise HttpError(403, "Nur der Owner darf Sharing-Einstellungen ändern")

    data.pop("portions", None)  # Always enforce portions=1
    scout_level_ids = data.pop("scout_level_ids", None)
    tag_ids = data.pop("tag_ids", None)
    nutritional_tag_ids = data.pop("nutritional_tag_ids", None)
    equipment_ids = data.pop("equipment_ids", None)
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
        recipe.tags.set(_resolve_tag_ids(tag_ids))
    if equipment_ids is not None:
        recipe.equipment.set(equipment_ids)
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

        from supply.models import Portion

        portion_ids = {
            item_data["portion_id"] for item_data in recipe_items_data if item_data["portion_id"] is not None
        }
        valid_portion_ids = set(
            Portion.objects.filter(id__in=portion_ids, deleted_at__isnull=True).values_list("id", flat=True)
        )
        missing_portion_ids = portion_ids - valid_portion_ids
        if missing_portion_ids:
            raise HttpError(400, f"Portionen nicht gefunden: {missing_portion_ids}")
        from supply.services.portion_resolution import resolve_trusted_weight

        unweighted_portion_ids = {
            portion.id
            for portion in Portion.objects.filter(id__in=portion_ids, deleted_at__isnull=True).select_related(
                "measuring_unit"
            )
            if resolve_trusted_weight(portion) is None
        }
        if unweighted_portion_ids:
            raise HttpError(422, f"Portionen ohne bestätigtes Gewicht: {sorted(unweighted_portion_ids)}")

        recipe.recipe_items.all().delete()
        for item_data in recipe_items_data:
            RecipeItem.objects.create(
                recipe=recipe,
                portion_id=item_data["portion_id"],
                client_request_id=item_data.get("client_request_id"),
                quantity=item_data.get("quantity", 1),
                sort_order=item_data.get("sort_order", 0),
                note=item_data.get("note", ""),
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

    from content.services.food_access import get_visible_recipe_or_404, require_action

    recipe = get_visible_recipe_or_404(request.user, recipe_id)
    require_action(recipe, request.user, "delete")

    from planner.models import MealItem

    recipe_item_ids = set(recipe.recipe_items.values_list("id", flat=True))
    has_active_variant = any(
        recipe_item_ids.intersection(meal_item.active_recipe_item_ids or [])
        for meal_item in MealItem.objects.filter(recipe=recipe).only("active_recipe_item_ids")
    )
    if has_active_variant:
        raise HttpError(409, "Das Rezept wird mit aktiven Varianten in einem Essensplan verwendet.")

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
def fork_recipe(request, recipe_id: int, payload: ForkRecipeIn | None = None):
    """Create a personal copy (fork) of a recipe.

    Copies the recipe and all its RecipeItems, setting owner to the current user.
    Accepts an optional custom title for the clone.
    """
    _require_auth(request)

    if payload is None:
        payload = ForkRecipeIn()

    from content.services.food_access import get_visible_recipe_or_404

    original = get_visible_recipe_or_404(request.user, recipe_id)
    original = Recipe.objects.prefetch_related(
        "recipe_items__portion",
        "exchange_groups",
        "tags",
        "scout_levels",
        "nutritional_tags",
    ).get(pk=original.pk)

    with transaction.atomic():
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

        fork.tags.set(original.tags.all())
        fork.scout_levels.set(original.scout_levels.all())
        fork.nutritional_tags.set(original.nutritional_tags.all())
        fork.authors.add(request.user)

        from recipe.models import RecipeItemExchangeGroup

        group_map: dict[int, RecipeItemExchangeGroup] = {}
        for group in original.exchange_groups.all():
            group_map[group.id] = RecipeItemExchangeGroup.objects.create(
                recipe=fork,
                name=group.name,
            )

        for item in original.recipe_items.all():
            exchange_group = group_map.get(item.exchange_group_id) if item.exchange_group_id is not None else None
            RecipeItem.objects.create(
                recipe=fork,
                portion_id=item.portion_id,
                quantity=item.quantity,
                sort_order=item.sort_order,
                note=item.note,
                is_optional=item.is_optional,
                exchange_group=exchange_group,
                exchange_position=item.exchange_position,
            )

    fork.emotion_counts = {}
    fork.user_emotion = None
    fork.can_edit = True
    fork.next_best_recipes = []

    return fork


# ===========================================================================
# Verification
# ===========================================================================


@router.post("/{recipe_id}/verify/", response=VerifyStatusOut)
def verify_recipe_endpoint(request, recipe_id: int, payload: VerifyRequestIn):
    """Verify a recipe. Staff-only. Checks rules and required fields, warns if not all met."""
    _require_auth(request)
    if not request.user.is_staff:
        raise HttpError(403, "Nur Staff-User dürfen Rezepte verifizieren")

    recipe = get_object_or_404(Recipe, id=recipe_id)

    from recipe.services.verification_service import verify_recipe

    result = verify_recipe(recipe, reviewer=request.user, confirm=payload.confirm)
    return result.to_dict()


@router.get("/{recipe_id}/verification-status/", response=VerifyStatusOut)
def get_verification_status(request, recipe_id: int):
    """Get the verification readiness status for a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id)

    from recipe.services.verification_service import check_verification_readiness

    result = check_verification_readiness(recipe)
    return result.to_dict()


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
