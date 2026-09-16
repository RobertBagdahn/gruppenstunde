"""Integration tests for the portion magic wand."""

import json
from unittest.mock import patch

import pytest
from django.test import Client

from supply.models import MeasuringUnit, Portion
from supply.tests import make_ingredient

BASE = "/api/ingredients"


@pytest.fixture
def user(db, django_user_model):
    return django_user_model.objects.create_user(username="portion-editor", password="password")


@pytest.fixture
def client(user):
    client = Client()
    client.force_login(user)
    return client


@pytest.fixture
def ingredient(db):
    return make_ingredient(name="Apfel", slug="apfel")


@pytest.fixture
def gram_unit(db):
    return MeasuringUnit.objects.create(name="Gramm", unit="g", quantity=1.0)


def _response(payload: dict):
    class Response:
        text = json.dumps(payload)

    return Response()


@pytest.mark.django_db
def test_preview_returns_weighted_rows_unchanged_and_unweighted_replacement(client, ingredient, gram_unit):
    weighted = Portion.objects.create(
        ingredient=ingredient,
        name="100g",
        measuring_unit=gram_unit,
        quantity=100,
        weight_g=100,
        rank=1,
    )
    unweighted = Portion(
        ingredient=ingredient,
        name="Stück",
        measuring_unit=gram_unit,
        quantity=1,
        weight_g=None,
        rank=2,
    )
    unweighted.save()
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.return_value = (
            _response(
                {
                    "suggestions": [
                        {
                            "operation": "replace",
                            "source_portion_id": unweighted.id,
                            "name": "Stück",
                            "quantity": 1,
                            "measuring_unit_name": "Gramm",
                            "rank": 2,
                            "proposed_weight_g": 150,
                            "confidence": 0.9,
                            "rationale": "typisches Stückgewicht",
                        }
                    ]
                }
            ),
            "interaction",
        )
        response = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        )
    assert response.status_code == 200
    operations = response.json()["operations"]
    assert any(item["source_portion_id"] == weighted.id and item["operation"] == "unchanged" for item in operations)
    replacement = next(item for item in operations if item["source_portion_id"] == unweighted.id)
    assert replacement["selected"] is True
    assert gemini.call_count == 1


@pytest.mark.django_db
def test_apply_replaces_unweighted_portion_atomically(client, ingredient, gram_unit):
    source = Portion.objects.create(
        ingredient=ingredient,
        name="Stück",
        measuring_unit=gram_unit,
        quantity=1,
        weight_g=None,
        rank=1,
    )
    from supply.services.portion_magic_wand import _context, _token

    ingredient.refresh_from_db()
    payload = {
        "preview_token": _token(_context(ingredient)),
        "operations": [
            {
                "operation_id": "operation-0",
                "operation": "replace",
                "source_portion_id": source.id,
                "name": "Stück neu",
                "quantity": 1,
                "measuring_unit_name": "Gramm",
                "rank": 1,
                "proposed_weight_g": 150,
                "confidence": 0.9,
                "rationale": "",
                "selected": True,
                "requires_manual_weight": False,
                "delete_without_replacement": False,
            }
        ],
    }
    response = client.post(
        f"{BASE}/{ingredient.slug}/portions/magic-wand/apply/",
        data=json.dumps(payload),
        content_type="application/json",
    )
    assert response.status_code == 200, response.content
    source.refresh_from_db()
    assert source.deleted_at is not None
    replacement = Portion.objects.get(ingredient=ingredient, name="Stück neu")
    assert replacement.weight_g == 150
