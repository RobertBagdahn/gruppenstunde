"""A failing external recipe image must not block recipe creation."""

import json
from unittest.mock import patch

import pytest

from recipe.models import Recipe


def _post_recipe(client, payload: dict):
    return client.post("/api/recipes/", data=json.dumps(payload), content_type="application/json")


@pytest.mark.django_db
class TestRecipeCreateImageImport:
    @pytest.mark.parametrize("error", [RuntimeError("download failed"), ValueError("forbidden"), OSError("storage")])
    def test_failing_image_download_still_creates_recipe(self, auth_client, error):
        with patch("content.services.image_service.download_external_image", side_effect=error):
            resp = _post_recipe(
                auth_client,
                {"title": "Rezept ohne Bild", "image_url": "https://example.test/blocked.jpg"},
            )

        assert resp.status_code == 200
        recipe = Recipe.objects.get(id=resp.json()["id"])
        assert not recipe.image

    def test_successful_image_download_is_attached(self, auth_client):
        with patch(
            "content.services.image_service.download_external_image",
            return_value="content/img_abc.jpg",
        ):
            resp = _post_recipe(
                auth_client,
                {"title": "Rezept mit Bild", "image_url": "https://example.test/ok.jpg"},
            )

        assert resp.status_code == 200
        assert Recipe.objects.get(id=resp.json()["id"]).image.name == "content/img_abc.jpg"
