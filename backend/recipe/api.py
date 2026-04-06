"""Django Ninja API routes for standalone recipes."""

import logging
import math
import time

from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from ninja import Query, Router
from ninja.errors import HttpError

from .models import Recipe, RecipeComment, RecipeEmotion, RecipeItem, RecipeView
from .schemas import (
    PaginatedRecipeOut,
    RecipeCommentIn,
    RecipeCommentOut,
    RecipeCreateIn,
    RecipeDetailOut,
    RecipeEmotionIn,
    RecipeEmotionOut,
    RecipeFilterIn,
    RecipeItemCreateIn,
    RecipeItemOut,
    RecipeItemUpdateIn,
    RecipeListOut,
    RecipeUpdateIn,
    RecipeCheckOut,
    RecipeHintMatchOut,
    NutriScoreDetailOut,
    RecipeNutritionBreakdownOut,
    RecipeSimilarOut,
)

logger = logging.getLogger(__name__)

router = Router(tags=["recipes"])


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
    qs = Recipe.objects.filter(status="published").prefetch_related("scout_levels", "tags__parent")

    # Show drafts to authenticated users
    if request.user.is_authenticated:
        if request.user.is_staff:
            qs = Recipe.objects.all().prefetch_related("scout_levels", "tags__parent")
        else:
            qs = Recipe.objects.filter(Q(status="published") | Q(created_by=request.user)).prefetch_related(
                "scout_levels", "tags__parent"
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
        "most_viewed": "-view_count",
    }
    order = sort_map.get(filters.sort, "-created_at")
    if filters.sort == "random":
        qs = qs.order_by("?")
    else:
        qs = qs.order_by(order)

    total = qs.count()
    total_pages = max(1, math.ceil(total / filters.page_size))
    offset = (filters.page - 1) * filters.page_size
    items = list(qs[offset : offset + filters.page_size])

    return {
        "items": items,
        "total": total,
        "page": filters.page,
        "page_size": filters.page_size,
        "total_pages": total_pages,
    }


@router.get("/{recipe_id}/", response=RecipeDetailOut)
def get_recipe(request, recipe_id: int):
    """Get recipe detail by ID."""
    recipe = get_object_or_404(
        Recipe.objects.prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient",
            "recipe_items__portion__measuring_unit",
            "recipe_items__ingredient",
            "recipe_items__measuring_unit",
            "authors__profile",
        ),
        id=recipe_id,
    )

    # Emotion counts
    emotions = RecipeEmotion.objects.filter(recipe=recipe).values("emotion_type").annotate(count=Count("id"))
    emotion_counts = {e["emotion_type"]: e["count"] for e in emotions}

    # User's emotion
    user_emotion = None
    if request.user.is_authenticated:
        ue = RecipeEmotion.objects.filter(recipe=recipe, created_by=request.user).first()
        if ue:
            user_emotion = ue.emotion_type

    recipe.emotion_counts = emotion_counts
    recipe.user_emotion = user_emotion
    recipe.can_edit = _can_edit_recipe(request, recipe)

    # Similar recipes
    tag_ids = list(recipe.tags.values_list("id", flat=True))
    similar_qs = Recipe.objects.filter(status="published").exclude(id=recipe_id)
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

    return recipe


