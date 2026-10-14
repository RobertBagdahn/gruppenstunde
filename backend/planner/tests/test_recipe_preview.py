"""Recipe preview endpoint of the meal search: full description, scaled amounts, allergen chips."""

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from model_bakery import baker

from recipe.tests import make_recipe, make_recipe_item
from supply.models import NutritionalTag
from supply.tests import make_ingredient, make_portion

User = get_user_model()


def _client():
    user = User.objects.create_user(username="previewer", password="x")
    client = Client()
    client.force_login(user)
    return client, user


@pytest.mark.django_db
class TestRecipePreview:
    def test_returns_full_description_scaled_amounts_and_allergens(self):
        client, _user = _client()
        description = "Deftige Suppe. " * 40
        recipe = make_recipe(title="Käse-Suppe", status="approved", description=description)
        ingredient = make_ingredient(name="Hackfleisch")
        portion = make_portion(ingredient=ingredient, name="Gramm", quantity=1.0, weight_g=1.0)
        make_recipe_item(recipe=recipe, portion=portion, ingredient=ingredient, quantity=50.0)
        lactose = baker.make(NutritionalTag, name="Laktose", is_dangerous=True)
        vegan = baker.make(NutritionalTag, name="Vegetarisch", is_dangerous=False)
        recipe.nutritional_tags.add(lactose, vegan)

        response = client.get(f"/api/meal-plans/recipes/{recipe.id}/preview/", {"portions": 30})

        assert response.status_code == 200
        data = response.json()
        assert data["description"] == description
        assert data["target_portions"] == 30
        assert [row["name"] for row in data["ingredients"]] == ["Hackfleisch"]
        assert "1,5 kg" in data["ingredients"][0]["amount_label"] or "1500" in data["ingredients"][0]["amount_label"]
        assert data["allergens"] == ["Laktose"]
        assert {tag["name"] for tag in data["nutritional_tags"]} == {"Laktose", "Vegetarisch"}

    def test_search_no_longer_truncates_description(self):
        client, _ = _client()
        description = "x" * 400
        make_recipe(title="Langer Eintopf", status="approved", description=description)

        response = client.get("/api/meal-plans/recipes/search/", {"q": "Langer Eintopf"})

        recipes = response.json()["recipes"]
        assert recipes and len(recipes[0]["description"]) == 400

    def test_requires_login(self):
        recipe = make_recipe(status="approved")
        assert Client().get(f"/api/meal-plans/recipes/{recipe.id}/preview/").status_code in (401, 403)
