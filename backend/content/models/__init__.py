"""
Content models package.

Re-exports all models so that existing imports like
``from content.models import Content`` continue to work.
"""

from .core import (
    AllObjectsManager,
    Content,
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
)
from .tags import Tag, ScoutLevel, TagSuggestion
from .search import SearchLog
from .interactions import ContentComment, ContentEmotion, ContentView
from .links import ContentLink, EmbeddingFeedback
from .approval import ApprovalLog, FeaturedContent

__all__ = [
    # Core
    "SoftDeleteQuerySet",
    "SoftDeleteManager",
    "AllObjectsManager",
    "SoftDeleteModel",
    "Content",
    # Tags
    "Tag",
    "ScoutLevel",
    "TagSuggestion",
    # Search
    "SearchLog",
    # Interactions
    "ContentComment",
    "ContentEmotion",
    "ContentView",
    # Links
    "ContentLink",
    "EmbeddingFeedback",
    # Approval
    "ApprovalLog",
    "FeaturedContent",
]
