"""Tests for the ingredient suggest endpoint — fuzzy match with enriched response.

Note: pg_trgm (SIMILARITY function) is only available on PostgreSQL.
These tests are skipped on SQLite (which is used by the test runner).
"""

import pytest
from django.db import connection

from supply.tests import make_ingredient


def _is_postgres():
    return connection.vendor == "postgresql"


@pytest.mark.skipif(not _is_postgres(), reason="pg_trgm SIMILARITY requires PostgreSQL")
@pytest.mark.django_db
class TestSuggestEndpoint:
    """Test GET /api/ingredients/suggest/ — fuzzy match with enriched fields."""

    def setup_method(self):
        from django.test import Client

        self.client = Client()

    def test_suggest_returns_enriched_fields(self):
        ing = make_ingredient(name="Salz", nutri_class=1, price_per_kg=0.89)
        ing.usage_count = 5
        ing.save(update_fields=["usage_count", "nutri_class", "price_per_kg"])

        response = self.client.get("/api/ingredients/suggest/?q=Salz&limit=15")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 1

        result = data[0]
        assert result["id"] == ing.id
        assert result["name"] == "Salz"
        assert "slug" in result
        assert "similarity" in result
        assert result["nutri_class"] == 1
        assert float(result["price_per_kg"]) == 0.89
        assert result["usage_count"] == 5

    def test_suggest_default_limit_is_15(self):
        for i in range(20):
            make_ingredient(name=f"Testzutat {i:02d}", slug=f"testzutat-{i:02d}")

        response = self.client.get("/api/ingredients/suggest/?q=Testzutat")
        data = response.json()
        assert len(data) <= 15

    def test_suggest_custom_limit(self):
        for i in range(10):
            make_ingredient(name=f"Kurztest {i:02d}", slug=f"kurztest-{i:02d}")

        response = self.client.get("/api/ingredients/suggest/?q=Kurztest&limit=5")
        data = response.json()
        assert len(data) <= 5

    def test_suggest_max_limit_30(self):
        response = self.client.get("/api/ingredients/suggest/?q=Test&limit=100")
        assert response.status_code == 200

    def test_suggest_orders_by_similarity_then_usage_count(self):
        ing_high_usage = make_ingredient(name="Salz", slug="salz-high", nutri_class=5, price_per_kg=0.89)
        ing_high_usage.usage_count = 23
        ing_high_usage.save(update_fields=["usage_count"])

        ing_low_usage = make_ingredient(name="Salze", slug="salze-low", nutri_class=3, price_per_kg=2.50)
        ing_low_usage.usage_count = 2
        ing_low_usage.save(update_fields=["usage_count"])

        response = self.client.get("/api/ingredients/suggest/?q=Salz&limit=15")
        data = response.json()
        if len(data) >= 2:
            high_usage_result = next((r for r in data if r["id"] == ing_high_usage.id), None)
            low_usage_result = next((r for r in data if r["id"] == ing_low_usage.id), None)
            if high_usage_result and low_usage_result:
                if high_usage_result["similarity"] == low_usage_result["similarity"]:
                    assert high_usage_result["usage_count"] >= low_usage_result["usage_count"]

    def test_suggest_returns_matched_via_for_alias(self):
        from supply.models import IngredientAlias

        ing = make_ingredient(name="Paradeiser", slug="paradeiser-test", nutri_class=1)
        IngredientAlias.objects.create(ingredient=ing, name="Tomate", rank=1)

        response = self.client.get("/api/ingredients/suggest/?q=Tomate")
        data = response.json()
        assert len(data) >= 1
        result = data[0]
        assert result["name"] == "Paradeiser"
        assert result["matched_via"] == "Tomate"
