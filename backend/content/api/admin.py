"""
Content API — Admin endpoints (approval queue, embedding viewer, embedding feedback).
"""

import logging
import math

from django.contrib.contenttypes.models import ContentType
from django.core.exceptions import ObjectDoesNotExist
from django.db import models
from ninja import Router
from ninja.errors import HttpError

logger = logging.getLogger(__name__)

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
from content.schemas.ai_interaction import (
    AiInteractionDetailOut,
    AiInteractionItemOut,
    AiInteractionStatsOut,
    GeminiPricingOut,
    UserCostOut,
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
        except (ObjectDoesNotExist, AttributeError, ContentType.DoesNotExist):
            logger.warning("Could not resolve source content for content_link %d", link.id)
        try:
            tgt_obj = link.target_content_type.get_object_for_this_type(pk=link.target_object_id)
            tgt_title = getattr(tgt_obj, "title", "")
        except (ObjectDoesNotExist, AttributeError, ContentType.DoesNotExist):
            logger.warning("Could not resolve target content for content_link %d", link.id)

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


# ---------------------------------------------------------------------------
# AI Interaction Stats
# ---------------------------------------------------------------------------


@router.get(
    "/admin/ai-interactions/stats/",
    response=AiInteractionStatsOut,
    url_name="content_admin_ai_interaction_stats",
)
def admin_ai_interaction_stats(request, date_from: str = "", date_to: str = ""):
    """Aggregated AI interaction statistics (admin only)."""
    _require_admin(request)

    from datetime import date, timedelta

    from django.utils import timezone

    from content.choices import AiContextChoices
    from content.models import AiInteraction

    include_background = request.GET.get("include_background", "").lower() == "true"
    today = timezone.now().date()

    base_qs = AiInteraction.objects.all()
    if not include_background:
        base_qs = base_qs.filter(is_background=False)

    if date_from:
        try:
            parsed_from = date.fromisoformat(date_from)
        except (ValueError, TypeError):
            raise HttpError(400, f"Ungültiges Datum für date_from: {date_from}. Erwartet: YYYY-MM-DD.")
        base_qs = base_qs.filter(created_at__date__gte=parsed_from)
    if date_to:
        try:
            parsed_to = date.fromisoformat(date_to)
        except (ValueError, TypeError):
            raise HttpError(400, f"Ungültiges Datum für date_to: {date_to}. Erwartet: YYYY-MM-DD.")
        base_qs = base_qs.filter(created_at__date__lte=parsed_to)

    total_calls = base_qs.count()
    calls_today = base_qs.filter(created_at__date=today).count() if not date_from and not date_to else 0
    voted_calls = base_qs.filter(vote__isnull=False).count()
    vote_rate = round(voted_calls / total_calls * 100, 1) if total_calls else 0

    token_agg = base_qs.aggregate(
        total_tokens=models.Sum("total_tokens"),
        total_cost_eur=models.Sum("cost_eur"),
    )
    total_tokens_all = token_agg["total_tokens"] or 0
    total_cost_eur = float(token_agg["total_cost_eur"] or 0)

    by_context = []
    for choice in AiContextChoices:
        qs = base_qs.filter(context=choice.value)
        total = qs.count()
        if total == 0:
            continue
        ctx_agg = qs.aggregate(
            ctx_tokens=models.Sum("total_tokens"),
            ctx_cost=models.Sum("cost_eur"),
        )
        success_count = qs.filter(success=True).count()
        error_count = qs.filter(success=False).count()
        thumbs_up = qs.filter(vote="up").count()
        thumbs_down = qs.filter(vote="down").count()
        ctx_vote_rate = round((thumbs_up + thumbs_down) / total * 100, 1) if total else 0
        by_context.append(
            {
                "context": choice.value,
                "label": str(choice.label),
                "total": total,
                "success_count": success_count,
                "error_count": error_count,
                "thumbs_up": thumbs_up,
                "thumbs_down": thumbs_down,
                "vote_rate": ctx_vote_rate,
                "total_tokens": ctx_agg["ctx_tokens"] or 0,
                "total_cost_eur": float(ctx_agg["ctx_cost"] or 0),
            }
        )

    if date_from or date_to:
        timeline_start = parsed_from if date_from else today - timedelta(days=29)
        timeline_end = parsed_to if date_to else today
    else:
        timeline_start = today - timedelta(days=29)
        timeline_end = today

    timeline = []
    day = timeline_end
    while day >= timeline_start:
        day_qs = AiInteraction.objects.filter(created_at__date=day)
        if not include_background:
            day_qs = day_qs.filter(is_background=False)
        total_day = day_qs.count()
        if total_day == 0:
            day -= timedelta(days=1)
            continue
        day_agg = day_qs.aggregate(
            day_cost=models.Sum("cost_eur"),
            day_tokens=models.Sum("total_tokens"),
        )
        thumbs_up_day = day_qs.filter(vote="up").count()
        thumbs_down_day = day_qs.filter(vote="down").count()
        timeline.append(
            {
                "date": day.isoformat(),
                "total": total_day,
                "thumbs_up": thumbs_up_day,
                "thumbs_down": thumbs_down_day,
                "total_cost_eur": float(day_agg["day_cost"] or 0),
                "total_tokens": day_agg["day_tokens"] or 0,
            }
        )
        day -= timedelta(days=1)

    return {
        "total_calls": total_calls,
        "calls_today": calls_today,
        "voted_calls": voted_calls,
        "vote_rate": vote_rate,
        "total_tokens_all": total_tokens_all,
        "total_cost_eur": total_cost_eur,
        "by_context": by_context,
        "timeline": timeline,
    }


# ---------------------------------------------------------------------------
# AI Interaction Log Viewer
# ---------------------------------------------------------------------------


@router.get(
    "/admin/ai-interactions/",
    url_name="content_admin_ai_interactions_list",
)
def admin_ai_interactions_list(request, page: int = 1, page_size: int = 20, context: str = "",
                                user_id: int | None = None, success: str = "", is_background: str = "",
                                has_vote: str = "", date_from: str = "", date_to: str = "",
                                search: str = ""):
    """Paginated list of AI interactions (admin only)."""
    _require_admin(request)

    from content.models import AiInteraction

    qs = AiInteraction.objects.select_related("user").order_by("-created_at")

    if context:
        qs = qs.filter(context=context)
    if user_id:
        qs = qs.filter(user_id=user_id)
    if success in ("true", "false"):
        qs = qs.filter(success=(success == "true"))
    if is_background in ("true", "false"):
        qs = qs.filter(is_background=(is_background == "true"))
    if has_vote == "true":
        qs = qs.filter(vote__isnull=False)
    elif has_vote == "false":
        qs = qs.filter(vote__isnull=True)
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    if search:
        qs = qs.filter(models.Q(response__icontains=search) | models.Q(error_code__icontains=search))

    total = qs.count()
    offset = (page - 1) * page_size
    items = []
    for interaction in qs[offset : offset + page_size]:
        items.append({
            "id": str(interaction.id),
            "context": interaction.context,
            "model": interaction.model,
            "user_name": interaction.user.username if interaction.user else None,
            "created_at": interaction.created_at,
            "total_tokens": interaction.total_tokens,
            "cost_eur": float(interaction.cost_eur) if interaction.cost_eur is not None else None,
            "duration_ms": interaction.duration_ms,
            "success": interaction.success,
            "error_code": interaction.error_code,
            "vote": interaction.vote,
            "is_background": interaction.is_background,
        })

    total_pages = math.ceil(total / page_size) if total else 0
    return {"items": items, "total": total, "page": page, "page_size": page_size, "total_pages": total_pages}


@router.get(
    "/admin/ai-interactions/user-costs/",
    url_name="content_admin_ai_interactions_user_costs",
)
def admin_ai_interactions_user_costs(request, date_from: str = "", date_to: str = ""):
    """Per-user cost aggregation (admin only)."""
    _require_admin(request)

    from datetime import date

    from django.utils import timezone

    from content.models import AiInteraction

    include_background = request.GET.get("include_background", "").lower() == "true"
    thirty_days_ago = timezone.now() - timezone.timedelta(days=30)

    base_qs = AiInteraction.objects.filter(user__isnull=False)
    if not include_background:
        base_qs = base_qs.filter(is_background=False)

    if date_from:
        try:
            parsed_from = date.fromisoformat(date_from)
        except (ValueError, TypeError):
            raise HttpError(400, f"Ungültiges Datum für date_from: {date_from}. Erwartet: YYYY-MM-DD.")
        base_qs = base_qs.filter(created_at__date__gte=parsed_from)
    if date_to:
        try:
            parsed_to = date.fromisoformat(date_to)
        except (ValueError, TypeError):
            raise HttpError(400, f"Ungültiges Datum für date_to: {date_to}. Erwartet: YYYY-MM-DD.")
        base_qs = base_qs.filter(created_at__date__lte=parsed_to)

    users_agg = base_qs.values("user_id", "user__username").annotate(
        total_calls=models.Count("id"),
        total_tokens=models.Sum("total_tokens"),
        total_cost_eur=models.Sum("cost_eur"),
    ).order_by("-total_cost_eur")

    result = []
    for row in users_agg:
        cost_30d = (
            AiInteraction.objects.filter(
                user_id=row["user_id"],
                created_at__gte=thirty_days_ago,
            )
            .exclude(is_background=True)
            .aggregate(cost=models.Sum("cost_eur"))["cost"]
        )
        voted = base_qs.filter(user_id=row["user_id"], vote__isnull=False).count()
        vote_rate = round(voted / row["total_calls"] * 100, 1) if row["total_calls"] else 0

        result.append({
            "user_id": row["user_id"],
            "user_name": row["user__username"],
            "total_calls": row["total_calls"],
            "total_tokens": row["total_tokens"] or 0,
            "total_cost_eur": float(row["total_cost_eur"] or 0),
            "cost_30d_eur": float(cost_30d or 0),
            "vote_rate": vote_rate,
        })

    return result


@router.get(
    "/admin/ai-interactions/{interaction_id}/",
    url_name="content_admin_ai_interactions_detail",
)
def admin_ai_interactions_detail(request, interaction_id: str):
    """Detail view with full prompt and response (admin only)."""
    _require_admin(request)

    from uuid import UUID

    from content.models import AiInteraction

    try:
        uid = UUID(interaction_id)
    except ValueError:
        raise HttpError(404, "Interaktion nicht gefunden")

    try:
        interaction = AiInteraction.objects.select_related("user").get(id=uid)
    except AiInteraction.DoesNotExist:
        raise HttpError(404, "Interaktion nicht gefunden")

    return {
        "id": str(interaction.id),
        "context": interaction.context,
        "model": interaction.model,
        "user_name": interaction.user.username if interaction.user else None,
        "created_at": interaction.created_at,
        "total_tokens": interaction.total_tokens,
        "cost_eur": float(interaction.cost_eur) if interaction.cost_eur is not None else None,
        "duration_ms": interaction.duration_ms,
        "success": interaction.success,
        "error_code": interaction.error_code,
        "vote": interaction.vote,
        "is_background": interaction.is_background,
        "prompt": interaction.prompt,
        "response": interaction.response,
    }


# ---------------------------------------------------------------------------
# Gemini Pricing Endpoint
# ---------------------------------------------------------------------------


@router.get(
    "/admin/ai-pricing/",
    response=GeminiPricingOut,
    url_name="content_admin_ai_pricing",
)
def admin_ai_pricing(request):
    """Current Gemini pricing configuration (admin only)."""
    _require_admin(request)

    from django.conf import settings

    pricing_entries = []
    for model, config in getattr(settings, "GEMINI_PRICING", {}).items():
        pricing_entries.append({
            "model": model,
            "type": config.get("type", ""),
            "input_per_1m_usd": config.get("input_per_1m_usd", 0),
            "output_per_1m_usd": config.get("output_per_1m_usd"),
            "image_output_per_1m_usd": config.get("image_output_per_1m_usd"),
        })

    return {
        "pricing": pricing_entries,
        "usd_to_eur": float(getattr(settings, "USD_TO_EUR", 0.92)),
    }
