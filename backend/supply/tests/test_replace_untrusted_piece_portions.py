"""Tests for the replace_untrusted_piece_portions and fix_recipe_quantities commands."""

from __future__ import annotations

import pytest
from django.core.management import call_command

from recipe.models import Recipe, RecipeItem
from supply.choices import PortionWeightStatus
from supply.models import Ingredient, MeasuringUnit, Portion


@pytest.fixture
def gramm():
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


@pytest.mark.django_db
def test_confirms_realistic_piece_weight(gramm):
    onion = Ingredient.objects.create(name="Speisezwiebeln", slug="speisezwiebeln")
    piece = Portion.objects.create(name="Stück", ingredient=onion, measuring_unit=gramm, weight_g=100.0)
    recipe = Recipe.objects.create(title="Suppe", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=piece, quantity=0.5)

    call_command("replace_untrusted_piece_portions", apply=True)

    piece.refresh_from_db()
    item.refresh_from_db()
    assert piece.weight_status == PortionWeightStatus.CONFIRMED
    assert item.portion_id == piece.id
    assert item.quantity == 0.5


@pytest.mark.django_db
def test_moves_placeholder_to_grams_and_hides_it(gramm):
    cheese = Ingredient.objects.create(name="Gorgonzola", slug="gorgonzola")
    slice_ = Portion.objects.create(name="Scheibe", ingredient=cheese, measuring_unit=gramm, weight_g=30.0)
    recipe = Recipe.objects.create(title="Bandnudeln", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=slice_, quantity=0.8333)

    call_command("replace_untrusted_piece_portions", apply=True)

    item.refresh_from_db()
    slice_.refresh_from_db()
    assert item.portion.name == "g"
    assert item.portion.ingredient_id == cheese.id
    assert item.quantity == 25.0
    assert slice_.deleted_at is not None


@pytest.mark.django_db
def test_dry_run_writes_nothing(gramm):
    cheese = Ingredient.objects.create(name="Gorgonzola", slug="gorgonzola")
    slice_ = Portion.objects.create(name="Scheibe", ingredient=cheese, measuring_unit=gramm, weight_g=30.0)
    recipe = Recipe.objects.create(title="Bandnudeln", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=slice_, quantity=0.8333)

    call_command("replace_untrusted_piece_portions")

    item.refresh_from_db()
    slice_.refresh_from_db()
    assert item.portion_id == slice_.id
    assert slice_.deleted_at is None


@pytest.mark.django_db
def test_fix_scaled_quantities_is_idempotent(gramm):
    onion = Ingredient.objects.create(name="Zwiebel", slug="zwiebel")
    portion = Portion.objects.create(
        name="1 Portion",
        ingredient=onion,
        measuring_unit=gramm,
        weight_g=120.0,
        weight_status=PortionWeightStatus.CONFIRMED,
    )
    recipe = Recipe.objects.create(title="Pfannen-Pizza", slug="pfannen-pizza-1", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=portion, quantity=0.0042)

    call_command("fix_recipe_quantities", apply=True)
    item.refresh_from_db()
    assert item.quantity == 0.5

    item.quantity = 0.75
    item.save(update_fields=["quantity"])
    call_command("fix_recipe_quantities", apply=True)
    item.refresh_from_db()
    assert item.quantity == 0.75


@pytest.mark.django_db
def test_fix_recipe_quantities_rebinds_mislabelled_gram_portion(gramm):
    corn = Ingredient.objects.create(name="Mais", slug="mais")
    cans = Portion.objects.create(name="Dosen", ingredient=corn, measuring_unit=gramm, weight_g=1.0)
    recipe = Recipe.objects.create(title="Chili", slug="chili-test", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=cans, quantity=50)

    call_command("fix_recipe_quantities", apply=True)

    item.refresh_from_db()
    cans.refresh_from_db()
    assert item.portion.name == "g"
    assert item.quantity == 50
    assert cans.deleted_at is not None


@pytest.mark.django_db
def test_fix_recipe_quantities_dry_run_rolls_back(gramm):
    corn = Ingredient.objects.create(name="Mais", slug="mais")
    cans = Portion.objects.create(name="Dosen", ingredient=corn, measuring_unit=gramm, weight_g=1.0)
    recipe = Recipe.objects.create(title="Chili", slug="chili-test", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=cans, quantity=50)

    call_command("fix_recipe_quantities")

    item.refresh_from_db()
    cans.refresh_from_db()
    assert item.portion_id == cans.id
    assert cans.deleted_at is None


@pytest.mark.django_db
def test_fix_recipe_quantities_replaces_wrong_ingredient(gramm):
    amaretto = Ingredient.objects.create(name="Amaretto-Eier (Oster)", slug="amaretto-eier")
    old = Portion.objects.create(
        name="180g",
        ingredient=amaretto,
        measuring_unit=gramm,
        weight_g=180.0,
        weight_status=PortionWeightStatus.IMPORTED,
    )
    egg = Ingredient.objects.create(name="Hühnerei", slug="huehnerei")
    new = Portion.objects.create(
        name="1 Ei (60g)",
        ingredient=egg,
        measuring_unit=gramm,
        weight_g=60.0,
        weight_status=PortionWeightStatus.IMPORTED,
    )
    recipe = Recipe.objects.create(title="Omelett", slug="omelett", portions=1)
    item = RecipeItem.objects.create(recipe=recipe, portion=old, quantity=3)

    call_command("fix_recipe_quantities", apply=True)

    item.refresh_from_db()
    assert item.portion_id == new.id
    assert item.quantity == 3


@pytest.mark.django_db
def test_cleanup_placeholder_portions_promotes_trusted_main_portion(gramm):
    spinach = Ingredient.objects.create(name="Rahmspinat", slug="rahmspinat")
    placeholder = Portion.objects.create(
        name="1 Stück (150g)", ingredient=spinach, measuring_unit=gramm, weight_g=150.0, rank=1
    )
    hundred = Portion.objects.create(
        name="100g",
        ingredient=spinach,
        measuring_unit=gramm,
        weight_g=100.0,
        weight_status=PortionWeightStatus.IMPORTED,
        rank=2,
    )

    call_command("cleanup_placeholder_portions", apply=True)

    placeholder.refresh_from_db()
    hundred.refresh_from_db()
    assert placeholder.deleted_at is not None
    assert hundred.rank == 1


@pytest.mark.django_db
def test_cleanup_placeholder_portions_keeps_referenced_and_sole_portions(gramm):
    apple = Ingredient.objects.create(name="Apfel", slug="apfel")
    used = Portion.objects.create(name="1 Stück (150g)", ingredient=apple, measuring_unit=gramm, weight_g=150.0)
    RecipeItem.objects.create(recipe=Recipe.objects.create(title="Kuchen"), portion=used, quantity=1)
    kiwi = Ingredient.objects.create(name="Kiwi", slug="kiwi")
    kiwi.portions.all().delete()  # drop auto-created default portions
    sole = Portion.objects.create(name="1 Stück (150g)", ingredient=kiwi, measuring_unit=gramm, weight_g=150.0)

    call_command("cleanup_placeholder_portions", apply=True)

    used.refresh_from_db()
    sole.refresh_from_db()
    assert used.deleted_at is None
    assert sole.deleted_at is None
