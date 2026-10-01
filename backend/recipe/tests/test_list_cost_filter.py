"""Recipe list cost filter works on the price per portion shown on the cards."""

import pytest
from django.test import Client

from recipe.tests import make_recipe


def _titles(client: Client, query: str) -> list[str]:
    response = client.get(f"/api/recipes/?{query}&page_size=50&sort=oldest")
    assert response.status_code == 200, response.content
    return [item["title"] for item in response.json()["items"]]


@pytest.fixture
def priced_recipes(db):
    # total price / portions: Suppe 1.50, Braten 3.00, Festmahl 7.00, Teuer 12.00
    make_recipe(title="Suppe", owner=None, portions=4, cached_price_total=6.0)
    make_recipe(title="Braten", owner=None, portions=2, cached_price_total=6.0)
    make_recipe(title="Festmahl", owner=None, portions=1, cached_price_total=7.0)
    make_recipe(title="Teuer", owner=None, portions=1, cached_price_total=12.0)


@pytest.mark.django_db
class TestRecipeCostFilter:
    def test_upper_bound_uses_price_per_portion(self, client: Client, priced_recipes):
        # 6 € total for 4 portions is 1.50 €: below 2 € although the total is above it.
        assert _titles(client, "costs_max=2") == ["Suppe"]

    def test_range_between_bounds(self, client: Client, priced_recipes):
        assert _titles(client, "costs_min=2&costs_max=5") == ["Braten"]

    def test_open_upper_range(self, client: Client, priced_recipes):
        assert _titles(client, "costs_min=10") == ["Teuer"]

    def test_no_bounds_lists_everything(self, client: Client, priced_recipes):
        assert len(_titles(client, "")) == 4
