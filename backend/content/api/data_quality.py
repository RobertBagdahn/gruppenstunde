"""Data quality API endpoints — staff-only dashboard and public distribution charts."""

import logging
import math
import uuid
from collections import defaultdict

from django.contrib.contenttypes.models import ContentType
from django.db import models as db_models
from django.db.models import Avg, Q
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from content.choices import LinkType
from content.models import ContentLink, DuplicateDismissal
from content.schemas.data_quality import (
    CacheStalenessOut,
    CompletenessItemOut,
    CostDistributionOut,
    DismissRequestIn,
    DistributionBucketOut,
    DistributionStatsOut,
    EnergyDistributionOut,
    ImpactOut,
    MergePreviewOut,
    MergeRequestIn,
    MissingClassificationOut,
    MissingSystemPortionOut,
    NutrientDistributionOut,
    NutrientScatterItemOut,
    NutriScoreClassOut,
    NutriScoreDistributionOut,
    NutritionPlausibilityOut,
    PaginatedAuditLogOut,
    PaginatedCompletenessOut,
    PaginatedDuplicatePairOut,
    PaginatedPriceAnomalyOut,
    PortionPlausibilityOut,
    PriceApplyRequestIn,
    PriceApplyResponseOut,
    PriceEvaluateRequestIn,
    PriceEvaluateResponseOut,
    PriceSuggestionOut,
    QualityTrendOut,
    QualityTrendPointOut,
    RecipeDismissRequestIn,
    RecipeMergePreviewOut,
    RecipeMetadataCheckOut,
)
from content.services.audit_service import get_audit_log_queryset
from supply.models import Ingredient

logger = logging.getLogger(__name__)

admin_router = Router(tags=["Data Quality Admin"])
public_router = Router(tags=["Data Quality Public"])


def _require_staff(request):
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur für Administratoren")


# ============================================================================
# Price Analysis
# ============================================================================


