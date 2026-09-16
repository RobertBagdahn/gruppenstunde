"""RecipeItem CRUD endpoints."""

import hashlib
import json
from typing import cast

from django.db import IntegrityError, transaction
from django.shortcuts import get_object_or_404
from django.utils.text import slugify
from ninja import Router, Status
from ninja.errors import HttpError

from recipe.models import Recipe, RecipeItem, RecipeItemExchangeGroup, RecipeItemIdempotencyRecord
from recipe.schemas import (
    AiIngredientApplyIn,
    AiIngredientSuggestionsOut,
    EstimateQuantitiesOut,
    RecipeItemCreateIn,
    RecipeItemExchangeGroupCreateIn,
    RecipeItemExchangeGroupOut,
    RecipeItemOut,
    RecipeItemReplaceIn,
    RecipeItemUpdateIn,
)
from supply.models import Portion
from supply.services.portion_resolution import resolve_trusted_weight


def _recipe_item_has_active_variants(item: RecipeItem) -> bool:
    """True if any MealItem references this recipe item in active_recipe_item_ids."""
    from planner.models import MealItem

    return any(
        item.id in (mi.active_recipe_item_ids or [])
        for mi in MealItem.objects.filter(recipe=item.recipe).only("active_recipe_item_ids").iterator()
    )


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


def _get_visible_recipe_or_404(request, recipe_id: int, require_auth: bool = True) -> Recipe:
    if require_auth:
        _require_auth(request)
    from content.services.food_access import get_visible_recipe_or_404

    return cast(Recipe, get_visible_recipe_or_404(request.user, recipe_id))


def _require_weighted_portion(portion: Portion) -> None:
    if resolve_trusted_weight(portion) is None:
        raise HttpError(422, "Diese Portion hat kein bestätigtes Gewicht und kann nicht im Rezept verwendet werden.")


