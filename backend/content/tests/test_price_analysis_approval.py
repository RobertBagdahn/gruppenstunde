"""Tests for the consolidated Data-Quality price approval workflow.

The price-analysis endpoints must create/reuse pending IngredientPriceProposal
records and never write global ingredient prices directly.
"""

import json
from unittest.mock import MagicMock, patch

import pytest
from django.test import Client

from supply.models import IngredientPriceProposal

BASE = "/api/admin/data-quality/ingredients/price-analysis"


@pytest.fixture
def admin_client(db, django_user_model) -> Client:
    user = django_user_model.objects.create_superuser(
        username="priceadmin",
        email="priceadmin@inspi.dev",
        password="adminpass123",
    )
    client = Client()
    client.force_login(user)
    return client


def _proposal_response(price: float = 3.49, confidence: float = 0.8):
    mock = MagicMock()
    mock.text = json.dumps(
        {
            "proposed_price_per_kg": price,
            "confidence": confidence,
            "rationale": "Typischer Supermarktpreis.",
            "source": "gemini",
        }
    )
    return mock


@pytest.mark.django_db
class TestPriceEvaluateCreatesProposals:
    def test_evaluate_creates_pending_proposal(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Weizenmehl", slug="weizenmehl", price_per_kg=None)

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            mock_gemini.return_value = (_proposal_response(), "interaction-1")
            res = admin_client.post(
                f"{BASE}/evaluate/",
                data=json.dumps({"ingredient_ids": [ingredient.id]}),
                content_type="application/json",
            )

        assert res.status_code == 200
        suggestion = res.json()["suggestions"][0]
        assert suggestion["ingredient_id"] == ingredient.id
        assert suggestion["status"] == "pending"
        assert suggestion["proposal_id"] is not None
        assert suggestion["suggested_price"] == "3.49"
        assert suggestion["confidence"] == 0.8
        assert IngredientPriceProposal.objects.filter(ingredient=ingredient, status="pending").count() == 1
        ingredient.refresh_from_db()
        assert ingredient.price_per_kg is None

    def test_evaluate_reuses_pending_proposal(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Haferflocken", slug="haferflocken", price_per_kg=None)
        proposal = IngredientPriceProposal.objects.create(
            ingredient=ingredient,
            proposed_price_per_kg="1.99",
            confidence=0.7,
            rationale="Alt",
        )

        with patch("supply.services.ingredient_price_proposal_service.gemini_call") as mock_gemini:
            res = admin_client.post(
                f"{BASE}/evaluate/",
                data=json.dumps({"ingredient_ids": [ingredient.id]}),
                content_type="application/json",
            )
            assert mock_gemini.call_count == 0

        assert res.status_code == 200
        suggestion = res.json()["suggestions"][0]
        assert suggestion["proposal_id"] == proposal.id
        assert suggestion["suggested_price"] == "1.99"
        assert IngredientPriceProposal.objects.filter(ingredient=ingredient).count() == 1

    def test_evaluate_positive_price_reports_conflict(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Zucker", slug="zucker", price_per_kg=2.49)

        res = admin_client.post(
            f"{BASE}/evaluate/",
            data=json.dumps({"ingredient_ids": [ingredient.id]}),
            content_type="application/json",
        )

        assert res.status_code == 200
        suggestion = res.json()["suggestions"][0]
        assert suggestion["status"] == "conflict"
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 2.49

    def test_evaluate_requires_staff(self, client, db):
        res = client.post(
            f"{BASE}/evaluate/",
            data=json.dumps({"ingredient_ids": [1]}),
            content_type="application/json",
        )
        assert res.status_code == 403


@pytest.mark.django_db
class TestPriceApplyUsesProposals:
    def _make_pending(self, ingredient, price="3.49"):
        return IngredientPriceProposal.objects.create(
            ingredient=ingredient,
            proposed_price_per_kg=price,
            confidence=0.8,
            rationale="Test",
        )

    def test_apply_accepts_pending_proposal(self, admin_client, db):
        from recipe.services.recipe_checks import recalculate_recipe_cache
        from recipe.tests import make_recipe, make_recipe_item
        from supply.tests import make_ingredient

        priced = make_ingredient(name="Mehl", slug="mehl", price_per_kg=2.0)
        unpriced = make_ingredient(name="Wasser", slug="wasser", price_per_kg=None)
        recipe = make_recipe(title="Brotteig", slug="brotteig")
        make_recipe_item(recipe=recipe, ingredient=priced, quantity=500)
        make_recipe_item(recipe=recipe, ingredient=unpriced, quantity=100)
        recalculate_recipe_cache(recipe)
        proposal = self._make_pending(unpriced)

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": unpriced.id, "action": "accept", "replace": False}]}),
            content_type="application/json",
        )

        assert res.status_code == 200
        result = res.json()["results"][0]
        assert result["status"] == "accepted"
        assert result["proposal_id"] == proposal.id

        unpriced.refresh_from_db()
        proposal.refresh_from_db()
        recipe.refresh_from_db()
        assert float(unpriced.price_per_kg) == 3.49
        assert proposal.status == "accepted"
        assert recipe.cached_price_priced_count == 2
        assert recipe.cached_price_missing_count == 0

    def test_apply_positive_price_conflict_without_replace(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Butter", slug="butter", price_per_kg=5.0)
        proposal = self._make_pending(ingredient, price="6.0")

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "action": "accept", "replace": False}]}),
            content_type="application/json",
        )

        assert res.status_code == 200
        assert res.json()["results"][0]["status"] == "conflict"
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 5.0

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "action": "accept", "replace": True}]}),
            content_type="application/json",
        )
        assert res.json()["results"][0]["status"] == "accepted"
        ingredient.refresh_from_db()
        assert float(ingredient.price_per_kg) == 6.0

    def test_apply_reject_keeps_price(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Olivenöl", slug="olivenoel", price_per_kg=None)
        proposal = self._make_pending(ingredient)

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "action": "reject", "replace": False}]}),
            content_type="application/json",
        )

        assert res.json()["results"][0]["status"] == "rejected"
        ingredient.refresh_from_db()
        proposal.refresh_from_db()
        assert ingredient.price_per_kg is None
        assert proposal.status == "rejected"

    def test_apply_partial_batch_isolates_conflicts(self, admin_client, db):
        from supply.tests import make_ingredient

        missing = make_ingredient(name="Reis", slug="reis", price_per_kg=None)
        self._make_pending(missing, price="1.50")
        priced = make_ingredient(name="Honig", slug="honig", price_per_kg=8.0)
        self._make_pending(priced, price="9.0")

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps(
                {
                    "items": [
                        {"ingredient_id": missing.id, "action": "accept", "replace": False},
                        {"ingredient_id": priced.id, "action": "accept", "replace": False},
                    ]
                }
            ),
            content_type="application/json",
        )

        results = {item["ingredient_id"]: item["status"] for item in res.json()["results"]}
        assert results[missing.id] == "accepted"
        assert results[priced.id] == "conflict"
        missing.refresh_from_db()
        priced.refresh_from_db()
        assert float(missing.price_per_kg) == 1.50
        assert float(priced.price_per_kg) == 8.0

    def test_apply_missing_proposal_reports_status(self, admin_client, db):
        from supply.tests import make_ingredient

        ingredient = make_ingredient(name="Salz", slug="salz", price_per_kg=None)

        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": ingredient.id, "action": "accept", "replace": False}]}),
            content_type="application/json",
        )

        assert res.json()["results"][0]["status"] == "missing_proposal"

    def test_apply_unknown_ingredient(self, admin_client, db):
        res = admin_client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": [{"ingredient_id": 999999, "action": "accept", "replace": False}]}),
            content_type="application/json",
        )
        assert res.json()["results"][0]["status"] == "not_found"

    def test_apply_requires_staff(self, client, db):
        res = client.patch(
            f"{BASE}/apply/",
            data=json.dumps({"items": []}),
            content_type="application/json",
        )
        assert res.status_code == 403
