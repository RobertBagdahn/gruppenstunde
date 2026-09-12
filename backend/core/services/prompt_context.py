"""Central prompt context builder for AI features.

Collects available user, group, and environmental context (dietary tags,
group size, season, pantry summary) into a German context block that AI
services append to their prompts. Only includes data the requesting user is
authorized to see (own profile, own pantry).
"""

from __future__ import annotations

from typing import Any

from django.utils import timezone

GERMAN_MONTHS = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
]


def _dietary_tag_names(user: Any, nutritional_tag_ids: list[int] | None) -> list[str]:
    """Collect dietary/nutritional tag names from explicit IDs or the user's profile."""
    from supply.models import NutritionalTag

    if nutritional_tag_ids:
        tags = NutritionalTag.objects.filter(id__in=nutritional_tag_ids)
    elif user is not None and getattr(user, "is_authenticated", False):
        profile = getattr(user, "profile", None)
        tags = profile.nutritional_tags.all() if profile is not None else NutritionalTag.objects.none()
    else:
        tags = NutritionalTag.objects.none()
    return [t.name_opposite or t.name for t in tags]


def _pantry_summary(user: Any) -> list[str]:
    """Return a short list of the user's own ingredient names (summary only)."""
    if user is None or not getattr(user, "is_authenticated", False):
        return []
    from supply.models import Ingredient

    return list(
        Ingredient.objects.filter(created_by=user, deleted_at__isnull=True)
        .exclude(status="draft")
        .order_by("-usage_count")
        .values_list("name", flat=True)[:30]
    )


def build_prompt_context(
    user: Any = None,
    *,
    num_persons: int | float | None = None,
    nutritional_tag_ids: list[int] | None = None,
    include_pantry: bool = False,
) -> str:
    """Build a German context block for AI prompts from available data.

    Returns an empty string when no context data is available.
    """
    parts: list[str] = []

    tag_names = _dietary_tag_names(user, nutritional_tag_ids)
    if tag_names:
        parts.append(f"Ernährungsvorgaben: {', '.join(tag_names)}")

    if num_persons is not None:
        parts.append(f"Gruppengröße: {num_persons} Personen")

    parts.append(f"Jahreszeit: {GERMAN_MONTHS[timezone.now().month - 1]}")

    if include_pantry:
        pantry = _pantry_summary(user)
        if pantry:
            parts.append(f"Bereits vorhandene Zutaten (Vorrat): {', '.join(pantry)}")

    if not parts:
        return ""

    return "=== NUTZERKONTEXT ===\n" + "\n".join(parts)
