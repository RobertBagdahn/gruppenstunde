"""Authorization tests for event save endpoints (locations, meeting points, waitlist)."""

import json

import pytest

from event.models import EventLocation, MeetingPoint
from event.tests import make_booking_option, make_event, make_event_location, make_person
from profiles.choices import MembershipRoleChoices
from profiles.models import GroupMembership, UserGroup


@pytest.mark.django_db
class TestEventLocationAuthorization:
    def test_unrelated_user_cannot_update_location(self, auth_client, django_user_model):
        other = django_user_model.objects.create_user(username="other", password="x")
        loc = make_event_location(created_by=other)
        resp = auth_client.patch(
            f"/api/locations/{loc.id}/",
            data=json.dumps({"name": "Hijacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403
        loc.refresh_from_db()
        assert loc.name != "Hijacked"

    def test_unrelated_user_cannot_delete_location(self, auth_client, django_user_model):
        other = django_user_model.objects.create_user(username="other", password="x")
        loc = make_event_location(created_by=other)
        resp = auth_client.delete(f"/api/locations/{loc.id}/")
        assert resp.status_code == 403
        assert EventLocation.objects.filter(id=loc.id).exists()

    def test_creator_can_update_location(self, auth_client):
        loc = make_event_location(created_by=auth_client._user)
        resp = auth_client.patch(
            f"/api/locations/{loc.id}/",
            data=json.dumps({"name": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_staff_can_update_location(self, admin_client, django_user_model):
        other = django_user_model.objects.create_user(username="other", password="x")
        loc = make_event_location(created_by=other)
        resp = admin_client.patch(
            f"/api/locations/{loc.id}/",
            data=json.dumps({"name": "Staff"}),
            content_type="application/json",
        )
        assert resp.status_code == 200


@pytest.mark.django_db
class TestMeetingPointAuthorization:
    def _make_meeting_point(self, created_by, group=None):
        return MeetingPoint.objects.create(
            name="Parkplatz",
            city="Waldstadt",
            created_by=created_by,
            group=group,
        )

    def test_group_member_cannot_update_anothers_meeting_point(self, auth_client, django_user_model):
        creator = django_user_model.objects.create_user(username="creator", password="x")
        group = UserGroup.objects.create(name="Gruppe")
        for user in (creator, auth_client._user):
            GroupMembership.objects.create(user=user, group=group, role=MembershipRoleChoices.MEMBER, is_active=True)
        mp = self._make_meeting_point(created_by=creator, group=group)

        resp = auth_client.patch(
            f"/api/meeting-points/{mp.id}/",
            data=json.dumps({"name": "Hijacked"}),
            content_type="application/json",
        )
        assert resp.status_code == 403
        mp.refresh_from_db()
        assert mp.name != "Hijacked"

    def test_creator_can_update_meeting_point(self, auth_client):
        mp = self._make_meeting_point(created_by=auth_client._user)
        resp = auth_client.patch(
            f"/api/meeting-points/{mp.id}/",
            data=json.dumps({"name": "Updated"}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_group_admin_can_update_meeting_point(self, auth_client, django_user_model):
        creator = django_user_model.objects.create_user(username="creator", password="x")
        group = UserGroup.objects.create(name="Gruppe")
        GroupMembership.objects.create(
            user=auth_client._user, group=group, role=MembershipRoleChoices.ADMIN, is_active=True
        )
        mp = self._make_meeting_point(created_by=creator, group=group)

        resp = auth_client.patch(
            f"/api/meeting-points/{mp.id}/",
            data=json.dumps({"name": "AdminUpdate"}),
            content_type="application/json",
        )
        assert resp.status_code == 200


@pytest.mark.django_db
class TestWaitlistAuthorization:
    def test_uninvited_user_cannot_join_waitlist(self, auth_client, django_user_model):
        owner = django_user_model.objects.create_user(username="owner", password="x")
        event = make_event(is_public=False, created_by=owner)
        option = make_booking_option(event=event)
        resp = auth_client.post(
            f"/api/events/{event.slug}/waitlist/",
            data=json.dumps({"booking_option_id": option.id}),
            content_type="application/json",
        )
        assert resp.status_code == 403

    def test_cannot_use_foreign_person(self, auth_client, django_user_model):
        event = make_event(is_public=True)
        option = make_booking_option(event=event)
        other = django_user_model.objects.create_user(username="other", password="x")
        foreign_person = make_person(user=other)
        resp = auth_client.post(
            f"/api/events/{event.slug}/waitlist/",
            data=json.dumps({"booking_option_id": option.id, "person_id": foreign_person.id}),
            content_type="application/json",
        )
        assert resp.status_code == 403