@router.get("/by-slug/{slug}/", response=RecipeDetailOut)
def get_recipe_by_slug(request, slug: str):
    """Get recipe detail by slug (SEO-friendly)."""
    recipe = get_object_or_404(
        Recipe.objects.prefetch_related(
            "scout_levels",
            "tags__parent",
            "nutritional_tags",
            "recipe_items__portion__ingredient",
            "recipe_items__portion__measuring_unit",
            "recipe_items__ingredient",
            "recipe_items__measuring_unit",
            "authors__profile",
        ),
        slug=slug,
    )

    # Emotion counts
    emotions = RecipeEmotion.objects.filter(recipe=recipe).values("emotion_type").annotate(count=Count("id"))
    emotion_counts = {e["emotion_type"]: e["count"] for e in emotions}

    # User's emotion
    user_emotion = None
    if request.user.is_authenticated:
        ue = RecipeEmotion.objects.filter(recipe=recipe, created_by=request.user).first()
        if ue:
            user_emotion = ue.emotion_type

    recipe.emotion_counts = emotion_counts
    recipe.user_emotion = user_emotion
    recipe.can_edit = _can_edit_recipe(request, recipe)

    # Similar recipes
    tag_ids = list(recipe.tags.values_list("id", flat=True))
    similar_qs = Recipe.objects.filter(status="published").exclude(id=recipe.id)
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

    return recipe


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

    # Emotion counts
    emotions = RecipeEmotion.objects.filter(recipe=recipe).values("emotion_type").annotate(count=Count("id"))
    recipe.emotion_counts = {e["emotion_type"]: e["count"] for e in emotions}
    recipe.user_emotion = None
    recipe.can_edit = True
    recipe.next_best_recipes = []

    return recipe


@router.delete("/{recipe_id}/")
def delete_recipe(request, recipe_id: int):
    """Delete a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)

    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    recipe.delete()
    return {"success": True}


# ==========================================================================
# Recipe Items CRUD
# ==========================================================================


@router.get("/{recipe_id}/recipe-items/", response=list[RecipeItemOut])
def list_recipe_items(request, recipe_id: int):
    """List recipe items for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    return RecipeItem.objects.filter(recipe=recipe).select_related("portion", "portion__ingredient", "portion__measuring_unit", "ingredient", "measuring_unit")


@router.post("/{recipe_id}/recipe-items/", response=RecipeItemOut)
def create_recipe_item(request, recipe_id: int, payload: RecipeItemCreateIn):
    """Add a recipe item to a recipe."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = RecipeItem.objects.create(
        recipe=recipe,
        portion_id=payload.portion_id,
        ingredient_id=payload.ingredient_id,
        quantity=payload.quantity,
        measuring_unit_id=payload.measuring_unit_id,
        sort_order=payload.sort_order,
        note=payload.note,
        quantity_type=payload.quantity_type,
    )
    return item


@router.patch("/{recipe_id}/recipe-items/{item_id}/", response=RecipeItemOut)
def update_recipe_item(request, recipe_id: int, item_id: int, payload: RecipeItemUpdateIn):
    """Update a recipe item."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)

    data = payload.dict(exclude_unset=True)
    for field, value in data.items():
        setattr(item, field, value)
    item.save()

    return item


@router.delete("/{recipe_id}/recipe-items/{item_id}/")
def delete_recipe_item(request, recipe_id: int, item_id: int):
    """Delete a recipe item."""
    _require_auth(request)

    recipe = get_object_or_404(Recipe, id=recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)
    item.delete()
    return {"success": True}


# ==========================================================================
# Comments
# ==========================================================================


@router.get("/{recipe_id}/comments/", response=list[RecipeCommentOut])
def list_recipe_comments(request, recipe_id: int):
    """List approved comments for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    qs = RecipeComment.objects.filter(recipe=recipe, status="approved")
    return qs


@router.post("/{recipe_id}/comments/", response=RecipeCommentOut)
def create_recipe_comment(request, recipe_id: int, payload: RecipeCommentIn):
    """Create a comment on a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)

    comment = RecipeComment(
        recipe=recipe,
        text=payload.text,
        parent_id=payload.parent_id,
    )

    if request.user.is_authenticated:
        comment.user = request.user
        comment.created_by = request.user
        comment.status = "approved"
    else:
        comment.author_name = payload.author_name or "Anonym"
        comment.status = "pending"

    comment.save()
    return comment


# ==========================================================================
# Emotions
# ==========================================================================


