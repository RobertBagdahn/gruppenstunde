"""Tests for the central AI prompt context builder."""

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from core.services.prompt_context import build_prompt_context
from profiles.models import UserProfile
from supply.models import Ingredient, NutritionalTag


@pytest.mark.django_db
def test_prompt_context_includes_season_and_group_size():
    user = get_user_model().objects.create_user(username="context-user")

    context = build_prompt_context(user, num_persons=12)

    assert "Gruppengröße: 12 Personen" in context
    assert "Jahreszeit:" in context
    assert timezone.now().strftime("%B") not in context or "Jahreszeit:" in context


@pytest.mark.django_db
def test_prompt_context_includes_profile_tags_and_own_pantry_only():
    user = get_user_model().objects.create_user(username="owner")
    other = get_user_model().objects.create_user(username="other")
    profile = UserProfile.objects.create(user=user)
    tag = NutritionalTag.objects.create(name="Vegan", name_opposite="Tierische Produkte")
    profile.nutritional_tags.add(tag)
    Ingredient.objects.create(name="Eigener Vorrat", slug="eigener-vorrat", owner=user, created_by=user)
    Ingredient.objects.create(name="Fremder Vorrat", slug="fremder-vorrat", owner=other, created_by=other)
    Ingredient.objects.create(name="Importierter Entwurf", slug="importierter-entwurf", created_by=user)

    context = build_prompt_context(user, include_pantry=True)

    assert "Ernährungsvorgaben: Tierische Produkte" in context
    assert "Eigener Vorrat" in context
    assert "Fremder Vorrat" not in context
    assert "Importierter Entwurf" not in context


@pytest.mark.django_db
def test_prompt_context_accepts_explicit_nutritional_tags_without_user():
    tag = NutritionalTag.objects.create(name="Glutenfrei")

    context = build_prompt_context(nutritional_tag_ids=[tag.id])

    assert "Ernährungsvorgaben: Glutenfrei" in context
