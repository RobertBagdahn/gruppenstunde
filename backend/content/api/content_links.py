"""
Content API — Content link endpoints.
"""

from django.contrib.contenttypes.models import ContentType
from ninja import Router
from ninja.errors import HttpError

from content.models import ContentLink
from content.schemas.base import ContentLinkCreateIn
from content.schemas.content_links import ContentLinkDetailOut

router = Router(tags=["content"])


def _resolve_link(link: ContentLink) -> dict:
    """Resolve a ContentLink to a dict with titles and slugs."""

    def _resolve_content(ct: ContentType, oid: int) -> tuple[str, str, str | None]:
        try:
            obj = ct.get_object_for_this_type(pk=oid)
            title = getattr(obj, "title", getattr(obj, "name", ""))
            slug = getattr(obj, "slug", "")
            image_url = obj.image.url if hasattr(obj, "image") and obj.image else None
            return title, slug, image_url
        except Exception:
            return "", "", None

    src_title, src_slug, src_img = _resolve_content(link.source_content_type, link.source_object_id)
    tgt_title, tgt_slug, tgt_img = _resolve_content(link.target_content_type, link.target_object_id)

    return {
        "id": link.id,
        "source_content_type": link.source_content_type.model,
        "source_object_id": link.source_object_id,
        "source_title": src_title,
        "source_slug": src_slug,
        "source_image_url": src_img,
        "target_content_type": link.target_content_type.model,
        "target_object_id": link.target_object_id,
        "target_title": tgt_title,
        "target_slug": tgt_slug,
        "target_image_url": tgt_img,
        "link_type": link.link_type,
        "relevance_score": link.relevance_score,
        "is_rejected": link.is_rejected,
        "created_at": link.created_at.isoformat(),
    }


@router.get(
    "/links/",
    response=list[ContentLinkDetailOut],
    url_name="content_links_list",
)
def list_content_links(
    request,
    content_type: str = "",
    object_id: int = 0,
    direction: str = "outgoing",
):
    """
    List content links for a specific content object.

    Args:
        content_type: Model name (e.g., "groupsession", "recipe")
        object_id: Object ID
        direction: "outgoing" (from this object) or "incoming" (to this object) or "both"
    """
    if not content_type or not object_id:
        return []

    try:
        ct = ContentType.objects.get(model=content_type)
    except ContentType.DoesNotExist:
        return []

    links = ContentLink.objects.filter(is_rejected=False).select_related("source_content_type", "target_content_type")

    if direction == "outgoing":
        links = links.filter(source_content_type=ct, source_object_id=object_id)
    elif direction == "incoming":
        links = links.filter(target_content_type=ct, target_object_id=object_id)
    else:  # both
        from django.db.models import Q

        links = links.filter(
            Q(source_content_type=ct, source_object_id=object_id)
            | Q(target_content_type=ct, target_object_id=object_id)
        )

    return [_resolve_link(link) for link in links[:50]]


@router.post(
    "/links/",
    response={201: ContentLinkDetailOut},
    url_name="content_links_create",
)
def create_content_link(request, payload: ContentLinkCreateIn):
    """Create a manual content link between two content items."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    try:
        src_ct = ContentType.objects.get(model=payload.source_content_type)
        tgt_ct = ContentType.objects.get(model=payload.target_content_type)
    except ContentType.DoesNotExist:
        raise HttpError(400, "Ungültiger Content-Typ")

    existing = ContentLink.objects.filter(
        source_content_type=src_ct,
        source_object_id=payload.source_object_id,
        target_content_type=tgt_ct,
        target_object_id=payload.target_object_id,
    ).first()
    if existing:
        raise HttpError(409, "Verknüpfung existiert bereits")

    link = ContentLink.objects.create(
        source_content_type=src_ct,
        source_object_id=payload.source_object_id,
        target_content_type=tgt_ct,
        target_object_id=payload.target_object_id,
        link_type="manual",
        created_by=request.user,
    )

    return 201, _resolve_link(link)


@router.post(
    "/links/{link_id}/reject/",
    response={200: dict},
    url_name="content_links_reject",
)
def reject_content_link(request, link_id: int):
    """Reject a content link (admin only)."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")

    try:
        link = ContentLink.objects.get(pk=link_id)
    except ContentLink.DoesNotExist:
        raise HttpError(404, "Verknüpfung nicht gefunden")

    link.is_rejected = True
    link.save(update_fields=["is_rejected"])
    return {"success": True}


@router.delete(
    "/links/{link_id}/",
    response={204: None},
    url_name="content_links_delete",
)
def delete_content_link(request, link_id: int):
    """Delete a content link (creator or admin)."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Anmeldung erforderlich")

    try:
        link = ContentLink.objects.get(pk=link_id)
    except ContentLink.DoesNotExist:
        raise HttpError(404, "Verknüpfung nicht gefunden")

    if not request.user.is_staff and link.created_by_id != request.user.id:
        raise HttpError(403, "Keine Berechtigung")

    link.delete()
    return 204, None
