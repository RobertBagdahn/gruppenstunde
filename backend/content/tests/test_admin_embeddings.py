"""Tests for the admin embedding status endpoint."""

from datetime import timedelta

import pytest
from django.utils import timezone

from recipe.tests import make_recipe

EMBEDDINGS_URL = "/api/content/admin/embeddings/"


@pytest.mark.django_db
class TestAdminEmbeddingStatus:
    def test_lists_items_with_and_without_stored_vector(self, admin_client):
        embedded = make_recipe(title="Mit Embedding")
        embedded.embedding = [0.1] * 768
        embedded.embedding_updated_at = timezone.now() + timedelta(minutes=1)
        embedded.save()
        missing = make_recipe(title="Ohne Embedding")

        resp = admin_client.get(EMBEDDINGS_URL, {"content_type": "recipe"})

        assert resp.status_code == 200
        data = resp.json()
        assert data["stats"] == {"total": 2, "with_embedding": 1, "stale": 0, "missing": 1}
        by_id = {item["object_id"]: item for item in data["items"]}
        assert by_id[embedded.id]["has_embedding"] is True
        assert by_id[embedded.id]["is_stale"] is False
        assert by_id[missing.id]["has_embedding"] is False

    def test_missing_filter_excludes_embedded_items(self, admin_client):
        embedded = make_recipe(title="Mit Embedding")
        embedded.embedding = [0.2] * 768
        embedded.save()
        missing = make_recipe(title="Ohne Embedding")

        resp = admin_client.get(EMBEDDINGS_URL, {"content_type": "recipe", "status_filter": "missing"})

        assert resp.status_code == 200
        assert [item["object_id"] for item in resp.json()["items"]] == [missing.id]

    def test_requires_staff(self, auth_client):
        assert auth_client.get(EMBEDDINGS_URL).status_code == 403
