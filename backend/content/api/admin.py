"""
Content API — Admin endpoints (approval queue, embedding viewer, embedding feedback).
"""

import math

from django.contrib.contenttypes.models import ContentType
from ninja import Router
from ninja.errors import HttpError

from content.schemas.admin import (
    AdminApprovalActionIn,
    ApprovalActionOut,
    ApprovalLogItemOut,
    BatchEmbeddingIn,
    BatchEmbeddingOut,
    PaginatedApprovalQueueOut,
    PaginatedEmbeddingFeedbackOut,
    PaginatedEmbeddingStatusOut,
)

router = Router(tags=["content"])


def _require_admin(request):
    """Check that user is authenticated and staff."""
    if not request.user.is_authenticated or not request.user.is_staff:
        raise HttpError(403, "Nur Admins")


# ---------------------------------------------------------------------------
# Approval Queue
# ---------------------------------------------------------------------------


@router.get(
    "/admin/approvals/",
    response=PaginatedApprovalQueueOut,
    url_name="content_admin_approval_queue",
)
def admin_approval_queue(request, page: int = 1, page_size: int = 20):
    """List content items awaiting approval (admin only)."""
    _require_admin(request)

    from content.services.approval_service import get_pending_approvals

    all_pending = get_pending_approvals(limit=500)
    total = len(all_pending)
    total_pages = max(1, math.ceil(total / page_size))

    start = (page - 1) * page_size
    end = start + page_size
    items = all_pending[start:end]

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }


@router.post(
    "/admin/approvals/{content_type_name}/{object_id}/",
    response=ApprovalActionOut,
    url_name="content_admin_approval_action",
)
def admin_approval_action(request, content_type_name: str, object_id: int, payload: AdminApprovalActionIn):
    """Approve or reject a content item (admin only)."""
    _require_admin(request)

    from content.services.approval_service import ApprovalError, approve_content, reject_content

    try:
        ct = ContentType.objects.get(model=content_type_name)
    except ContentType.DoesNotExist:
        raise HttpError(400, f"Unbekannter Content-Typ: {content_type_name}")

    model_class = ct.model_class()
    try:
        content_obj = model_class.objects.get(pk=object_id)
    except model_class.DoesNotExist:
        raise HttpError(404, "Inhalt nicht gefunden")

    try:
        if payload.action == "approve":
            approve_content(content_obj, reviewer=request.user, reason=payload.reason)
            return {
                "success": True,
                "content_type": content_type_name,
                "object_id": object_id,
                "new_status": "approved",
                "message": f"'{content_obj.title}' wurde genehmigt.",
            }
        elif payload.action == "reject":
            reject_content(content_obj, reviewer=request.user, reason=payload.reason)
            return {
                "success": True,
                "content_type": content_type_name,
                "object_id": object_id,
                "new_status": "rejected",
                "message": f"'{content_obj.title}' wurde abgelehnt.",
            }
        else:
            raise HttpError(400, f"Ungültige Aktion: {payload.action}. Verwende 'approve' oder 'reject'.")
    except ApprovalError as exc:
        raise HttpError(400, str(exc))


@router.get(
    "/admin/approvals/{content_type_name}/{object_id}/history/",
    response=list[ApprovalLogItemOut],
    url_name="content_admin_approval_history",
)
def admin_approval_history(request, content_type_name: str, object_id: int):
    """Get the approval history for a content item (admin only)."""
    _require_admin(request)

    try:
        ct = ContentType.objects.get(model=content_type_name)
    except ContentType.DoesNotExist:
        raise HttpError(400, f"Unbekannter Content-Typ: {content_type_name}")

    from content.models import ApprovalLog as ApprovalLogModel

    logs = (
        ApprovalLogModel.objects.filter(content_type=ct, object_id=object_id)
        .select_related("reviewer")
        .order_by("-created_at")
    )

    return [
        {
            "id": log.id,
            "content_type": content_type_name,
            "object_id": object_id,
            "action": log.action,
            "reviewer_name": (log.reviewer.get_full_name() or log.reviewer.email if log.reviewer else None),
            "reason": log.reason,
            "created_at": log.created_at.isoformat(),
        }
        for log in logs
    ]


# ---------------------------------------------------------------------------
# Embedding Viewer
# ---------------------------------------------------------------------------


