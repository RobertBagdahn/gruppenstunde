"""Store endpoints (openspec `shopping-stores`)."""

import json

import pytest
from django.contrib.auth import get_user_model
from django.test import Client

from event.tests import make_event
from shopping.models import ShoppingList, SourceType, Store

User = get_user_model()
BASE = "/api/shopping-stores"


def make_user(name: str):
    return User.objects.create_user(username=name, email=f"{name}@example.com", password="x")


def client_for(user) -> Client:
    client = Client()
    client.force_login(user)
    return client


def post(client: Client, name: str):
    return client.post(f"{BASE}/", json.dumps({"name": name}), content_type="application/json")


def patch(client: Client, store_id: int, name: str):
    return client.patch(f"{BASE}/{store_id}/", json.dumps({"name": name}), content_type="application/json")


@pytest.fixture
def anna():
    return make_user("anna")


@pytest.fixture
def anna_client(anna):
    return client_for(anna)


@pytest.mark.django_db
class TestCreateStore:
    def test_new_store(self, anna_client):
        response = post(anna_client, "Metro")
        assert response.status_code == 201
        assert response.json()["name"] == "Metro" and "id" in response.json()

    def test_duplicate_name_returns_existing_store(self, anna_client):
        first = post(anna_client, "Metro").json()
        response = post(anna_client, "metro ")
        assert response.status_code == 200
        assert response.json()["id"] == first["id"]
        assert Store.objects.count() == 1

    def test_names_are_trimmed_and_whitespace_collapsed(self, anna_client):
        assert post(anna_client, "  Metzger   Müller ").json()["name"] == "Metzger Müller"

    def test_blank_name_is_rejected_with_german_message(self, anna_client):
        response = post(anna_client, "   ")
        assert response.status_code == 422
        assert response.json()["detail"] == "Bitte gib einen Namen für den Laden ein."

    def test_name_longer_than_80_characters_is_rejected(self, anna_client):
        assert post(anna_client, "x" * 81).status_code == 422

    def test_anonymous_gets_401(self):
        assert post(Client(), "Metro").status_code == 401

    def test_same_name_for_different_owners_is_allowed(self, anna_client):
        post(anna_client, "Metro")
        assert post(client_for(make_user("ben")), "Metro").status_code == 201


@pytest.mark.django_db
class TestListStores:
    def test_lists_only_own_stores_paginated_and_searchable(self, anna, anna_client):
        for name in ("Metro", "Metzger", "DM"):
            Store.objects.create(owner=anna, name=name)
        Store.objects.create(owner=make_user("ben"), name="Fremd")

        body = anna_client.get(f"{BASE}/?search=met&page_size=1").json()

        assert body["total"] == 2 and body["page_size"] == 1 and body["total_pages"] == 2
        assert [s["name"] for s in body["items"]] == ["Metro"]
        assert anna_client.get(f"{BASE}/").json()["total"] == 3

    def test_team_stores_appear_for_event_members(self, anna, anna_client):
        ben = make_user("ben")
        event = make_event(created_by=anna)
        event.responsible_persons.add(ben)
        metzger = Store.objects.create(owner=anna, name="Metzger Müller")
        ShoppingList.objects.create(
            name="Einkauf", owner=anna, event=event, store=metzger, source_type=SourceType.EVENT_TRIP
        )

        names = [s["name"] for s in client_for(ben).get(f"{BASE}/?event_slug={event.slug}").json()["items"]]

        assert names == ["Metzger Müller"]
        assert client_for(ben).get(f"{BASE}/").json()["total"] == 0

    def test_foreign_event_adds_nothing(self, anna):
        event = make_event(created_by=anna)
        store = Store.objects.create(owner=anna, name="Geheim")
        ShoppingList.objects.create(
            name="Einkauf", owner=anna, event=event, store=store, source_type=SourceType.EVENT_TRIP
        )

        response = client_for(make_user("stranger")).get(f"{BASE}/?event_slug={event.slug}")

        assert response.status_code == 200 and response.json()["total"] == 0

    def test_anonymous_gets_401(self):
        assert Client().get(f"{BASE}/").status_code == 401


@pytest.mark.django_db
class TestRenameAndDelete:
    def test_rename(self, anna, anna_client):
        store = Store.objects.create(owner=anna, name="Rewe")
        assert patch(anna_client, store.id, "REWE City").json()["name"] == "REWE City"

    def test_rename_to_existing_name_conflicts(self, anna, anna_client):
        Store.objects.create(owner=anna, name="Rewe")
        other = Store.objects.create(owner=anna, name="Aldi")
        assert patch(anna_client, other.id, "rewe").status_code == 409

    def test_foreign_store_is_404(self, anna_client):
        store = Store.objects.create(owner=make_user("ben"), name="Rewe")
        assert patch(anna_client, store.id, "Neu").status_code == 404
        assert anna_client.delete(f"{BASE}/{store.id}/").status_code == 404

    def test_delete_unused_store(self, anna, anna_client):
        store = Store.objects.create(owner=anna, name="Rewe")
        assert anna_client.delete(f"{BASE}/{store.id}/").status_code == 204
        assert not Store.objects.filter(id=store.id).exists()

    def test_delete_store_in_use_conflicts(self, anna, anna_client):
        store = Store.objects.create(owner=anna, name="Rewe")
        ShoppingList.objects.create(name="Einkauf", owner=anna, store=store)
        response = anna_client.delete(f"{BASE}/{store.id}/")
        assert response.status_code == 409
        assert response.json()["detail"] == "Dieser Laden wird noch in Einkäufen verwendet."
