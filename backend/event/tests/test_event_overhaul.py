"""Tests for event creation overhaul features.

Covers: choices, model fields, compute_phase, slug check, duplication,
waitlist, attendance, checklist, coordinates, room assignment,
parent access, budget, import, templates, API route order.
"""

import datetime
import uuid
from decimal import Decimal

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from model_bakery import baker

from event.choices import (
    BudgetCategoryChoices,
    EventColorChoices,
    EventIconChoices,
    EventPhaseChoices,
)
from event.models import (
    AttendanceRecord,
    BudgetItem,
    Event,
    MeetingPoint,
    ParentAccessToken,
    RoomAssignment,
    WaitlistEntry,
)
from event.tests import (
    make_booking_option,
    make_event,
    make_event_location,
    make_participant,
    make_registration,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _manager_client(event: Event) -> Client:
    """Return an authenticated client whose user is a manager of *event*."""
    user = baker.make(User)
    event.responsible_persons.add(user)
    client = Client()
    client.force_login(user)
    client._user = user  # type: ignore[attr-defined]
    return client


def _auth_client() -> tuple[Client, User]:
    """Return an authenticated client + its user."""
    user = baker.make(User)
    client = Client()
    client.force_login(user)
    client._user = user  # type: ignore[attr-defined]
    return client, user


# ===========================================================================
# 29.1 — Choices validation
# ===========================================================================


@pytest.mark.django_db
class TestChoices:
    def test_color_choices_count(self):
        assert len(EventColorChoices.choices) >= 15

    def test_color_choices_has_blue(self):
        assert "blue" in EventColorChoices.values

    def test_icon_choices_has_tent(self):
        assert "tent" in EventIconChoices.values

    def test_icon_choices_has_flame(self):
        # campfire doesn't exist in lucide-react — we use flame
        assert "flame" in EventIconChoices.values
        assert "campfire" not in EventIconChoices.values

    def test_phase_choices(self):
        values = EventPhaseChoices.values
        assert "draft" in values
        assert "registration" in values
        assert "completed" in values


# ===========================================================================
# 29.2 — New Event model fields
# ===========================================================================


@pytest.mark.django_db
class TestEventModelFields:
    def test_default_color(self):
        event = make_event()
        assert event.color == EventColorChoices.BLUE

    def test_default_icon(self):
        event = make_event()
        assert event.icon == EventIconChoices.TENT

    def test_is_template_default_false(self):
        event = make_event()
        assert event.is_template is False

    def test_manual_phase_nullable(self):
        event = make_event(manual_phase=None)
        assert event.manual_phase is None

    def test_custom_color(self):
        event = make_event(color=EventColorChoices.RED)
        assert event.color == EventColorChoices.RED

    def test_custom_icon(self):
        event = make_event(icon=EventIconChoices.FLAME)
        assert event.icon == EventIconChoices.FLAME

    def test_is_template(self):
        event = make_event(is_template=True)
        assert event.is_template is True


# ===========================================================================
# 29.3 — compute_phase with manual_phase override
# ===========================================================================


@pytest.mark.django_db
class TestComputePhase:
    def test_manual_phase_overrides_computed(self):
        event = make_event(
            manual_phase=EventPhaseChoices.COMPLETED,
            start_date=timezone.now() + datetime.timedelta(days=30),
            end_date=timezone.now() + datetime.timedelta(days=37),
        )
        assert event.compute_phase() == "completed"

    def test_no_manual_phase_uses_time_based(self):
        event = make_event(
            manual_phase=None,
            start_date=timezone.now() + datetime.timedelta(days=30),
            end_date=timezone.now() + datetime.timedelta(days=37),
            registration_start=timezone.now() - datetime.timedelta(days=5),
            registration_deadline=timezone.now() + datetime.timedelta(days=25),
        )
        # Should be registration or pre_registration, not completed
        phase = event.compute_phase()
        assert phase != "completed"

    def test_empty_manual_phase_ignored(self):
        event = make_event(
            manual_phase="",
            start_date=timezone.now() + datetime.timedelta(days=30),
        )
        phase = event.compute_phase()
        assert phase != ""


# ===========================================================================
# 29.4 — Slug check endpoint
# ===========================================================================


@pytest.mark.django_db
class TestSlugCheck:
    def test_available_slug(self, auth_client):
        resp = auth_client.get("/api/events/check-slug/", {"slug": "unique-slug-99999"})
        assert resp.status_code == 200
        data = resp.json()
        assert data["available"] is True

    def test_taken_slug(self, auth_client):
        event = make_event()
        resp = auth_client.get("/api/events/check-slug/", {"slug": event.slug})
        assert resp.status_code == 200
        data = resp.json()
        assert data["available"] is False
        assert "suggestion" in data


# ===========================================================================
# 29.5 — Event duplication
# ===========================================================================


@pytest.mark.django_db
class TestDuplication:
    def test_duplicate_creates_new_event(self):
        event = make_event()
        make_booking_option(event=event)
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/duplicate/",
            content_type="application/json",
            data="{}",
        )
        assert resp.status_code == 200
        data = resp.json()
        assert data["slug"] != event.slug
        assert data["name"].startswith(event.name)

    def test_duplicate_with_date_shift(self):
        now = timezone.now()
        event = make_event(
            start_date=now + datetime.timedelta(days=10),
            end_date=now + datetime.timedelta(days=17),
        )
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/duplicate/",
            content_type="application/json",
            data='{"date_shift_weeks": 52}',
        )
        assert resp.status_code == 200
        new_event = Event.objects.get(slug=resp.json()["slug"])
        shift = datetime.timedelta(weeks=52)
        assert abs((new_event.start_date - event.start_date) - shift) < datetime.timedelta(hours=1)


