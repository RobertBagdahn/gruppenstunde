"""Tests for the normalize_recipe_servings management command."""

from io import StringIO

import pytest
from django.core.management import CommandError, call_command

from recipe.management.commands.normalize_recipe_servings import (
    PER_PERSON,
    REVIEW,
    TOTAL,
    classify_recipe_servings,
)
from recipe.models import Recipe, RecipeItem, RecipeItemExchangeGroup, RecipeStep, RecipeStepIngredient
from recipe.tests import make_recipe
from supply.tests import make_ingredient


def _recipe_with_grams(title: str, portions: int, grams: list[float], recipe_type: str = "warm_meal") -> Recipe:
    recipe = make_recipe(title=title, portions=portions, recipe_type=recipe_type)
    for index, quantity in enumerate(grams):
        ingredient = make_ingredient(name=f"{title} Zutat {index}")
        RecipeItem.objects.create(recipe=recipe, ingredient=ingredient, portion=None, quantity=quantity)
    return recipe


def _run(*args: str) -> str:
    out = StringIO()
    call_command("normalize_recipe_servings", *args, stdout=out)
    return out.getvalue()


def _quantities(recipe: Recipe) -> list[float]:
    return sorted(recipe.recipe_items.values_list("quantity", flat=True))


@pytest.mark.django_db
class TestClassifyRecipeServings:
    def test_plausible_per_person_weight_is_per_person(self):
        recipe = _recipe_with_grams("Suppe für zwanzig", 20, [300, 185])

        assert classify_recipe_servings(recipe).category == PER_PERSON

    def test_total_weight_for_all_servings_is_total(self):
        recipe = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])

        classification = classify_recipe_servings(recipe)

        assert classification.category == TOTAL
        assert classification.weight_if_total_g == 300

    def test_both_interpretations_plausible_needs_review(self):
        recipe = _recipe_with_grams("Nudelsalat", 2, [400, 300])

        assert classify_recipe_servings(recipe).category == REVIEW

    def test_sauce_uses_small_per_person_range(self):
        sauce = _recipe_with_grams("Tomatensoße", 4, [400], recipe_type="recipe_part")
        component = _recipe_with_grams("Tofu-Hack", 4, [400], recipe_type="recipe_part")

        assert classify_recipe_servings(sauce).category == TOTAL
        assert classify_recipe_servings(sauce).range_g == (30.0, 120.0)
        assert classify_recipe_servings(component).range_g == (50.0, 300.0)

    def test_exchange_alternatives_do_not_count_towards_weight(self):
        recipe = _recipe_with_grams("Hirsebrei", 4, [300], recipe_type="breakfast")
        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Getreide")
        RecipeItem.objects.filter(recipe=recipe).update(exchange_group=group, exchange_position=0)
        RecipeItem.objects.create(
            recipe=recipe,
            ingredient=make_ingredient(name="Hafer Alternative"),
            quantity=900,
            exchange_group=group,
            exchange_position=1,
        )

        classification = classify_recipe_servings(recipe)

        assert classification.total_weight_g == 300
        assert classification.category == PER_PERSON

    def test_recipe_without_weighted_items_is_per_person(self):
        recipe = make_recipe(title="Leer", portions=4)

        assert classify_recipe_servings(recipe).category == PER_PERSON


@pytest.mark.django_db
class TestNormalizeRecipeServingsCommand:
    def test_default_run_reports_without_writing(self):
        recipe = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])

        output = _run()

        recipe.refresh_from_db()
        assert recipe.portions == 4
        assert _quantities(recipe) == [150, 200, 250, 600]
        assert "Dry run" in output

    def test_explicit_dry_run_does_not_write(self):
        recipe = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])

        _run("--dry-run")

        recipe.refresh_from_db()
        assert recipe.portions == 4

    def test_apply_divides_totals_and_keeps_step_modifiers(self):
        recipe = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])
        group = RecipeItemExchangeGroup.objects.create(recipe=recipe, name="Käse")
        RecipeItem.objects.filter(recipe=recipe, quantity=250).update(exchange_group=group, exchange_position=0)
        alternative = RecipeItem.objects.create(
            recipe=recipe,
            ingredient=make_ingredient(name="Emmentaler"),
            quantity=200,
            exchange_group=group,
            exchange_position=1,
        )
        step = RecipeStep.objects.create(recipe=recipe, sort_order=0, instruction="Kochen")
        link = RecipeStepIngredient.objects.create(
            step=step, recipe_item=recipe.recipe_items.get(quantity=600), quantity_modifier=0.5
        )

        _run("--apply")

        recipe.refresh_from_db()
        alternative.refresh_from_db()
        link.refresh_from_db()
        assert recipe.portions == 1
        assert recipe.source_servings == 4
        assert _quantities(recipe) == [37.5, 50, 50, 62.5, 150]
        assert alternative.quantity == 50
        assert link.quantity_modifier == 0.5
        assert recipe.cached_weight_g == pytest.approx(300)

    def test_apply_keeps_per_person_quantities(self):
        recipe = _recipe_with_grams("Suppe für zwanzig", 20, [300, 185])

        _run("--apply")

        recipe.refresh_from_db()
        assert recipe.portions == 1
        assert recipe.source_servings is None
        assert _quantities(recipe) == [185, 300]
        assert recipe.cached_weight_g == pytest.approx(485)

    def test_apply_keeps_existing_source_servings(self):
        recipe = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])
        Recipe.objects.filter(id=recipe.id).update(source_servings=6)

        _run("--apply")

        recipe.refresh_from_db()
        assert recipe.source_servings == 6
        assert recipe.portions == 1

    def test_apply_leaves_review_cases_unchanged(self):
        recipe = _recipe_with_grams("Nudelsalat", 2, [400, 300])

        output = _run("--apply")

        recipe.refresh_from_db()
        assert recipe.portions == 2
        assert _quantities(recipe) == [300, 400]
        assert "1 need review" in output

    def test_overrides_decide_review_and_heuristic_cases(self):
        review_case = _recipe_with_grams("Nudelsalat", 2, [400, 300])
        heuristic_total = _recipe_with_grams("Käsenudeln", 4, [600, 250, 200, 150])

        _run(
            "--apply",
            f"--treat-as-total={review_case.id}",
            f"--treat-as-per-person={heuristic_total.id}",
        )

        review_case.refresh_from_db()
        heuristic_total.refresh_from_db()
        assert review_case.portions == 1
        assert _quantities(review_case) == [150, 200]
        assert heuristic_total.portions == 1
        assert _quantities(heuristic_total) == [150, 200, 250, 600]

    def test_ids_restrict_processed_recipes(self):
        selected = _recipe_with_grams("Suppe", 20, [300, 185])
        skipped = _recipe_with_grams("Andere Suppe", 20, [300, 185])

        _run("--apply", f"--ids={selected.id}")

        selected.refresh_from_db()
        skipped.refresh_from_db()
        assert selected.portions == 1
        assert skipped.portions == 20

    def test_conflicting_overrides_are_rejected(self):
        recipe = _recipe_with_grams("Nudelsalat", 2, [400, 300])

        with pytest.raises(CommandError):
            _run(f"--treat-as-total={recipe.id}", f"--treat-as-per-person={recipe.id}")

    def test_apply_and_dry_run_are_mutually_exclusive(self):
        with pytest.raises(CommandError):
            _run("--apply", "--dry-run")
