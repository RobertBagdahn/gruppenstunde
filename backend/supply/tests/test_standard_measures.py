"""Tests for the standard-measures catalog endpoint.

GET /api/ingredients/{slug}/standard-measures/ returns fixed kitchen measures
(EL, TL, Tasse, Prise, Msp) with density-based (or generic, approx) weights.
The catalog is display-only and never persists portions.
"""

import pytest

from supply.models import Portion
from supply.tests import make_ingredient


@pytest.fixture
def onion(db):
    return make_ingredient(
        name="Speisezwiebeln",
        slug="speisezwiebeln",
        physical_density=0.8,
    )


@pytest.fixture
def densityless_ingredient(db):
    # physical_density defaults to 1.0 (NOT NULL) — that means "not explicitly
    # set" and must yield generic, approximate gram amounts.
    return make_ingredient(
        name="Gewürzmischung",
        slug="gewuerzmischung",
        physical_density=1.0,
    )


@pytest.mark.django_db
class TestStandardMeasuresEndpoint:
    def test_ingredient_with_density(self, api_client, onion):
        resp = api_client.get(f"/api/ingredients/{onion.slug}/standard-measures/")
        assert resp.status_code == 200
        items = resp.json()
        by_key = {m["key"]: m for m in items}
        assert set(by_key) == {"el", "tl", "tasse", "prise", "msp"}
        assert by_key["el"]["grams"] == pytest.approx(12.0)  # 15 ml × 0.8
        assert by_key["el"]["is_approx"] is False
        assert by_key["tl"]["grams"] == pytest.approx(4.0)
        assert by_key["tasse"]["grams"] == pytest.approx(160.0)
        assert by_key["prise"]["grams"] == pytest.approx(0.5)
        assert by_key["prise"]["is_approx"] is True

    def test_ingredient_without_density_falls_back_to_generic(self, api_client, densityless_ingredient):
        resp = api_client.get(f"/api/ingredients/{densityless_ingredient.slug}/standard-measures/")
        assert resp.status_code == 200
        by_key = {m["key"]: m for m in resp.json()}
        assert by_key["el"]["grams"] == pytest.approx(15.0)
        assert by_key["el"]["is_approx"] is True
        assert by_key["tasse"]["grams"] == pytest.approx(200.0)

    def test_unknown_slug_returns_404(self, api_client):
        resp = api_client.get("/api/ingredients/gibt-es-nicht/standard-measures/")
        assert resp.status_code == 404

    def test_anonymous_access_is_allowed(self, api_client, onion):
        resp = api_client.get(f"/api/ingredients/{onion.slug}/standard-measures/")
        assert resp.status_code == 200

    def test_catalog_does_not_persist_portions(self, api_client, onion):
        before = Portion.objects.filter(ingredient=onion).count()
        api_client.get(f"/api/ingredients/{onion.slug}/standard-measures/")
        assert Portion.objects.filter(ingredient=onion).count() == before
