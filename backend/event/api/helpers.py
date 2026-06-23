"""Helper functions shared across event API modules."""

import hashlib
import time
from collections import defaultdict
from threading import Lock

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


# Simple in-memory rate limiter (no external dependency)
_rate_limit_store: dict[str, list[float]] = defaultdict(list)
_rate_limit_lock = Lock()


def check_rate_limit(request, max_requests: int = 10, window_seconds: int = 3600) -> None:
    """Check rate limit based on hashed client IP. Raises HttpError(429) if exceeded."""
    ip = _get_client_ip(request)
    ip_hash = hashlib.sha256(ip.encode()).hexdigest()[:16]
    now = time.time()

    with _rate_limit_lock:
        timestamps = _rate_limit_store[ip_hash]
        # Remove expired entries
        _rate_limit_store[ip_hash] = [t for t in timestamps if now - t < window_seconds]
        timestamps = _rate_limit_store[ip_hash]

        if len(timestamps) >= max_requests:
            raise HttpError(429, "Zu viele Anfragen. Bitte versuche es später erneut.")

        timestamps.append(now)


def _get_client_ip(request) -> str:
    """Extract client IP from request (supports proxied requests)."""
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR", "unknown")
