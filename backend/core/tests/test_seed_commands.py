from io import StringIO

import pytest
from django.contrib.auth import get_user_model
from django.core.management import call_command

from content.choices import ContentStatus
from content.models import Tag
from recipe.models import Recipe
from session.models import GroupSession
from supply.models import Ingredient, MeasuringUnit


@pytest.mark.django_db
class TestAddUsersCommand:
    def test_if_empty_skips_when_users_exist(self):
        UserModel = get_user_model()
        UserModel.objects.create_user(username="existing", password="existing")

        output = StringIO()
        call_command("add_users", "--if-empty", stdout=output)

        assert UserModel.objects.count() == 1
        assert "skipping add_users" in output.getvalue()


@pytest.mark.django_db
class TestSeedAllCommand:
    def test_if_empty_skips_selected_section_when_seed_data_exists(self):
        GroupSession.objects.create(
            title="Existing session",
            summary="Already seeded",
            session_type="scout_skills",
            status=ContentStatus.APPROVED,
        )

        output = StringIO()
        call_command("seed_all", "--only", "content", "--if-empty", stdout=output)

        assert GroupSession.objects.count() == 1
        assert "skipping seed_all" in output.getvalue()


@pytest.mark.django_db
class TestBreakfastSeed:
    def _seed_breakfast(self):
        MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        MeasuringUnit.objects.get_or_create(name="ml", defaults={"quantity": 1.0, "unit": "ml"})
        call_command("seed_breakfast_catalog")

    def test_creates_all_tags(self):
        self._seed_breakfast()
        expected = {"breakfast-base", "breakfast-topping", "breakfast-drink", "breakfast-warm-meal"}
        actual = set(Tag.objects.filter(slug__in=expected).values_list("slug", flat=True))
        assert expected == actual

    def test_creates_six_base_ingredients(self):
        self._seed_breakfast()
        tag = Tag.objects.get(slug="breakfast-base")
        count = Ingredient.objects.filter(tags=tag).count()
        assert count == 6

    def test_creates_seventeen_topping_ingredients(self):
        self._seed_breakfast()
        tag = Tag.objects.get(slug="breakfast-topping")
        count = Ingredient.objects.filter(tags=tag).count()
        assert count == 17

    def test_creates_six_drink_ingredients(self):
        self._seed_breakfast()
        tag = Tag.objects.get(slug="breakfast-drink")
        count = Ingredient.objects.filter(tags=tag, is_standalone_food=True).count()
        assert count == 6

    def test_creates_three_drink_recipes(self):
        self._seed_breakfast()
        tag = Tag.objects.get(slug="breakfast-drink")
        count = Recipe.objects.filter(tags=tag, recipe_type="drink").count()
        assert count == 3

    def test_creates_warm_meals_and_muesli(self):
        MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        MeasuringUnit.objects.get_or_create(name="ml", defaults={"quantity": 1.0, "unit": "ml"})
        call_command("seed_breakfast_catalog")
        call_command("seed_breakfast_recipes")
        warm_tag = Tag.objects.get(slug="breakfast-warm-meal")
        warm_count = Recipe.objects.filter(tags=warm_tag, recipe_type="breakfast").count()
        assert warm_count == 5
        muesli = Recipe.objects.filter(slug="muesli", recipe_type="cold_meal").first()
        assert muesli is not None

    def test_idempotent_on_rerun(self):
        self._seed_breakfast()
        tag_count_before = Tag.objects.count()
        ing_count_before = Ingredient.objects.count()
        recipe_count_before = Recipe.objects.count()

        self._seed_breakfast()

        assert Tag.objects.count() == tag_count_before
        assert Ingredient.objects.count() == ing_count_before
        assert Recipe.objects.count() == recipe_count_before

    def test_no_legacy_drink_overlap(self):
        """seed_breakfast_catalog creates 3 drink recipes, NOT the 8 from the old system."""
        self._seed_breakfast()
        drinks = Recipe.objects.filter(recipe_type="drink")
        slugs = set(drinks.values_list("slug", flat=True))
        assert "milch-laktosefrei" not in slugs
        assert "hafermilch" not in slugs
        assert "saft-orange" not in slugs
        assert "saft-apfel" not in slugs
        assert "saft-multivitamin" not in slugs
        assert "kaffee" in slugs
        assert "kakao" in slugs
        assert "tee" in slugs
