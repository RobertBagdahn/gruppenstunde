"""Tests for event-guest-registration change:
- BookingOption is_bookable property
- Guest registration endpoint
- Admin registration with inline person data
- Soft-delete registration
- Booking option time window enforcement
- Auto-account creation
"""

import json
from datetime import timedelta

import pytest
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone

from event.models import (
    Event,
    Person,
    Registration,
)
from event.tests import (
    make_booking_option,
    make_event,
    make_participant,
    make_person,
    make_registration,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------


@pytest.fixture
def manager_user(db):
    return User.objects.create_user(
        username="manager",
        email="manager@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def manager_client(manager_user) -> Client:
    client = Client()
    client.force_login(manager_user)
    client._user = manager_user
    return client


@pytest.fixture
def regular_user(db):
    return User.objects.create_user(
        username="regular",
        email="regular@inspi.dev",
        password="testpass123",
    )


@pytest.fixture
def regular_client(regular_user) -> Client:
    client = Client()
    client.force_login(regular_user)
    client._user = regular_user
    return client


@pytest.fixture
def guest_client(db) -> Client:
    """Unauthenticated client for guest registration."""
    return Client()


@pytest.fixture
def event_with_manager(manager_user) -> Event:
    event = make_event()
    event.responsible_persons.add(manager_user)
    return event


@pytest.fixture
def event_with_guest_reg(manager_user) -> Event:
    """Event with guest registration enabled and in registration phase."""
    event = make_event(guest_registration_enabled=True)
    event.responsible_persons.add(manager_user)
    return event


# ===========================================================================
# 16.1 BookingOption is_bookable property
# ===========================================================================


@pytest.mark.django_db
class TestBookingOptionIsBookable:
    def test_no_time_window_always_bookable(self):
        option = make_booking_option()
        assert option.is_bookable is True

    def test_bookable_from_in_past(self):
        option = make_booking_option(
            bookable_from=timezone.now() - timedelta(days=1),
        )
        assert option.is_bookable is True

    def test_bookable_from_in_future(self):
        option = make_booking_option(
            bookable_from=timezone.now() + timedelta(days=1),
        )
        assert option.is_bookable is False

    def test_bookable_till_in_future(self):
        option = make_booking_option(
            bookable_till=timezone.now() + timedelta(days=1),
        )
        assert option.is_bookable is True

    def test_bookable_till_in_past(self):
        option = make_booking_option(
            bookable_till=timezone.now() - timedelta(days=1),
        )
        assert option.is_bookable is False

    def test_within_time_window(self):
        option = make_booking_option(
            bookable_from=timezone.now() - timedelta(days=1),
            bookable_till=timezone.now() + timedelta(days=1),
        )
        assert option.is_bookable is True

    def test_outside_time_window(self):
        option = make_booking_option(
            bookable_from=timezone.now() - timedelta(days=5),
            bookable_till=timezone.now() - timedelta(days=1),
        )
        assert option.is_bookable is False


# ===========================================================================
# 16.2 Guest registration endpoint
# ===========================================================================


@pytest.mark.django_db
class TestGuestRegistration:
    def _register_url(self, slug: str) -> str:
        return f"/api/events/{slug}/register-guest/"

    def test_happy_path(self, guest_client, event_with_guest_reg):
        event = event_with_guest_reg
        option = make_booking_option(event=event)
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Anna",
                            "last_name": "Schmidt",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "anna@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.json()
        assert data["participant_count"] == 1
        assert data["email"] == "anna@example.com"

    def test_guest_reg_disabled(self, guest_client, event_with_manager):
        """Should fail if guest_registration_enabled=False."""
        event = event_with_manager
        option = make_booking_option(event=event)
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Test",
                            "last_name": "User",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "test@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_wrong_event_phase(self, guest_client, manager_user):
        """Should fail if event is not in registration phase (e.g. completed)."""
        event = make_event(
            guest_registration_enabled=True,
            start_date=timezone.now() - timedelta(days=10),
            end_date=timezone.now() - timedelta(days=3),
        )
        event.responsible_persons.add(manager_user)
        option = make_booking_option(event=event)
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Test",
                            "last_name": "User",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "test@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_expired_booking_option(self, guest_client, event_with_guest_reg):
        """Should fail if booking option has expired."""
        event = event_with_guest_reg
        option = make_booking_option(
            event=event,
            bookable_till=timezone.now() - timedelta(days=1),
        )
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Test",
                            "last_name": "User",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "test@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_full_booking_option(self, guest_client, event_with_guest_reg):
        """Should fail if booking option is full."""
        event = event_with_guest_reg
        option = make_booking_option(event=event, max_participants=1)
        # Fill the option
        reg = make_registration(event=event)
        make_participant(registration=reg, booking_option=option)
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Test",
                            "last_name": "User",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "test@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_system_booking_option_rejected(self, guest_client, event_with_guest_reg):
        """Guest should not be able to select system booking option."""
        event = event_with_guest_reg
        # System option gets auto-created via signal; find it
        system_opt = event.booking_options.filter(is_system=True).first()
        if system_opt is None:
            system_opt = make_booking_option(event=event, is_system=True)
        resp = guest_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Test",
                            "last_name": "User",
                            "booking_option_id": system_opt.id,
                        }
                    ],
                    "email": "test@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ===========================================================================
