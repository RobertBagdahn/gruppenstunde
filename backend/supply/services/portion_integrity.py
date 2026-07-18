"""Guard-rails for Portion/RecipeItem integrity.

Prevents the class of bugs discovered while investigating the AI quantity
estimation feature: once a `Portion` is referenced by a `RecipeItem`, its
`weight_g` MUST never change in place (a new Portion is created instead), and
`RecipeItem.portion_id` MUST never be rewritten by an automated process except
through the dedicated rebind helpers in this module.
"""

from __future__ import annotations

import logging

logger = logging.getLogger(__name__)


def is_referenced_by_recipe_items(portion) -> bool:
    """Return True if at least one RecipeItem points to this portion."""
    from recipe.models import RecipeItem

    return RecipeItem.objects.filter(portion=portion).exists()


def get_active_rank1_portion(ingredient, *, exclude_portion_id: int | None = None):
    """Return the ingredient's single active (non-deleted) rank=1 portion, if any."""
    qs = ingredient.portions.filter(rank=1, deleted_at__isnull=True).select_related("measuring_unit")
    if exclude_portion_id is not None:
        qs = qs.exclude(pk=exclude_portion_id)
    return qs.order_by("id").first()


def rebind_recipe_items_to_portion(source_portion, target_portion, *, updated_by=None) -> list[int]:
    """Rebind all RecipeItems referencing `source_portion` onto `target_portion`,
    preserving the gram amount (`quantity * weight_g` stays constant).

    Returns the list of updated RecipeItem ids.
    """
    from recipe.models import RecipeItem

    old_weight_g = source_portion.weight_g or 1.0
    new_weight_g = target_portion.weight_g or 1.0

    updated_ids: list[int] = []
    items = list(RecipeItem.objects.filter(portion=source_portion))
    for item in items:
        grams = item.quantity * old_weight_g
        item.portion = target_portion
        # RecipeItem.quantity has a DB check constraint (> 0). Rounding very
        # small gram amounts against a large target weight_g can otherwise
        # round down to exactly 0.0 and violate it — clamp to a tiny epsilon
        # instead (still negligible in practice, e.g. a trace of a spice).
        item.quantity = max(round(grams / new_weight_g, 4), 0.0001)
        item.save(update_fields=["portion", "quantity"])
        updated_ids.append(item.id)

    if updated_ids:
        logger.info(
            "Rebound %d RecipeItem(s) from portion %s (%s) to portion %s (%s)",
            len(updated_ids),
            source_portion.id,
            source_portion.name,
            target_portion.id,
            target_portion.name,
        )
    return updated_ids


def rebind_recipe_items_to_rank1(portion, *, updated_by=None) -> list[int]:
    """Rebind all RecipeItems referencing `portion` onto the ingredient's current
    active rank=1 portion (excluding `portion` itself), preserving gram amounts.

    Raises ValueError if no other active rank=1 portion exists for the ingredient
    (i.e. `portion` itself is the only active rank=1 portion — nothing to rebind onto).
    """
    ingredient = portion.ingredient
    target = get_active_rank1_portion(ingredient, exclude_portion_id=portion.pk)
    if target is None:
        raise ValueError(
            f"Keine andere aktive rank=1-Portion für Zutat '{ingredient.name}' verfügbar — "
            "Rebind nicht möglich."
        )
    return rebind_recipe_items_to_portion(portion, target, updated_by=updated_by)


def would_change_weight_g(portion, prospective_weight_g: float | None) -> bool:
    """Return True if `prospective_weight_g` differs from the portion's current
    persisted `weight_g` (within floating point tolerance)."""
    current = portion.weight_g
    if current is None and prospective_weight_g is None:
        return False
    if current is None or prospective_weight_g is None:
        return True
    return abs(current - prospective_weight_g) > 1e-6


def create_replacement_portion(old_portion, **new_attrs):
    """Create a brand-new Portion carrying `new_attrs`, leaving `old_portion`
    completely untouched. Used when a weight_g change is requested on a
    Portion that is already referenced by RecipeItems (Guard-Rail: Decision 1).

    Auto-suffixes the name if it collides with the (untouched) old portion's
    name, since the unique-per-ingredient-name constraint would otherwise reject it.

    If rank=1 would collide with an existing active rank=1 portion (e.g. the
    untouched old portion), automatically assigns the next free rank to avoid
    a unique-constraint violation.
    """
    from supply.models import Portion

    ingredient = old_portion.ingredient
    name = new_attrs.get("name") or old_portion.name
    if Portion.objects.filter(ingredient=ingredient, name__iexact=name, deleted_at__isnull=True).exists():
        name = f"{name} (neu)"

    rank = new_attrs.get("rank", old_portion.rank)
    if rank == 1 and Portion.objects.filter(
        ingredient=ingredient, rank=1, deleted_at__isnull=True
    ).exists():
        taken_ranks = set(
            Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).values_list(
                "rank", flat=True
            )
        )
        rank = 2
        while rank in taken_ranks:
            rank += 1

    portion = Portion(
        ingredient=ingredient,
        name=name,
        quantity=new_attrs.get("quantity", old_portion.quantity),
        measuring_unit=new_attrs.get("measuring_unit", old_portion.measuring_unit),
        rank=rank,
        created_by=new_attrs.get("created_by"),
    )
    portion.weight_g = new_attrs.get("weight_g")
    portion.save()
    logger.info(
        "Created replacement portion %s (%s) for referenced portion %s (%s) instead of updating weight_g in place",
        portion.id,
        portion.name,
        old_portion.id,
        old_portion.name,
    )
    return portion


