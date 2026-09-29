"""AI quota endpoint (all visitors)."""

from ninja import Router

from core.schemas import AiQuotaOut
from core.services.ai_budget import ANONYMOUS_FEATURES, quota_for

ai_router = Router(tags=["ai"])


@ai_router.get("/quota/", response=AiQuotaOut)
def get_ai_quota(request):
    """Current AI budget; anonymous visitors see the shared hourly pot and their own share."""
    quota = quota_for(request)
    visitor_percent = None
    if quota.visitor_limit_eur is not None and quota.visitor_used_eur is not None and quota.visitor_limit_eur > 0:
        remaining = max(0, quota.visitor_limit_eur - quota.visitor_used_eur)
        visitor_percent = int(remaining / quota.visitor_limit_eur * 100)
    return AiQuotaOut(
        tier=quota.tier,
        limit_eur=float(quota.limit_eur),
        used_eur=float(round(quota.used_eur, 4)),
        remaining_eur=float(round(quota.remaining_eur, 4)),
        used_percent=quota.used_percent,
        resets_at=quota.resets_at,
        anonymous_features=list(ANONYMOUS_FEATURES),
        visitor_remaining_percent=visitor_percent,
    )
