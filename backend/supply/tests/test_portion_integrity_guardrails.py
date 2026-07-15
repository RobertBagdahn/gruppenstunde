"""Tests for Portion/RecipeItem integrity guard-rails.

Covers the change `fix-portion-integrity-and-ai-estimate`: prevents changing
`weight_g` in place on a referenced Portion, enforces a single active rank=1
portion per ingredient, and auto-rebinds RecipeItems when their portion is
deleted.
"""

import pytest

from recipe.tests import make_recipe, make_recipe_item
from supply.models import Ingredient, MeasuringUnit, Portion, RetailSection
from supply.services.portion_integrity import (
    _pick_rank1_winner,
    create_replacement_portion,
    dedupe_rank1_portions,
    get_active_rank1_portion,
    is_referenced_by_recipe_items,
    rebind_dead_portion_references,
    rebind_recipe_items_to_rank1,
    would_change_weight_g,
)


@pytest.fixture
def retail_section(db):
    return RetailSection.objects.create(name="Gemüse", rank=1)


@pytest.fixture
def measuring_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.fixture
def ingredient(db, retail_section):
    return Ingredient.objects.create(
        name="Testzutat",
        slug="testzutat",
        status="approved",
        retail_section=retail_section,
    )


def make_portion(ingredient, measuring_unit, **kwargs):
    defaults = {"name": "100g Testzutat", "quantity": 1.0, "rank": 1}
    defaults.update(kwargs)
    portion = Portion(ingredient=ingredient, measuring_unit=measuring_unit, **defaults)
    portion.weight_g = kwargs.get("weight_g", 100.0)
    portion.save()
    return portion


# ---------------------------------------------------------------------------
# 1.1 is_referenced_by_recipe_items()
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_is_referenced_by_recipe_items(ingredient, measuring_unit):
    portion = make_portion(ingredient, measuring_unit)
    assert portion.is_referenced_by_recipe_items() is False
    assert is_referenced_by_recipe_items(portion) is False

    make_recipe_item(portion=portion, quantity=2.0)

    assert portion.is_referenced_by_recipe_items() is True
    assert is_referenced_by_recipe_items(portion) is True


# ---------------------------------------------------------------------------
# would_change_weight_g()
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_would_change_weight_g(ingredient, measuring_unit):
    portion = make_portion(ingredient, measuring_unit, weight_g=100.0)
    assert would_change_weight_g(portion, 100.0) is False
    assert would_change_weight_g(portion, 100.0000001) is False  # tolerance
    assert would_change_weight_g(portion, 150.0) is True
    assert would_change_weight_g(portion, None) is True


# ---------------------------------------------------------------------------
# 1.7 weight_g guard-rail: referenced portion → new portion created instead
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_create_replacement_portion_leaves_original_untouched(ingredient, measuring_unit):
    portion = make_portion(ingredient, measuring_unit, name="1 Stück (150g)", weight_g=150.0)
    make_recipe_item(portion=portion, quantity=1.0)

    replacement = create_replacement_portion(
        portion,
        name="1 Stück (150g)",
        quantity=1.0,
        measuring_unit=measuring_unit,
        weight_g=200.0,
        rank=2,
    )

    portion.refresh_from_db()
    assert portion.weight_g == 150.0  # unchanged
    assert replacement.id != portion.id
    assert replacement.weight_g == 200.0
    # Name collision was auto-resolved
    assert replacement.name != portion.name or replacement.id != portion.id


@pytest.mark.django_db
def test_replacement_portion_autosuffixes_colliding_name(ingredient, measuring_unit):
    portion = make_portion(ingredient, measuring_unit, name="Portion A", weight_g=100.0)
    make_recipe_item(portion=portion, quantity=1.0)

    replacement = create_replacement_portion(
        portion,
        name="Portion A",
        quantity=1.0,
        measuring_unit=measuring_unit,
        weight_g=120.0,
        rank=2,
    )
    assert replacement.name == "Portion A (neu)"


# ---------------------------------------------------------------------------
# Unique rank=1 constraint
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_unique_rank1_constraint_rejects_second_active_rank1(ingredient, measuring_unit):
    from django.db import IntegrityError, transaction

    make_portion(ingredient, measuring_unit, name="Portion 1", rank=1)

    with pytest.raises(IntegrityError):
        with transaction.atomic():
            make_portion(ingredient, measuring_unit, name="Portion 2", rank=1)


@pytest.mark.django_db
def test_rank1_reassignable_after_softdelete(ingredient, measuring_unit):
    first = make_portion(ingredient, measuring_unit, name="Portion 1", rank=1)
    first.soft_delete()

    # Now a new rank=1 portion is allowed since the previous one is deleted
    second = make_portion(ingredient, measuring_unit, name="Portion 2", rank=1)
    assert second.rank == 1


