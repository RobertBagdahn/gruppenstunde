"""Cross-instance result cache for anonymous AI previews (recognize recipe/ingredient)."""

from __future__ import annotations

import hashlib
import re
from datetime import timedelta
from typing import Any

from django.db import IntegrityError
from django.utils import timezone

CACHE_TTL = timedelta(days=7)


def normalize_input(value: str) -> str:
    return re.sub(r"\s+", " ", value.strip())


def input_hash(value: str) -> str:
    return hashlib.sha256(normalize_input(value).encode()).hexdigest()


def get_cached(feature: str, value: str) -> dict[str, Any] | None:
    from content.models import AiResultCache

    entry = (
        AiResultCache._default_manager.filter(
            feature=feature, input_hash=input_hash(value), expires_at__gt=timezone.now()
        )
        .values_list("payload", flat=True)
        .first()
    )
    return entry if isinstance(entry, dict) else None


def store(feature: str, value: str, payload: dict[str, Any]) -> None:
    from content.models import AiResultCache

    try:
        AiResultCache._default_manager.update_or_create(
            feature=feature,
            input_hash=input_hash(value),
            defaults={"payload": payload, "expires_at": timezone.now() + CACHE_TTL},
        )
    except IntegrityError:
        # A concurrent request stored the same input first; either payload is fine.
        pass
