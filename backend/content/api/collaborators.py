"""ContentCollaborator CRUD API endpoints."""

from django.contrib.contenttypes.models import ContentType
from django.shortcuts import get_object_or_404
from ninja import Router
from ninja.errors import HttpError

from content.api.helpers import (
    _is_staff_or_admin,
    _require_auth,
)
from content.models import ContentCollaborator, ContentCollaboratorRole
from content.schemas.collaborator import (
    ContentCollaboratorIn,
    ContentCollaboratorOut,
    ContentCollaboratorUpdateIn,
)

router = Router(tags=["content-collaborators"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _can_manage_shares(obj, user) -> bool:
    """Check if user can manage shares for a content object."""
    if not user.is_authenticated:
        return False
    try:
        if user.profile.role in ("staff", "admin"):
            return True
    except AttributeError:
        pass
    if getattr(obj, "created_by_id", None) == user.id:
        return True
    # Check if user has admin role via ContentCollaborator
    ct = ContentType.objects.get_for_model(obj)
    return ContentCollaborator.objects.filter(
        content_type=ct,
        object_id=obj.id,
        user=user,
        role=ContentCollaboratorRole.ADMIN,
    ).exists()


def _resolve_content_object(content_type_app: str, content_type_model: str, object_id: int):
    """Resolve a content object from app label, model name, and ID."""
    ct = get_object_or_404(ContentType, app_label=content_type_app, model=content_type_model)
    return ct.get_object_for_this_type(id=object_id)


# ---------------------------------------------------------------------------
# CRUD Endpoints
# ---------------------------------------------------------------------------


@router.get("/", response=list[ContentCollaboratorOut])
def list_collaborators(request, content_type_app: str, content_type_model: str, object_id: int):
    """List collaborators for a content object."""
    _require_auth(request)

    ct = get_object_or_404(ContentType, app_label=content_type_app, model=content_type_model)
    obj = get_object_or_404(ct.model_class(), id=object_id)

    # User must have at least viewer access
    has_access = _is_staff_or_admin(request) or getattr(obj, "created_by_id", None) == request.user.id
    if not has_access:
        has_access = ContentCollaborator.objects.filter(
            content_type=ct,
            object_id=object_id,
            user=request.user,
        ).exists()
    if not has_access:
        raise HttpError(403, "Keine Berechtigung")

    collabs = ContentCollaborator.objects.filter(
        content_type=ct,
        object_id=object_id,
    ).select_related("user__profile", "group")

    result = []
    for c in collabs:
        user_display = None
        group_name = None
        if c.user:
            profile = getattr(c.user, "profile", None)
            user_display = profile.scout_display_name if profile else c.user.email
        if c.group:
            group_name = c.group.name
        result.append(
            ContentCollaboratorOut(
                id=c.id,
                user_id=c.user_id,
                user_display_name=user_display,
                group_id=c.group_id,
                group_name=group_name,
                role=c.role,
                created_by_id=c.created_by_id,
                created_at=c.created_at.isoformat(),
            )
        )
    return result


@router.post("/", response=ContentCollaboratorOut)
def add_collaborator(request, payload: ContentCollaboratorIn):
    """Add a collaborator to a content object."""
    _require_auth(request)

    ct = get_object_or_404(ContentType, app_label=payload.content_type_app, model=payload.content_type_model)
    obj = get_object_or_404(ct.model_class(), id=payload.object_id)

    if not _can_manage_shares(obj, request.user):
        raise HttpError(403, "Keine Berechtigung zum Verwalten von Freigaben")

    if not payload.user_id and not payload.group_id:
        raise HttpError(400, "user_id oder group_id muss angegeben werden")

    if payload.role not in ("viewer", "editor", "admin"):
        raise HttpError(400, "Ungültige Rolle")

    collab = ContentCollaborator.objects.create(
        content_type=ct,
        object_id=payload.object_id,
        user_id=payload.user_id,
        group_id=payload.group_id,
        role=payload.role,
        created_by=request.user,
    )

    return ContentCollaboratorOut(
        id=collab.id,
        user_id=collab.user_id,
        group_id=collab.group_id,
        role=collab.role,
        created_by_id=collab.created_by_id,
        created_at=collab.created_at.isoformat(),
    )


@router.patch("/{collab_id}/", response=ContentCollaboratorOut)
def update_collaborator(request, collab_id: int, payload: ContentCollaboratorUpdateIn):
    """Update a collaborator's role."""
    _require_auth(request)

    collab = get_object_or_404(ContentCollaborator, id=collab_id)

    if not _can_manage_shares(collab.content_object, request.user):
        raise HttpError(403, "Keine Berechtigung zum Verwalten von Freigaben")

    if payload.role not in ("viewer", "editor", "admin"):
        raise HttpError(400, "Ungültige Rolle")

    collab.role = payload.role
    collab.save(update_fields=["role"])

    return ContentCollaboratorOut(
        id=collab.id,
        user_id=collab.user_id,
        group_id=collab.group_id,
        role=collab.role,
        created_by_id=collab.created_by_id,
        created_at=collab.created_at.isoformat(),
    )


@router.delete("/{collab_id}/", response={204: None})
def remove_collaborator(request, collab_id: int):
    """Remove a collaborator."""
    _require_auth(request)

    collab = get_object_or_404(ContentCollaborator, id=collab_id)

    if not _can_manage_shares(collab.content_object, request.user):
        raise HttpError(403, "Keine Berechtigung zum Verwalten von Freigaben")

    collab.delete()
    return 204, None
