"""Tests for the piece-portion confirmation service and endpoint."""

import json

import pytest
from django.contrib.auth.models import User
from model_bakery import baker

from supply.models import Portion
from supply.services.portion_confirmation import confirm_portion

from . import make_ingredient, make_measuring_unit


@pytest.mark.django_db
class TestConfirmPortionService:
    def _setup(self, name="Brötchen"):
        ingredient = make_ingredient(name=name)
        user = baker.make(User)
        return ingredient, user

    def test_creates_new_confirmed_portion(self):
        ingredient, user = self._setup()
        portion = confirm_portion(
            ingredient,
            name="kleines Brötchen",
            weight_g=45.0,
            quantity=1.0,
            measuring_unit=None,
            rank=1,
            existing_portion_id=None,
            user=user,
        )
        assert portion.id is not None
        assert portion.weight_status == "confirmed"
        assert portion.weight_source == "manual"
        assert portion.weight_confirmed_at is not None
        assert portion.is_weight_trusted

    def test_reuses_identical_existing_portion(self):
        ingredient, user = self._setup()
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="kleines Brötchen",
            quantity=1.0,
            weight_g=45.0,
            weight_status="confirmed",
        )
        portion = confirm_portion(
            ingredient,
            name="kleines Brötchen",
            weight_g=45.0,
            quantity=1.0,
            measuring_unit=None,
            rank=1,
            existing_portion_id=None,
            user=user,
        )
        assert portion.id == existing.id
        assert (
            not Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
            .exclude(name="g")
            .exclude(id=existing.id)
            .exists()
        )

    def test_conflicting_weight_creates_new_portion_without_mutation(self):
        ingredient, user = self._setup()
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
            rank=1,
        )
        portion = confirm_portion(
            ingredient,
            name="kleines Brötchen",
            weight_g=45.0,
            quantity=1.0,
            measuring_unit=None,
            rank=1,
            existing_portion_id=None,
            user=user,
        )
        assert portion.id != existing.id
        existing.refresh_from_db()
        assert existing.weight_g == 62.5
        # The new portion got a rank that does not collide with the existing rank=1
        assert (
            portion.rank != 1
            or Portion.objects.filter(ingredient=ingredient, rank=1, deleted_at__isnull=True).count() == 1
        )

    def test_same_name_different_weight_gets_unique_name(self):
        ingredient, user = self._setup()
        baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="kleines Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
        )
        portion = confirm_portion(
            ingredient,
            name="kleines Brötchen",
            weight_g=45.0,
            quantity=1.0,
            measuring_unit=None,
            rank=3,
            existing_portion_id=None,
            user=user,
        )
        assert portion.name != "kleines Brötchen"
        assert "45" in portion.name
        assert portion.weight_g == 45.0

    def test_explicit_existing_choice_wins(self):
        ingredient, user = self._setup()
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
        )
        portion = confirm_portion(
            ingredient,
            name="kleines Brötchen",
            weight_g=45.0,
            quantity=1.0,
            measuring_unit=None,
            rank=1,
            existing_portion_id=existing.id,
            user=user,
        )
        assert portion.id == existing.id
        assert (
            not Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True)
            .exclude(name="g")
            .exclude(id=existing.id)
            .exists()
        )

    def test_rejecting_proposal_creates_nothing(self):
        ingredient, user = self._setup()
        with pytest.raises(ValueError):
            confirm_portion(
                ingredient,
                name="kleines Brötchen",
                weight_g=45.0,
                quantity=1.0,
                measuring_unit=None,
                rank=1,
                existing_portion_id=999_999,
                user=user,
            )
        assert not Portion.objects.filter(ingredient=ingredient, deleted_at__isnull=True).exclude(name="g").exists()

    def test_empty_name_rejected(self):
        ingredient, user = self._setup()
        with pytest.raises(ValueError):
            confirm_portion(
                ingredient,
                name="   ",
                weight_g=45.0,
                quantity=1.0,
                measuring_unit=None,
                rank=1,
                existing_portion_id=None,
                user=user,
            )


@pytest.mark.django_db
class TestConfirmPortionEndpoint:
    def _client(self):
        user = baker.make(User)
        client = pytest.importorskip("django.test").Client()
        client.force_login(user)
        return client, user

    def _post(self, client, slug, payload):
        return client.post(
            f"/api/ingredients/{slug}/portions/confirm/",
            data=json.dumps(payload),
            content_type="application/json",
        )

    def test_confirm_endpoint_creates_confirmed_portion(self):
        client, user = self._client()
        ingredient = make_ingredient(name="Brötchen", owner=user, visibility="shared")
        resp = self._post(
            client,
            ingredient.slug,
            {
                "name": "kleines Brötchen",
                "weight_g": 45.0,
                "quantity": 1.0,
                "rank": 1,
            },
        )
        assert resp.status_code == 200, resp.content
        data = resp.json()
        assert data["weight_status"] == "confirmed"
        assert data["is_weight_trusted"] is True
        portion = Portion.objects.get(id=data["id"])
        assert portion.weight_g == 45.0
        assert portion.is_weight_trusted

    def test_confirm_endpoint_requires_auth(self):
        from django.test import Client

        ingredient = make_ingredient(name="Brötchen")
        resp = Client().post(
            f"/api/ingredients/{ingredient.slug}/portions/confirm/",
            data=json.dumps({"name": "kleines Brötchen", "weight_g": 45.0}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_confirm_endpoint_returns_existing_choice(self):
        client, user = self._client()
        ingredient = make_ingredient(name="Brötchen", owner=user, visibility="shared")
        existing = baker.make(
            Portion,
            ingredient=ingredient,
            measuring_unit=make_measuring_unit(),
            name="Brötchen",
            quantity=1.0,
            weight_g=62.5,
            weight_status="confirmed",
        )
        resp = self._post(
            client,
            ingredient.slug,
            {"name": "kleines Brötchen", "weight_g": 45.0, "existing_portion_id": existing.id},
        )
        assert resp.status_code == 200, resp.content
        assert resp.json()["id"] == existing.id

    def test_confirm_endpoint_rejects_invalid_weight(self):
        client, user = self._client()
        ingredient = make_ingredient(name="Brötchen", owner=user, visibility="shared")
        resp = self._post(client, ingredient.slug, {"name": "kleines Brötchen", "weight_g": -5.0})
        assert resp.status_code == 422
