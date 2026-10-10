"""Rule-based suggestion engine: candidates, hard filters, scoring, diversity, relaxing."""

from __future__ import annotations

import logging
import math
import random
from dataclasses import dataclass, field
from typing import TYPE_CHECKING, Any

import numpy as np
from django.db.models import Count, Q

from . import traits as t
from .context import EffectiveContext, build_context
from .directions import CARDS_PER_DIRECTION, MEAL_TYPE_CONFIG, Direction, MealTypeConfig, directions_for
from .traits import Candidate

if TYPE_CHECKING:
    from django.contrib.auth.models import AbstractBaseUser

    from planner.models import Meal, MealPlan

logger = logging.getLogger(__name__)

# The diet filter (vegetarian) is a dietary choice like the plan tags and is never relaxed.
RELAX_ORDER = ("budget", "prep", "kids", "taste")
CHEAP_PRICE_PP = {"breakfast": 1.0, "lunch": 1.5, "dinner": 1.5, "snack": 0.8, "drinks": 0.5}
MMR_LAMBDA = 0.35
SIMILARITY_PENALTY_START = 0.8
MAIN_MEAL_TYPES = ("lunch", "dinner")


@dataclass
class Filters:
    taste: str | None = None
    prep: str | None = None
    kids: bool | None = None
    budget: str | None = None
    diet: str | None = None
    with_dessert: bool = False

    def active(self) -> list[str]:
        return [
            key
            for key, value in (
                ("budget", self.budget),
                ("prep", self.prep),
                ("kids", self.kids),
                ("taste", self.taste),
                ("diet", self.diet),
            )
            if value
        ]

    def without(self, key: str) -> Filters:
        copy = Filters(**self.__dict__)
        setattr(copy, key, None)
        return copy


@dataclass
class PanelResult:
    directions: list[tuple[Direction, list[Candidate]]]
    relaxed: list[str] = field(default_factory=list)
    context: EffectiveContext = field(default_factory=EffectiveContext)

    @property
    def total(self) -> int:
        return sum(len(cards) for _, cards in self.directions)


# ---------------------------------------------------------------------------
# Duplicate scope
# ---------------------------------------------------------------------------


def _scope_plan_ids(meal_plan: MealPlan) -> list[int]:
    from event.models import EventMealPlanRelation

    relation = EventMealPlanRelation.objects.filter(meal_plan_id=meal_plan.id).first()
    if relation is None:
        return [meal_plan.id]
    return list(EventMealPlanRelation.objects.filter(event_id=relation.event_id).values_list("meal_plan_id", flat=True))


def excluded_ids(meal_plan: MealPlan, meal: Meal) -> tuple[set[int], set[int]]:
    """Return (recipe ids, ingredient ids) that must not be suggested for this slot."""
    from planner.models import MealItem

    recipes: set[int] = {i.recipe_id for i in meal.items.all() if i.recipe_id}
    ingredients: set[int] = {i.ingredient_id for i in meal.items.all() if i.ingredient_id}

    items = MealItem.objects.filter(meal__meal_plan_id__in=_scope_plan_ids(meal_plan), meal__is_reference=False)
    if meal.meal_type in MAIN_MEAL_TYPES:
        recipes |= set(
            items.filter(meal__meal_type__in=MAIN_MEAL_TYPES, recipe__isnull=False).values_list("recipe_id", flat=True)
        )
    elif meal.meal_type == "breakfast" and meal.start_datetime:
        recipes |= set(
            items.filter(
                meal__meal_type="breakfast",
                meal__start_datetime__date=meal.start_datetime.date(),
                recipe__isnull=False,
            ).values_list("recipe_id", flat=True)
        )
    return recipes, ingredients


def planned_embeddings(meal_plan: MealPlan, meal: Meal) -> list[np.ndarray]:
    """Embeddings of already planned main-type recipes in the duplicate scope."""
    from planner.models import MealItem
    from recipe.models import Recipe

    types = MAIN_MEAL_TYPES if meal.meal_type in MAIN_MEAL_TYPES else (meal.meal_type,)
    ids = (
        MealItem.objects.filter(
            meal__meal_plan_id__in=_scope_plan_ids(meal_plan), meal__meal_type__in=types, recipe__isnull=False
        )
        .values_list("recipe_id", flat=True)
        .distinct()
    )
    out: list[np.ndarray] = []
    for emb in Recipe.objects.filter(id__in=list(ids), embedding__isnull=False).values_list("embedding", flat=True):
        out.append(np.asarray(emb, dtype=np.float32))
    return out


# ---------------------------------------------------------------------------
# Candidates
# ---------------------------------------------------------------------------