@router.get("/{recipe_id}/recipe-items/", response=list[RecipeItemOut])
def list_recipe_items(request, recipe_id: int):
    """List recipe items for a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return RecipeItem.objects.filter(recipe=recipe).select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    )


def _compute_item_payload_hash(payload: RecipeItemCreateIn) -> str:
    data = {
        "portion_id": payload.portion_id,
        "quantity": payload.quantity,
        "sort_order": payload.sort_order,
        "note": payload.note.strip(),
        "is_optional": bool(payload.is_optional),
    }
    dumped = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()


@router.post("/{recipe_id}/recipe-items/", response=RecipeItemOut)
def create_recipe_item(request, recipe_id: int, payload: RecipeItemCreateIn):
    """Add a recipe item to a recipe."""
    _require_auth(request)

    request_key = (payload.idempotency_key or payload.client_request_id or "").strip() or None
    payload_hash = _compute_item_payload_hash(payload) if request_key else ""

    with transaction.atomic():
        recipe = _get_visible_recipe_or_404(request, recipe_id)
        recipe = Recipe.objects.select_for_update().get(pk=recipe.pk)
        if not _can_edit_recipe(request, recipe):
            raise HttpError(403, "Keine Berechtigung")

        item = None
        if request_key:
            record = (
                RecipeItemIdempotencyRecord.objects.select_for_update()
                .filter(
                    user=request.user,
                    recipe=recipe,
                    operation=RecipeItemIdempotencyRecord.OPERATION_CREATE,
                    request_key=request_key,
                )
                .first()
            )
            if record:
                if record.payload_hash != payload_hash:
                    raise HttpError(
                        409,
                        "Dieser Idempotency-Key wurde bereits für eine abweichende Zutat verwendet.",
                    )
                if record.recipe_item:
                    item = record.recipe_item

        if item is None:
            # Fallback legacy lookup by client_request_id directly on RecipeItem
            if request_key:
                existing_item = RecipeItem.objects.filter(
                    recipe=recipe,
                    client_request_id=request_key,
                ).first()
                if existing_item:
                    item = existing_item

        if item is None:
            if payload.portion_id is not None:
                portion = Portion.objects.filter(id=payload.portion_id, deleted_at__isnull=True).first()
                if portion is None:
                    raise HttpError(400, "Portion existiert nicht")
                _require_weighted_portion(portion)
            if payload.quantity <= 0:
                raise HttpError(400, "Menge muss größer als 0 sein")

            item = RecipeItem.objects.create(
                recipe=recipe,
                portion_id=payload.portion_id,
                client_request_id=request_key,
                quantity=payload.quantity,
                sort_order=payload.sort_order,
                note=payload.note,
                is_optional=payload.is_optional,
            )
            if request_key:
                try:
                    RecipeItemIdempotencyRecord.objects.create(
                        user=request.user,
                        recipe=recipe,
                        operation=RecipeItemIdempotencyRecord.OPERATION_CREATE,
                        request_key=request_key,
                        payload_hash=payload_hash,
                        recipe_item=item,
                    )
                except IntegrityError:
                    record = RecipeItemIdempotencyRecord.objects.get(
                        user=request.user,
                        recipe=recipe,
                        operation=RecipeItemIdempotencyRecord.OPERATION_CREATE,
                        request_key=request_key,
                    )
                    if record.payload_hash != payload_hash:
                        raise HttpError(
                            409,
                            "Dieser Idempotency-Key wurde bereits für eine abweichende Zutat verwendet.",
                        )
                    item.delete()
                    item = record.recipe_item
                    if item is None:
                        raise HttpError(500, "Fehler beim Auflösen der idempotenten Zutat")

    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    ).get(id=item.id)
    return item


@router.patch("/{recipe_id}/recipe-items/{item_id}/", response=RecipeItemOut)
def update_recipe_item(request, recipe_id: int, item_id: int, payload: RecipeItemUpdateIn):
    """Update a recipe item."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)

    data = payload.dict(exclude_unset=True)
    expected_grams_total = data.pop("expected_grams_total", None)

    # Determine resulting optional/exchange state to validate mutual exclusion.
    result_is_optional = data.get("is_optional", item.is_optional)
    result_exchange_group = data["exchange_group_id"] if "exchange_group_id" in data else item.exchange_group_id
    if result_is_optional and result_exchange_group is not None:
        raise HttpError(
            400,
            "Eine Zutat kann nicht gleichzeitig optional und Teil einer Austausch-Gruppe sein.",
        )

    # Protect split-relevant fields while active variants reference this item.
    split_relevant = {"is_optional", "exchange_group_id", "exchange_position"}
    if split_relevant & data.keys() and _recipe_item_has_active_variants(item):
        raise HttpError(
            409,
            "Diese Zutat wird in aktiven Essensplänen mit Varianten verwendet und kann nicht geändert werden.",
        )

    # Plausibility check (safety net): if the client tells us what gram total
    # it intended (e.g. when applying an AI quantity estimate), verify the
    # resulting quantity * portion.weight_g matches within a generous tolerance
    # (15% or 2g). The wide tolerance allows legitimate cooking-portion
    # variations and floating-point noise while still catching catastrophic
    # mismatches (factor 10+ errors from client bugs).
    if expected_grams_total is not None:
        result_portion_id = data.get("portion_id", item.portion_id)
        result_quantity = data.get("quantity", item.quantity)
        portion = (
            item.portion if result_portion_id == item.portion_id else get_object_or_404(Portion, id=result_portion_id)
        )
        if portion is None:
            raise HttpError(400, "Zutat hat keine Portion")
        _require_weighted_portion(portion)
        resulting_weight_g = resolve_trusted_weight(portion)
        if resulting_weight_g is None:
            raise HttpError(422, "Die Portion hat kein bestätigtes Gewicht.")
        resulting_grams = result_quantity * resulting_weight_g
        tolerance = max(abs(expected_grams_total) * 0.15, 2.0)
        if abs(resulting_grams - expected_grams_total) > tolerance:
            raise HttpError(
                422,
                "Die resultierende Menge weicht von der erwarteten Gramm-Menge ab "
                f"(erwartet {expected_grams_total}g, ergäbe {resulting_grams:.2f}g). "
                "Speichern abgebrochen, um eine falsche Portion/Menge-Kombination zu verhindern.",
            )

    for field, value in data.items():
        setattr(item, field, value)
    item.save()

    # Reload with relations for schema resolvers
    item = RecipeItem.objects.select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    ).get(id=item.id)
    return item


