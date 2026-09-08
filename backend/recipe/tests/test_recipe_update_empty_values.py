"""Tests protecting existing recipe content from being wiped by empty updates.

The observed defect: the creation wizard sent uninitialised defaults when the
user clicked through the metadata step without editing anything. The endpoint
accepted `difficulty=""`, `execution_time=""` and `description=""` with HTTP
200, so the AI-generated preparation text was destroyed. Because the recipe
detail page only renders the preparation editor when a description exists, the
recipe then looked uneditable.
"""

import json

import pytest

from recipe.models import Recipe


def _make_owned_recipe(user) -> Recipe:
    return Recipe.objects.create(
        title="KI Rezept",
        slug=f"ki-rezept-{user.id}",
        summary="KI Kurzfassung",
        description="## KI Zubereitung\n1. Schneiden\n2. Kochen",
        difficulty="easy",
        execution_time="30_60",
        preparation_time="less_15",
        portions=1,
        recipe_type="warm_meal",
        status="draft",
        owner=user,
        created_by=user,
    )


def _patch(client, recipe_id: int, payload: dict):
    return client.patch(
        f"/api/recipes/{recipe_id}/",
        data=json.dumps(payload),
        content_type="application/json",
    )


@pytest.mark.django_db
class TestChoiceFieldsRejectEmptyValues:
    @pytest.mark.parametrize(
        "field",
        ["difficulty", "execution_time", "preparation_time"],
    )
    def test_empty_choice_value_is_rejected(self, auth_client, field):
        recipe = _make_owned_recipe(auth_client._user)

        response = _patch(auth_client, recipe.id, {field: ""})

        assert response.status_code == 422
        recipe.refresh_from_db()
        assert getattr(recipe, field) != ""

    def test_wizard_default_payload_does_not_wipe_content(self, auth_client):
        """The exact body the wizard sent when the user changed nothing."""
        recipe = _make_owned_recipe(auth_client._user)

        response = _patch(
            auth_client,
            recipe.id,
            {
                "summary": "",
                "description": "",
                "difficulty": "",
                "execution_time": "",
                "preparation_time": "",
                "tag_ids": [],
                "visibility": "private",
            },
        )

        assert response.status_code == 422
        recipe.refresh_from_db()
        assert recipe.description.startswith("## KI Zubereitung")
        assert recipe.summary == "KI Kurzfassung"
        assert recipe.difficulty == "easy"
        assert recipe.execution_time == "30_60"

    def test_valid_choice_value_is_accepted(self, auth_client):
        recipe = _make_owned_recipe(auth_client._user)

        response = _patch(auth_client, recipe.id, {"difficulty": "medium"})

        assert response.status_code == 200
        recipe.refresh_from_db()
        assert recipe.difficulty == "medium"

    def test_omitted_choice_field_keeps_existing_value(self, auth_client):
        recipe = _make_owned_recipe(auth_client._user)

        response = _patch(auth_client, recipe.id, {"title": "Neuer Titel"})

        assert response.status_code == 200
        recipe.refresh_from_db()
        assert recipe.title == "Neuer Titel"
        assert recipe.difficulty == "easy"
        assert recipe.execution_time == "30_60"

    def test_free_text_fields_may_be_cleared(self, auth_client):
        """Summary and description are free text and may be emptied on purpose."""
        recipe = _make_owned_recipe(auth_client._user)

        response = _patch(auth_client, recipe.id, {"summary": "", "description": ""})

        assert response.status_code == 200
        recipe.refresh_from_db()
        assert recipe.summary == ""
        assert recipe.description == ""
