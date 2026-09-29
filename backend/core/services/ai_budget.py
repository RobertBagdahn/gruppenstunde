"""AI budgets per tier, enforced in EUR via the database (works across instances).

Every non-system Gemini call reserves its worst-case cost before the call under a
row lock (`AiBudgetBucket`). The reservation counts until the real `cost_eur` is
written or it expires after RESERVATION_TTL.
"""

from __future__ import annotations

import hashlib
import hmac
from dataclasses import dataclass
from datetime import datetime, timedelta
from decimal import Decimal
from typing import Any
from zoneinfo import ZoneInfo

from django.conf import settings
from django.db import transaction
from django.db.models import Case, DecimalField, F, Q, Sum, Value, When
from django.http import HttpRequest
from django.utils import timezone

from content.choices import AiContextChoices, AiTierChoices
from core.errors import ApiError

RESERVATION_TTL = timedelta(minutes=10)
ANON_WINDOW = timedelta(hours=1)
BERLIN = ZoneInfo("Europe/Berlin")
CHARS_PER_TOKEN = 3  # conservative: German text averages ~3.5-4 chars per token
DEFAULT_OUTPUT_TOKEN_ESTIMATE = 8192
IMAGE_OUTPUT_TOKEN_ESTIMATE = 1500

# Gemini contexts that anonymous visitors may trigger: "Rezept erkennen" and "Zutat erkennen".
ANONYMOUS_AI_CONTEXTS: frozenset[str] = frozenset(
    {
        AiContextChoices.RECIPE_SMART_INPUT,
        AiContextChoices.URL_IMPORT_MATCHING,
        AiContextChoices.URL_IMPORT_METADATA,
        AiContextChoices.URL_IMPORT_GROUNDING_FALLBACK,
        AiContextChoices.INGREDIENT_URL_IMPORT,
        AiContextChoices.INGREDIENT_AI_CREATE,
    }
)
ANONYMOUS_FEATURES: tuple[str, ...] = ("recipe_recognize", "ingredient_recognize")

LOGIN_REQUIRED_DETAIL = "KI-Funktionen gibt es nach der kostenlosen Anmeldung."
PUBLIC_BUDGET_DETAIL = (
    "Die kostenlose KI-Vorschau ist gerade ausgelastet. Versuch es später erneut – "
    "oder melde dich an, dann hast du dein eigenes Kontingent."
)
VISITOR_LIMIT_DETAIL = (
    "Du hast die kostenlose KI-Vorschau für diese Stunde ausgeschöpft. Melde dich an, um mehr zu nutzen."
)
QUOTA_EXCEEDED_DETAIL = "Dein KI-Kontingent für heute ist aufgebraucht. Morgen ab 0:00 Uhr geht es weiter."


# ---------------------------------------------------------------------------
# Visitor key (no raw IPs)
# ---------------------------------------------------------------------------


def client_ip(request: HttpRequest) -> str:
    hops = int(getattr(settings, "AI_CLIENT_IP_TRUSTED_HOPS", 0))
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR", "")
    if hops > 0 and forwarded:
        entries = [entry.strip() for entry in forwarded.split(",") if entry.strip()]
        if len(entries) >= hops:
            return entries[-hops]
        if entries:
            return entries[0]
    return str(request.META.get("REMOTE_ADDR", ""))


def compute_anon_key(request: HttpRequest, now: datetime | None = None) -> str:
    """HMAC over IP + user agent with a key rotating daily; the IP is never stored."""
    day = (now or timezone.now()).astimezone(BERLIN).date().isoformat()
    daily_key = hashlib.sha256(f"{settings.SECRET_KEY}|ai-anon|{day}".encode()).digest()
    message = f"{client_ip(request)}|{request.META.get('HTTP_USER_AGENT', '')}".encode()
    return hmac.new(daily_key, message, hashlib.sha256).hexdigest()


# ---------------------------------------------------------------------------
# Tier resolution and limits
# ---------------------------------------------------------------------------


def resolve_ai_tier(user: Any, *, bypass_limits: bool = False) -> str:
    """Single place to decide the budget tier (extend here for group-based quotas)."""
    if bypass_limits:
        return AiTierChoices.SYSTEM
    if user is None or not getattr(user, "is_authenticated", False):
        return AiTierChoices.ANONYMOUS
    if getattr(user, "is_staff", False) or getattr(user, "is_superuser", False):
        return AiTierChoices.STAFF
    return AiTierChoices.USER


