import pytest
from django.test import Client

from recipe.models import Recipe


@pytest.fixture
def admin_user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="admin_staff",
        email="admin_staff@test.de",
        password="secret",
        is_staff=True,
    )


@pytest.fixture
def regular_user(db, django_user_model):
    return django_user_model.objects.create_user(
        username="regular",
        email="regular@test.de",
        password="secret",
        is_staff=False,
    )


@pytest.fixture
def admin_client(admin_user) -> Client:
    c = Client()
    c.force_login(admin_user)
    return c


@pytest.fixture
def regular_client(regular_user) -> Client:
    c = Client()
    c.force_login(regular_user)
    return c


BASE = "/api/admin/data-quality/recipes/portion-plausibility/"


@pytest.mark.django_db
class TestRecipePortionPlausibility:
    def test_requires_staff(self, regular_client):
        resp = regular_client.get(BASE)
        assert resp.status_code == 403

    def test_plausible_warm_meal_not_flagged(self, admin_client):
        Recipe.objects.create(
            title="Normale Pasta",
            slug="normale-pasta",
            recipe_type="warm_meal",
            portions=1,
            cached_weight_g=450.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert not any(i["slug"] == "normale-pasta" for i in items)

    def test_too_heavy_meal_flagged(self, admin_client):
        Recipe.objects.create(
            title="Riesentopf",
            slug="riesentopf",
            recipe_type="warm_meal",
            portions=1,
            cached_weight_g=5000.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        item = next((i for i in items if i["slug"] == "riesentopf"), None)
        assert item is not None
        assert "Sehr viel Gewicht" in item["issue"]
        assert item["cached_weight_g"] == 5000.0

    def test_too_light_meal_flagged(self, admin_client):
        Recipe.objects.create(
            title="Magerkost",
            slug="magerkost",
            recipe_type="warm_meal",
            portions=1,
            cached_weight_g=50.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        item = next((i for i in items if i["slug"] == "magerkost"), None)
        assert item is not None
        assert "Sehr wenig Gewicht" in item["issue"]

    def test_multi_portion_recipe_calculates_per_portion(self, admin_client):
        # 4 portions with 4000g total = 1000g/portion (plausible, not > 2000g per portion)
        Recipe.objects.create(
            title="Gruppensuppe",
            slug="gruppensuppe",
            recipe_type="warm_meal",
            portions=4,
            cached_weight_g=4000.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert not any(i["slug"] == "gruppensuppe" for i in items)

    def test_snack_not_flagged_for_light_weight(self, admin_client):
        Recipe.objects.create(
            title="Brotchips",
            slug="brotchips",
            recipe_type="snack",
            portions=1,
            cached_weight_g=30.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert not any(i["slug"] == "brotchips" for i in items)

    def test_recipe_part_not_flagged_for_light_weight(self, admin_client):
        Recipe.objects.create(
            title="Kräuterbutter",
            slug="kraeuterbutter",
            recipe_type="recipe_part",
            portions=1,
            cached_weight_g=80.0,
        )
        resp = admin_client.get(BASE)
        assert resp.status_code == 200
        items = resp.json()["items"]
        assert not any(i["slug"] == "kraeuterbutter" for i in items)
