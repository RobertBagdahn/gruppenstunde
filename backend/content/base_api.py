"""
Backward-compatibility shim.

All helper functions have moved to ``content.api.helpers``.
This file re-exports them so existing imports like
``from content.base_api import toggle_emotion`` still work.
"""

from content.api.helpers import (  # noqa: F401
    create_comment,
    enrich_content_with_interactions,
    enrich_list_with_permissions,
    get_comments,
    get_content_type_for_model,
    get_emotion_counts,
    get_session_key,
    get_user_emotion,
    paginate_queryset,
    record_view,
    toggle_emotion,
)