def daily_limit_eur(tier: str) -> Decimal:
    value = settings.AI_BUDGET_STAFF_EUR_PER_DAY if tier == AiTierChoices.STAFF else settings.AI_BUDGET_USER_EUR_PER_DAY
    return Decimal(str(value))


def start_of_day(now: datetime) -> datetime:
    local = now.astimezone(BERLIN)
    return local.replace(hour=0, minute=0, second=0, microsecond=0)


def next_midnight(now: datetime) -> datetime:
    return start_of_day(now) + timedelta(days=1)


# ---------------------------------------------------------------------------
# Cost estimation
# ---------------------------------------------------------------------------


def _pricing(model: str) -> dict[str, Any]:
    return dict(getattr(settings, "GEMINI_PRICING", {}).get(model) or {})


def estimate_max_cost_eur(model: str, contents: object, max_output_tokens: int | None, *, attempts: int = 1) -> Decimal:
    pricing = _pricing(model)
    input_tokens = len(str(contents)) / CHARS_PER_TOKEN
    input_cost = input_tokens / 1_000_000 * float(pricing.get("input_per_1m_usd", 0.5))
    if pricing.get("type") == "image":
        output_cost = IMAGE_OUTPUT_TOKEN_ESTIMATE / 1_000_000 * float(pricing.get("image_output_per_1m_usd", 30))
    else:
        output_tokens = max_output_tokens or DEFAULT_OUTPUT_TOKEN_ESTIMATE
        output_cost = output_tokens / 1_000_000 * float(pricing.get("output_per_1m_usd", 2.0))
    usd_to_eur = float(getattr(settings, "USD_TO_EUR", 0.92))
    estimate = Decimal(str((input_cost + output_cost) * usd_to_eur * attempts))
    return estimate.quantize(Decimal("0.000001"))


# ---------------------------------------------------------------------------
# Usage queries
# ---------------------------------------------------------------------------


def _usage_sum(filters: Q, now: datetime) -> Decimal:
    from content.models import AiInteraction

    stale_cutoff = now - RESERVATION_TTL
    effective_cost = Case(
        When(cost_eur__isnull=False, then=F("cost_eur")),
        When(created_at__gte=stale_cutoff, reserved_cost_eur__isnull=False, then=F("reserved_cost_eur")),
        default=Value(Decimal("0")),
        output_field=DecimalField(max_digits=12, decimal_places=6),
    )
    total = AiInteraction._default_manager.filter(filters).aggregate(total=Sum(effective_cost))["total"]
    return Decimal(total or 0)


def anonymous_usage(now: datetime) -> Decimal:
    return _usage_sum(Q(tier=AiTierChoices.ANONYMOUS, created_at__gte=now - ANON_WINDOW), now)


def visitor_usage(anon_key: str, now: datetime) -> Decimal:
    return _usage_sum(
        Q(tier=AiTierChoices.ANONYMOUS, anon_key=anon_key, created_at__gte=now - ANON_WINDOW),
        now,
    )


def user_usage_today(user: Any, now: datetime) -> Decimal:
    return _usage_sum(
        Q(user=user, tier__in=[AiTierChoices.USER, AiTierChoices.STAFF], created_at__gte=start_of_day(now)),
        now,
    )


def user_usage_since(user: Any, since: datetime, now: datetime) -> Decimal:
    return _usage_sum(Q(user=user, created_at__gte=since), now)


def _oldest_anonymous_expiry(filters: Q, now: datetime) -> int:
    """Seconds until the oldest counted anonymous record leaves the rolling window."""
    from content.models import AiInteraction

    oldest = (
        AiInteraction._default_manager.filter(filters)
        .order_by("created_at")
        .values_list("created_at", flat=True)
        .first()
    )
    if oldest is None:
        return 60
    return max(60, int((oldest + ANON_WINDOW - now).total_seconds()))


# ---------------------------------------------------------------------------
# Reservation
# ---------------------------------------------------------------------------


def _atomic() -> transaction.Atomic:
    # Explicit Atomic instance: the `transaction.atomic` overloads confuse type checkers.
    return transaction.Atomic(using=None, savepoint=True, durable=False)