def _visible_to(user: AbstractBaseUser | None) -> Q:
    """Verified (ownerless) content plus the user's own; ownerless only without a user."""
    return Q(owner__isnull=True) | Q(owner=user) if user is not None else Q(owner__isnull=True)


def _recipe_candidates(config: MealTypeConfig, user: AbstractBaseUser | None) -> list[Candidate]:
    from content.choices import ContentStatus
    from recipe.models import Recipe

    qs = (
        Recipe.objects.filter(status=ContentStatus.APPROVED, recipe_type__in=config.recipe_types)
        .filter(_visible_to(user))
        .annotate(item_count=Count("recipe_items", distinct=True))
        .prefetch_related(
            "nutritional_tags",
            "manual_nutritional_tags",
            "recipe_items__portion__ingredient__nutritional_tags",
            "recipe_items__portion__ingredient__retail_section",
            "recipe_items__ingredient__nutritional_tags",
            "recipe_items__ingredient__retail_section",
        )
    )
    from supply.models import NutritionalTag

    veg_tag_id = NutritionalTag.objects.filter(name="Vegetarisch").values_list("id", flat=True).first()
    out: list[Candidate] = []
    for r in qs:
        weight = float(r.cached_weight_g or 0)
        sugar = float(r.cached_sugar_g) if r.cached_sugar_g is not None else None
        tags = list(r.nutritional_tags.all()) + list(r.manual_nutritional_tags.all())
        tag_ids = {tag.id for tag in tags}
        tag_names = {tag.name for tag in tags}
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredients = [
            ingredient for item in r.recipe_items.all() if (ingredient := get_recipe_item_ingredient(item)) is not None
        ]
        if ingredients:
            # A recipe carries a tag when every ingredient does (recipe tags are not synced on all systems).
            shared = set.intersection(*({tag.id for tag in ing.nutritional_tags.all()} for ing in ingredients))
            tag_ids |= shared
            names_by_id = {tag.id: tag.name for ing in ingredients for tag in ing.nutritional_tags.all()}
            tag_names |= {names_by_id[i] for i in shared}
        candidate = Candidate(
            kind="recipe",
            id=r.id,
            title=r.title,
            slug=r.slug,
            recipe_type=r.recipe_type,
            description=(r.summary or r.description or "")[:300],
            sugar_per_100g=(sugar / weight * 100) if sugar is not None and weight > 0 else None,
            price_pp=(round(float(r.cached_price_total) / (r.portions or 1), 2) if r.cached_price_total else None),
            tag_ids=tag_ids,
            tag_names=tag_names,
            ingredient_names=" ".join(ing.name.lower() for ing in ingredients),
            ingredient_sections={ing.retail_section.name for ing in ingredients if ing.retail_section},
            embedding=np.asarray(r.embedding, dtype=np.float32) if r.embedding is not None else None,
            usage_count=r.usage_count or 0,
            quality=float(r.quality_score or 0),
            item_count=r.item_count,
            badge="verified" if r.owner_id is None else "community",
        )
        if veg_tag_id is not None and t.is_vegetarian(candidate) is True:
            candidate.tag_ids.add(veg_tag_id)
        out.append(candidate)
    return out


def default_portion(ingredient: Any) -> tuple[int | None, int | None, float | None, float | None]:
    """Return (portion_id, measuring_unit_id, quantity, grams) following the smart-default rule."""
    portions = [p for p in ingredient.portions.all() if p.deleted_at is None and p.superseded_by_id is None]
    weighted = [p for p in portions if p.weight_g and p.weight_g > 0]
    non_g = [p for p in weighted if p.weight_g != 1 and p.name.strip().lower() != "g"]
    if non_g:
        p = sorted(non_g, key=lambda x: x.rank)[0]
        return p.id, p.measuring_unit_id, 1.0, p.weight_g
    gram = next((p for p in portions if p.name.strip().lower() == "g"), None)
    if gram:
        return gram.id, gram.measuring_unit_id, 100.0, 100.0
    return None, None, None, None