@router.get(
    "/admin/embeddings/",
    response=PaginatedEmbeddingStatusOut,
    url_name="content_admin_embedding_status",
)
def admin_embedding_status(
    request,
    content_type: str = "",
    status_filter: str = "",
    page: int = 1,
    page_size: int = 20,
):
    """List content items with their embedding status (admin only)."""
    _require_admin(request)

    from blog.models import Blog
    from game.models import Game
    from recipe.models import Recipe
    from session.models import GroupSession

    model_map = {
        "groupsession": GroupSession,
        "blog": Blog,
        "game": Game,
        "recipe": Recipe,
    }

    models_to_query = (
        [model_map[content_type]] if content_type and content_type in model_map else list(model_map.values())
    )

    all_items: list[dict] = []
    stats = {"total": 0, "with_embedding": 0, "stale": 0, "missing": 0}

    for model_class in models_to_query:
        ct_name = model_class.__name__.lower()
        qs = model_class.objects.filter(status="approved").order_by("-updated_at")

        for item in qs:
            has_emb = bool(item.embedding)
            is_stale = False
            emb_updated = None

            if has_emb and item.embedding_updated_at:
                emb_updated = item.embedding_updated_at.isoformat()
                is_stale = item.embedding_updated_at < item.updated_at
            elif has_emb:
                is_stale = True

            stats["total"] += 1
            if has_emb:
                stats["with_embedding"] += 1
                if is_stale:
                    stats["stale"] += 1
            else:
                stats["missing"] += 1

            if status_filter == "missing" and has_emb:
                continue
            if status_filter == "stale" and not is_stale:
                continue
            if status_filter == "current" and (not has_emb or is_stale):
                continue

            all_items.append(
                {
                    "content_type": ct_name,
                    "object_id": item.pk,
                    "title": item.title,
                    "slug": item.slug,
                    "has_embedding": has_emb,
                    "embedding_updated_at": emb_updated,
                    "content_updated_at": item.updated_at.isoformat(),
                    "is_stale": is_stale,
                }
            )

    total = len(all_items)
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size
    end = start + page_size

    return {
        "items": all_items[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "stats": stats,
    }


@router.post(
    "/admin/embeddings/batch-update/",
    response=BatchEmbeddingOut,
    url_name="content_admin_embedding_batch_update",
)
def admin_embedding_batch_update(request, payload: BatchEmbeddingIn):
    """Batch update embeddings for content (admin only)."""
    _require_admin(request)

    from content.services.embedding_service import batch_update_embeddings

    result = batch_update_embeddings(
        content_type=payload.content_type or None,
        force=payload.force,
        limit=payload.limit,
    )

    return result


# ---------------------------------------------------------------------------
# Embedding Feedback
# ---------------------------------------------------------------------------


@router.get(
    "/admin/embedding-feedback/",
    response=PaginatedEmbeddingFeedbackOut,
    url_name="content_admin_embedding_feedback",
)
def admin_embedding_feedback(
    request,
    feedback_type: str = "",
    page: int = 1,
    page_size: int = 20,
):
    """List embedding feedback entries (admin only)."""
    _require_admin(request)

    from content.models import EmbeddingFeedback

    qs = EmbeddingFeedback.objects.select_related(
        "content_link__source_content_type",
        "content_link__target_content_type",
        "created_by",
    ).order_by("-created_at")

    if feedback_type:
        qs = qs.filter(feedback_type=feedback_type)

    total = qs.count()
    total_pages = max(1, math.ceil(total / page_size))
    start = (page - 1) * page_size

    items = []
    for fb in qs[start : start + page_size]:
        link = fb.content_link

        src_title = ""
        tgt_title = ""
        try:
            src_obj = link.source_content_type.get_object_for_this_type(pk=link.source_object_id)
            src_title = getattr(src_obj, "title", "")
        except Exception:
            pass
        try:
            tgt_obj = link.target_content_type.get_object_for_this_type(pk=link.target_object_id)
            tgt_title = getattr(tgt_obj, "title", "")
        except Exception:
            pass

        items.append(
            {
                "id": fb.id,
                "content_link_id": link.id,
                "source_content_type": link.source_content_type.model,
                "source_title": src_title,
                "target_content_type": link.target_content_type.model,
                "target_title": tgt_title,
                "feedback_type": fb.feedback_type,
                "notes": fb.notes,
                "created_by_name": (fb.created_by.get_full_name() or fb.created_by.email if fb.created_by else None),
                "created_at": fb.created_at.isoformat(),
            }
        )

    return {
        "items": items,
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
    }
