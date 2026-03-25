"""Django Ninja API routes for profile, preferences, and groups."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from django.utils import timezone
from ninja import Router
from ninja.errors import HttpError

from .choices import MembershipRoleChoices
from .models import GroupJoinRequest, GroupMembership, UserGroup, UserPreference, UserProfile
from .schemas import (
    AddMemberIn,
    GroupMemberOut,
    JoinByCodeIn,
    JoinRequestDecisionIn,
    JoinRequestIn,
    JoinRequestOut,
    MyIdeaOut,
    PublicUserProfileOut,
    UpdateMemberIn,
    UserGroupChildOut,
    UserGroupCreateIn,
    UserGroupDetailOut,
    UserGroupOut,
    UserGroupUpdateIn,
    UserPreferenceIn,
    UserPreferenceOut,
    UserProfileOut,
    UserProfileUpdateIn,
)

profile_router = Router(tags=["profile"])
group_router = Router(tags=["groups"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _require_group_admin(group: UserGroup, user):
    """Check that the user is an admin of the group."""
    is_admin = GroupMembership.objects.filter(
        group=group,
        user=user,
        role=MembershipRoleChoices.ADMIN,
        is_active=True,
    ).exists()
    if not is_admin and not user.is_staff:
        raise HttpError(403, "Nur Admins können diese Aktion ausführen")


# ==========================================================================
# Profile
# ==========================================================================


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


@profile_router.get("/me/ideas/", response=list[MyIdeaOut])
def get_my_ideas(request):
    """List all ideas authored by the current user (all statuses)."""
    _require_auth(request)
    from idea.models import Idea

    return (
        Idea.objects.filter(
            Q(authors=request.user) | Q(created_by=request.user)
        )
        .distinct()
        .order_by("-updated_at")
    )


@profile_router.get("/{user_id}/", response=PublicUserProfileOut)
def get_user_profile(request, user_id: int):
    """Get another user's public profile with their published ideas."""
    profile = get_object_or_404(UserProfile, user_id=user_id)
    from idea.models import Idea
    from idea.choices import StatusChoices

    profile.ideas = (
        Idea.objects.filter(
            status=StatusChoices.PUBLISHED,
        )
        .filter(
            Q(authors__id=user_id) | Q(created_by_id=user_id)
        )
        .distinct()
        .order_by("-created_at")[:20]
    )
    return profile


@profile_router.get("/me/groups/", response=list[UserGroupOut])
def get_my_groups(request):
    """List groups the current user is a member of."""
    _require_auth(request)
    group_ids = GroupMembership.objects.filter(
        user=request.user,
        is_active=True,
    ).values_list("group_id", flat=True)
    return UserGroup.objects.filter(id__in=group_ids, is_deleted=False)


@profile_router.get("/me/requests/", response=list[JoinRequestOut])
def get_my_join_requests(request):
    """List the current user's pending join requests."""
    _require_auth(request)
    return GroupJoinRequest.objects.filter(
        user=request.user,
        approved__isnull=True,
    ).select_related("group")


# ==========================================================================
# Groups
# ==========================================================================


@group_router.get("/", response=list[UserGroupOut])
def list_groups(request, q: str = ""):
    """List all visible groups, optionally filtered by search query."""
    qs = UserGroup.objects.filter(is_deleted=False, is_visible=True)
    if q:
        qs = qs.filter(Q(name__icontains=q) | Q(description__icontains=q))
    return qs


@group_router.post("/", response=UserGroupOut)
def create_group(request, payload: UserGroupCreateIn):
    """Create a new group. The creator becomes admin."""
    _require_auth(request)
    group = UserGroup.objects.create(
        name=payload.name,
        description=payload.description,
        is_visible=payload.is_visible,
        free_to_join=payload.free_to_join,
        join_code=payload.join_code,
        parent_id=payload.parent_id,
        created_by=request.user,
    )
    # Creator becomes admin
    GroupMembership.objects.create(
        user=request.user,
        group=group,
        role=MembershipRoleChoices.ADMIN,
    )
    return group


@group_router.get("/{group_slug}/", response=UserGroupDetailOut)
def get_group(request, group_slug: str):
    """Get group details by slug."""
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    return group


@group_router.patch("/{group_slug}/", response=UserGroupDetailOut)
def update_group(request, group_slug: str, payload: UserGroupUpdateIn):
    """Update group settings (admin only)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(group, field, value)
    group.save()
    return group


@group_router.delete("/{group_slug}/")
def delete_group(request, group_slug: str):
    """Soft-delete a group (admin only)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    group.is_deleted = True
    group.date_deleted = timezone.now()
    group.save(update_fields=["is_deleted", "date_deleted"])
    return {"success": True, "message": "Gruppe gelöscht"}


# --- Members ---


