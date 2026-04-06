"""Factories for creating test data (profiles app)."""

from model_bakery import baker

from profiles.choices import GenderChoices, MembershipRoleChoices
from profiles.models import (
    GroupJoinRequest,
    GroupMembership,
    UserGroup,
    UserPreference,
    UserProfile,
)


# ---------------------------------------------------------------------------
# UserProfile
# ---------------------------------------------------------------------------


def make_user_profile(user=None, **kwargs) -> UserProfile:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    defaults = {
        "scout_name": "Adler",
        "first_name": "Max",
        "last_name": "Mustermann",
        "gender": GenderChoices.MALE,
        "about_me": "Pfadfinder seit 2010",
        "is_public": True,
    }
    defaults.update(kwargs)
    return baker.make(UserProfile, user=user, **defaults)


# ---------------------------------------------------------------------------
# UserPreference
# ---------------------------------------------------------------------------


def make_user_preference(user=None, **kwargs) -> UserPreference:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    defaults = {
        "preferred_difficulty": "easy",
        "preferred_location": "outdoor",
    }
    defaults.update(kwargs)
    return baker.make(UserPreference, user=user, **defaults)


# ---------------------------------------------------------------------------
# UserGroup
# ---------------------------------------------------------------------------


def make_user_group(**kwargs) -> UserGroup:
    defaults = {
        "name": "Stamm Waldläufer",
        "description": "Ein toller Pfadfinderstamm",
        "is_visible": True,
        "free_to_join": False,
    }
    defaults.update(kwargs)
    return baker.make(UserGroup, **defaults)


# ---------------------------------------------------------------------------
# GroupMembership
# ---------------------------------------------------------------------------


def make_group_membership(
    user=None,
    group: UserGroup | None = None,
    **kwargs,
) -> GroupMembership:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    if group is None:
        group = make_user_group()
    defaults = {
        "role": MembershipRoleChoices.MEMBER,
        "is_active": True,
    }
    defaults.update(kwargs)
    return baker.make(GroupMembership, user=user, group=group, **defaults)


# ---------------------------------------------------------------------------
# GroupJoinRequest
# ---------------------------------------------------------------------------


def make_group_join_request(
    user=None,
    group: UserGroup | None = None,
    **kwargs,
) -> GroupJoinRequest:
    if user is None:
        from django.contrib.auth import get_user_model

        User = get_user_model()
        user = baker.make(User)
    if group is None:
        group = make_user_group()
    defaults = {
        "message": "Ich möchte gerne eurem Stamm beitreten!",
        "approved": None,
    }
    defaults.update(kwargs)
    return baker.make(GroupJoinRequest, user=user, group=group, **defaults)