# 16.3 Admin registration with inline person data
# ===========================================================================


@pytest.mark.django_db
class TestAdminRegistrationInlinePerson:
    def _register_url(self, slug: str) -> str:
        return f"/api/events/{slug}/register-admin/"

    def test_inline_person_creation(self, manager_client, event_with_manager):
        event = event_with_manager
        option = make_booking_option(event=event)
        resp = manager_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_data": {
                                "first_name": "Neue",
                                "last_name": "Person",
                                "email": "neue@example.com",
                            },
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        # Verify person was created
        assert Person.objects.filter(first_name="Neue", last_name="Person").exists()
        # Verify user was created for the email
        assert User.objects.filter(email="neue@example.com").exists()

    def test_inline_person_without_email(self, manager_client, event_with_manager):
        """Inline person without email uses the manager's user."""
        event = event_with_manager
        option = make_booking_option(event=event)
        resp = manager_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_data": {
                                "first_name": "Kein",
                                "last_name": "Email",
                            },
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200
        person = Person.objects.get(first_name="Kein", last_name="Email")
        assert person.user == manager_client._user

    def test_existing_person_mode(self, manager_client, event_with_manager):
        """Admin can register an existing person by person_id."""
        event = event_with_manager
        person = make_person(user=manager_client._user)
        option = make_booking_option(event=event)
        resp = manager_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_id": person.id,
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200


# ===========================================================================
# 16.4 Soft-delete registration
# ===========================================================================


