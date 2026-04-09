"""Profile and preference API endpoints."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership, UserPreference, UserProfile
from profiles.schemas import (
    MyContentOut,
    PublicUserProfileOut,
    UserGroupOut,
    JoinRequestOut,
    UserPreferenceIn,
    UserPreferenceOut,
    UserProfileOut,
    UserProfileUpdateIn,
)

profile_router = Router(tags=["profile"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


@profile_router.get("/me/", response=UserProfileOut)
def get_my_profile(request):
    """Get the current user's profile."""
    _require_auth(request)
    profile, _ = UserProfile.objects.prefetch_related("nutritional_tags").get_or_create(user=request.user)
    return profile


@profile_router.patch("/me/", response=UserProfileOut)
def update_my_profile(request, payload: UserProfileUpdateIn):
    """Update the current user's profile."""
    _require_auth(request)
    profile, _ = UserProfile.objects.prefetch_related("nutritional_tags").get_or_create(user=request.user)
    data = payload.dict(exclude_unset=True)
    tag_ids = data.pop("nutritional_tag_ids", None)
    for field, value in data.items():
        setattr(profile, field, value)
    profile.save()
    if tag_ids is not None:
        profile.nutritional_tags.set(tag_ids)
    return profile


@profile_router.get("/me/preferences/", response=UserPreferenceOut)
def get_my_preferences(request):
    """Get the current user's preferences."""
    _require_auth(request)
    prefs, _ = UserPreference.objects.get_or_create(user=request.user)
    return prefs


@profile_router.patch("/me/preferences/", response=UserPreferenceOut)
def update_my_preferences(request, payload: UserPreferenceIn):
    """Update the current user's preferences."""
    _require_auth(request)
    prefs, _ = UserPreference.objects.get_or_create(user=request.user)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(prefs, field, value)
    prefs.save()
    return prefs


@profile_router.get("/me/ideas/", response=list[MyContentOut])
def get_my_ideas(request):
    """List all content authored by the current user (all statuses)."""
    _require_auth(request)

    from blog.models import Blog
    from game.models import Game
    from session.models import GroupSession

    results = []
    for Model, content_type in [
        (GroupSession, "session"),
        (Blog, "blog"),
        (Game, "game"),
    ]:
        qs = (
            Model.objects.filter(Q(authors=request.user) | Q(created_by=request.user))
            .distinct()
            .order_by("-updated_at")
        )
        for obj in qs:
            obj.content_type = content_type
        results.extend(qs)

    results.sort(key=lambda x: x.updated_at, reverse=True)
    return results


@profile_router.get("/{user_id}/", response=PublicUserProfileOut)
def get_user_profile(request, user_id: int):
    """Get another user's public profile with their published content."""
    profile = get_object_or_404(UserProfile, user_id=user_id)
    from content.choices import ContentStatus

    from blog.models import Blog
    from game.models import Game
    from session.models import GroupSession

    results = []
    for Model, content_type in [
        (GroupSession, "session"),
        (Blog, "blog"),
        (Game, "game"),
    ]:
        qs = (
            Model.objects.filter(
                status=ContentStatus.APPROVED,
            )
            .filter(Q(authors__id=user_id) | Q(created_by_id=user_id))
            .distinct()
            .order_by("-created_at")[:20]
        )
        for obj in qs:
            obj.content_type = content_type
        results.extend(qs)

    results.sort(key=lambda x: x.created_at, reverse=True)
    profile.contents = results[:20]
    return profile


@profile_router.get("/me/groups/", response=list[UserGroupOut])
def get_my_groups(request):
    """List groups the current user is a member of."""
    _require_auth(request)
    from profiles.models import UserGroup

    group_ids = GroupMembership.objects.filter(
        user=request.user,
        is_active=True,
    ).values_list("group_id", flat=True)
    return UserGroup.objects.filter(id__in=group_ids, is_deleted=False)


@profile_router.get("/me/requests/", response=list[JoinRequestOut])
def get_my_join_requests(request):
    """List the current user's pending join requests."""
    _require_auth(request)
    from profiles.models import GroupJoinRequest

    return GroupJoinRequest.objects.filter(
        user=request.user,
        approved__isnull=True,
    ).select_related("group")
