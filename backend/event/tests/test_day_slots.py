"""Tests for EventDaySlot API (CRUD under /api/events/{slug}/day-slots/)."""

import datetime
import json

import pytest
from django.test import Client

from event.models import Event, EventDaySlot
from event.tests import make_event


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def manager_client(db, django_user_model) -> Client:
    """Authenticated client whose user is event manager."""
    user = django_user_model.objects.create_user(
        username="manager",
        email="manager@inspi.dev",
        password="testpass123",
    )
    client = Client()
    client.force_login(user)
    client._user = user  # type: ignore[attr-defined]
    return client


@pytest.fixture
def event_with_manager(manager_client) -> Event:
    """Event with the manager_client user as responsible_person."""
    event = make_event()
    event.responsible_persons.add(manager_client._user)  # type: ignore[attr-defined]
    return event


@pytest.fixture
def sample_slot(event_with_manager) -> EventDaySlot:
    """A sample day slot attached to the managed event."""
    return EventDaySlot.objects.create(
        event=event_with_manager,
        date=datetime.date(2026, 7, 15),
        start_time=datetime.time(9, 0),
        end_time=datetime.time(10, 30),
        title="Morgenrunde",
        notes="Alle zusammen im Kreis",
        sort_order=0,
    )


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestListDaySlots:
    def test_list_empty(self, api_client: Client, event_with_manager: Event):
        resp = api_client.get(f"/api/events/{event_with_manager.slug}/day-slots/")
        assert resp.status_code == 200
        assert resp.json() == []

    def test_list_returns_slots(self, api_client: Client, sample_slot: EventDaySlot):
        event = sample_slot.event
        resp = api_client.get(f"/api/events/{event.slug}/day-slots/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 1
        slot = data[0]
        assert slot["title"] == "Morgenrunde"
        assert slot["date"] == "2026-07-15"
        assert slot["start_time"] == "09:00:00"
        assert slot["end_time"] == "10:30:00"
        assert slot["notes"] == "Alle zusammen im Kreis"
        assert slot["sort_order"] == 0

    def test_list_ordered_by_date_and_sort_order(self, api_client: Client, event_with_manager: Event):
        EventDaySlot.objects.create(
            event=event_with_manager,
            date=datetime.date(2026, 7, 16),
            title="Tag 2 - Nachmittag",
            sort_order=1,
        )
        EventDaySlot.objects.create(
            event=event_with_manager,
            date=datetime.date(2026, 7, 15),
            title="Tag 1 - Morgen",
            sort_order=0,
        )
        EventDaySlot.objects.create(
            event=event_with_manager,
            date=datetime.date(2026, 7, 15),
            title="Tag 1 - Nachmittag",
            sort_order=1,
        )
        resp = api_client.get(f"/api/events/{event_with_manager.slug}/day-slots/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) == 3
        titles = [s["title"] for s in data]
        assert titles == ["Tag 1 - Morgen", "Tag 1 - Nachmittag", "Tag 2 - Nachmittag"]

    def test_list_404_for_missing_event(self, api_client: Client):
        resp = api_client.get("/api/events/nonexistent-event/day-slots/")
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestCreateDaySlot:
    def test_create_minimal(self, manager_client: Client, event_with_manager: Event):
        payload = {
            "date": "2026-07-15",
            "title": "Frühstück",
        }
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/day-slots/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["title"] == "Frühstück"
        assert data["date"] == "2026-07-15"
        assert data["notes"] == ""
        assert data["sort_order"] == 0
        assert data["content_type"] is None
        assert data["object_id"] is None

    def test_create_full(self, manager_client: Client, event_with_manager: Event):
        payload = {
            "date": "2026-07-15",
            "start_time": "08:00:00",
            "end_time": "09:00:00",
            "title": "Frühstück",
            "notes": "Mit frischem Brot",
            "sort_order": 1,
        }
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/day-slots/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["start_time"] == "08:00:00"
        assert data["end_time"] == "09:00:00"
        assert data["notes"] == "Mit frischem Brot"
        assert data["sort_order"] == 1

    def test_create_requires_auth(self, api_client: Client, event_with_manager: Event):
        payload = {"date": "2026-07-15", "title": "Test"}
        resp = api_client.post(
            f"/api/events/{event_with_manager.slug}/day-slots/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_requires_manager(self, auth_client: Client, event_with_manager: Event):
        """Non-manager authenticated user cannot create."""
        payload = {"date": "2026-07-15", "title": "Test"}
        resp = auth_client.post(
            f"/api/events/{event_with_manager.slug}/day-slots/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_create_sets_created_by(self, manager_client: Client, event_with_manager: Event):
        payload = {"date": "2026-07-15", "title": "Test"}
        resp = manager_client.post(
            f"/api/events/{event_with_manager.slug}/day-slots/",
            data=json.dumps(payload),
            content_type="application/json",
        )
        assert resp.status_code == 201
        slot = EventDaySlot.objects.get(pk=resp.json()["id"])
        assert slot.created_by == manager_client._user  # type: ignore[attr-defined]


# ---------------------------------------------------------------------------
# Update
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestUpdateDaySlot:
    def test_update_title(self, manager_client: Client, sample_slot: EventDaySlot):
        resp = manager_client.patch(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
            data=json.dumps({"title": "Abendrunde"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.json()["title"] == "Abendrunde"
        sample_slot.refresh_from_db()
        assert sample_slot.title == "Abendrunde"

    def test_update_time(self, manager_client: Client, sample_slot: EventDaySlot):
        resp = manager_client.patch(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
            data=json.dumps({"start_time": "14:00:00", "end_time": "15:30:00"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["start_time"] == "14:00:00"
        assert data["end_time"] == "15:30:00"

    def test_update_requires_auth(self, api_client: Client, sample_slot: EventDaySlot):
        resp = api_client.patch(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
            data=json.dumps({"title": "Hacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_update_requires_manager(self, auth_client: Client, sample_slot: EventDaySlot):
        resp = auth_client.patch(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
            data=json.dumps({"title": "Hacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_update_wrong_event_404(self, manager_client: Client, sample_slot: EventDaySlot):
        """Slot belongs to event A, but request goes to event B's URL."""
        other_event = make_event(name="Other Event")
        other_event.responsible_persons.add(manager_client._user)  # type: ignore[attr-defined]
        resp = manager_client.patch(
            f"/api/events/{other_event.slug}/day-slots/{sample_slot.pk}/",
            data=json.dumps({"title": "Wrong event"}),
            content_type="application/json",
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestDeleteDaySlot:
    def test_delete(self, manager_client: Client, sample_slot: EventDaySlot):
        slot_id = sample_slot.pk
        resp = manager_client.delete(
            f"/api/events/{sample_slot.event.slug}/day-slots/{slot_id}/",
        )
        assert resp.status_code == 204
        assert not EventDaySlot.objects.filter(pk=slot_id).exists()

    def test_delete_requires_auth(self, api_client: Client, sample_slot: EventDaySlot):
        resp = api_client.delete(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
        )
        assert resp.status_code == 403

    def test_delete_requires_manager(self, auth_client: Client, sample_slot: EventDaySlot):
        resp = auth_client.delete(
            f"/api/events/{sample_slot.event.slug}/day-slots/{sample_slot.pk}/",
        )
        assert resp.status_code == 403

    def test_delete_wrong_event_404(self, manager_client: Client, sample_slot: EventDaySlot):
        other_event = make_event(name="Other Event 2")
        other_event.responsible_persons.add(manager_client._user)  # type: ignore[attr-defined]
        resp = manager_client.delete(
            f"/api/events/{other_event.slug}/day-slots/{sample_slot.pk}/",
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# EventDetail includes day_slots
# ---------------------------------------------------------------------------


@pytest.mark.django_db
class TestEventDetailIncludesDaySlots:
    def test_event_detail_includes_day_slots(self, api_client: Client, sample_slot: EventDaySlot):
        event = sample_slot.event
        resp = api_client.get(f"/api/events/{event.slug}/")
        assert resp.status_code == 200
        data = resp.json()
        assert "day_slots" in data
        assert len(data["day_slots"]) == 1
        assert data["day_slots"][0]["title"] == "Morgenrunde"

    def test_event_detail_empty_day_slots(self, api_client: Client, event_with_manager: Event):
        resp = api_client.get(f"/api/events/{event_with_manager.slug}/")
        assert resp.status_code == 200
        data = resp.json()
        assert "day_slots" in data
        assert data["day_slots"] == []