@pytest.mark.django_db
class TestSoftDeleteRegistration:
    def _delete_url(self, slug: str, participant_id: int) -> str:
        return f"/api/events/{slug}/participants/{participant_id}/"

    def test_soft_delete_sets_deleted_at(self, manager_client, event_with_manager):
        event = event_with_manager
        reg = make_registration(user=manager_client._user, event=event)
        participant = make_participant(registration=reg)

        resp = manager_client.delete(
            self._delete_url(event.slug, participant.id),
            data=json.dumps({"reason": "error"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

        reg.refresh_from_db()
        assert reg.deleted_at is not None
        assert reg.deleted_reason == "error"

    def test_soft_deleted_hidden_from_default_manager(self, manager_client, event_with_manager):
        event = event_with_manager
        reg = make_registration(user=manager_client._user, event=event)
        participant = make_participant(registration=reg)

        manager_client.delete(
            self._delete_url(event.slug, participant.id),
            content_type="application/json",
        )

        # Default manager should hide it
        assert Registration.objects.filter(id=reg.id).count() == 0
        # objects_all should still find it
        assert Registration.objects_all.filter(id=reg.id).count() == 1

    def test_timeline_entry_created_on_delete(self, manager_client, event_with_manager):
        from event.models import TimelineEntry

        event = event_with_manager
        reg = make_registration(user=manager_client._user, event=event)
        participant = make_participant(registration=reg)

        manager_client.delete(
            self._delete_url(event.slug, participant.id),
            content_type="application/json",
        )

        assert TimelineEntry.objects.filter(
            event=event,
            action_type="unregistered",
        ).exists()

    def test_reactivation_on_re_register(self, manager_client, event_with_manager, regular_user):
        """Re-registering a soft-deleted user should reactivate the registration."""
        event = event_with_manager
        person = make_person(user=regular_user)
        option = make_booking_option(event=event)

        # Create registration, then soft-delete it
        reg = make_registration(user=regular_user, event=event)
        reg.deleted_at = timezone.now()
        reg.deleted_reason = "cancel"
        reg.save()

        # Admin re-registers the same user
        resp = manager_client.post(
            f"/api/events/{event.slug}/register-admin/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_id": person.id,
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

        reg.refresh_from_db()
        assert reg.deleted_at is None
        assert reg.deleted_reason == ""


# ===========================================================================
# 16.5 Booking option time window enforcement
# ===========================================================================


@pytest.mark.django_db
class TestBookingOptionTimeWindowEnforcement:
    def _register_url(self, slug: str) -> str:
        return f"/api/events/{slug}/register/"

    def test_self_registration_rejects_expired_option(self, regular_client, event_with_manager):
        event = event_with_manager
        person = make_person(user=regular_client._user)
        option = make_booking_option(
            event=event,
            bookable_till=timezone.now() - timedelta(hours=1),
        )

        resp = regular_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_id": person.id,
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 400

    def test_admin_bypasses_time_window(self, manager_client, event_with_manager):
        event = event_with_manager
        person = make_person(user=manager_client._user)
        option = make_booking_option(
            event=event,
            bookable_till=timezone.now() - timedelta(hours=1),
        )

        resp = manager_client.post(
            f"/api/events/{event.slug}/register-admin/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_id": person.id,
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_self_registration_accepts_bookable_option(self, regular_client, event_with_manager):
        event = event_with_manager
        person = make_person(user=regular_client._user)
        option = make_booking_option(
            event=event,
            bookable_from=timezone.now() - timedelta(days=1),
            bookable_till=timezone.now() + timedelta(days=1),
        )

        resp = regular_client.post(
            self._register_url(event.slug),
            data=json.dumps(
                {
                    "persons": [
                        {
                            "person_id": person.id,
                            "booking_option_id": option.id,
                        }
                    ],
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200


# ===========================================================================
# 16.6 Auto-account creation
# ===========================================================================


@pytest.mark.django_db
class TestAutoAccountCreation:
    def test_new_email_creates_user(self, guest_client, event_with_guest_reg):
        event = event_with_guest_reg
        option = make_booking_option(event=event)
        email = "newuser@example.com"
        assert not User.objects.filter(email=email).exists()

        resp = guest_client.post(
            f"/api/events/{event.slug}/register-guest/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Neu",
                            "last_name": "Benutzer",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": email,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        user = User.objects.get(email=email)
        assert not user.has_usable_password()

    def test_existing_real_account_not_hijacked(self, guest_client, event_with_guest_reg):
        """A guest registration must NOT attach to an existing password-protected
        account just because the email matches (account-hijack protection)."""
        event = event_with_guest_reg
        option = make_booking_option(event=event)
        email = "existing@example.com"
        existing_user = User.objects.create_user(
            username="existing",
            email=email,
            password="test123",
        )

        resp = guest_client.post(
            f"/api/events/{event.slug}/register-guest/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Existing",
                            "last_name": "User",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": email,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        # A separate guest account was created; the real account is untouched.
        reg = Registration.objects.get(event=event)
        assert reg.user != existing_user
        assert not reg.user.has_usable_password()
        # The real, password-protected account has no registration attached.
        assert not Registration.objects.filter(user=existing_user).exists()

    def test_existing_guest_account_is_reused(self, guest_client, event_with_guest_reg):
        """A prior guest account (no usable password) IS reused for the same email."""
        event = event_with_guest_reg
        option = make_booking_option(event=event)
        email = "guest-return@example.com"
        guest_user = User.objects.create_user(username=email, email=email, password=None)
        guest_user.set_unusable_password()
        guest_user.save()

        resp = guest_client.post(
            f"/api/events/{event.slug}/register-guest/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Returning",
                            "last_name": "Guest",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": email,
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert User.objects.filter(email=email).count() == 1
        reg = Registration.objects.get(event=event)
        assert reg.user == guest_user

    def test_case_insensitive_email_lookup(self, guest_client, event_with_guest_reg):
        """Existing guest account is matched case-insensitively (and reused)."""
        event = event_with_guest_reg
        option = make_booking_option(event=event)
        guest = User.objects.create_user(
            username="Upper@Example.com",
            email="Upper@Example.com",
            password=None,
        )
        guest.set_unusable_password()
        guest.save()

        resp = guest_client.post(
            f"/api/events/{event.slug}/register-guest/",
            data=json.dumps(
                {
                    "persons": [
                        {
                            "first_name": "Case",
                            "last_name": "Test",
                            "booking_option_id": option.id,
                        }
                    ],
                    "email": "upper@example.com",
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 201
        # Should NOT create a new user — the existing guest account is reused.
        assert User.objects.filter(email__iexact="upper@example.com").count() == 1
