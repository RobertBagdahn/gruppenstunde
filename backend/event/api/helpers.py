"""Helper functions shared across event API modules."""

import hashlib

from django.core.cache import cache
from ninja.errors import HttpError

from event.models import Event


def require_auth(request):
    """Ensure user is authenticated."""
    if not request.user.is_authenticated:
        raise HttpError(403, "Sitzung nicht gefunden. Bitte erneut anmelden.")


def require_event_manager(event: Event, user):
    """Check that the user can manage this event."""
    if not event.user_can_manage(user):
        raise HttpError(403, "Nur Verantwortliche können diese Aktion ausführen")


def check_rate_limit(request, max_requests: int = 10, window_seconds: int = 3600) -> None:
    """Check rate limit based on hashed client IP. Uses django.core.cache so it
    works across multiple instances (e.g. Cloud Run). Raises HttpError(429) if exceeded."""
    ip = _get_client_ip(request)
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    key = f"ratelimit:{ip_hash}"

    try:
        count = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=window_seconds)
        count = 1

    if count > max_requests:
        raise HttpError(429, "Zu viele Anfragen. Bitte warte einen Moment.")


def _get_client_ip(request) -> str:
    """Extract client IP from request (supports proxied requests)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")
