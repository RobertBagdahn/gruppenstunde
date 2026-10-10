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