def _compute_replace_payload_hash(payload: RecipeItemReplaceIn) -> str:
    data = {
        "portion_id": payload.portion_id,
        "quantity": payload.quantity,
    }
    dumped = json.dumps(data, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(dumped.encode("utf-8")).hexdigest()


def _reload_item_with_relations(item_id: int) -> RecipeItem:
    return RecipeItem.objects.select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    ).get(id=item_id)


@router.post("/{recipe_id}/items/{item_id}/replace/", response=RecipeItemOut)
def replace_recipe_item(request, recipe_id: int, item_id: int, payload: RecipeItemReplaceIn):
    """Replace a RecipeItem's portion with a target portion atomically.

    The existing RecipeItem row (and its ID, sort order, note, optional flag
    and step assignments) is kept; only portion and quantity change. The
    quantity is derived from the item's current gram amount when both the
    source and target portions have trusted weights, otherwise an explicit
    quantity is required. Repeating a request with the same
    `client_request_id` returns the already-replaced item (idempotency).
    """
    _require_auth(request)

    request_key = (payload.client_request_id or "").strip() or None
    payload_hash = _compute_replace_payload_hash(payload) if request_key else ""

    with transaction.atomic():
        recipe = _get_visible_recipe_or_404(request, recipe_id)
        recipe = Recipe.objects.select_for_update().get(pk=recipe.pk)
        if not _can_edit_recipe(request, recipe):
            raise HttpError(403, "Keine Berechtigung")

        item = (
            RecipeItem.objects.select_for_update()
            .filter(id=item_id, recipe=recipe)
            .select_related("portion", "portion__measuring_unit")
            .first()
        )
        if item is None:
            raise HttpError(404, "Zutat nicht gefunden")

        already_applied = False
        if request_key:
            record = (
                RecipeItemIdempotencyRecord.objects.select_for_update()
                .filter(
                    user=request.user,
                    recipe=recipe,
                    operation=RecipeItemIdempotencyRecord.OPERATION_REPLACE,
                    request_key=request_key,
                )
                .first()
            )
            if record:
                if record.payload_hash != payload_hash:
                    raise HttpError(
                        409,
                        "Dieser Idempotency-Key wurde bereits für eine abweichende Ersetzung verwendet.",
                    )
                already_applied = True
                if record.recipe_item_id is not None:
                    item = record.recipe_item
                else:
                    raise HttpError(500, "Fehler beim Auflösen der idempotenten Ersetzung")

        if not already_applied:
            target_portion = (
                Portion.objects.filter(id=payload.portion_id, deleted_at__isnull=True)
                .select_related("ingredient", "measuring_unit")
                .first()
            )
            if target_portion is None:
                raise HttpError(404, "Portion existiert nicht")

            if target_portion.id == item.portion_id and payload.quantity is None:
                return _reload_item_with_relations(item.id)

            if payload.ingredient_id is not None and target_portion.ingredient_id != payload.ingredient_id:
                raise HttpError(422, "Die Portion gehört nicht zur angeforderten Zutat.")

            from supply.services.portion_resolution import resolve_trusted_weight

            if item.portion is None:
                source_weight = 1.0
            else:
                source_weight = resolve_trusted_weight(item.portion)
            target_weight = resolve_trusted_weight(target_portion)

            used_automatic_conversion = payload.quantity is None
            if payload.quantity is not None:
                if payload.quantity <= 0:
                    raise HttpError(400, "Menge muss größer als 0 sein")
                new_quantity = payload.quantity
            elif source_weight is not None and target_weight is not None:
                current_grams = item.quantity * source_weight
                new_quantity = current_grams / target_weight
            else:
                raise HttpError(
                    422,
                    "Die Zielmenge kann nicht automatisch umgerechnet werden. Bitte Zielmenge auswählen.",
                )

            rounded_quantity = max(round(new_quantity, 4), 0.0001)
            if used_automatic_conversion and source_weight is not None and target_weight is not None:
                expected_grams = item.quantity * source_weight
                actual_grams = rounded_quantity * target_weight
                tolerance = max(abs(expected_grams) * 0.001, 0.01)
                if abs(actual_grams - expected_grams) > tolerance:
                    raise HttpError(
                        422,
                        "Die automatische Umrechnung weicht zu stark von der technischen Grammmenge ab. "
                        "Bitte eine Zielmenge auswählen.",
                    )
            new_quantity = rounded_quantity

            item.portion = target_portion
            item.quantity = new_quantity
            item.save(update_fields=["portion", "quantity"])

            if request_key:
                try:
                    RecipeItemIdempotencyRecord.objects.create(
                        user=request.user,
                        recipe=recipe,
                        operation=RecipeItemIdempotencyRecord.OPERATION_REPLACE,
                        request_key=request_key,
                        payload_hash=payload_hash,
                        recipe_item=item,
                    )
                except IntegrityError:
                    record = RecipeItemIdempotencyRecord.objects.get(
                        user=request.user,
                        recipe=recipe,
                        operation=RecipeItemIdempotencyRecord.OPERATION_REPLACE,
                        request_key=request_key,
                    )
                    if record.payload_hash != payload_hash:
                        raise HttpError(
                            409,
                            "Dieser Idempotency-Key wurde bereits für eine abweichende Ersetzung verwendet.",
                        )
                    if record.recipe_item_id is not None:
                        item = record.recipe_item

            # Recalculate denormalized nutrition/price caches
            from recipe.services.recipe_checks import recalculate_recipe_cache

            recalculate_recipe_cache(recipe)

    return _reload_item_with_relations(item.id)