@group_router.get("/{group_slug}/members/", response=list[GroupMemberOut])
def list_members(request, group_slug: str):
    """List members of a group."""
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    return group.memberships.filter(is_active=True).select_related("user")


@group_router.post("/{group_slug}/members/", response=GroupMemberOut)
def add_member(request, group_slug: str, payload: AddMemberIn):
    """Add a member to a group (admin only)."""
    from django.contrib.auth import get_user_model

    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    User = get_user_model()
    target_user = get_object_or_404(User, id=payload.user_id)

    membership, created = GroupMembership.objects.get_or_create(
        user=target_user,
        group=group,
        defaults={"role": payload.role},
    )
    if not created:
        membership.is_active = True
        membership.role = payload.role
        membership.save(update_fields=["is_active", "role"])
    return membership


@group_router.patch("/{group_slug}/members/{membership_id}/", response=GroupMemberOut)
def update_member(request, group_slug: str, membership_id: int, payload: UpdateMemberIn):
    """Update a membership (admin only)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    membership = get_object_or_404(GroupMembership, id=membership_id, group=group)
    for field, value in payload.dict(exclude_unset=True).items():
        setattr(membership, field, value)
    membership.save()
    return membership


@group_router.delete("/{group_slug}/members/{membership_id}/")
def remove_member(request, group_slug: str, membership_id: int):
    """Remove a member from a group (admin or self)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    membership = get_object_or_404(GroupMembership, id=membership_id, group=group)

    # Allow self-removal or admin removal
    if membership.user != request.user:
        _require_group_admin(group, request.user)

    membership.is_active = False
    membership.save(update_fields=["is_active"])
    return {"success": True, "message": "Mitglied entfernt"}


# --- Join Requests ---


@group_router.post("/{group_slug}/join/", response={200: GroupMemberOut, 201: JoinRequestOut})
def join_group(request, group_slug: str, payload: JoinRequestIn = None):
    """Join a group (directly if free_to_join, otherwise create a request)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)

    # Check if already a member
    if GroupMembership.objects.filter(user=request.user, group=group, is_active=True).exists():
        raise HttpError(400, "Du bist bereits Mitglied dieser Gruppe")

    if group.free_to_join:
        membership, created = GroupMembership.objects.get_or_create(
            user=request.user,
            group=group,
            defaults={"role": MembershipRoleChoices.MEMBER},
        )
        if not created:
            membership.is_active = True
            membership.save(update_fields=["is_active"])
        return 200, membership

    # Create join request
    if GroupJoinRequest.objects.filter(user=request.user, group=group, approved__isnull=True).exists():
        raise HttpError(400, "Du hast bereits eine ausstehende Anfrage")

    message = payload.message if payload else ""
    join_request = GroupJoinRequest.objects.create(
        user=request.user,
        group=group,
        message=message,
    )
    return 201, join_request


@group_router.post("/{group_slug}/join-by-code/", response=GroupMemberOut)
def join_by_code(request, group_slug: str, payload: JoinByCodeIn):
    """Join a group using a join code."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)

    if not group.join_code or group.join_code != payload.join_code:
        raise HttpError(400, "Ungültiger Beitrittscode")

    if GroupMembership.objects.filter(user=request.user, group=group, is_active=True).exists():
        raise HttpError(400, "Du bist bereits Mitglied dieser Gruppe")

    membership, created = GroupMembership.objects.get_or_create(
        user=request.user,
        group=group,
        defaults={"role": MembershipRoleChoices.MEMBER},
    )
    if not created:
        membership.is_active = True
        membership.save(update_fields=["is_active"])
    return membership


@group_router.get("/{group_slug}/requests/", response=list[JoinRequestOut])
def list_join_requests(request, group_slug: str):
    """List pending join requests for a group (admin only)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    return GroupJoinRequest.objects.filter(
        group=group,
        approved__isnull=True,
    ).select_related("user", "group")


@group_router.post("/{group_slug}/requests/{request_id}/", response=JoinRequestOut)
def decide_join_request(request, group_slug: str, request_id: int, payload: JoinRequestDecisionIn):
    """Approve or reject a join request (admin only)."""
    _require_auth(request)
    group = get_object_or_404(UserGroup, slug=group_slug, is_deleted=False)
    _require_group_admin(group, request.user)

    join_request = get_object_or_404(
        GroupJoinRequest,
        id=request_id,
        group=group,
        approved__isnull=True,
    )
    join_request.approved = payload.approved
    join_request.date_checked = timezone.now()
    join_request.checked_by = request.user
    join_request.save(update_fields=["approved", "date_checked", "checked_by"])

    # Auto-create membership on approval
    if payload.approved:
        GroupMembership.objects.get_or_create(
            user=join_request.user,
            group=group,
            defaults={"role": MembershipRoleChoices.MEMBER},
        )

    return join_request
