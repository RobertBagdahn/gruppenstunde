"""
Service for managing ContentLinks between content items.

Supports manual linking, embedding-based recommendations,
rejection with feedback, and grouped retrieval by target type.
"""

import logging

from django.contrib.auth import get_user_model
from django.contrib.auth.models import AbstractBaseUser
from django.contrib.contenttypes.models import ContentType
from django.db.models import Q

from content.choices import EmbeddingFeedbackType, LinkType
from content.models import ContentLink, EmbeddingFeedback

logger = logging.getLogger(__name__)
User = get_user_model()

# Content type model names that support linking
LINKABLE_TYPES = {"groupsession", "blog", "game", "recipe"}

# URL prefixes for content types
URL_PREFIXES = {
    "groupsession": "/sessions/",
    "blog": "/blogs/",
    "game": "/games/",
    "recipe": "/recipes/",
}


def create_manual_link(
    source_type: str,
    source_id: int,
    target_type: str,
    target_id: int,
    user: AbstractBaseUser | None = None,
) -> ContentLink:
    """
    Create a manual link between two content items.

    Args:
        source_type: Model name of the source (e.g., "groupsession").
        source_id: PK of the source object.
        target_type: Model name of the target.
        target_id: PK of the target object.
        user: The user creating the link.

    Returns:
        The created ContentLink.

    Raises:
        ValueError: If content types are invalid, objects don't exist,
                    or a duplicate link already exists.
    """
    src_ct = _get_content_type(source_type)
    tgt_ct = _get_content_type(target_type)

    # Verify objects exist
    _verify_object_exists(src_ct, source_id)
    _verify_object_exists(tgt_ct, target_id)

    # Prevent self-linking
    if src_ct == tgt_ct and source_id == target_id:
        raise ValueError("Ein Inhalt kann nicht mit sich selbst verknüpft werden.")

    # Check for duplicates (in either direction)
    if _link_exists(src_ct, source_id, tgt_ct, target_id):
        raise ValueError("Diese Verknüpfung existiert bereits.")

    link = ContentLink.objects.create(
        source_content_type=src_ct,
        source_object_id=source_id,
        target_content_type=tgt_ct,
        target_object_id=target_id,
        link_type=LinkType.MANUAL,
        created_by=user,
    )

    logger.info(
        "Manual link created: %s #%d → %s #%d by user %s",
        source_type,
        source_id,
        target_type,
        target_id,
        user.id if user else "anonymous",
    )
    return link


def create_embedding_links(
    source_type: str,
    source_id: int,
    recommendations: list[dict],
) -> list[ContentLink]:
    """
    Batch-create embedding-based links from similarity results.

    Args:
        source_type: Model name of the source content.
        source_id: PK of the source object.
        recommendations: List of dicts with keys:
            - target_type (str): Model name of target.
            - target_id (int): PK of target.
            - score (float): Cosine similarity score.

    Returns:
        List of created ContentLink objects.
    """
    src_ct = _get_content_type(source_type)
    created_links: list[ContentLink] = []

    for rec in recommendations:
        tgt_ct = _get_content_type(rec["target_type"])
        target_id = rec["target_id"]
        score = rec.get("score", 0.0)

        # Skip self-links
        if src_ct == tgt_ct and source_id == target_id:
            continue

        # Skip duplicates
        if _link_exists(src_ct, source_id, tgt_ct, target_id):
            continue

        link = ContentLink.objects.create(
            source_content_type=src_ct,
            source_object_id=source_id,
            target_content_type=tgt_ct,
            target_object_id=target_id,
            link_type=LinkType.EMBEDDING,
            relevance_score=score,
        )
        created_links.append(link)

    logger.info(
        "Created %d embedding links for %s #%d",
        len(created_links),
        source_type,
        source_id,
    )
    return created_links


def get_links_for_content(
    content_type: str,
    object_id: int,
    direction: str = "both",
    include_rejected: bool = False,
    limit: int = 50,
) -> list[ContentLink]:
    """
    Get ContentLinks for a specific content item.

    Args:
        content_type: Model name (e.g., "groupsession").
        object_id: PK of the content object.
        direction: "outgoing", "incoming", or "both".
        include_rejected: If True, include rejected links.
        limit: Maximum number of links to return.

    Returns:
        List of ContentLink objects with related content types prefetched.
    """
    try:
        ct = _get_content_type(content_type)
    except ValueError:
        return []

    qs = ContentLink.objects.select_related("source_content_type", "target_content_type")

    if not include_rejected:
        qs = qs.filter(is_rejected=False)

    if direction == "outgoing":
        qs = qs.filter(source_content_type=ct, source_object_id=object_id)
    elif direction == "incoming":
        qs = qs.filter(target_content_type=ct, target_object_id=object_id)
    else:  # both
        qs = qs.filter(
            Q(source_content_type=ct, source_object_id=object_id)
            | Q(target_content_type=ct, target_object_id=object_id)
        )

    return list(qs[:limit])


