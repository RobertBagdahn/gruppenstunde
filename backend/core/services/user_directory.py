"""Privacy-safe user directory: public display names and collaborator search.

Responses built from this module never contain e-mail addresses or usernames
(usernames are e-mail addresses for password and social accounts).
"""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Q, QuerySet

from core.errors import ApiError
from core.schemas import UserSimpleOut

USER_SEARCH_MIN_QUERY_LENGTH = 2
USER_SEARCH_MAX_PAGE_SIZE = 20


def public_display_name(user: Any) -> str:
    """Name shown to other users: scout name, profile name or account name — never the e-mail."""
    if user is None:
        return ""
    profile = getattr(user, "profile", None)
    if profile is not None:
        profile_name = profile.scout_name or profile.full_name
        if profile_name:
            return str(profile_name)
    full_name = f"{user.first_name} {user.last_name}".strip()
    return full_name or f"Inspi-Nutzer #{user.id}"


def search_user_directory(q: str, page: int = 1, page_size: int = USER_SEARCH_MAX_PAGE_SIZE) -> dict:
    """Search active users for collaborator invites.

    A query containing ``@`` is treated as a case-insensitive exact e-mail lookup and
    yields at most one user, so known contacts can be invited without enumerating
    addresses. Any other query matches name fields only.
    """
    query = q.strip()
    if len(query) < USER_SEARCH_MIN_QUERY_LENGTH:
        raise ApiError(
            422,
            "invalid_input",
            f"Bitte mindestens {USER_SEARCH_MIN_QUERY_LENGTH} Zeichen eingeben.",
        )
    if page < 1 or page_size < 1 or page_size > USER_SEARCH_MAX_PAGE_SIZE:
        raise ApiError(
            422,
            "invalid_input",
            f"Die Seitengröße muss zwischen 1 und {USER_SEARCH_MAX_PAGE_SIZE} liegen.",
        )

    User = get_user_model()
    users: QuerySet = User.objects.filter(is_active=True).select_related("profile")
    if "@" in query:
        users = users.filter(email__iexact=query).order_by("id")[:1]
        matches = list(users)
        total = len(matches)
        page_items = matches if page == 1 else []
    else:
        users = users.filter(
            Q(first_name__icontains=query)
            | Q(last_name__icontains=query)
            | Q(profile__scout_name__icontains=query)
            | Q(profile__first_name__icontains=query)
            | Q(profile__last_name__icontains=query)
        ).order_by("profile__scout_name", "first_name", "last_name", "id")
        total = users.count()
        offset = (page - 1) * page_size
        page_items = list(users[offset : offset + page_size])

    return {
        "items": [UserSimpleOut(id=user.id, display_name=public_display_name(user)) for user in page_items],
        "total": total,
        "page": page,
        "page_size": page_size,
        "total_pages": max(1, (total + page_size - 1) // page_size),
    }