@router.post("/{recipe_id}/emotions/", response=RecipeEmotionOut)
def toggle_recipe_emotion(request, recipe_id: int, payload: RecipeEmotionIn):
    """Add or toggle emotion on a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)

    if request.user.is_authenticated:
        existing = RecipeEmotion.objects.filter(recipe=recipe, created_by=request.user).first()
        if existing:
            if existing.emotion_type == payload.emotion_type:
                existing.delete()
                # Recalculate like_score
                _update_like_score(recipe)
                return existing
            existing.emotion_type = payload.emotion_type
            existing.save()
            _update_like_score(recipe)
            return existing
        emotion = RecipeEmotion.objects.create(
            recipe=recipe,
            emotion_type=payload.emotion_type,
            created_by=request.user,
        )
    else:
        session_key = request.session.session_key or ""
        emotion = RecipeEmotion.objects.create(
            recipe=recipe,
            emotion_type=payload.emotion_type,
            session_key=session_key,
        )

    _update_like_score(recipe)
    return emotion


def _update_like_score(recipe: Recipe):
    """Recalculate like_score from emotions."""
    emotions = RecipeEmotion.objects.filter(recipe=recipe)
    score = 0
    for e in emotions:
        if e.emotion_type == "in_love":
            score += 1
        elif e.emotion_type == "happy":
            score += 1
        elif e.emotion_type == "disappointed":
            score -= 1
    recipe.like_score = score
    recipe.save(update_fields=["like_score"])


# ==========================================================================
# Recipe Analysis (Nutri-Score, Hints, Checks)
# ==========================================================================


@router.get("/{recipe_id}/recipe-checks/", response=list[RecipeCheckOut])
def get_recipe_checks(request, recipe_id: int):
    """Get 4-dimension recipe checks."""
    from idea.services.recipe_checks import get_recipe_checks as _get_checks

    recipe = get_object_or_404(Recipe, id=recipe_id)
    return _get_checks(recipe)


@router.get("/{recipe_id}/recipe-hints/", response=list[RecipeHintMatchOut])
def get_recipe_hints(request, recipe_id: int, recipe_objective: str = ""):
    """Get recipe improvement hints."""
    from idea.services.recipe_checks import match_recipe_hints

    recipe = get_object_or_404(Recipe, id=recipe_id)
    matches = match_recipe_hints(recipe, recipe_objective)

    return [
        {
            "hint": {
                "id": m["hint"].id,
                "name": m["hint"].name,
                "description": m["hint"].description,
                "parameter": m["hint"].parameter,
                "min_value": m["hint"].min_value,
                "max_value": m["hint"].max_value,
                "min_max": m["hint"].min_max,
                "hint_level": m["hint"].hint_level,
                "recipe_type": m["hint"].recipe_type,
                "recipe_objective": m["hint"].recipe_objective,
            },
            "actual_value": m["actual_value"],
            "message": m["message"],
        }
        for m in matches
    ]


@router.get("/{recipe_id}/nutri-score/", response=NutriScoreDetailOut)
def get_recipe_nutri_score(request, recipe_id: int):
    """Get detailed Nutri-Score for a recipe."""
    from idea.services.recipe_checks import get_recipe_nutritional_values
    from idea.services.nutri_service import get_nutri_score_details

    recipe = get_object_or_404(Recipe, id=recipe_id)
    values = get_recipe_nutritional_values(recipe)

    class _AggIngredient:
        pass

    agg = _AggIngredient()
    for k, v in values.items():
        setattr(agg, k, v)
    agg.physical_viscosity = "solid"

    return get_nutri_score_details(agg)


# ==========================================================================
# Nutritional Breakdown (per ingredient)
# ==========================================================================


@router.get("/{recipe_id}/nutrition-breakdown/", response=RecipeNutritionBreakdownOut)
def get_recipe_nutrition_breakdown(request, recipe_id: int):
    """Get detailed nutritional breakdown per ingredient for a recipe."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    items = RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion", "portion__ingredient", "ingredient", "measuring_unit"
    )

    result_items = []
    total_weight_g = 0.0
    total_price = 0.0
    has_prices = False
    totals = {
        "energy_kj": 0.0,
        "protein_g": 0.0,
        "fat_g": 0.0,
        "fat_sat_g": 0.0,
        "carbohydrate_g": 0.0,
        "sugar_g": 0.0,
        "fibre_g": 0.0,
        "salt_g": 0.0,
    }

    # First pass: calculate weights
    item_data = []
    for item in items:
        ingredient = item.ingredient or (item.portion.ingredient if item.portion else None)
        if not ingredient:
            continue

        weight_g = 0.0
        if item.portion and item.portion.weight_g:
            weight_g = item.quantity * item.portion.weight_g
        elif item.portion and item.portion.measuring_unit:
            weight_g = item.quantity * item.portion.quantity * item.portion.measuring_unit.quantity
        else:
            continue

        # Price
        item_price = None
        if ingredient.price_per_kg:
            has_prices = True
            item_price = float(ingredient.price_per_kg) * weight_g / 1000.0
            total_price += item_price

        total_weight_g += weight_g
        factor = weight_g / 100.0

        item_nutrition = {}
        for field in totals:
            val = getattr(ingredient, field, None) or 0.0
            contribution = val * factor
            item_nutrition[field] = contribution
            totals[field] += contribution

        energy_kcal = item_nutrition["energy_kj"] / 4.184

        item_data.append(
            {
                "recipe_item_id": item.id,
                "ingredient_id": ingredient.id,
                "ingredient_name": ingredient.name,
                "quantity": item.quantity,
                "portion_name": str(item.portion)
                if item.portion
                else (item.measuring_unit.name if item.measuring_unit else "Stueck"),
                "weight_g": round(weight_g, 1),
                "price_eur": round(item_price, 2) if item_price is not None else None,
                "energy_kj": round(item_nutrition["energy_kj"], 1),
                "energy_kcal": round(energy_kcal, 1),
                "protein_g": round(item_nutrition["protein_g"], 1),
                "fat_g": round(item_nutrition["fat_g"], 1),
                "fat_sat_g": round(item_nutrition["fat_sat_g"], 1),
                "carbohydrate_g": round(item_nutrition["carbohydrate_g"], 1),
                "sugar_g": round(item_nutrition["sugar_g"], 1),
                "fibre_g": round(item_nutrition["fibre_g"], 1),
                "salt_g": round(item_nutrition["salt_g"], 1),
                "weight_pct": 0.0,
            }
        )

    # Second pass: calculate weight percentages
    for item in item_data:
        if total_weight_g > 0:
            item["weight_pct"] = round(item["weight_g"] / total_weight_g * 100, 1)
        result_items.append(item)

    total_energy_kcal = totals["energy_kj"] / 4.184
    servings = recipe.servings or 1

    return {
        "total_weight_g": round(total_weight_g, 1),
        "total_price_eur": round(total_price, 2) if has_prices else None,
        "total_energy_kj": round(totals["energy_kj"], 1),
        "total_energy_kcal": round(total_energy_kcal, 1),
        "total_protein_g": round(totals["protein_g"], 1),
        "total_fat_g": round(totals["fat_g"], 1),
        "total_fat_sat_g": round(totals["fat_sat_g"], 1),
        "total_carbohydrate_g": round(totals["carbohydrate_g"], 1),
        "total_sugar_g": round(totals["sugar_g"], 1),
        "total_fibre_g": round(totals["fibre_g"], 1),
        "total_salt_g": round(totals["salt_g"], 1),
        "per_serving_energy_kcal": round(total_energy_kcal / servings, 1),
        "per_serving_protein_g": round(totals["protein_g"] / servings, 1),
        "per_serving_fat_g": round(totals["fat_g"] / servings, 1),
        "per_serving_carbohydrate_g": round(totals["carbohydrate_g"] / servings, 1),
        "items": result_items,
    }


# ==========================================================================
# Similar Recipes (tag-based)
# ==========================================================================


@router.get("/{recipe_id}/similar/", response=list[RecipeSimilarOut])
def get_similar_recipes(request, recipe_id: int):
    """Get similar recipes based on shared tags and recipe type."""
    recipe = get_object_or_404(Recipe, id=recipe_id)
    tag_ids = list(recipe.tags.values_list("id", flat=True))

    # Find recipes sharing the most tags
    qs = Recipe.objects.filter(status="published").exclude(id=recipe_id).prefetch_related("tags")

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
