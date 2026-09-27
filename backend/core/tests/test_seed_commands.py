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
class TestBuffetCatalogSeed:
    def _seed_catalog(self):
        MeasuringUnit.objects.get_or_create(name="g", defaults={"quantity": 1.0, "unit": "g"})
        MeasuringUnit.objects.get_or_create(name="ml", defaults={"quantity": 1.0, "unit": "ml"})
        call_command("seed_buffet_catalog")

    def test_uses_buffet_role_tags(self):
        self._seed_catalog()
        expected = {
            "buffet-bread",
            "buffet-fat",
            "buffet-savory",
            "buffet-sweet",
            "buffet-fresh",
            "buffet-cereal",
            "buffet-drink",
        }
        actual = set(Tag.objects.filter(group="buffet", slug__in=expected).values_list("slug", flat=True))
        assert expected == actual
        assert not Tag.objects.filter(slug__startswith="breakfast-").exists()

    def test_creates_bread_and_cereal_ingredients(self):
        self._seed_catalog()
        assert Ingredient.objects.filter(tags__slug="buffet-bread").count() == 6
        assert set(Ingredient.objects.filter(tags__slug="buffet-cereal").values_list("slug", flat=True)) == {
            "muesli",
            "haferflocken",
        }

    def test_splits_toppings_into_sweet_and_savory(self):
        self._seed_catalog()
        assert Ingredient.objects.filter(tags__slug="buffet-sweet").count() == 13
        assert Ingredient.objects.filter(tags__slug="buffet-savory").count() == 10
        assert Ingredient.objects.filter(slug="nutella", tags__slug="buffet-sweet").exists()
        assert Ingredient.objects.filter(slug="gouda", tags__slug="buffet-savory").exists()

    def test_creates_six_drink_ingredients(self):
        self._seed_catalog()
        assert Ingredient.objects.filter(tags__slug="buffet-drink", is_standalone_food=True).count() == 6

    def test_creates_drink_recipes(self):
        self._seed_catalog()
        assert Recipe.objects.filter(tags__slug="buffet-drink", recipe_type="drink").count() == 8

    def test_creates_warm_meals_and_muesli(self):
        self._seed_catalog()
        call_command("seed_breakfast_recipes")
        assert Recipe.objects.filter(tags__slug="buffet-dish", recipe_type="breakfast").count() == 5
        assert Recipe.objects.filter(slug="muesli", recipe_type="cold_meal").exists()

    def test_idempotent_on_rerun(self):
        self._seed_catalog()
        counts = (Tag.objects.count(), Ingredient.objects.count(), Recipe.objects.count())

        self._seed_catalog()

        assert (Tag.objects.count(), Ingredient.objects.count(), Recipe.objects.count()) == counts

    def test_no_legacy_drink_overlap(self):
        self._seed_catalog()
        slugs = set(Recipe.objects.filter(recipe_type="drink").values_list("slug", flat=True))
        assert "milch-laktosefrei" not in slugs
        assert "hafermilch" not in slugs
        assert "saft-orange" not in slugs
        assert "saft-apfel" not in slugs
        assert "saft-multivitamin" not in slugs
        assert "kaffee" in slugs
        assert "kakao" in slugs
        assert "tee" in slugs