@router.delete("/{recipe_id}/recipe-items/{item_id}/")
def delete_recipe_item(request, recipe_id: int, item_id: int):
    """Delete a recipe item."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    item = get_object_or_404(RecipeItem, id=item_id, recipe=recipe)
    if _recipe_item_has_active_variants(item):
        raise HttpError(
            409,
            "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden.",
        )
    item.delete()
    return {"success": True}


# ---------------------------------------------------------------------------
# Exchange groups
# ---------------------------------------------------------------------------


@router.get("/{recipe_id}/exchanges/", response=list[RecipeItemExchangeGroupOut])
def list_exchange_groups(request, recipe_id: int):
    """List all exchange groups of a recipe."""
    recipe = _get_visible_recipe_or_404(request, recipe_id, require_auth=False)
    return RecipeItemExchangeGroup.objects.filter(recipe=recipe).prefetch_related(
        "items__portion__ingredient",
    )


@router.post("/{recipe_id}/exchanges/", response={201: RecipeItemExchangeGroupOut})
def create_exchange_group(request, recipe_id: int, payload: RecipeItemExchangeGroupCreateIn):
    """Create an exchange group for a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name=payload.name)
    return Status(201, group)


@router.delete("/{recipe_id}/exchanges/{group_id}/")
def delete_exchange_group(request, recipe_id: int, group_id: int):
    """Delete an exchange group.

    Blocked (409) if any active variant references its members (via active_recipe_item_ids).
    Otherwise the non-default members (exchange_position > 0) are deleted and the original
    (position 0) is reset to a normal ingredient (exchange_group=None).
    """
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    group = get_object_or_404(RecipeItemExchangeGroup, id=group_id, recipe=recipe)

    members = list(group.items.all())
    if any(_recipe_item_has_active_variants(m) for m in members):
        raise HttpError(
            409,
            "Diese Austausch-Gruppe wird in aktiven Essensplänen verwendet und kann nicht gelöscht werden.",
        )

    for member in members:
        if (member.exchange_position or 0) > 0:
            member.delete()
        else:
            member.exchange_group = None
            member.exchange_position = None
            member.save(update_fields=["exchange_group", "exchange_position"])

    group.delete()
    return {"success": True}