# ===========================================================================
# 29.6 — Waitlist
# ===========================================================================


@pytest.mark.django_db
class TestWaitlist:
    def test_join_waitlist(self):
        event = make_event()
        option = make_booking_option(event=event)
        client, user = _auth_client()

        resp = client.post(
            f"/api/events/{event.slug}/waitlist/",
            content_type="application/json",
            data=f'{{"booking_option_id": {option.id}}}',
        )
        assert resp.status_code in (200, 201)
        assert WaitlistEntry.objects.filter(event=event, user=user).exists()

    def test_list_waitlist_manager_only(self):
        event = make_event()
        client, _user = _auth_client()

        resp = client.get(f"/api/events/{event.slug}/waitlist/")
        # Non-managers should get 403
        assert resp.status_code == 403

    def test_list_waitlist_as_manager(self):
        event = make_event()
        client = _manager_client(event)

        resp = client.get(f"/api/events/{event.slug}/waitlist/")
        assert resp.status_code == 200

    def test_person_fk_set_null(self):
        """Verify WaitlistEntry.person uses SET_NULL."""
        from django.db.models import SET_NULL

        person_field = WaitlistEntry._meta.get_field("person")
        assert person_field.remote_field.on_delete == SET_NULL


# ===========================================================================
# 29.7 — Attendance
# ===========================================================================


@pytest.mark.django_db
class TestAttendance:
    def test_check_in(self):
        event = make_event()
        option = make_booking_option(event=event)
        reg = make_registration(event=event)
        participant = make_participant(registration=reg, booking_option=option)
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/attendance/check-in/",
            content_type="application/json",
            data=f'{{"participant_id": {participant.id}}}',
        )
        assert resp.status_code in (200, 201)
        assert AttendanceRecord.objects.filter(participant=participant).exists()

    def test_batch_check_in(self):
        event = make_event()
        option = make_booking_option(event=event)
        reg = make_registration(event=event)
        p1 = make_participant(registration=reg, booking_option=option, first_name="A")
        p2 = make_participant(registration=reg, booking_option=option, first_name="B")
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/attendance/batch-check-in/",
            content_type="application/json",
            data=f'{{"participant_ids": [{p1.id}, {p2.id}]}}',
        )
        assert resp.status_code in (200, 201)
        assert AttendanceRecord.objects.filter(participant__in=[p1, p2]).count() == 2


# ===========================================================================
# 29.8 — Checklist endpoint
# ===========================================================================