@admin_router.get("/ingredients/price-analysis/", response=PaginatedPriceAnomalyOut)
def price_analysis(request, page: int = 1, page_size: int = 20, anomaly_type: str | None = None):
    _require_staff(request)

    # Get all ingredients with prices, grouped by retail_section
    ingredients = Ingredient.objects.select_related("retail_section").all()

    # Compute stats per retail section
    section_stats = {}
    for ing in ingredients:
        if ing.price_per_kg is None:
            continue
        section_id = ing.retail_section_id or 0
        if section_id not in section_stats:
            section_stats[section_id] = {"prices": [], "name": ing.retail_section.name if ing.retail_section else None}
        section_stats[section_id]["prices"].append(float(ing.price_per_kg))

    # Compute global stats for sections with too few items
    all_prices = [float(ing.price_per_kg) for ing in ingredients if ing.price_per_kg is not None]
    global_mean = sum(all_prices) / len(all_prices) if all_prices else 0
    global_std = math.sqrt(sum((p - global_mean) ** 2 for p in all_prices) / len(all_prices)) if all_prices else 1

    for sid in section_stats:
        prices = section_stats[sid]["prices"]
        section_stats[sid]["mean"] = sum(prices) / len(prices) if len(prices) >= 5 else global_mean
        if len(prices) >= 5:
            m = section_stats[sid]["mean"]
            section_stats[sid]["std"] = math.sqrt(sum((p - m) ** 2 for p in prices) / len(prices)) or 1
        else:
            section_stats[sid]["std"] = global_std

    items = []
    for ing in ingredients:
        if ing.price_per_kg is None:
            items.append(
                {
                    "id": ing.id,
                    "name": ing.name,
                    "slug": ing.slug,
                    "price_per_kg": None,
                    "retail_section": ing.retail_section.name if ing.retail_section else None,
                    "z_score": None,
                    "anomaly_type": "missing",
                }
            )
            continue

        section_id = ing.retail_section_id or 0
        stats = section_stats.get(section_id, {"mean": global_mean, "std": global_std or 1})
        z = (float(ing.price_per_kg) - stats["mean"]) / stats["std"] if stats["std"] else 0

        if abs(z) > 2.5:
            anomaly = "high" if z > 0 else "low"
            items.append(
                {
                    "id": ing.id,
                    "name": ing.name,
                    "slug": ing.slug,
                    "price_per_kg": str(ing.price_per_kg),
                    "retail_section": ing.retail_section.name if ing.retail_section else None,
                    "z_score": round(z, 2),
                    "anomaly_type": anomaly,
                }
            )

    if anomaly_type:
        items = [i for i in items if i["anomaly_type"] == anomaly_type]

    # Sort: missing first, then by |z_score|
    items.sort(key=lambda x: (0 if x["anomaly_type"] == "missing" else 1, -(abs(x["z_score"] or 0))))

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]

    return {"items": page_items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.post("/ingredients/price-analysis/evaluate/", response=PriceEvaluateResponseOut)
def price_evaluate(request, body: PriceEvaluateRequestIn):
    _require_staff(request)
    if not body.ingredient_ids:
        raise HttpError(400, "Keine Zutaten ausgewählt")

    ingredients = Ingredient.objects.filter(id__in=body.ingredient_ids).select_related("retail_section")

    suggestions = []
    for ing in ingredients[:50]:
        # Use Gemini to suggest a price
        suggested = _ai_suggest_price(ing)
        suggestions.append(
            PriceSuggestionOut(
                ingredient_id=ing.id,
                current_price=str(ing.price_per_kg) if ing.price_per_kg else None,
                suggested_price=suggested.get("price"),
                reasoning=suggested.get("reasoning", "Keine KI-Empfehlung verfügbar"),
            )
        )

    return PriceEvaluateResponseOut(suggestions=suggestions, batch_token=str(uuid.uuid4()))


def _ai_suggest_price(ingredient) -> dict:
    """Use Gemini to suggest a realistic price_per_kg for an ingredient."""
    try:
        from core.services.gemini import gemini_call

        prompt = (
            f"Schätze einen realistischen Supermarkt-Preis in Euro pro Kilogramm "
            f"für folgende Zutat: {ingredient.name}.\n"
        )
        if ingredient.retail_section:
            prompt += f"Supermarkt-Abteilung: {ingredient.retail_section.name}\n"
        if ingredient.energy_kcal:
            prompt += f"Energie: {ingredient.energy_kcal} kcal/100g\n"
        prompt += "Antworte NUR mit dem Preis als Zahl in Euro pro kg (z.B. 3.49), sonst nichts."

        result, interaction_id = gemini_call(
            user=None,
            model="gemini-3.1-flash-lite",
            contents=prompt,
            bypass_limits=True,
            is_background=True,
        )
        price_str = result.text.strip().replace(",", ".").replace("€", "").strip() if result and result.text else None
        if price_str:
            try:
                float(price_str)
                return {"price": price_str, "reasoning": "KI-Schätzung basierend auf Produktname und Kategorie."}
            except ValueError:
                pass
    except Exception as e:
        logger.warning("AI price suggestion failed for %s: %s", ingredient.name, e)

    return {"price": None, "reasoning": "KI-Bewertung nicht verfügbar (API-Fehler)"}


@admin_router.patch("/ingredients/price-analysis/apply/", response=PriceApplyResponseOut)
def price_apply(request, body: PriceApplyRequestIn):
    _require_staff(request)
    updated = []
    for item in body.items:
        try:
            ing = Ingredient.objects.get(id=item.ingredient_id)
            price = float(item.price_per_kg)
            if price <= 0 or price > 1000:
                raise HttpError(422, f"Ungültiger Preis für {ing.name}: {price}")
            ing.price_per_kg = price
            ing.save(update_fields=["price_per_kg", "updated_at"])
            updated.append(ing.id)
        except Ingredient.DoesNotExist:
            pass
    return PriceApplyResponseOut(updated_ids=updated)


# ============================================================================
# Duplicate Detection
# ============================================================================


@admin_router.get("/ingredients/duplicates/", response=PaginatedDuplicatePairOut)
def ingredient_duplicates(request):
    _require_staff(request)

    from django.db import connection
    from content.services.embedding_service import similarity_to_pct

    dismissed = set(
        DuplicateDismissal.objects.filter(
            source_content_type=ContentType.objects.get_for_model(Ingredient),
        ).values_list("source_object_id", "target_object_id")
    )

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH candidates AS (
                SELECT id, name, slug, embedding
                FROM supply_ingredient
                WHERE embedding IS NOT NULL
                ORDER BY id DESC
                LIMIT 100
            )
            SELECT a.id, a.name, a.slug,
                   b.id, b.name, b.slug,
                   1 - b.dist AS sim
            FROM candidates a
            CROSS JOIN LATERAL (
                SELECT sub.id, sub.name, sub.slug,
                       a.embedding <=> sub.embedding AS dist
                FROM supply_ingredient sub
                WHERE sub.id != a.id
                  AND sub.embedding IS NOT NULL
                ORDER BY dist
                LIMIT 10
            ) b
            ORDER BY sim DESC
            LIMIT 5
            """
        )
        rows = cursor.fetchall()

    seen = set()
    pairs = []
    for id_a, name_a, slug_a, id_b, name_b, slug_b, sim in rows:
        pair_key = (id_a, id_b) if id_a < id_b else (id_b, id_a)
        if pair_key in seen or pair_key in dismissed:
            continue
        seen.add(pair_key)
        # Convert cosine similarity to percentage using sigmoid calibration
        sim_pct = similarity_to_pct(sim)
        pairs.append(
            {
                "ingredient_a": {"id": id_a, "name": name_a, "slug": slug_a},
                "ingredient_b": {"id": id_b, "name": name_b, "slug": slug_b},
                "similarity": round(sim_pct, 1),
            }
        )

    return {"items": pairs, "total": len(pairs), "page": 1, "page_size": 5, "total_pages": 1}


@admin_router.get("/recipes/duplicates/", response=PaginatedDuplicatePairOut)
def recipe_duplicates(request):
    _require_staff(request)

    from recipe.models import Recipe

    dismissed = set(
        DuplicateDismissal.objects.filter(
            source_content_type=ContentType.objects.get_for_model(Recipe),
        ).values_list("source_object_id", "target_object_id")
    )

    from django.db import connection

    with connection.cursor() as cursor:
        cursor.execute(
            """
            WITH candidates AS (
                SELECT id, title, slug, embedding
                FROM recipe_recipe
                WHERE embedding IS NOT NULL
                ORDER BY id DESC
                LIMIT 100
            )
            SELECT a.id, a.title, a.slug,
                   b.id, b.title, b.slug,
                   1 - b.dist AS sim
            FROM candidates a
            CROSS JOIN LATERAL (
                SELECT sub.id, sub.title, sub.slug,
                       a.embedding <=> sub.embedding AS dist
                FROM recipe_recipe sub
                WHERE sub.id != a.id
                  AND sub.embedding IS NOT NULL
                ORDER BY dist
                LIMIT 10
            ) b
            ORDER BY sim DESC
            LIMIT 5
            """
        )
        rows = cursor.fetchall()

    seen = set()
    pairs = []
    for id_a, title_a, slug_a, id_b, title_b, slug_b, sim in rows:
        pair_key = (id_a, id_b) if id_a < id_b else (id_b, id_a)
        if pair_key in seen or pair_key in dismissed:
            continue
        seen.add(pair_key)
        pairs.append(
            {
                "ingredient_a": {"id": id_a, "name": title_a, "slug": slug_a},
                "ingredient_b": {"id": id_b, "name": title_b, "slug": slug_b},
                "similarity": round(sim, 4),
            }
        )

    return {"items": pairs, "total": len(pairs), "page": 1, "page_size": 5, "total_pages": 1}


@admin_router.post("/recipes/duplicates/dismiss/")
def recipe_dismiss_duplicate(request, body: RecipeDismissRequestIn):
    _require_staff(request)
    from recipe.models import Recipe

    ct = ContentType.objects.get_for_model(Recipe)
    a, b = sorted([body.recipe_a_id, body.recipe_b_id])
    DuplicateDismissal.objects.get_or_create(
        source_content_type=ct,
        source_object_id=a,
        target_content_type=ct,
        target_object_id=b,
        defaults={"dismissed_by": request.user},
    )
    return {"success": True}


@admin_router.delete("/recipes/duplicates/dismiss/")
def recipe_undismiss_duplicate(request, body: RecipeDismissRequestIn):
    _require_staff(request)
    from recipe.models import Recipe

    ct = ContentType.objects.get_for_model(Recipe)
    a, b = sorted([body.recipe_a_id, body.recipe_b_id])
    DuplicateDismissal.objects.filter(
        source_content_type=ct,
        source_object_id=a,
        target_content_type=ct,
        target_object_id=b,
    ).delete()
    return {"success": True}


@admin_router.get("/recipes/merge/preview/", response=RecipeMergePreviewOut)
def recipe_merge_preview(request, source_id: int, target_id: int):
    _require_staff(request)
    from recipe.models import Recipe

    try:
        source = Recipe.objects.get(id=source_id)
        target = Recipe.objects.get(id=target_id)
    except Recipe.DoesNotExist:
        raise HttpError(404, "Rezept nicht gefunden")

    if source_id == target_id:
        raise HttpError(400, "Quell- und Ziel-Rezept dürfen nicht identisch sein")

    from planner.models import MealItem

    affected_meal_count = MealItem.objects.filter(recipe=source).count()

    return RecipeMergePreviewOut(
        source_id=source.id,
        source_name=source.title,
        target_id=target.id,
        target_name=target.title,
        affected_meal_count=affected_meal_count,
    )


@admin_router.post("/recipes/merge/")
def recipe_merge(request, body: MergeRequestIn):
    _require_staff(request)
    from recipe.models import Recipe

    if body.source_id == body.target_id:
        raise HttpError(400, "Quell- und Ziel-Rezept dürfen nicht identisch sein")

    try:
        target = Recipe.objects.get(id=body.target_id)
        source = Recipe.all_objects.get(id=body.source_id)
    except Recipe.DoesNotExist:
        raise HttpError(404, "Rezept nicht gefunden")

    if source.is_deleted:
        raise HttpError(400, "Quell-Rezept wurde bereits zusammengeführt")

    ct = ContentType.objects.get_for_model(Recipe)

    if ContentLink.objects.filter(
        source_content_type=ct,
        source_object_id=source.id,
        target_content_type=ct,
        target_object_id=target.id,
        link_type=LinkType.DUPLICATE_MERGED,
    ).exists():
        raise HttpError(400, "Dieses Rezept-Paar wurde bereits zusammengeführt")

    source.soft_delete()

    ContentLink.objects.create(
        source_content_type=ct,
        source_object_id=source.id,
        target_content_type=ct,
        target_object_id=target.id,
        link_type=LinkType.DUPLICATE_MERGED,
        created_by=request.user,
    )

    return {"success": True}


@admin_router.post("/ingredients/duplicates/dismiss/")
def dismiss_duplicate(request, body: DismissRequestIn):
    _require_staff(request)
    ct = ContentType.objects.get_for_model(Ingredient)
    a, b = sorted([body.ingredient_a_id, body.ingredient_b_id])
    DuplicateDismissal.objects.get_or_create(
        source_content_type=ct,
        source_object_id=a,
        target_content_type=ct,
        target_object_id=b,
        defaults={"dismissed_by": request.user},
    )
    return {"success": True}


@admin_router.delete("/ingredients/duplicates/dismiss/")
def undismiss_duplicate(request, body: DismissRequestIn):
    _require_staff(request)
    ct = ContentType.objects.get_for_model(Ingredient)
    a, b = sorted([body.ingredient_a_id, body.ingredient_b_id])
    DuplicateDismissal.objects.filter(
        source_content_type=ct,
        source_object_id=a,
        target_content_type=ct,
        target_object_id=b,
    ).delete()
    return {"success": True}


@admin_router.get("/ingredients/merge/preview/", response=MergePreviewOut)
def merge_preview(request, source_id: int, target_id: int):
    _require_staff(request)
    if source_id == target_id:
        raise HttpError(400, "Quell- und Ziel-Zutat dürfen nicht identisch sein")

    try:
        source = Ingredient.objects.get(id=source_id)
        target = Ingredient.objects.get(id=target_id)
    except Ingredient.DoesNotExist:
        raise HttpError(404, "Zutat nicht gefunden")

    from recipe.models import RecipeItem

    affected = RecipeItem.objects.filter(portion__ingredient=source).count()

    return MergePreviewOut(
        source_id=source.id,
        source_name=source.name,
        target_id=target.id,
        target_name=target.name,
        affected_recipe_items=affected,
        source_aliases=[a.name for a in source.aliases.all()],
        target_aliases=[a.name for a in target.aliases.all()],
        nutrition_comparison={
            "source": {"energy_kcal": source.energy_kcal, "protein_g": source.protein_g},
            "target": {"energy_kcal": target.energy_kcal, "protein_g": target.protein_g},
        },
    )


@admin_router.post("/ingredients/merge/")
def merge_ingredients(request, body: MergeRequestIn):
    _require_staff(request)
    if body.source_id == body.target_id:
        raise HttpError(400, "Quell- und Ziel-Zutat dürfen nicht identisch sein")

    from django.contrib.contenttypes.models import ContentType

    from content.models import ContentLink
    from supply.models import IngredientAlias

    try:
        source = Ingredient.all_objects.get(id=body.source_id)
        target = Ingredient.objects.get(id=body.target_id)
    except Ingredient.DoesNotExist:
        raise HttpError(404, "Zutat nicht gefunden")

    if source.is_deleted:
        raise HttpError(400, "Quell-Zutat wurde bereits zusammengeführt")

    ct = ContentType.objects.get_for_model(Ingredient)

    if ContentLink.objects.filter(
        source_content_type=ct,
        source_object_id=source.id,
        target_content_type=ct,
        target_object_id=target.id,
        link_type="duplicate_merged",
    ).exists():
        raise HttpError(400, "Dieses Zutaten-Paar wurde bereits zusammengeführt")

    from django.db import transaction

    from recipe.models import RecipeItem
    from supply.models import UnitConversion
    from supply.services.portion_integrity import rebind_recipe_items_to_portion

    with transaction.atomic():
        affected = RecipeItem.objects.filter(portion__ingredient=source).count()

        target_max_alias_rank = (
            IngredientAlias.objects.filter(ingredient=target)
            .aggregate(m=db_models.Max("rank"))["m"] or 0
        )

        IngredientAlias.objects.get_or_create(
            ingredient=target,
            name=source.name,
            defaults={
                "rank": target_max_alias_rank + 1,
                "is_generic": True,
                "created_by": request.user,
            },
        )
        aliases_added = 1

        for alias in source.aliases.all():
            _, created = IngredientAlias.objects.get_or_create(
                ingredient=target,
                name=alias.name,
                defaults={
                    "rank": target_max_alias_rank + 2 + alias.rank,
                    "is_generic": True,
                    "created_by": request.user,
                },
            )
            if created:
                aliases_added += 1

        source_portions = list(source.portions.filter(deleted_at__isnull=True))
        portions_moved = 0

        target_portion_names = {
            p.name.lower(): p
            for p in target.portions.filter(deleted_at__isnull=True)
        }
        max_target_rank = target.portions.aggregate(
            m=db_models.Max("rank")
        )["m"] or 1

        for source_portion in source_portions:
            existing = target_portion_names.get(source_portion.name.lower())
            if existing is not None:
                if RecipeItem.objects.filter(portion=source_portion).exists():
                    rebind_recipe_items_to_portion(source_portion, existing)
                source_portion.delete()
            else:
                if source_portion.rank == 1:
                    max_target_rank += 1
                    source_portion.rank = max_target_rank
                source_portion.ingredient = target
                source_portion.save(update_fields=["ingredient", "rank"])
                portions_moved += 1

        from planner.models import MealItem
        MealItem.objects.filter(ingredient=source).update(ingredient=target)

        UnitConversion.objects.filter(ingredient=source).delete()

        from content.services.embedding_service import update_ingredient_embedding
        try:
            update_ingredient_embedding(target, force=True)
        except Exception:
            pass

        source.soft_delete()

        ContentLink.objects.create(
            source_content_type=ct,
            source_object_id=source.id,
            target_content_type=ct,
            target_object_id=target.id,
            link_type="duplicate_merged",
            created_by=request.user,
        )

    return {
        "success": True,
        "affected_recipe_items": affected,
        "portions_moved": portions_moved,
        "aliases_added": aliases_added,
    }


# ============================================================================
# Completeness & Data Quality Dashboard
# ============================================================================


@admin_router.get("/ingredients/completeness/", response=PaginatedCompletenessOut)
def ingredient_completeness(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    ingredients = Ingredient.objects.all().order_by(db_models.F("quality_score").asc(nulls_first=True))

    total = ingredients.count()
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    qs = ingredients[start : start + page_size]

    items = []
    for ing in qs:
        items.append(
            CompletenessItemOut(
                id=ing.id,
                name=ing.name,
                slug=ing.slug,
                quality_score=ing.quality_score,
                status=ing.status,
                nutrition_score=0,
                price_score=0,
                physical_score=0,
                classification_score=0,
                scout_score=0,
                portion_score=0,
            )
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/ingredients/missing-classification/")
def missing_classification(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    qs = Ingredient.objects.filter(Q(retail_section__isnull=True) | Q(nutritional_tags__isnull=True)).distinct()

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size

    items = []
    for ing in qs[start : start + page_size]:
        items.append(
            MissingClassificationOut(
                id=ing.id,
                name=ing.name,
                slug=ing.slug,
                missing_retail_section=ing.retail_section_id is None,
                missing_tags=not ing.nutritional_tags.exists(),
            )
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/ingredients/nutrition-plausibility/")
def nutrition_plausibility(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    ingredients = Ingredient.objects.exclude(energy_kcal=0).all()
    items = []
    for ing in ingredients:
        macro_sum = (ing.protein_g or 0) + (ing.fat_g or 0) + (ing.carbohydrate_g or 0)
        if macro_sum > 110:
            items.append(
                NutritionPlausibilityOut(
                    id=ing.id,
                    name=ing.name,
                    slug=ing.slug,
                    energy_kcal=ing.energy_kcal or 0,
                    protein_g=ing.protein_g or 0,
                    fat_g=ing.fat_g or 0,
                    carbohydrate_g=ing.carbohydrate_g or 0,
                    macro_sum=round(macro_sum, 1),
                    issue=f"Makro-Summe {round(macro_sum, 1)}g > 100g/100g",
                )
            )
        elif ing.energy_kcal and ing.energy_kcal > 900:
            items.append(
                NutritionPlausibilityOut(
                    id=ing.id,
                    name=ing.name,
                    slug=ing.slug,
                    energy_kcal=ing.energy_kcal,
                    protein_g=ing.protein_g or 0,
                    fat_g=ing.fat_g or 0,
                    carbohydrate_g=ing.carbohydrate_g or 0,
                    macro_sum=round(macro_sum, 1),
                    issue=f"Extrem hohe Energiedichte: {ing.energy_kcal} kcal/100g",
                )
            )

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return {"items": page_items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/recipes/metadata-check/")
def recipe_metadata_check(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    from recipe.models import Recipe

    qs = Recipe.objects.filter(Q(image__isnull=True) | Q(summary="") | Q(tags__isnull=True)).distinct()

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size

    items = []
    for recipe in qs[start : start + page_size]:
        items.append(
            RecipeMetadataCheckOut(
                id=recipe.id,
                title=recipe.title,
                slug=recipe.slug,
                missing_image=not bool(recipe.image),
                missing_tags=not recipe.tags.exists(),
                missing_summary=not bool(recipe.summary),
            )
        )

    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/recipes/cache-staleness/")
def recipe_cache_staleness(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    from recipe.models import Recipe

    # Find recipes where any ingredient was updated after the cache
    qs = Recipe.objects.filter(cached_at__isnull=False).prefetch_related("recipe_items__portion__ingredient")
    items = []
    for recipe in qs:
        stale = False
        for item in recipe.recipe_items.all():
            if item.portion and item.portion.ingredient:
                if item.portion.ingredient.updated_at > recipe.cached_at:
                    stale = True
                    break
        if stale:
            items.append(
                CacheStalenessOut(
                    id=recipe.id,
                    title=recipe.title,
                    slug=recipe.slug,
                    cached_at=str(recipe.cached_at),
                    stale_since=str(recipe.cached_at),
                )
            )

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return {"items": page_items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/recipes/portion-plausibility/")
def recipe_portion_plausibility(request, page: int = 1, page_size: int = 20):
    _require_staff(request)
    from recipe.models import Recipe

    qs = Recipe.objects.filter(cached_weight_g__isnull=False)
    items = []
    for recipe in qs:
        if recipe.cached_weight_g and recipe.cached_weight_g < 100:
            items.append(
                PortionPlausibilityOut(
                    id=recipe.id,
                    title=recipe.title,
                    slug=recipe.slug,
                    cached_weight_g=recipe.cached_weight_g,
                    issue=f"Sehr wenig Gewicht pro Portion: {recipe.cached_weight_g:.0f}g",
                )
            )
        elif recipe.cached_weight_g and recipe.cached_weight_g > 2000:
            items.append(
                PortionPlausibilityOut(
                    id=recipe.id,
                    title=recipe.title,
                    slug=recipe.slug,
                    cached_weight_g=recipe.cached_weight_g,
                    issue=f"Sehr viel Gewicht pro Portion: {recipe.cached_weight_g:.0f}g",
                )
            )

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return {"items": page_items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/ingredients/missing-system-portions/")
def missing_system_portions(request, page: int = 1, page_size: int = 20):
    """Ingredients die eine oder mehrere System-Portionen (g/ml, Packung, Stück) vermissen."""
    _require_staff(request)
    from supply.models import Portion

    system_names = Portion.system_portion_names()
    qs = Ingredient.objects.all().prefetch_related("portions")

    items: list = []
    for ing in qs:
        existing = set(p.name for p in ing.portions.filter(deleted_at__isnull=True))
        # g oder ml als Basis-System-Portion akzeptieren
        has_base = "g" in existing or "ml" in existing
        missing = [name for name in sorted(system_names) if name not in existing]
        if not has_base:
            missing = ["g/ml"] + missing
        elif "g" not in existing:
            missing = [m for m in missing if m != "g"]
        if missing:
            items.append(
                MissingSystemPortionOut(
                    id=ing.id,
                    name=ing.name,
                    slug=ing.slug,
                    missing_portions=missing,
                )
            )

    total = len(items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    page_items = items[start : start + page_size]
    return {"items": page_items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@admin_router.get("/trend/", response=QualityTrendOut)
def quality_trend(request, type: str = "ingredients"):
    _require_staff(request)
    # Return daily average quality score for last 30 days
    now = timezone.now()
    points = []
    # Simple: return today's avg as the only point for now
    if type == "ingredients":
        avg = Ingredient.objects.exclude(quality_score__isnull=True).aggregate(avg=Avg("quality_score"))["avg"]
    else:
        from recipe.models import Recipe

        avg = Recipe.objects.exclude(quality_score__isnull=True).aggregate(avg=Avg("quality_score"))["avg"]
    points.append(QualityTrendPointOut(date=now.strftime("%Y-%m-%d"), avg_score=round(avg or 0, 1)))
    return QualityTrendOut(points=points)


# ============================================================================
# Audit Log
# ============================================================================


@admin_router.get("/audit-log/", response=PaginatedAuditLogOut)
def audit_log(
    request, content_type: str | None = None, object_id: int | None = None, page: int = 1, page_size: int = 20
):
    _require_staff(request)

    qs = get_audit_log_queryset(content_type_str=content_type, object_id=object_id)
    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size

    entries = []
    for entry in qs[start : start + page_size]:
        entries.append(
            {
                "id": entry.id,
                "field_name": entry.field_name,
                "old_value": entry.old_value,
                "new_value": entry.new_value,
                "changed_by_name": entry.changed_by.username if entry.changed_by else None,
                "changed_at": entry.changed_at,
            }
        )

    return {"items": entries, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


# ============================================================================
# Impact Analysis (Public)
# ============================================================================


@public_router.get("/ingredients/{slug}/impact/", response=ImpactOut)
def ingredient_impact(request, slug: str):
    try:
        ing = Ingredient.objects.get(slug=slug)
    except Ingredient.DoesNotExist:
        raise HttpError(404, "Zutat nicht gefunden")

    from recipe.models import RecipeItem

    recipe_count = RecipeItem.objects.filter(portion__ingredient=ing).values("recipe_id").distinct().count()

    from planner.models import MealPlan

    recipe_ids = RecipeItem.objects.filter(portion__ingredient=ing).values_list("recipe_id", flat=True)
    meal_plan_count = MealPlan.objects.filter(meals__recipeitem__recipe_id__in=recipe_ids).distinct().count()

    return ImpactOut(recipe_count=recipe_count, meal_plan_count=meal_plan_count)


# ============================================================================
# Public Distribution Charts
# ============================================================================


@public_router.get("/ingredients/distribution/cost/", response=CostDistributionOut)
def ingredient_cost_distribution(
    request, tags: str | None = None, retail_section: int | None = None, status: str | None = None
):
    qs = Ingredient.objects.filter(price_per_kg__isnull=False)
    if retail_section:
        qs = qs.filter(retail_section_id=retail_section)
    if status:
        qs = qs.filter(status=status)
    if tags:
        tag_ids = [int(t) for t in tags.split(",") if t.strip()]
        qs = qs.filter(nutritional_tags__id__in=tag_ids).distinct()

    prices = [float(ing.price_per_kg) for ing in qs]
    if not prices:
        return CostDistributionOut(
            buckets=[], stats=DistributionStatsOut(mean=None, median=None, p5=None, p95=None, count=0)
        )

    prices.sort()
    bucket_ranges = [(0, 1), (1, 2), (2, 5), (5, 10), (10, 20), (20, 50), (50, None)]
    buckets = []
    for lo, hi in bucket_ranges:
        count = sum(1 for p in prices if p >= lo and (hi is None or p < hi))
        buckets.append(DistributionBucketOut(min=lo, max=hi, count=count, label=f"{lo}-{hi}€" if hi else f"{lo}+€"))

    n = len(prices)
    stats = DistributionStatsOut(
        mean=round(sum(prices) / n, 2),
        median=round(prices[n // 2], 2),
        p5=round(prices[int(n * 0.05)], 2),
        p95=round(prices[int(n * 0.95)], 2),
        count=n,
    )
    return CostDistributionOut(buckets=buckets, stats=stats)


@public_router.get("/ingredients/distribution/energy/", response=EnergyDistributionOut)
def ingredient_energy_distribution(
    request, tags: str | None = None, retail_section: int | None = None, status: str | None = None
):
    qs = Ingredient.objects.exclude(energy_kcal=0)
    if retail_section:
        qs = qs.filter(retail_section_id=retail_section)
    if status:
        qs = qs.filter(status=status)
    if tags:
        tag_ids = [int(t) for t in tags.split(",") if t.strip()]
        qs = qs.filter(nutritional_tags__id__in=tag_ids).distinct()

    energies = [(ing.id, ing.name, ing.energy_kcal or 0) for ing in qs]
    if not energies:
        return EnergyDistributionOut(
            buckets=[],
            stats=DistributionStatsOut(mean=None, median=None, p5=None, p95=None, count=0),
            top_dense=[],
            bottom_dense=[],
        )

    kcal_values = [e[2] for e in energies]
    kcal_values.sort()

    bucket_ranges = [(0, 50), (50, 100), (100, 200), (200, 300), (300, 500), (500, 700), (700, None)]
    buckets = []
    for lo, hi in bucket_ranges:
        count = sum(1 for k in kcal_values if k >= lo and (hi is None or k < hi))
        buckets.append(DistributionBucketOut(min=lo, max=hi, count=count, label=f"{lo}-{hi}" if hi else f"{lo}+"))

    energies.sort(key=lambda e: e[2], reverse=True)
    top = [{"id": e[0], "name": e[1], "energy_kcal": e[2]} for e in energies[:20]]
    bottom = [{"id": e[0], "name": e[1], "energy_kcal": e[2]} for e in energies[-20:]]

    n = len(kcal_values)
    stats = DistributionStatsOut(
        mean=round(sum(kcal_values) / n, 1),
        median=round(kcal_values[n // 2], 1),
        p5=round(kcal_values[int(n * 0.05)], 1),
        p95=round(kcal_values[int(n * 0.95)], 1),
        count=n,
    )
    return EnergyDistributionOut(buckets=buckets, stats=stats, top_dense=top, bottom_dense=bottom)


@public_router.get("/ingredients/distribution/nutrients/", response=NutrientDistributionOut)
def ingredient_nutrient_distribution(
    request, tags: str | None = None, retail_section: int | None = None, status: str | None = None
):
    qs = Ingredient.objects.exclude(energy_kcal=0)
    if retail_section:
        qs = qs.filter(retail_section_id=retail_section)
    if status:
        qs = qs.filter(status=status)

    vegan_ids = set()
    if tags:
        tag_ids = [int(t) for t in tags.split(",") if t.strip()]
        qs = qs.filter(nutritional_tags__id__in=tag_ids).distinct()

    # Determine which ingredients are vegan
    from supply.models import NutritionalTag

    try:
        vegan_tag = NutritionalTag.objects.get(name__iexact="vegan")
        vegan_ids = set(Ingredient.objects.filter(nutritional_tags=vegan_tag).values_list("id", flat=True))
    except NutritionalTag.DoesNotExist:
        pass

    nutrients = []
    scatter = []
    for ing in qs[:500]:
        scatter.append(
            NutrientScatterItemOut(
                id=ing.id,
                name=ing.name,
                energy_kcal=ing.energy_kcal or 0,
                protein_g=ing.protein_g or 0,
                fat_g=ing.fat_g or 0,
                carbohydrate_g=ing.carbohydrate_g or 0,
                is_vegan=ing.id in vegan_ids,
            )
        )

    return NutrientDistributionOut(nutrients=nutrients, scatter_data=scatter)


@public_router.get("/recipes/distribution/cost/", response=CostDistributionOut)
def recipe_cost_distribution(request, recipe_type: str | None = None):
    from recipe.models import Recipe

    qs = Recipe.objects.filter(cached_price_total__isnull=False)
    if recipe_type:
        qs = qs.filter(recipe_type=recipe_type)

    prices = [float(r.cached_price_total) for r in qs]
    if not prices:
        return CostDistributionOut(
            buckets=[], stats=DistributionStatsOut(mean=None, median=None, p5=None, p95=None, count=0)
        )

    prices.sort()
    bucket_ranges = [(0, 1), (1, 2), (2, 5), (5, 10), (10, 20), (20, None)]
    buckets = []
    for lo, hi in bucket_ranges:
        count = sum(1 for p in prices if p >= lo and (hi is None or p < hi))
        buckets.append(DistributionBucketOut(min=lo, max=hi, count=count, label=f"{lo}-{hi}€" if hi else f"{lo}+€"))

    n = len(prices)
    stats = DistributionStatsOut(
        mean=round(sum(prices) / n, 2),
        median=round(prices[n // 2], 2),
        p5=round(prices[int(n * 0.05)], 2),
        p95=round(prices[int(n * 0.95)], 2),
        count=n,
    )
    return CostDistributionOut(buckets=buckets, stats=stats)


@public_router.get("/recipes/distribution/calories/", response=EnergyDistributionOut)
def recipe_calorie_distribution(request, recipe_type: str | None = None):
    from recipe.models import Recipe

    qs = Recipe.objects.filter(cached_energy_total_kcal__isnull=False)
    if recipe_type:
        qs = qs.filter(recipe_type=recipe_type)

    energies = [(r.id, r.title, r.cached_energy_total_kcal or 0) for r in qs]
    if not energies:
        return EnergyDistributionOut(
            buckets=[],
            stats=DistributionStatsOut(mean=None, median=None, p5=None, p95=None, count=0),
            top_dense=[],
            bottom_dense=[],
        )

    kcal_vals = [e[2] for e in energies]
    kcal_vals.sort()
    bucket_ranges = [(0, 200), (200, 400), (400, 600), (600, 800), (800, 1200), (1200, None)]
    buckets = []
    for lo, hi in bucket_ranges:
        count = sum(1 for k in kcal_vals if k >= lo and (hi is None or k < hi))
        buckets.append(DistributionBucketOut(min=lo, max=hi, count=count, label=f"{lo}-{hi}" if hi else f"{lo}+"))

    n = len(kcal_vals)
    stats = DistributionStatsOut(
        mean=round(sum(kcal_vals) / n, 1),
        median=round(kcal_vals[n // 2], 1),
        p5=round(kcal_vals[int(n * 0.05)], 1),
        p95=round(kcal_vals[int(n * 0.95)], 1),
        count=n,
    )
    return EnergyDistributionOut(buckets=buckets, stats=stats, top_dense=[], bottom_dense=[])


@public_router.get("/recipes/distribution/nutri-score/", response=NutriScoreDistributionOut)
def recipe_nutri_score_distribution(request, recipe_type: str | None = None):
    from recipe.models import Recipe

    qs = Recipe.objects.exclude(cached_nutri_class__isnull=True)
    if recipe_type:
        qs = qs.filter(recipe_type=recipe_type)

    class_counts = defaultdict(int)
    for r in qs:
        label = chr(64 + r.cached_nutri_class) if r.cached_nutri_class else None
        if label:
            class_counts[label] += 1

    classes = [NutriScoreClassOut(class_label=label, count=count) for label, count in sorted(class_counts.items())]
    return NutriScoreDistributionOut(classes=classes)
