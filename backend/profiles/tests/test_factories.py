"""Tests to validate that all profiles app factories produce valid model instances."""

import pytest

from profiles.tests import (
    make_group_join_request,
    make_group_membership,
    make_user_group,
    make_user_preference,
    make_user_profile,
)


@pytest.mark.django_db
class TestProfilesFactories:
    def test_make_user_profile(self):
        profile = make_user_profile()
        assert profile.pk is not None
        assert profile.user is not None
        assert profile.scout_name == "Adler"
        assert profile.full_name == "Max Mustermann"

    def test_make_user_preference(self):
        pref = make_user_preference()
        assert pref.pk is not None
        assert pref.user is not None
        assert pref.preferred_difficulty == "easy"

    def test_make_user_group(self):
        group = make_user_group()
        assert group.pk is not None
        assert group.slug
        assert group.is_visible is True

    def test_make_user_group_with_parent(self):
        parent = make_user_group(name="Diözese Mainz")
        child = make_user_group(name="Bezirk Rheinhessen", parent=parent)
        assert child.parent == parent
        ancestors = child.get_ancestors()
        assert parent in ancestors

    def test_make_group_membership(self):
        membership = make_group_membership()
        assert membership.pk is not None
        assert membership.user is not None
        assert membership.group is not None
        assert membership.role == "member"
        assert membership.is_active is True

    def test_make_group_membership_admin(self):
        membership = make_group_membership(role="admin")
        assert membership.role == "admin"

    def test_make_group_join_request(self):
        request = make_group_join_request()
        assert request.pk is not None
        assert request.user is not None
        assert request.group is not None
        assert request.approved is None  # pending
