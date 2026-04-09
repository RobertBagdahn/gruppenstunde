"""
Backward-compatibility shim.

All schemas have moved to ``content.schemas.*``.
This file re-exports them so existing imports like
``from content.base_schemas import ContentListOut`` still work.
"""

from content.schemas.base import (  # noqa: F401
    ApprovalActionIn,
    ApprovalLogOut,
    ContentAuthorOut,
    ContentCommentIn,
    ContentCommentOut,
    ContentCreateIn,
    ContentDetailOut,
    ContentEmotionIn,
    ContentEmotionOut,
    ContentLinkCreateIn,
    ContentLinkOut,
    ContentListOut,
    ContentSimilarOut,
    ContentUpdateIn,
    FeaturedContentIn,
    FeaturedContentOut,
    PaginatedContentOut,
    ScoutLevelOut,
    TagOut,
    TagSuggestIn,
    TagTreeOut,
)
