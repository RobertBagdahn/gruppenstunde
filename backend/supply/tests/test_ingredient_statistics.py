"""Regression tests for memory-bounded ingredient-statistics queries."""

import json
from concurrent.futures import ThreadPoolExecutor
from typing import Any, Protocol

import pytest
from django.db import connection
from django.http import HttpResponse
from django.test import Client
from django.test.utils import CaptureQueriesContext

from supply.models import Ingredient


class DjangoTestClient(Protocol):
    def get(self, path: str) -> HttpResponse: ...


@pytest.mark.django_db
def test_distribution_reads_only_numeric_values_without_hydrating_ingredients(client: DjangoTestClient) -> None:
    for index, energy_kcal in enumerate((100, 200, 300, 400)):
        Ingredient.objects.create(
            name=f"Statistics fixture {index}",
            slug=f"statistics-fixture-{index}",
            status="verified",
            energy_kcal=energy_kcal,
        )

    with CaptureQueriesContext(connection) as captured:
        response = client.get("/api/ingredient-statistics/distributions/?field=energy_kcal")

    ingredient_queries = [
        query["sql"] for query in captured.captured_queries if "supply_ingredient" in query["sql"].lower()
    ]
    assert len(ingredient_queries) == 1
    assert "energy_kcal" in ingredient_queries[0]
    assert "embedding" not in ingredient_queries[0]
    assert response.status_code == 200
    payload = json.loads(response.content)
    assert payload["stats"] == {
        "mean": 250.0,
        "median": 300.0,
        "p5": 100.0,
        "p95": 400.0,
        "count": 4,
    }
    assert sum(bucket["count"] for bucket in payload["buckets"]) == 4


@pytest.mark.django_db(transaction=True)
def test_concurrent_distribution_reads_return_consistent_results() -> None:
    Ingredient.objects.bulk_create(
        [
            Ingredient(
                name=f"Concurrent statistics fixture {index}",
                slug=f"concurrent-statistics-fixture-{index}",
                status="verified",
                energy_kcal=100 + index,
            )
            for index in range(60)
        ]
    )

    def request_distribution() -> dict[str, Any]:
        response = Client().get("/api/ingredient-statistics/distributions/?field=energy_kcal")
        assert response.status_code == 200
        return json.loads(response.content)

    with ThreadPoolExecutor(max_workers=4) as executor:
        results = list(executor.map(lambda _index: request_distribution(), range(4)))

    assert [result["stats"]["count"] for result in results] == [60, 60, 60, 60]


# Parity of the column-only statistics with the response contract of the former
# full-row implementation (food-release-hardening 2.2).

EMPTY_STATS = {"mean": None, "median": None, "p5": None, "p95": None, "count": 0}


def _make_energy_ingredients(values: list[float | None], *, status: str = "verified") -> list[Ingredient]:
    return [
        Ingredient.objects.create(
            name=f"Parity {status} {index}",
            slug=f"parity-{status}-{index}",
            status=status,
            energy_kcal=value,
        )
        for index, value in enumerate(values)
    ]


def _energy_distribution(client: DjangoTestClient) -> dict[str, Any]:
    response = client.get("/api/ingredient-statistics/distributions/?field=energy_kcal")
    assert response.status_code == 200
    return json.loads(response.content)


@pytest.mark.django_db
def test_distribution_parity_without_values(client: DjangoTestClient) -> None:
    _make_energy_ingredients([None])
    _make_energy_ingredients([250], status="draft")

    assert _energy_distribution(client) == {"buckets": [], "stats": EMPTY_STATS}


@pytest.mark.django_db
def test_distribution_parity_with_a_single_value(client: DjangoTestClient) -> None:
    _make_energy_ingredients([120])

    assert _energy_distribution(client) == {
        "buckets": [{"min": 120.0, "max": 120.0, "count": 1, "percentage": 100.0, "label": "120.0"}],
        "stats": {"mean": 120.0, "median": 120.0, "p5": 120.0, "p95": 120.0, "count": 1},
    }


@pytest.mark.django_db
def test_distribution_parity_with_only_duplicate_values(client: DjangoTestClient) -> None:
    _make_energy_ingredients([70, 70, 70])

    assert _energy_distribution(client) == {
        "buckets": [{"min": 70.0, "max": 70.0, "count": 3, "percentage": 100.0, "label": "70.0"}],
        "stats": {"mean": 70.0, "median": 70.0, "p5": 70.0, "p95": 70.0, "count": 3},
    }


@pytest.mark.django_db
def test_distribution_parity_with_duplicate_pairs(client: DjangoTestClient) -> None:
    _make_energy_ingredients([80, 50, 80, 50])

    payload = _energy_distribution(client)

    assert payload["stats"] == {"mean": 65.0, "median": 80.0, "p5": 50.0, "p95": 80.0, "count": 4}
    buckets = payload["buckets"]
    assert len(buckets) == 20
    assert buckets[0] == {"min": 50.0, "max": 51.5, "count": 2, "percentage": 50.0, "label": "50.0–51.5"}
    assert buckets[-1] == {"min": 78.5, "max": 80.01, "count": 2, "percentage": 50.0, "label": "78.5–80.0"}
    assert [bucket["count"] for bucket in buckets[1:-1]] == [0] * 18


@pytest.mark.django_db
def test_distribution_parity_with_an_outlier(client: DjangoTestClient) -> None:
    _make_energy_ingredients([10, 11, 12, 13, 1000])

    payload = _energy_distribution(client)

    assert payload["stats"] == {"mean": 209.2, "median": 12.0, "p5": 10.0, "p95": 1000.0, "count": 5}
    counts = [bucket["count"] for bucket in payload["buckets"]]
    assert counts == [4] + [0] * 18 + [1]
    assert payload["buckets"][-1]["max"] == 1000.01


@pytest.mark.django_db
def test_outlier_parity_flags_only_the_extreme_value(client: DjangoTestClient) -> None:
    ingredients = _make_energy_ingredients([10, 11, 12, 13, 1000])
    outlier = ingredients[-1]

    response = client.get("/api/ingredient-statistics/outliers/?field=energy_kcal")

    assert response.status_code == 200
    assert json.loads(response.content) == {
        "fields": [
            {
                "field": "energy_kcal",
                "field_label": "Energie",
                "unit": "kcal",
                "count": 1,
                "items": [
                    {
                        "id": outlier.id,
                        "name": outlier.name,
                        "slug": outlier.slug,
                        "value": 1000.0,
                        "severity": "extreme",
                        "deviation": 83.33,
                    }
                ],
            }
        ],
        "summary": "1 bei Energie",
    }


@pytest.mark.django_db
def test_outlier_parity_needs_four_values_and_spread(client: DjangoTestClient) -> None:
    _make_energy_ingredients([10, 1000, 10])

    response = client.get("/api/ingredient-statistics/outliers/?field=energy_kcal")

    assert json.loads(response.content) == {"fields": [], "summary": "Keine Ausreißer gefunden"}