@router.post(
    "/{recipe_id}/ai-suggest-ingredients/",
    response=AiIngredientSuggestionsOut,
)
def ai_suggest_ingredients(request, recipe_id: int):
    """Use AI to suggest ingredients for a recipe."""
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeAiIngredientsService
    from supply.models import Ingredient, IngredientAlias
    from supply.services.term_normalization import normalize_term

    service = RecipeAiIngredientsService()
    service_result = service.get_full_suggestions(recipe, user=request.user)
    if isinstance(service_result, tuple):
        results, interaction_id = service_result
    else:
        results, interaction_id = service_result, None

    if results is None:
        raise HttpError(503, "KI-Vorschläge konnten nicht generiert werden")

    # Collect ingredient IDs already in this recipe (via portions)
    existing_ingredient_ids: set[int] = set(
        recipe.recipe_items.select_related("portion__ingredient").values_list("portion__ingredient_id", flat=True)
    )

    # Also collect alias ingredient IDs for ingredients already in the recipe
    # so that e.g. "Zwiebeln" is excluded when "Zwiebel" is already present
    alias_ingredient_ids: set[int] = set(
        IngredientAlias.objects.filter(ingredient_id__in=existing_ingredient_ids).values_list(
            "ingredient_id", flat=True
        )
    )
    all_excluded_ids = existing_ingredient_ids | alias_ingredient_ids

    # Also exclude via normalized (stemmed) name comparison, so plural/singular
    # variants without a maintained alias (e.g. "Zwiebeln" vs "Zwiebel") are not
    # suggested again as a duplicate.
    existing_normalized_names = {
        normalize_term(name)
        for name in Ingredient.objects.filter(id__in=existing_ingredient_ids).values_list("name", flat=True)
    }

    filtered = [
        r
        for r in results
        if (
            r.replacement_for_item_id is not None
            or (
                r.ingredient_id not in all_excluded_ids
                and normalize_term(r.ingredient_name) not in existing_normalized_names
            )
        )
    ]

    return {
        "items": [
            {
                "ingredient_id": r.ingredient_id,
                "ingredient_name": r.ingredient_name,
                "portion_id": r.portion_id,
                "portion_name": r.portion_name,
                "quantity": r.quantity,
                "is_new_ingredient": r.is_new_ingredient,
                "note": r.note,
                "replacement_for_item_id": r.replacement_for_item_id,
                "replacement_reason": r.replacement_reason,
                "replacement_confidence": r.replacement_confidence,
            }
            for r in filtered
        ],
        "ai_interaction_id": interaction_id,
    }


