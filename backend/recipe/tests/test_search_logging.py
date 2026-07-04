"""Tests for recipe search logging (SearchLog + structured JSON log)."""

import json

import pytest

from content.choices import ContentStatus
from content.models import SearchLog
from recipe.models import Recipe


@pytest.mark.django_db
class TestRecipeSearchLogging:
    def test_search_logs_query(self, api_client, db):
        Recipe.objects.create(
            title="Pfannkuchen",
            summary="Einfache Pfannkuchen",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get("/api/recipes/", {"q": "Pfannkuchen"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["total"] == 1

        log = SearchLog.objects.first()
        assert log is not None
        assert log.query == "Pfannkuchen"
        assert log.results_count == 1
        assert log.user is None

    def test_empty_query_does_not_log(self, api_client, db):
        Recipe.objects.create(
            title="Pfannkuchen",
            summary="Einfache Pfannkuchen",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get("/api/recipes/")
        assert resp.status_code == 200
        assert SearchLog.objects.count() == 0

    def test_authenticated_search_logs_user(self, auth_client, db):
        Recipe.objects.create(
            title="Pfannkuchen",
            summary="Einfache Pfannkuchen",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
        )
        resp = auth_client.get("/api/recipes/", {"q": "Pfannkuchen"})
        assert resp.status_code == 200

        log = SearchLog.objects.first()
        assert log is not None
        assert log.user == auth_client._user

    def test_structured_json_log_output(self, api_client, db, caplog):
        import logging

        caplog.set_level(logging.INFO)
        Recipe.objects.create(
            title="Pfannkuchen",
            summary="Einfache Pfannkuchen",
            recipe_type="warm_meal",
            status=ContentStatus.APPROVED,
        )
        resp = api_client.get("/api/recipes/", {"q": "Pfannkuchen"})
        assert resp.status_code == 200

        json_lines = [
            json.loads(r.msg) for r in caplog.records if r.name == "content.services.search_service"
        ]
        assert len(json_lines) == 1
        assert json_lines[0]["event"] == "recipe_list_search"
        assert json_lines[0]["query"] == "Pfannkuchen"
        assert json_lines[0]["source"] == "recipe_list"
        assert json_lines[0]["results_count"] == 1
        assert json_lines[0]["user_id"] is None
