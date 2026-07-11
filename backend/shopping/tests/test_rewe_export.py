"""Tests for REWE basket export endpoints."""

import json
import uuid
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from shopping.models import (
    CollaboratorRole,
    ReweExportToken,
    ShoppingList,
    ShoppingListCollaborator,
    ShoppingListItem,
    SourceType,
)
from supply.tests import make_ingredient, make_measuring_unit, make_portion

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def user(db):
    return User.objects.create_user(username="alice", email="alice@example.com", password="test123")


@pytest.fixture
def other_user(db):
    return User.objects.create_user(username="bob", email="bob@example.com", password="test123")


@pytest.fixture
def client_alice(user) -> Client:
    c = Client()
    c.force_login(user)
    c._user = user
    return c


@pytest.fixture
def client_bob(other_user) -> Client:
    c = Client()
    c.force_login(other_user)
    c._user = other_user
    return c


@pytest.fixture
def ingredient_with_rewe(db):
    return make_ingredient(name="Vollmilch", nan_art_id_rewe=12345678)


@pytest.fixture
def ingredient_without_rewe(db):
    return make_ingredient(name="Bio-Mehl", nan_art_id_rewe=None)


@pytest.fixture
def shopping_list(user):
    return ShoppingList.objects.create(
        name="Wocheneinkauf",
        owner=user,
        source_type=SourceType.MANUAL,
    )


@pytest.fixture
def shopping_list_with_rewe_items(shopping_list, ingredient_with_rewe, ingredient_without_rewe):
    mu = make_measuring_unit(name="Gramm", quantity=1.0, unit="g")
    make_portion(ingredient=ingredient_with_rewe, name="Packung (500g)", weight_g=500, is_system=False, measuring_unit=mu)
    make_portion(ingredient=ingredient_without_rewe, name="Packung (1000g)", weight_g=1000, is_system=False, measuring_unit=mu)

    ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        ingredient=ingredient_with_rewe,
        name="Vollmilch",
        quantity_g=750,
        unit="g",
        sort_order=0,
    )
    ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        ingredient=ingredient_without_rewe,
        name="Bio-Mehl",
        quantity_g=500,
        unit="g",
        sort_order=1,
    )
    ShoppingListItem.objects.create(
        shopping_list=shopping_list,
        name="Freitext-Artikel",
        quantity_g=3,
        unit="Stück",
        sort_order=2,
    )
    return shopping_list


@pytest.fixture
def export_token(shopping_list_with_rewe_items, user):
    return ReweExportToken.objects.create(
        shopping_list=shopping_list_with_rewe_items,
        user=user,
        expires_at=timezone.now() + timedelta(minutes=5),
    )


# ---------------------------------------------------------------------------
# 4.1 — Token creation succeeds for authorized user
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateReweExportToken:
    def test_owner_can_create_token(self, client_alice, shopping_list):
        res = client_alice.post(f"/api/shopping-lists/{shopping_list.id}/rewe-export-token/")
        assert res.status_code == 200
        data = res.json()
        assert "token" in data
        assert "export_url" in data
        assert "expires_at" in data
        assert f"/rewe-export/{data['token']}/" in data["export_url"]

    def test_collaborator_can_create_token(self, client_bob, shopping_list, other_user):
        ShoppingListCollaborator.objects.create(
            shopping_list=shopping_list, user=other_user, role=CollaboratorRole.VIEWER
        )
        res = client_bob.post(f"/api/shopping-lists/{shopping_list.id}/rewe-export-token/")
        assert res.status_code == 200

    def test_token_is_stored_in_db(self, client_alice, shopping_list):
        res = client_alice.post(f"/api/shopping-lists/{shopping_list.id}/rewe-export-token/")
        data = res.json()
        token_uuid = uuid.UUID(data["token"])
        assert ReweExportToken.objects.filter(token=token_uuid, shopping_list=shopping_list).exists()


# ---------------------------------------------------------------------------
# 4.2 — Token creation fails (no auth / no role)
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateReweExportTokenFailures:
    def test_unauthenticated_returns_403(self, shopping_list):
        c = Client()
        res = c.post(f"/api/shopping-lists/{shopping_list.id}/rewe-export-token/")
        assert res.status_code == 403

    def test_unrelated_user_gets_404(self, client_bob, shopping_list):
        res = client_bob.post(f"/api/shopping-lists/{shopping_list.id}/rewe-export-token/")
        assert res.status_code == 404


# ---------------------------------------------------------------------------
# 4.3 — Export endpoint returns correct data with rounded quantities
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReweExportGetList:
    def test_returns_correct_items(self, export_token):
        c = Client()
        res = c.get(f"/api/shopping-lists/rewe-export/{export_token.token}/")
        assert res.status_code == 200
        data = res.json()
        assert data["shopping_list_name"] == "Wocheneinkauf"
        assert len(data["items"]) == 3

        # First item: Vollmilch, 750g needed, 500g package → ceil(750/500)=2
        item0 = data["items"][0]
        assert item0["ingredient_name"] == "Vollmilch"
        assert item0["nan_art_id_rewe"] == 12345678
        assert item0["matched"] is True
        assert item0["order_quantity"] == 2.0
        assert "Packung" in item0["unit"]

        # Second item: Bio-Mehl, 500g needed, 1000g package → ceil(500/1000)=1
        item1 = data["items"][1]
        assert item1["ingredient_name"] == "Bio-Mehl"
        assert item1["nan_art_id_rewe"] is None
        assert item1["matched"] is False
        assert item1["order_quantity"] == 1.0

        # Third item: free-text, no ingredient, no rewe matching
        item2 = data["items"][2]
        assert item2["ingredient_name"] == "Freitext-Artikel"
        assert item2["nan_art_id_rewe"] is None
        assert item2["matched"] is False
        assert item2["order_quantity"] == 3.0
        assert item2["unit"] == "Stück"


