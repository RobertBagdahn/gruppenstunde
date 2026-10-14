"""Learned ingredient mappings: confirmed review choices feed the next import."""

import json

import pytest
from django.test import Client

from recipe.services.ingredient_matcher import IngredientMatcher
from recipe.services.learned_mapping import record_confirmation
from supply.models import LearnedIngredientMapping
from supply.tests import make_ingredient, make_portion

pytestmark = [pytest.mark.django_db, pytest.mark.usefixtures("gemini_unavailable")]


def test_one_confirmation_is_a_suggestion(django_user_model):
    feta = make_ingredient(name="Feta")
    record_confirmation("Feta-Mix", feta.id, django_user_model.objects.create_user(username="a", password="x"))

    result = IngredientMatcher.match("Feta-Mix")

    assert result.ingredient_id == feta.id
    assert result.matched_via == "learned"
    assert result.needs_review is True


def test_two_people_make_it_a_match(django_user_model):
    feta = make_ingredient(name="Feta")
    for username in ("a", "b"):
        record_confirmation("Feta-Mix", feta.id, django_user_model.objects.create_user(username=username, password="x"))

    result = IngredientMatcher.match("Feta-Mix")

    assert result.ingredient_id == feta.id
    assert result.needs_review is False


def test_same_person_twice_stays_a_suggestion(django_user_model):
    feta = make_ingredient(name="Feta")
    user = django_user_model.objects.create_user(username="a", password="x")
    record_confirmation("Feta-Mix", feta.id, user)
    record_confirmation("Feta-Mix", feta.id, user)

    assert IngredientMatcher.match("Feta-Mix").needs_review is True


def test_a_different_choice_replaces_the_mapping(django_user_model):
    feta = make_ingredient(name="Feta")
    sheep = make_ingredient(name="Schafskäse")
    user = django_user_model.objects.create_user(username="a", password="x")
    record_confirmation("Feta-Mix", feta.id, user)
    record_confirmation("Feta-Mix", sheep.id, user)

    mapping = LearnedIngredientMapping.objects.get(query_key="feta-mix")
    assert (mapping.ingredient_id, mapping.confirmations) == (sheep.id, 1)


def test_anonymous_users_never_teach(django_user_model):
    from django.contrib.auth.models import AnonymousUser

    record_confirmation("Feta-Mix", make_ingredient(name="Feta").id, AnonymousUser())

    assert not LearnedIngredientMapping.objects.exists()


def test_deleted_ingredient_is_ignored(django_user_model):
    from django.utils import timezone

    feta = make_ingredient(name="Feta")
    record_confirmation("Feta-Mix", feta.id, django_user_model.objects.create_user(username="a", password="x"))
    feta.deleted_at = timezone.now()
    feta.save(update_fields=["deleted_at"])

    assert IngredientMatcher.match("Feta-Mix").matched_via != "learned"


def test_saving_a_reviewed_recipe_records_the_choice(django_user_model):
    feta = make_ingredient(name="Feta")
    portion = make_portion(feta, name="100g Feta", quantity=100, weight_g=100, rank=1)
    client = Client()
    client.force_login(django_user_model.objects.create_user(username="cook", password="x"))

    response = client.post(
        "/api/recipes/",
        data=json.dumps(
            {
                "title": "Salat",
                "input_servings": 1,
                "recipe_items": [{"portion_id": portion.id, "quantity": 2, "sort_order": 0}],
                "ingredient_review_rows": [
                    {
                        "key": "row-1",
                        "status": "confirmed",
                        "selected_ingredient_id": feta.id,
                        "selected_portion_id": portion.id,
                        "quantity": 2,
                        "match_query": "Feta-Mix",
                    }
                ],
            }
        ),
        content_type="application/json",
    )

    assert response.status_code == 200
    mapping = LearnedIngredientMapping.objects.get(query_key="feta-mix")
    assert mapping.ingredient_id == feta.id