# ---------------------------------------------------------------------------
# Rebind: portion deleted → RecipeItems moved to rank=1, gram amount preserved
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_rebind_recipe_items_to_rank1_preserves_grams(ingredient, measuring_unit):
    rank1 = make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1, weight_g=100.0)
    prise = make_portion(ingredient, measuring_unit, name="1 Prise", rank=2, weight_g=0.3)

    item = make_recipe_item(portion=prise, quantity=10.0)  # 10 * 0.3 = 3g

    updated_ids = rebind_recipe_items_to_rank1(prise)

    item.refresh_from_db()
    assert item.id in updated_ids
    assert item.portion_id == rank1.id
    assert item.quantity * rank1.weight_g == pytest.approx(3.0, abs=0.01)


@pytest.mark.django_db
def test_rebind_recipe_items_to_rank1_clamps_away_from_zero_quantity(ingredient, measuring_unit):
    """Regression: reproduces a real production incident during the
    fix-portion-integrity-and-ai-estimate rollout. Rebinding a tiny gram
    amount onto a portion with a much larger weight_g rounded to exactly
    0.0 at 4 decimals, violating RecipeItem's `quantity > 0` DB check
    constraint (`recipe_item_quantity_positive`)."""
    rank1 = make_portion(ingredient, measuring_unit, name="1 kg Testzutat", rank=1, weight_g=1000.0)
    trace = make_portion(ingredient, measuring_unit, name="Spur", rank=2, weight_g=0.001)

    item = make_recipe_item(portion=trace, quantity=1.0)  # 1 * 0.001 = 0.001g total

    rebind_recipe_items_to_rank1(trace)

    item.refresh_from_db()
    assert item.quantity > 0
    assert item.quantity == 0.0001


@pytest.mark.django_db
def test_rebind_recipe_items_to_rank1_raises_without_target(ingredient, measuring_unit):
    only_rank1 = make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1)
    make_recipe_item(portion=only_rank1, quantity=1.0)

    with pytest.raises(ValueError):
        rebind_recipe_items_to_rank1(only_rank1)


@pytest.mark.django_db
def test_get_active_rank1_portion_excludes_deleted(ingredient, measuring_unit):
    rank1 = make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1)
    assert get_active_rank1_portion(ingredient) == rank1

    rank1.soft_delete()
    assert get_active_rank1_portion(ingredient) is None


# ---------------------------------------------------------------------------
# 2.7 dedupe_rank1_portions()
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_pick_rank1_winner_prefers_referenced_portion(ingredient, measuring_unit):
    legacy = make_portion(ingredient, measuring_unit, name="Gramm (legacy)", rank=2, weight_g=1.0)
    newer = make_portion(ingredient, measuring_unit, name="1 Stück (150g)", rank=3, weight_g=150.0)

    winner = _pick_rank1_winner([legacy, newer], referenced_ids={newer.pk})
    assert winner.pk == newer.pk


@pytest.mark.django_db
def test_pick_rank1_winner_prefers_plausible_weight_when_unreferenced(ingredient, measuring_unit):
    degenerate = make_portion(ingredient, measuring_unit, name="Gramm (degenerate)", rank=2, weight_g=1.0)
    plausible = make_portion(ingredient, measuring_unit, name="1 Stück (150g)", rank=3, weight_g=150.0)

    winner = _pick_rank1_winner([degenerate, plausible], referenced_ids=set())
    assert winner.pk == plausible.pk


@pytest.mark.django_db
def test_dedupe_rank1_portions_no_duplicates_is_noop(ingredient, measuring_unit):
    make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1)
    assert dedupe_rank1_portions() == []


# ---------------------------------------------------------------------------
# 2.8 rebind_dead_portion_references() — mass rebind for repair command
# ---------------------------------------------------------------------------


@pytest.mark.django_db
def test_rebind_dead_portion_references_mass_run(ingredient, measuring_unit):
    rank1 = make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1, weight_g=100.0)
    dead = make_portion(ingredient, measuring_unit, name="1 Prise", rank=2, weight_g=0.3)

    item1 = make_recipe_item(portion=dead, quantity=10.0)  # 3g
    item2 = make_recipe_item(portion=dead, quantity=20.0)  # 6g

    dead.soft_delete()

    changes = rebind_dead_portion_references()

    item1.refresh_from_db()
    item2.refresh_from_db()
    assert len(changes) == 2
    assert item1.portion_id == rank1.id
    assert item2.portion_id == rank1.id
    assert item1.quantity * rank1.weight_g == pytest.approx(3.0, abs=0.01)
    assert item2.quantity * rank1.weight_g == pytest.approx(6.0, abs=0.01)


@pytest.mark.django_db
def test_rebind_dead_portion_references_dry_run_does_not_persist(ingredient, measuring_unit):
    rank1 = make_portion(ingredient, measuring_unit, name="100g Testzutat", rank=1, weight_g=100.0)
    dead = make_portion(ingredient, measuring_unit, name="1 Prise", rank=2, weight_g=0.3)
    item = make_recipe_item(portion=dead, quantity=10.0)
    dead.soft_delete()

    changes = rebind_dead_portion_references(dry_run=True)

    item.refresh_from_db()
    assert len(changes) == 1
    assert item.portion_id == dead.id  # unchanged