# ---------------------------------------------------------------------------
# 4.4 — Export endpoint with expired/invalid token
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReweExportGetListExpired:
    def test_invalid_uuid_format_returns_401(self):
        c = Client()
        res = c.get("/api/shopping-lists/rewe-export/not-a-uuid/")
        assert res.status_code == 401

    def test_nonexistent_token_returns_401(self):
        c = Client()
        res = c.get(f"/api/shopping-lists/rewe-export/{uuid.uuid4()}/")
        assert res.status_code == 401

    def test_expired_token_returns_401(self, shopping_list_with_rewe_items, user):
        expired_token = ReweExportToken.objects.create(
            shopping_list=shopping_list_with_rewe_items,
            user=user,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        c = Client()
        res = c.get(f"/api/shopping-lists/rewe-export/{expired_token.token}/")
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# 4.5 — Article without nan_art_id_rewe marked as unmatched
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReweExportUnmatchedItem:
    def test_item_without_nan_art_id_rewe_is_unmatched(self, export_token):
        c = Client()
        res = c.get(f"/api/shopping-lists/rewe-export/{export_token.token}/")
        assert res.status_code == 200
        data = res.json()

        bio_mehl = next(item for item in data["items"] if item["ingredient_name"] == "Bio-Mehl")
        assert bio_mehl["matched"] is False
        assert bio_mehl["nan_art_id_rewe"] is None

        free_text = next(item for item in data["items"] if item["ingredient_name"] == "Freitext-Artikel")
        assert free_text["matched"] is False

    def test_item_with_nan_art_id_rewe_is_matched(self, export_token):
        c = Client()
        res = c.get(f"/api/shopping-lists/rewe-export/{export_token.token}/")
        assert res.status_code == 200
        data = res.json()

        vollmilch = next(item for item in data["items"] if item["ingredient_name"] == "Vollmilch")
        assert vollmilch["matched"] is True
        assert vollmilch["nan_art_id_rewe"] == 12345678


# ---------------------------------------------------------------------------
# 4.6 — Report callback updates rewe_added_at
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReweExportReport:
    def test_successful_report_updates_rewe_added_at(self, export_token):
        items = ShoppingListItem.objects.filter(shopping_list=export_token.shopping_list)
        item_ids = list(items.values_list("id", flat=True)[:2])

        assert items.filter(rewe_added_at__isnull=True).count() == 3

        c = Client()
        res = c.post(
            f"/api/shopping-lists/rewe-export/{export_token.token}/report/",
            data=json.dumps({"successful_item_ids": item_ids, "failed_item_ids": []}),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["updated"] == 2
        assert data["success"] is True

        updated_items = ShoppingListItem.objects.filter(id__in=item_ids)
        for item in updated_items:
            assert item.rewe_added_at is not None

    def test_empty_report_succeeds(self, export_token):
        c = Client()
        res = c.post(
            f"/api/shopping-lists/rewe-export/{export_token.token}/report/",
            data=json.dumps({"successful_item_ids": [], "failed_item_ids": []}),
            content_type="application/json",
        )
        assert res.status_code == 200
        assert res.json()["updated"] == 0

    def test_expired_token_rejects_report(self, shopping_list_with_rewe_items, user):
        expired_token = ReweExportToken.objects.create(
            shopping_list=shopping_list_with_rewe_items,
            user=user,
            expires_at=timezone.now() - timedelta(seconds=1),
        )
        c = Client()
        res = c.post(
            f"/api/shopping-lists/rewe-export/{expired_token.token}/report/",
            data=json.dumps({"successful_item_ids": [], "failed_item_ids": []}),
            content_type="application/json",
        )
        assert res.status_code == 401


# ---------------------------------------------------------------------------
# 4.7 — Report callback ignores item IDs from other lists
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestReweExportReportIgnoresForeignItems:
    def test_foreign_item_ids_are_ignored(self, export_token, other_user):
        other_list = ShoppingList.objects.create(
            name="Andere Liste",
            owner=other_user,
            source_type=SourceType.MANUAL,
        )
        foreign_item = ShoppingListItem.objects.create(
            shopping_list=other_list,
            name="Fremder Artikel",
            quantity_g=100,
        )

        own_items = ShoppingListItem.objects.filter(shopping_list=export_token.shopping_list)
        own_ids = list(own_items.values_list("id", flat=True)[:1])

        c = Client()
        res = c.post(
            f"/api/shopping-lists/rewe-export/{export_token.token}/report/",
            data=json.dumps({
                "successful_item_ids": own_ids + [foreign_item.id],
                "failed_item_ids": [],
            }),
            content_type="application/json",
        )
        assert res.status_code == 200
        data = res.json()
        assert data["updated"] == 1
        assert data["ignored"] == 1

        foreign_item.refresh_from_db()
        assert foreign_item.rewe_added_at is None