def get_links_grouped_by_type(
    content_type: str,
    object_id: int,
    max_per_group: int = 6,
) -> dict[str, list[dict]]:
    """
    Get links grouped by target content type, suitable for display sections.

    Returns a dict like:
        {
            "game": [{"id": 1, "title": "...", "slug": "...", ...}, ...],
            "recipe": [{"id": 2, "title": "...", "slug": "...", ...}, ...],
        }

    Only includes groups with at least one item.
    """
    links = get_links_for_content(content_type, object_id, direction="both")
    try:
        ct = _get_content_type(content_type)
    except ValueError:
        return {}

    grouped: dict[str, list[dict]] = {}

    for link in links:
        # Determine which end is the "related" content
        if link.source_content_type == ct and link.source_object_id == object_id:
            related_ct = link.target_content_type
            related_id = link.target_object_id
        else:
            related_ct = link.source_content_type
            related_id = link.source_object_id

        type_name = related_ct.model
        if type_name not in grouped:
            grouped[type_name] = []

        # Only add up to max_per_group items
        if len(grouped[type_name]) >= max_per_group:
            continue

        # Resolve the related object
        resolved = _resolve_content_object(related_ct, related_id)
        if resolved:
            resolved["link_id"] = link.id
            resolved["link_type"] = link.link_type
            resolved["relevance_score"] = link.relevance_score
            grouped[type_name].append(resolved)

    return grouped


def reject_link(link_id: int, user: Any | None = None) -> ContentLink:
    """
    Reject a content link (mark as not relevant).

    Args:
        link_id: PK of the ContentLink.
        user: Admin user performing the rejection.

    Returns:
        The updated ContentLink.

    Raises:
        ValueError: If the link doesn't exist.
    """
    try:
        link = ContentLink.objects.get(pk=link_id)
    except ContentLink.DoesNotExist:
        raise ValueError("Verknüpfung nicht gefunden.")

    link.is_rejected = True
    link.save(update_fields=["is_rejected"])

    logger.info("Link #%d rejected by user %s", link_id, user.id if user else "anonymous")
    return link


def reject_link_with_feedback(
    link_id: int,
    feedback_type: str,
    notes: str = "",
    user: AbstractBaseUser | None = None,
) -> tuple[ContentLink, EmbeddingFeedback]:
    """
    Reject a link and create an EmbeddingFeedback record.

    Args:
        link_id: PK of the ContentLink.
        feedback_type: One of EmbeddingFeedbackType choices.
        notes: Optional notes explaining the rejection.
        user: The admin user.

    Returns:
        Tuple of (updated ContentLink, created EmbeddingFeedback).
    """
    link = reject_link(link_id, user)

    feedback = EmbeddingFeedback.objects.create(
        content_link=link,
        feedback_type=feedback_type,
        notes=notes,
        created_by=user,
    )

    logger.info(
        "Feedback created for link #%d: %s",
        link_id,
        feedback_type,
    )
    return link, feedback


def delete_link(link_id: int, user: Any | None = None) -> None:
    """
    Delete a content link. Only creator or admin allowed.

    Args:
        link_id: PK of the ContentLink.
        user: The user requesting deletion.

    Raises:
        ValueError: If link doesn't exist.
        PermissionError: If user is not creator or admin.
    """
    try:
        link = ContentLink.objects.get(pk=link_id)
    except ContentLink.DoesNotExist:
        raise ValueError("Verknüpfung nicht gefunden.")

    if user and not user.is_staff and link.created_by_id != user.id:
        raise PermissionError("Keine Berechtigung zum Löschen dieser Verknüpfung.")

    link.delete()
    logger.info("Link #%d deleted by user %s", link_id, user.id if user else "anonymous")


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------


def _get_content_type(model_name: str) -> ContentType:
    """Get ContentType by model name, raises ValueError if not found."""
    try:
        return ContentType.objects.get(model=model_name)
    except ContentType.DoesNotExist:
        raise ValueError(f"Unbekannter Content-Typ: {model_name}")


def _verify_object_exists(ct: ContentType, object_id: int) -> None:
    """Verify that an object exists for the given content type and ID."""
    model_class = ct.model_class()
    if model_class and not model_class.objects.filter(pk=object_id).exists():
        raise ValueError(f"{ct.model} #{object_id} existiert nicht.")


def _link_exists(
    src_ct: ContentType,
    source_id: int,
    tgt_ct: ContentType,
    target_id: int,
) -> bool:
    """Check if a link exists in either direction."""
    return ContentLink.objects.filter(
        Q(
            source_content_type=src_ct,
            source_object_id=source_id,
            target_content_type=tgt_ct,
            target_object_id=target_id,
        )
        | Q(
            source_content_type=tgt_ct,
            source_object_id=target_id,
            target_content_type=src_ct,
            target_object_id=source_id,
        )
    ).exists()


def _resolve_content_object(ct: ContentType, object_id: int) -> dict | None:
    """Resolve a content type + object ID to a display dict."""
    try:
        obj = ct.get_object_for_this_type(pk=object_id)
    except Exception:
        return None

    title = getattr(obj, "title", getattr(obj, "name", ""))
    slug = getattr(obj, "slug", "")
    summary = getattr(obj, "summary", "")[:200]
    image_url = obj.image.url if hasattr(obj, "image") and obj.image else None
    url_prefix = URL_PREFIXES.get(ct.model, f"/{ct.model}/")

    return {
        "id": obj.id,
        "content_type": ct.model,
        "title": title,
        "slug": slug,
        "summary": summary,
        "image_url": image_url,
        "url": f"{url_prefix}{slug}",
    }