def _pick_rank1_winner(candidates: list, referenced_ids: set[int]):
    """Pure selection logic for `dedupe_rank1_portions`: given a list of
    candidate rank=1 Portion objects for the same ingredient and the set of
    ids among them that are referenced by at least one RecipeItem, return the
    winning Portion (kept at rank=1)."""
    referenced = [p for p in candidates if p.pk in referenced_ids]
    if referenced:
        return referenced[0]
    # Heuristic: prefer the portion with the largest weight_g > 1 (avoids
    # picking degenerate "g"/placeholder-style portions as the winner).
    plausible = sorted(
        candidates,
        key=lambda p: (p.weight_g or 0) if (p.weight_g or 0) > 1 else -1,
        reverse=True,
    )
    return plausible[0]


def dedupe_rank1_portions(*, dry_run: bool = False) -> list[dict]:
    """Ensure every ingredient has at most one active rank=1 portion.

    For ingredients with more than one active rank=1 portion: the portion
    already referenced by at least one RecipeItem wins and keeps rank=1; all
    other candidates are demoted to the next free rank. If none of the
    candidates are referenced, the one with the most plausible `weight_g`
    (closest to a sane default, largest non-trivial value) wins.

    Returns a list of dicts describing each change made (or that would be
    made if `dry_run=True`).
    """
    from django.db.models import Count, Q

    from recipe.models import RecipeItem
    from supply.models import Ingredient

    changes: list[dict] = []

    duplicated = Ingredient.objects.annotate(
        rank1_count=Count("portions", filter=Q(portions__rank=1, portions__deleted_at__isnull=True)),
    ).filter(rank1_count__gt=1)

    for ingredient in duplicated:
        candidates = list(
            ingredient.portions.filter(rank=1, deleted_at__isnull=True).order_by("id"),
        )
        referenced_ids = set(
            RecipeItem.objects.filter(portion__in=candidates).values_list("portion_id", flat=True),
        )
        winner = _pick_rank1_winner(candidates, referenced_ids)

        # Find a free rank to demote the losers to (start at 2, skip taken ranks)
        taken_ranks = set(
            ingredient.portions.filter(deleted_at__isnull=True).values_list("rank", flat=True),
        )
        next_free_rank = 2
        for loser in candidates:
            if loser.pk == winner.pk:
                continue
            while next_free_rank in taken_ranks:
                next_free_rank += 1
            changes.append(
                {
                    "ingredient_id": ingredient.id,
                    "ingredient_name": ingredient.name,
                    "winner_portion_id": winner.id,
                    "demoted_portion_id": loser.id,
                    "demoted_to_rank": next_free_rank,
                },
            )
            if not dry_run:
                loser.rank = next_free_rank
                loser.save(update_fields=["rank"])
            taken_ranks.add(next_free_rank)
            next_free_rank += 1

    return changes


def rebind_dead_portion_references(*, dry_run: bool = False) -> list[dict]:
    """Find all RecipeItems pointing to a soft-deleted portion and rebind them
    onto the ingredient's current active rank=1 portion, preserving gram amounts.

    Returns a list of dicts describing each rebind performed (or that would be
    performed if `dry_run=True`).
    """
    from recipe.models import RecipeItem

    changes: list[dict] = []
    items = list(
        RecipeItem.objects.filter(portion__deleted_at__isnull=False).select_related(
            "portion",
            "portion__ingredient",
        ),
    )
    for item in items:
        portion = item.portion
        ingredient = portion.ingredient
        target = get_active_rank1_portion(ingredient, exclude_portion_id=portion.pk)
        if target is None:
            logger.warning(
                "RecipeItem %s references deleted portion %s (%s) but no active "
                "rank=1 portion exists for ingredient '%s' — skipping",
                item.id,
                portion.id,
                portion.name,
                ingredient.name,
            )
            continue

        old_weight_g = portion.weight_g or 1.0
        new_weight_g = target.weight_g or 1.0
        grams = item.quantity * old_weight_g
        # Clamp away from exactly 0 — RecipeItem.quantity has a DB check
        # constraint (> 0); rounding a tiny gram amount against a large
        # target weight_g can otherwise round down to 0.0.
        new_quantity = max(round(grams / new_weight_g, 4), 0.0001)

        changes.append(
            {
                "recipe_item_id": item.id,
                "recipe_id": item.recipe_id,
                "old_portion_id": portion.id,
                "new_portion_id": target.id,
                "old_quantity": item.quantity,
                "new_quantity": new_quantity,
            },
        )

        if not dry_run:
            item.portion = target
            item.quantity = new_quantity
            item.save(update_fields=["portion", "quantity"])

    return changes
