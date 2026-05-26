"""Tests for Event.user_is_personally_invited() method."""

import pytest
from django.contrib.auth import get_user_model
from model_bakery import baker

from event.tests import make_event
from profiles.models import GroupMembership, UserGroup

User = get_user_model()


@pytest.mark.django_db
class TestUserIsPersonallyInvited:
    def test_direct_invite_returns_true(self):
        user = baker.make(User)
        event = make_event(is_public=False)
        event.invited_users.add(user)
        assert event.user_is_personally_invited(user) is True

    def test_group_invite_returns_true(self):
        user = baker.make(User)
        group = baker.make(UserGroup)
        GroupMembership.objects.create(user=user, group=group, is_active=True)
        event = make_event(is_public=False)
        event.invited_groups.add(group)
        assert event.user_is_personally_invited(user) is True

    def test_inactive_group_membership_returns_false(self):
        user = baker.make(User)
        group = baker.make(UserGroup)
        GroupMembership.objects.create(user=user, group=group, is_active=False)
        event = make_event(is_public=False)
        event.invited_groups.add(group)
        assert event.user_is_personally_invited(user) is False

    def test_manager_only_returns_false(self):
        """Responsible person without explicit invitation is NOT personally invited."""
        user = baker.make(User)
        event = make_event(is_public=False)
        event.responsible_persons.add(user)
        assert event.user_is_personally_invited(user) is False

    def test_creator_only_returns_false(self):
        user = baker.make(User)
        event = make_event(is_public=False, created_by=user)
        assert event.user_is_personally_invited(user) is False

    def test_public_event_without_invite_returns_false(self):
        """Public visibility alone does NOT imply personal invitation."""
        user = baker.make(User)
        event = make_event(is_public=True)
        assert event.user_is_personally_invited(user) is False

    def test_staff_without_invite_returns_false(self):
        user = baker.make(User, is_staff=True)
        event = make_event(is_public=False)
        assert event.user_is_personally_invited(user) is False

    def test_anonymous_user_returns_false(self):
        from django.contrib.auth.models import AnonymousUser

        event = make_event()
        assert event.user_is_personally_invited(AnonymousUser()) is False

    def test_none_user_returns_false(self):
        event = make_event()
        assert event.user_is_personally_invited(None) is False

    def test_overlap_manager_and_invited_returns_true(self):
        """User is both responsible AND personally invited → counts as invited."""
        user = baker.make(User)
        event = make_event(is_public=False)
        event.responsible_persons.add(user)
        event.invited_users.add(user)
        assert event.user_is_personally_invited(user) is True