def _ingredient_candidates(config: MealTypeConfig, user: AbstractBaseUser | None) -> list[Candidate]:
    from supply.models import Ingredient

    if not config.ingredient_sections:
        return []
    qs = (
        Ingredient.objects.filter(
            is_standalone_food=True,
            status="verified",
            retail_section__name__in=config.ingredient_sections,
        )
        .filter(_visible_to(user))
        .select_related("retail_section")
        .prefetch_related("nutritional_tags", "portions")
    )
    out: list[Candidate] = []
    for ing in qs:
        portion_id, unit_id, qty, grams = default_portion(ing)
        if portion_id is None:
            continue
        price = round(float(ing.price_per_kg) * grams / 1000, 2) if ing.price_per_kg and grams else None
        tags = list(ing.nutritional_tags.all())
        out.append(
            Candidate(
                kind="ingredient",
                id=ing.id,
                title=ing.name,
                slug=ing.slug,
                section=ing.retail_section.name if ing.retail_section else "",
                description=ing.description or "",
                sugar_per_100g=float(ing.sugar_g) if ing.sugar_g is not None else None,
                price_pp=price,
                tag_ids={tag.id for tag in tags},
                tag_names={tag.name for tag in tags},
                usage_count=ing.usage_count or 0,
                quality=float(ing.quality_score or 0),
                child_score=ing.child_score,
                badge="verified",
                portion_id=portion_id,
                measuring_unit_id=unit_id,
                quantity=qty,
            )
        )
    return out


def load_all_candidates(meal_type: str, user: AbstractBaseUser | None = None) -> list[Candidate]:
    """All candidates for a meal type without duplicate exclusion (used by the coverage report)."""
    config = MEAL_TYPE_CONFIG.get(meal_type, MEAL_TYPE_CONFIG["snack"])
    return [*_recipe_candidates(config, user), *_ingredient_candidates(config, user)]


def load_candidates(meal_plan: MealPlan, meal: Meal, user: AbstractBaseUser) -> list[Candidate]:
    config = MEAL_TYPE_CONFIG.get(meal.meal_type, MEAL_TYPE_CONFIG["snack"])
    recipe_ids, ingredient_ids = excluded_ids(meal_plan, meal)
    candidates = [c for c in _recipe_candidates(config, user) if c.id not in recipe_ids]
    candidates += [c for c in _ingredient_candidates(config, user) if c.id not in ingredient_ids]
    return candidates


# ---------------------------------------------------------------------------
# Filters
# ---------------------------------------------------------------------------


def passes_hard(c: Candidate, ctx: EffectiveContext, plan_tag_ids: set[int]) -> bool:
    """Criteria that are never relaxed: diet/allergies, heat source, cooling."""
    if plan_tag_ids and not plan_tag_ids <= c.tag_ids:
        return False
    sources = {s for s in ctx.cooking_sources if s != "none"}
    if ctx.cooking_sources:
        required = t.required_heat_sources(c)
        if required and not (required & sources):
            return False
    if ctx.cooling == "none" and t.needs_cooling(c):
        return False
    return True


def passes_soft(c: Candidate, filters: Filters, meal_type: str) -> bool:
    if filters.taste == "sweet" and t.is_sweet(c) is not True:
        return False
    if filters.taste == "savory" and t.is_sweet(c) is not False:
        return False
    if filters.prep and t.preparation(c) != filters.prep:
        return False
    if filters.kids and t.is_kid_friendly(c) is not True:
        return False
    if filters.budget == "cheap":
        limit = CHEAP_PRICE_PP.get(meal_type, 1.5)
        if c.price_pp is None or c.price_pp > limit:
            return False
    if filters.diet == "vegetarian" and t.is_vegetarian(c) is not True:
        return False
    return True


# ---------------------------------------------------------------------------
# Scoring and selection
# ---------------------------------------------------------------------------


