"""Tests for get_event_ci() helper function."""

import pytest

from event.services.ci_helper import DEFAULT_CI, get_event_ci
from event.tests import make_event
from profiles.tests import make_corporate_identity, make_user_group


@pytest.mark.django_db
class TestGetEventCi:
    def test_event_without_groups_returns_default(self):
        event = make_event()
        ci = get_event_ci(event)
        assert ci == DEFAULT_CI
        assert ci.group_name == "gruppenstunde.de"

    def test_event_with_group_without_ci(self):
        event = make_event()
        group = make_user_group(name="Ohne CI")
        event.invited_groups.add(group)
        ci = get_event_ci(event)
        assert ci.group_name == "Ohne CI"
        assert ci.primary_color == DEFAULT_CI.primary_color
        assert ci.logo_url == ""

    def test_event_with_group_with_ci(self):
        event = make_event()
        group = make_user_group(name="Mit CI")
        make_corporate_identity(group=group, primary_color="#FF0000", slogan="Testslogan")
        event.invited_groups.add(group)
        ci = get_event_ci(event)
        assert ci.group_name == "Mit CI"
        assert ci.primary_color == "#FF0000"
        assert ci.slogan == "Testslogan"

    def test_event_with_multiple_groups_picks_first_with_ci(self):
        event = make_event()
        group_a = make_user_group(name="AAA-Gruppe")
        group_z = make_user_group(name="ZZZ-Gruppe")
        make_corporate_identity(group=group_z, primary_color="#0000FF")
        event.invited_groups.add(group_a, group_z)
        ci = get_event_ci(event)
        # group_z has CI, group_a does not
        assert ci.group_name == "ZZZ-Gruppe"
        assert ci.primary_color == "#0000FF"

    def test_event_deleted_group_ignored(self):
        event = make_event()
        group = make_user_group(name="Gelöscht", is_deleted=True)
        make_corporate_identity(group=group)
        event.invited_groups.add(group)
        ci = get_event_ci(event)
        assert ci == DEFAULT_CI