def _lock_bucket(key: str) -> None:
    from content.models import AiBudgetBucket

    AiBudgetBucket._default_manager.get_or_create(key=key)
    AiBudgetBucket._default_manager.select_for_update().get(key=key)


def reserve(
    *,
    tier: str,
    user: Any,
    anon_key: str | None,
    context: str,
    estimate_eur: Decimal,
    create_interaction: Any,
) -> Any:
    """Check the tier budget and create the interaction with its reservation atomically.

    `create_interaction(**fields)` creates the AiInteraction; it runs inside the lock so
    concurrent requests on any instance see each other's reservations.
    """
    now = timezone.now()
    if tier == AiTierChoices.SYSTEM:
        return create_interaction(tier=tier, reserved_cost_eur=None, anon_key="")

    if tier == AiTierChoices.ANONYMOUS:
        if context not in ANONYMOUS_AI_CONTEXTS or not anon_key:
            raise ApiError(401, "ai_login_required", LOGIN_REQUIRED_DETAIL)
        with _atomic():
            _lock_bucket("anonymous")
            limit = Decimal(str(settings.AI_BUDGET_ANONYMOUS_EUR_PER_HOUR))
            if anonymous_usage(now) + estimate_eur > limit:
                retry = _oldest_anonymous_expiry(
                    Q(tier=AiTierChoices.ANONYMOUS, created_at__gte=now - ANON_WINDOW), now
                )
                raise ApiError(429, "ai_public_budget_exhausted", PUBLIC_BUDGET_DETAIL, retry_after_seconds=retry)
            visitor_limit = Decimal(str(settings.AI_BUDGET_ANONYMOUS_VISITOR_EUR_PER_HOUR))
            if visitor_usage(anon_key, now) + estimate_eur > visitor_limit:
                retry = _oldest_anonymous_expiry(
                    Q(tier=AiTierChoices.ANONYMOUS, anon_key=anon_key, created_at__gte=now - ANON_WINDOW), now
                )
                raise ApiError(429, "ai_visitor_limit", VISITOR_LIMIT_DETAIL, retry_after_seconds=retry)
            return create_interaction(tier=tier, reserved_cost_eur=estimate_eur, anon_key=anon_key)

    with _atomic():
        _lock_bucket(f"user:{user.pk}")
        if user_usage_today(user, now) + estimate_eur > daily_limit_eur(tier):
            retry = int((next_midnight(now) - now).total_seconds())
            raise ApiError(429, "ai_quota_exceeded", QUOTA_EXCEEDED_DETAIL, retry_after_seconds=retry)
        return create_interaction(tier=tier, reserved_cost_eur=estimate_eur, anon_key="")


# ---------------------------------------------------------------------------
# Quota overview
# ---------------------------------------------------------------------------


@dataclass(frozen=True)
class Quota:
    tier: str
    limit_eur: Decimal
    used_eur: Decimal
    resets_at: datetime
    visitor_limit_eur: Decimal | None = None
    visitor_used_eur: Decimal | None = None

    @property
    def remaining_eur(self) -> Decimal:
        return max(Decimal("0"), self.limit_eur - self.used_eur)

    @property
    def used_percent(self) -> int:
        if self.limit_eur <= 0:
            return 100
        return min(100, int(self.used_eur / self.limit_eur * 100))


def quota_for(request: HttpRequest) -> Quota:
    now = timezone.now()
    user = getattr(request, "user", None)
    tier = resolve_ai_tier(user)
    if tier == AiTierChoices.ANONYMOUS:
        anon_key = compute_anon_key(request, now)
        return Quota(
            tier=tier,
            limit_eur=Decimal(str(settings.AI_BUDGET_ANONYMOUS_EUR_PER_HOUR)),
            used_eur=anonymous_usage(now),
            resets_at=now + ANON_WINDOW,
            visitor_limit_eur=Decimal(str(settings.AI_BUDGET_ANONYMOUS_VISITOR_EUR_PER_HOUR)),
            visitor_used_eur=visitor_usage(anon_key, now),
        )
    return Quota(
        tier=tier, limit_eur=daily_limit_eur(tier), used_eur=user_usage_today(user, now), resets_at=next_midnight(now)
    )