def _cosine(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    return float(np.dot(a, b) / denom) if denom else 0.0


def score_candidates(
    candidates: list[Candidate],
    ctx: EffectiveContext,
    meal: Meal,
    planned: list[np.ndarray],
    rng: random.Random,
) -> None:
    max_usage = {
        kind: max([c.usage_count for c in candidates if c.kind == kind] + [1]) for kind in ("recipe", "ingredient")
    }
    day_factor = float(getattr(meal, "day_part_factor", 0) or 0)
    meal_budget = (ctx.budget_per_person_per_day or 0) * day_factor
    for c in candidates:
        pop = math.log1p(c.usage_count) / math.log1p(max_usage[c.kind])
        quality = c.quality / 100 if c.kind == "recipe" and c.quality else 0.5
        if c.price_pp is None:
            budget_fit = 0.5
        elif meal_budget > 0:
            budget_fit = min(1.0, meal_budget / c.price_pp) if c.price_pp else 1.0
        else:
            budget_fit = 1.0 / (1.0 + c.price_pp)
        score = 0.35 * pop + 0.2 * quality + 0.25 * budget_fit
        if ctx.child_focused:
            kid = t.is_kid_friendly(c)
            score += 0.1 if kid is True else (-0.3 if kid is False else -0.03)
        if meal.meal_type == "drinks":
            warm = t.is_warm_drink(c)
            if ctx.season_hint == "cold":
                score += 0.15 if warm else -0.05
            elif ctx.season_hint == "hot":
                score += -0.15 if warm else 0.15
        if c.price_pp is None:
            score -= 0.03
        if c.embedding is not None and planned:
            sim = max(_cosine(c.embedding, p) for p in planned)
            if sim > SIMILARITY_PENALTY_START:
                score -= 0.4 * (sim - SIMILARITY_PENALTY_START) / (1 - SIMILARITY_PENALTY_START)
        c.score = score + rng.uniform(0.0, 0.15)


def _pick(pool: list[Candidate], n: int, ratio: float, kinds: tuple[str, ...]) -> list[Candidate]:
    """Pick n cards by score with MMR diversity; follow the recipe/ingredient ratio if both exist."""
    pool = sorted(pool, key=lambda c: c.score, reverse=True)
    n_ing = round(n * ratio) if ratio > 0 and "ingredient" in kinds else 0
    wanted = ["recipe"] * (n - n_ing) + ["ingredient"] * n_ing
    # interleave so kinds alternate
    order: list[str] = []
    while wanted:
        order.append(wanted.pop(0))
        if wanted and n_ing:
            order.append(wanted.pop())
    chosen: list[Candidate] = []
    for want in order:
        for kind in (want, "ingredient" if want == "recipe" else "recipe"):
            options = [c for c in pool if c.kind == kind and c not in chosen]
            if not options:
                continue

            def adjusted(c: Candidate) -> float:
                sims = [
                    _cosine(c.embedding, x.embedding)
                    for x in chosen
                    if x.embedding is not None and c.embedding is not None
                ]
                return c.score - MMR_LAMBDA * (max(sims) if sims else 0.0)

            chosen.append(max(options, key=adjusted))
            break
    return chosen[:n]


def _assemble(
    candidates: list[Candidate],
    filters: Filters,
    meal: Meal,
    ctx: EffectiveContext,
    plan_tag_ids: set[int],
) -> list[tuple[Direction, list[Candidate]]]:
    config = MEAL_TYPE_CONFIG.get(meal.meal_type, MEAL_TYPE_CONFIG["snack"])
    directions, assign_order = directions_for(meal.meal_type, filters.with_dessert)
    by_key = {d.key: d for d in directions}
    eligible = [c for c in candidates if passes_hard(c, ctx, plan_tag_ids) and passes_soft(c, filters, meal.meal_type)]
    taken: set[tuple[str, int]] = set()
    picked: dict[str, list[Candidate]] = {}
    for key in assign_order:
        direction = by_key[key]
        pool = [c for c in eligible if (c.kind, c.id) not in taken and c.kind in direction.kinds and direction.match(c)]
        chosen = _pick(pool, CARDS_PER_DIRECTION, config.ingredient_ratio, direction.kinds)
        for c in chosen:
            c.direction = key
            taken.add((c.kind, c.id))
        picked[key] = chosen
    return [(d, picked.get(d.key, [])) for d in directions]


def _contradicts_taste(direction: Direction, filters: Filters) -> bool:
    """A direction that can never hold cards under the taste filter does not count towards the target."""
    return (filters.taste == "sweet" and direction.key == "savory") or (
        filters.taste == "savory" and direction.key == "sweet"
    )


def build_panel(
    meal_plan: MealPlan,
    meal: Meal,
    user: AbstractBaseUser,
    filters: Filters,
    seed: int | None = None,
    candidates: list[Candidate] | None = None,
    boosts: dict[tuple[str, int], float] | None = None,
) -> PanelResult:
    ctx = build_context(meal_plan, meal.meal_type)
    plan_tag_ids = set(ctx.nutritional_tag_ids)
    pool = candidates if candidates is not None else load_candidates(meal_plan, meal, user)
    rng = random.Random(seed if seed is not None else 0)
    score_candidates(pool, ctx, meal, planned_embeddings(meal_plan, meal), rng)
    for c in pool:
        c.score += (boosts or {}).get((c.kind, c.id), 0.0)

    directions, _ = directions_for(meal.meal_type, filters.with_dessert)
    target = CARDS_PER_DIRECTION * len([d for d in directions if not _contradicts_taste(d, filters)])

    active = filters
    relaxed: list[str] = []
    best = PanelResult(_assemble(pool, active, meal, ctx, plan_tag_ids), [], ctx)
    for key in RELAX_ORDER:
        if best.total >= target or key not in active.active():
            continue
        active = active.without(key)
        relaxed.append(key)
        attempt = PanelResult(_assemble(pool, active, meal, ctx, plan_tag_ids), list(relaxed), ctx)
        if attempt.total >= best.total:
            best = attempt
    return best