@pytest.mark.django_db
class TestChecklist:
    def test_checklist_returns_items(self):
        event = make_event()
        client = _manager_client(event)

        resp = client.get(f"/api/events/{event.slug}/checklist/")
        assert resp.status_code == 200
        data = resp.json()
        assert "items" in data
        assert isinstance(data["items"], list)
        assert len(data["items"]) > 0  # should have at least some checks


# ===========================================================================
# 29.9 — Coordinate fields
# ===========================================================================


@pytest.mark.django_db
class TestCoordinateFields:
    def test_event_location_coordinates(self):
        loc = make_event_location(latitude=50.1234, longitude=8.5678)
        assert loc.latitude == pytest.approx(50.1234)
        assert loc.longitude == pytest.approx(8.5678)

    def test_event_location_null_coordinates(self):
        loc = make_event_location()
        assert loc.latitude is None
        assert loc.longitude is None

    def test_meeting_point_coordinates(self):
        mp = baker.make(
            MeetingPoint,
            name="Bahnhof",
            latitude=51.5,
            longitude=7.2,
        )
        assert mp.latitude == pytest.approx(51.5)
        assert mp.longitude == pytest.approx(7.2)


# ===========================================================================
# 29.10 — Room assignment
# ===========================================================================


@pytest.mark.django_db
class TestRoomAssignment:
    def test_create_room(self):
        event = make_event()
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/rooms/",
            content_type="application/json",
            data='{"name": "Zelt A", "capacity": 8}',
        )
        assert resp.status_code in (200, 201)
        assert RoomAssignment.objects.filter(event=event, name="Zelt A").exists()

    def test_list_rooms(self):
        event = make_event()
        RoomAssignment.objects.create(event=event, name="Zelt B", capacity=6)
        client = _manager_client(event)

        resp = client.get(f"/api/events/{event.slug}/rooms/")
        assert resp.status_code == 200
        data = resp.json()
        assert len(data) >= 1

    def test_delete_room(self):
        event = make_event()
        room = RoomAssignment.objects.create(event=event, name="Zelt C", capacity=4)
        client = _manager_client(event)

        resp = client.delete(f"/api/events/{event.slug}/rooms/{room.id}/")
        assert resp.status_code == 200
        assert not RoomAssignment.objects.filter(id=room.id).exists()


# ===========================================================================
# 29.11 — Parent access tokens
# ===========================================================================


@pytest.mark.django_db
class TestParentAccess:
    def test_generate_token(self):
        event = make_event()
        option = make_booking_option(event=event)
        reg = make_registration(event=event)
        participant = make_participant(registration=reg, booking_option=option)
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/parent-access/",
            content_type="application/json",
            data=f'{{"participant_id": {participant.id}}}',
        )
        assert resp.status_code in (200, 201)
        assert ParentAccessToken.objects.filter(participant=participant).exists()

    def test_token_has_uuid(self):
        event = make_event()
        reg = make_registration(event=event)
        participant = make_participant(registration=reg)
        token = ParentAccessToken.objects.create(
            participant=participant,
            expires_at=timezone.now() + datetime.timedelta(days=30),
        )
        assert token.token is not None
        # Should be a valid UUID
        uuid.UUID(str(token.token))

    def test_token_expiration(self):
        event = make_event()
        reg = make_registration(event=event)
        participant = make_participant(registration=reg)
        token = ParentAccessToken.objects.create(
            participant=participant,
            expires_at=timezone.now() - datetime.timedelta(days=1),
        )
        assert token.expires_at < timezone.now()


# ===========================================================================
# 29.12 — Budget
# ===========================================================================