@router.post("/{recipe_id}/ai-apply-ingredients/", response=list[RecipeItemOut])
def ai_apply_ingredients(request, recipe_id: int, payload: list[AiIngredientApplyIn]):
    """Apply AI-suggested ingredients as RecipeItems.

    Resolved candidates reference an existing portion. Unresolved candidates
    (no portion) are materialized here at apply time: a missing draft
    Ingredient and/or gram fallback portion are created only on confirmation,
    never during preview.
    """
    _require_auth(request)

    recipe = _get_visible_recipe_or_404(request, recipe_id)
    if not _can_edit_recipe(request, recipe):
        raise HttpError(403, "Keine Berechtigung")

    from supply.choices import IngredientStatusChoices
    from supply.models import Ingredient, MeasuringUnit

    # Get current max sort_order
    last_sort = (
        RecipeItem.objects.filter(recipe=recipe).order_by("-sort_order").values_list("sort_order", flat=True).first()
    ) or 0

    # Filter out duplicates: skip ingredients already in the recipe
    existing_ingredient_ids = set(
        RecipeItem.objects.filter(recipe=recipe).values_list("portion__ingredient_id", flat=True)
    )

    def _resolve_portion(item_in: AiIngredientApplyIn):
        """Return (portion, ingredient_id) creating draft data on demand."""
        if item_in.portion_id is not None:
            portion = (
                Portion.objects.filter(id=item_in.portion_id, deleted_at__isnull=True)
                .select_related("ingredient")
                .first()
            )
            if portion is None:
                raise HttpError(400, "Portion existiert nicht")
            return portion, portion.ingredient_id

        ingredient_id = item_in.ingredient_id
        name = (item_in.name or "").strip()
        if ingredient_id is None and name:
            existing = (
                Ingredient.objects.filter(name__iexact=name, deleted_at__isnull=True)
                .order_by("-usage_count", "id")
                .first()
            )
            if existing:
                ingredient_id = existing.id

        if ingredient_id is None:
            if not name:
                raise HttpError(400, "Unaufgelöste Zutat ohne Namen kann nicht angelegt werden")
            base_slug = slugify(name) or "zutat"
            slug = base_slug
            counter = 1
            while Ingredient.objects.filter(slug=slug).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            ingredient = Ingredient.objects.create(
                name=name,
                slug=slug,
                status=IngredientStatusChoices.DRAFT,
            )
            ingredient_id = ingredient.id

        portion = (
            Portion.objects.filter(ingredient_id=ingredient_id, deleted_at__isnull=True)
            .select_related("ingredient")
            .order_by("rank")
            .first()
        )
        if portion is None:
            gramm_unit, _ = MeasuringUnit.objects.get_or_create(
                name="g",
                defaults={"description": "Gramm", "quantity": 1.0, "unit": "g"},
            )
            portion = Portion.objects.filter(
                ingredient_id=ingredient_id,
                name="g",
                deleted_at__isnull=True,
            ).first()
            if portion is None:
                portion = Portion.objects.create(
                    name="g",
                    ingredient_id=ingredient_id,
                    measuring_unit=gramm_unit,
                    quantity=1.0,
                    weight_g=1.0,
                    rank=1,
                )
        return portion, ingredient_id

    created_items = []
    created_ingredient_ids: set[int] = set()
    with transaction.atomic():
        for item_in in payload:
            portion, ingredient_id = _resolve_portion(item_in)
            if ingredient_id in existing_ingredient_ids or ingredient_id in created_ingredient_ids:
                continue
            if item_in.quantity <= 0:
                raise HttpError(400, "Menge muss größer als 0 sein")
            item = RecipeItem.objects.create(
                recipe=recipe,
                portion=portion,
                quantity=item_in.quantity,
                sort_order=last_sort + len(created_items) + 1,
                is_optional=item_in.is_optional,
                note=item_in.note,
            )
            created_items.append(item)
            created_ingredient_ids.add(ingredient_id)

    # Recalculate nutritional cache
    from recipe.services.recipe_checks import recalculate_recipe_cache

    recalculate_recipe_cache(recipe)

    return RecipeItem.objects.filter(id__in=[item.id for item in created_items]).select_related(
        "portion",
        "portion__ingredient",
        "portion__measuring_unit",
    )


@router.post("/{recipe_id}/estimate-quantities/", response=EstimateQuantitiesOut)
def estimate_quantities(request, recipe_id: int):
    """AI-estimate realistic quantities for existing recipe items."""
    _require_auth(request)
    recipe = _get_visible_recipe_or_404(request, recipe_id)
    from content.services.food_access import can_edit

    if not can_edit(recipe, request.user):
        raise HttpError(403, "Keine Berechtigung")

    from recipe.services.ai_ingredients_service import RecipeQuantityEstimationService

    service = RecipeQuantityEstimationService()
    result = service.estimate_quantities(recipe, user=request.user)

    if result is None:
        raise HttpError(500, "AI-Schätzung fehlgeschlagen")

    return {"items": result}
