"""Django Ninja API routes for the collaborative planner."""

from django.db.models import Q
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from .models import Planner, PlannerCollaborator, PlannerEntry
from .schemas import (
    PlannerCreateIn,
    PlannerDetailOut,
    PlannerEntryIn,
    PlannerEntryOut,
    PlannerOut,
    InviteIn,
)

router = Router(tags=["planner"])


def _require_auth(request):
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")


def _check_planner_access(planner: Planner, user, require_editor: bool = False):
    """Check if user has access to the planner."""
    if planner.owner == user:
        return
    try:
        collab = PlannerCollaborator.objects.get(planner=planner, user=user)
        if require_editor and collab.role != "editor":
            raise HttpError(403, "Nur Editoren können Änderungen vornehmen")
    except PlannerCollaborator.DoesNotExist:
        raise HttpError(403, "Kein Zugriff auf diesen Planer")


@router.get("/", response=list[PlannerOut])
def list_planners(request):
    """List planners owned by or shared with the current user."""
    _require_auth(request)
    return Planner.objects.filter(
        Q(owner=request.user) | Q(collaborators__user=request.user)
    ).distinct()


@router.post("/", response=PlannerOut)
def create_planner(request, payload: PlannerCreateIn):
    """Create a new planner."""
    _require_auth(request)
    return Planner.objects.create(owner=request.user, title=payload.title)


@router.get("/{planner_id}/", response=PlannerDetailOut)
def get_planner(request, planner_id: int):
    """Get a planner with all entries and collaborators."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user)
    return planner


@router.post("/{planner_id}/entries/", response=PlannerEntryOut)
def add_entry(request, planner_id: int, payload: PlannerEntryIn):
    """Add an entry to a planner."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    return PlannerEntry.objects.create(
        planner=planner,
        idea_id=payload.idea_id,
        date=payload.date,
        notes=payload.notes,
        sort_order=payload.sort_order,
    )


@router.delete("/{planner_id}/entries/{entry_id}/")
def remove_entry(request, planner_id: int, entry_id: int):
    """Remove an entry from a planner."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)
    _check_planner_access(planner, request.user, require_editor=True)

    entry = get_object_or_404(PlannerEntry, id=entry_id, planner=planner)
    entry.delete()
    return {"success": True}


@router.post("/{planner_id}/invite/")
def invite_collaborator(request, planner_id: int, payload: InviteIn):
    """Invite a user as collaborator."""
    _require_auth(request)
    planner = get_object_or_404(Planner, id=planner_id)

    if planner.owner != request.user:
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