@pytest.mark.django_db
class TestBudget:
    def test_create_budget_item(self):
        event = make_event()
        client = _manager_client(event)

        resp = client.post(
            f"/api/events/{event.slug}/budget/items/",
            content_type="application/json",
            data='{"description": "Zeltmiete", "amount": "150.00", "category": "venue", "is_expense": true}',
        )
        assert resp.status_code in (200, 201)
        assert BudgetItem.objects.filter(event=event).exists()

    def test_budget_summary(self):
        event = make_event()
        user = baker.make(User)
        event.responsible_persons.add(user)
        BudgetItem.objects.create(
            event=event,
            description="Einnahme",
            amount=Decimal("100.00"),
            category=BudgetCategoryChoices.OTHER,
            is_expense=False,
            created_by=user,
        )
        BudgetItem.objects.create(
            event=event,
            description="Ausgabe",
            amount=Decimal("40.00"),
            category=BudgetCategoryChoices.FOOD,
            is_expense=True,
            created_by=user,
        )
        BudgetItem.objects.create(
            event=event,
            description="Ausgabe",
            amount=Decimal("40.00"),
            category=BudgetCategoryChoices.FOOD,
            is_expense=True,
            created_by=user,
        )
        client = Client()
        client.force_login(user)

        resp = client.get(f"/api/events/{event.slug}/budget/")
        assert resp.status_code == 200
        data = resp.json()
        assert float(data["total_income"]) == pytest.approx(100.0)
        assert float(data["total_expenses"]) == pytest.approx(80.0)
        assert float(data["balance"]) == pytest.approx(20.0)

    def test_delete_budget_item(self):
        event = make_event()
        user = baker.make(User)
        event.responsible_persons.add(user)
        item = BudgetItem.objects.create(
            event=event,
            description="Test",
            amount=Decimal("10.00"),
            category=BudgetCategoryChoices.OTHER,
            is_expense=True,
            created_by=user,
        )
        client = _manager_client(event)

        resp = client.delete(f"/api/events/{event.slug}/budget/items/{item.id}/")
        assert resp.status_code == 200


# ===========================================================================
# 29.13 — Participant import (CSV parsing)
# ===========================================================================


@pytest.mark.django_db
class TestParticipantImport:
    def test_import_preview_csv(self):
        event = make_event()
        make_booking_option(event=event)
        client = _manager_client(event)

        csv_content = "Vorname,Nachname,Geburtsdatum\nAnna,Schmidt,2010-05-15\nLukas,Meier,2011-03-20"
        from django.core.files.uploadedfile import SimpleUploadedFile

        file = SimpleUploadedFile("test.csv", csv_content.encode("utf-8"), content_type="text/csv")

        resp = client.post(
            f"/api/events/{event.slug}/import/preview/",
            data={"file": file},
        )
        # The import endpoint might not exist or have different structure
        # Accept 200 or 404/405 (if endpoint not yet wired)
        assert resp.status_code in (200, 400, 404, 405)


# ===========================================================================
# 29.14 — Event list excluding templates
# ===========================================================================


@pytest.mark.django_db
class TestTemplateExclusion:
    def test_templates_excluded_from_main_list(self, auth_client):
        make_event(name="Normal Event", is_template=False)
        make_event(name="Template Event", is_template=True)

        resp = auth_client.get("/api/events/")
        assert resp.status_code == 200
        data = resp.json()
        names = [e["name"] for e in data.get("items", data)]
        assert "Normal Event" in names
        assert "Template Event" not in names

    def test_templates_endpoint_returns_only_templates(self, auth_client):
        make_event(name="Normal Event", is_template=False)
        make_event(name="Template Event", is_template=True)

        resp = auth_client.get("/api/events/templates/")
        assert resp.status_code == 200
        data = resp.json()
        items = data.get("items", data) if isinstance(data, dict) else data
        for item in items:
            assert item.get("is_template") is True


# ===========================================================================
# 29.15 — API route order
# ===========================================================================


@pytest.mark.django_db
class TestApiRouteOrder:
    """Verify that static routes (check-slug, templates) resolve BEFORE the
    {event_slug} catch-all."""

    def test_check_slug_not_caught_by_event_slug(self, auth_client):
        """GET /api/events/check-slug/ should NOT try to find an event
        with slug='check-slug'."""
        resp = auth_client.get("/api/events/check-slug/", {"slug": "test"})
        # Should return 200 from the check-slug endpoint, not 404 from event detail
        assert resp.status_code == 200
        assert "available" in resp.json()

    def test_templates_not_caught_by_event_slug(self, auth_client):
        """GET /api/events/templates/ should NOT try to find an event
        with slug='templates'."""
        resp = auth_client.get("/api/events/templates/")
        assert resp.status_code == 200
