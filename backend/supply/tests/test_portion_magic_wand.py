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


@pytest.mark.django_db
def test_hotdog_preview_returns_positive_piece_estimate_without_mutation(client, gram_unit):
    ingredient = make_ingredient(name="Hotdog-Brötchen", slug="hotdog-broetchen")
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.return_value = (
            _response(
                {
                    "suggestions": [
                        {
                            "operation": "create",
                            "name": "Stück",
                            "quantity": 1,
                            "measuring_unit_name": "Gramm",
                            "rank": 1,
                            "proposed_weight_g": 55,
                            "confidence": 0.86,
                            "rationale": "Typisches Gewicht eines normalen Hotdog-Brötchens.",
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
    operation = next(item for item in response.json()["operations"] if item["name"] == "Stück")
    assert operation["proposed_weight_g"] == 55
    assert operation["suggestion_provenance"] == "ai_estimate"
    assert not Portion.objects.filter(ingredient=ingredient).exclude(name="g").exists()


@pytest.mark.django_db
def test_preview_repairs_missing_weight_once(client, ingredient, gram_unit):
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.side_effect = [
            (
                _response(
                    {
                        "suggestions": [
                            {
                                "operation": "create",
                                "name": "Stück",
                                "quantity": 1,
                                "measuring_unit_name": "Gramm",
                                "rank": 1,
                                "proposed_weight_g": None,
                            }
                        ]
                    }
                ),
                "first",
            ),
            (
                _response(
                    {
                        "suggestions": [
                            {
                                "operation": "create",
                                "name": "Stück",
                                "quantity": 1,
                                "measuring_unit_name": "Gramm",
                                "rank": 1,
                                "proposed_weight_g": 55,
                                "rationale": "Nachgebesserte Gewichtsschätzung",
                            }
                        ]
                    }
                ),
                "repair",
            ),
        ]
        response = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        )
    assert response.status_code == 200
    operation = next(item for item in response.json()["operations"] if item["name"] == "Stück")
    assert operation["proposed_weight_g"] == 55
    assert operation["suggestion_provenance"] == "ai_repaired"
    assert gemini.call_count == 2


@pytest.mark.django_db
def test_preview_marks_unresolved_weight_after_repair(client, ingredient, gram_unit):
    unresolved = {
        "suggestions": [
            {
                "operation": "create",
                "name": "Sonderportion",
                "quantity": 1,
                "measuring_unit_name": "Gramm",
                "rank": 1,
                "proposed_weight_g": None,
            }
        ]
    }
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.side_effect = [(_response(unresolved), "first"), (_response(unresolved), "repair")]
        response = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        )
    assert response.status_code == 200
    operation = next(item for item in response.json()["operations"] if item["name"] == "Sonderportion")
    assert operation["requires_manual_weight"] is True
    assert operation["selected"] is True
    assert gemini.call_count == 2


@pytest.mark.django_db
def test_preview_normalizes_piece_alias_to_gram_basis_without_retry(client, ingredient, gram_unit):
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.return_value = (
            _response(
                {
                    "suggestions": [
                        {
                            "operation": "create",
                            "name": "Stück",
                            "quantity": 1,
                            "measuring_unit_name": "Stk.",
                            "rank": 1,
                            "proposed_weight_g": 150,
                        },
                        {
                            "operation": "create",
                            "name": "Stück",
                            "quantity": 1,
                            "measuring_unit_name": "Gramm",
                            "rank": 1,
                            "proposed_weight_g": 150,
                        },
                        {
                            "operation": "create",
                            "name": "Unbekannt",
                            "quantity": 1,
                            "measuring_unit_name": "Messbecher",
                            "rank": 2,
                            "proposed_weight_g": 200,
                        },
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
    suggestions = [item for item in operations if item["operation"] == "create"]
    assert len(suggestions) == 1
    assert suggestions[0]["measuring_unit_name"] == "Gramm"
    assert gemini.call_count == 1


@pytest.mark.django_db
def test_preview_and_apply_store_package_suggestion_as_package(client, ingredient, gram_unit):
    from supply.models import Package

    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.return_value = (
            _response(
                {
                    "suggestions": [
                        {
                            "operation": "create",
                            "name": "Packung",
                            "quantity": 6,
                            "measuring_unit_name": "Gramm",
                            "rank": 1,
                            "proposed_weight_g": 330,
                            "rationale": "Sechs Hotdog-Brötchen pro Packung.",
                        }
                    ]
                }
            ),
            "interaction",
        )
        preview = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        ).json()

    operation = next(item for item in preview["operations"] if item["name"] == "Packung")
    assert operation["operation"] == "package"
    assert operation["proposed_weight_g"] == 330

    response = client.post(
        f"{BASE}/{ingredient.slug}/portions/magic-wand/apply/",
        data=json.dumps({"preview_token": preview["preview_token"], "operations": [{**operation, "selected": True}]}),
        content_type="application/json",
    )
    assert response.status_code == 200, response.content
    assert Package.objects.filter(ingredient=ingredient, name="Packung", weight_g=330).exists()
    assert response.json()["created_package_ids"]


@pytest.mark.django_db
def test_apply_rejects_foreign_source_without_partial_changes(client, ingredient, gram_unit):
    from supply.services.portion_magic_wand import _context, _token

    ingredient.refresh_from_db()
    payload = {
        "preview_token": _token(_context(ingredient)),
        "operations": [
            {
                "operation_id": "invalid-source",
                "operation": "replace",
                "source_portion_id": 999999,
                "name": "Stück",
                "quantity": 1,
                "measuring_unit_name": "Gramm",
                "rank": 1,
                "proposed_weight_g": 150,
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
    assert response.status_code == 422, response.content
    assert not Portion.objects.filter(ingredient=ingredient, name="Stück").exists()


@pytest.mark.django_db
def test_apply_rejects_duplicate_package_without_partial_changes(client, ingredient, gram_unit):
    from supply.models import Package
    from supply.services.portion_magic_wand import _context, _token

    Package.objects.create(ingredient=ingredient, name="Packung", weight_g=330, rank=1)
    ingredient.refresh_from_db()
    payload = {
        "preview_token": _token(_context(ingredient)),
        "operations": [
            {
                "operation_id": "duplicate-package",
                "operation": "package",
                "source_portion_id": None,
                "name": "Packung",
                "quantity": 6,
                "measuring_unit_name": "Gramm",
                "rank": 1,
                "proposed_weight_g": 330,
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
    assert response.status_code == 422, response.content
    assert Package.objects.filter(ingredient=ingredient, name="Packung").count() == 1


@pytest.mark.django_db
def test_piece_unit_migration_preserves_weight_and_portion_reference(ingredient, gram_unit):
    import importlib

    normalize_piece_units = importlib.import_module(
        "supply.migrations.0013_normalize_piece_portion_units"
    ).normalize_piece_units

    legacy = MeasuringUnit.objects.create(name="Packung", unit="g", quantity=1000)
    portion = Portion.objects.create(
        ingredient=ingredient,
        name="Packung",
        measuring_unit=legacy,
        quantity=1,
        weight_g=1000,
        rank=1,
    )

    class HistoricalApps:
        @staticmethod
        def get_model(app_label, model_name):
            return {"MeasuringUnit": MeasuringUnit, "Portion": Portion}[model_name]

    normalize_piece_units(HistoricalApps(), None)
    portion.refresh_from_db()
    assert portion.measuring_unit.name == "Gramm"
    assert portion.weight_g == 1000
    assert not MeasuringUnit.objects.filter(pk=legacy.id).exists()


@pytest.mark.django_db
def test_magic_wand_requires_authentication(ingredient, client):
    client.logout()
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        response = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        )
    assert response.status_code == 403
    gemini.assert_not_called()


@pytest.mark.django_db
def test_preview_marks_unweighted_portion_for_deletion_when_no_replacement(client, ingredient, gram_unit):
    source = Portion.objects.create(
        ingredient=ingredient,
        name="Stück alt",
        measuring_unit=gram_unit,
        quantity=1,
        weight_g=None,
        rank=2,
    )
    with patch("supply.services.portion_magic_wand.gemini_call") as gemini:
        gemini.return_value = (
            _response(
                {
                    "suggestions": [
                        {
                            "operation": "create",
                            "name": "Stück",
                            "quantity": 1,
                            "measuring_unit_name": "Gramm",
                            "rank": 1,
                            "proposed_weight_g": 55,
                        }
                    ]
                }
            ),
            "interaction",
        )
        response = client.post(
            f"{BASE}/{ingredient.slug}/portions/magic-wand/preview/", content_type="application/json"
        )
    operation = next(
        item for item in response.json()["operations"] if item["operation_id"] == f"delete-unweighted-{source.id}"
    )
    assert operation["delete_without_replacement"] is True
    assert operation["selected"] is False
