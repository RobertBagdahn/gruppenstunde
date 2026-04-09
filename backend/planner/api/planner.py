"""Django Ninja API routes for the collaborative session planner."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from profiles.models import GroupMembership
from profiles.choices import MembershipRoleChoices

from planner.models import Planner, PlannerCollaborator, PlannerEntry
from planner.schemas import (
    CollaboratorOut,
    InviteIn,
    PlannerCreateIn,
    PlannerDetailOut,
    PlannerEntryIn,
    PlannerEntryOut,
    PlannerEntryUpdateIn,
    PlannerOut,
    PlannerUpdateIn,
)

router = Router(tags=["planner"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _can_edit_planner(planner: Planner, user) -> bool:
    """Check if user can edit this planner (owner, group admin, or editor collaborator)."""
    if planner.owner == user:
        return True
    if user.is_staff:
        return True
    # Group admin check
    if planner.group_id:
        if GroupMembership.objects.filter(
            user=user,
            group=planner.group,
            role=MembershipRoleChoices.ADMIN,
            is_active=True,
        ).exists():
            return True
    # Collaborator editor check
    return PlannerCollaborator.objects.filter(planner=planner, user=user, role="editor").exists()


def _can_view_planner(planner: Planner, user) -> bool:
    """Check if user can view this planner."""
    if _can_edit_planner(planner, user):
        return True
    # Group member check
    if planner.group_id:
        if GroupMembership.objects.filter(
            user=user,
            group=planner.group,
            is_active=True,
        ).exists():
            return True
    # Collaborator viewer check
    return PlannerCollaborator.objects.filter(planner=planner, user=user).exists()


def _check_planner_access(planner: Planner, user, require_editor: bool = False):
    """Check if user has access to the planner, raise 403 if not."""
    if require_editor:
        if not _can_edit_planner(planner, user):
            raise HttpError(403, "Keine Berechtigung zum Bearbeiten dieses Planers")
    else:
        if not _can_view_planner(planner, user):
            raise HttpError(403, "Kein Zugriff auf diesen Planer")


# ==========================================================================
# Planner CRUD
# ==========================================================================


@router.get("/", response=list[PlannerOut])
def list_planners(request):
    """List planners the user has access to (owned, group member, collaborator)."""
    _require_auth(request)

    # Groups where user is a member
    member_group_ids = GroupMembership.objects.filter(
        user=request.user,
        is_active=True,
    ).values_list("group_id", flat=True)

    qs = Planner.objects.select_related("group")

    if request.user.is_staff:
        return qs.all()

    return qs.filter(
        Q(owner=request.user) | Q(group_id__in=member_group_ids) | Q(collaborators__user=request.user)
    ).distinct()


@router.post("/", response=PlannerOut)
def create_planner(request, payload: PlannerCreateIn):
    """Create a new planner."""
    _require_auth(request)

    data = payload.dict(exclude={"group_id"})
    planner = Planner.objects.create(owner=request.user, **data)

    if payload.group_id is not None:
        from profiles.models import UserGroup

        group = get_object_or_404(UserGroup, id=payload.group_id, is_deleted=False)
        planner.group = group
        planner.save()

    return planner


@router.get("/{planner_id}/", response=PlannerDetailOut)
def get_planner(request, planner_id: int):
    """Get a planner with all entries and collaborators."""
    _require_auth(request)
    planner = get_object_or_404(
        Planner.objects.select_related("group").prefetch_related("entries__session", "collaborators__user"),
        id=planner_id,
    )
    _check_planner_access(planner, request.user)
    planner.can_edit = _can_edit_planner(planner, request.user)
    return planner


@router.patch("/{planner_id}/", response=PlannerOut)
def update_planner(request, planner_id: int, payload: PlannerUpdateIn):
    """Update a planner (owner/group-admin/editor only)."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    data = payload.dict(exclude_unset=True)

    if "group_id" in data:
        group_id = data.pop("group_id")
        if group_id is not None:
            from profiles.models import UserGroup

            planner.group = get_object_or_404(UserGroup, id=group_id, is_deleted=False)
        else:
            planner.group = None

    for field, value in data.items():
        setattr(planner, field, value)
    planner.save()

    return planner


@router.delete("/{planner_id}/")
def delete_planner(request, planner_id: int):
    """Delete a planner and all its entries."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)

    if planner.owner != request.user and not request.user.is_staff:
        raise HttpError(403, "Nur der Ersteller kann den Planer löschen")

    planner.delete()
    return {"success": True, "message": "Planer gelöscht"}


# ==========================================================================
# Entry CRUD
# ==========================================================================


@router.post("/{planner_id}/entries/", response=PlannerEntryOut)
def add_entry(request, planner_id: int, payload: PlannerEntryIn):
    """Add an entry to a planner."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    return PlannerEntry.objects.create(
        planner=planner,
        session_id=payload.session_id,
        date=payload.date,
        notes=payload.notes,
        status=payload.status,
        sort_order=payload.sort_order,
    )


@router.patch("/{planner_id}/entries/{entry_id}/", response=PlannerEntryOut)
def update_entry(request, planner_id: int, entry_id: int, payload: PlannerEntryUpdateIn):
    """Update an entry (session, notes, status, date)."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    entry = get_object_or_404(PlannerEntry, id=entry_id, planner=planner)

    for field, value in payload.dict(exclude_unset=True).items():
        setattr(entry, field, value)
    entry.save()
    return entry


@router.delete("/{planner_id}/entries/{entry_id}/")
def remove_entry(request, planner_id: int, entry_id: int):
    """Remove an entry from a planner."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    entry = get_object_or_404(PlannerEntry, id=entry_id, planner=planner)
    entry.delete()
    return {"success": True}


# ==========================================================================
# Collaborator Management
# ==========================================================================


@router.post("/{planner_id}/invite/")
def invite_collaborator(request, planner_id: int, payload: InviteIn):
    """Invite a user as collaborator."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)

    if planner.owner != request.user and not request.user.is_staff:
        raise HttpError(403, "Nur der Besitzer kann Einladungen senden")

    from django.contrib.auth import get_user_model

    User = get_user_model()
    user = get_object_or_404(User, id=payload.user_id)

    PlannerCollaborator.objects.update_or_create(
        planner=planner,
        user=user,
        defaults={"role": payload.role},
    )
    return {"success": True, "message": f"{user.get_username()} eingeladen als {payload.role}"}
