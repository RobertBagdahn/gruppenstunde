"""
Content models package.

Re-exports all models so that existing imports like
``from content.models import Content`` continue to work.
"""

from .approval import ApprovalLog, FeaturedContent
from .audit import ChangeAuditLog
from .core import (
    AllObjectsManager,
    Content,
    SoftDeleteManager,
    SoftDeleteModel,
    SoftDeleteQuerySet,
)
from .data_quality import DuplicateDismissal
from .interactions import ContentComment, ContentEmotion, ContentView
from .links import ContentLink, EmbeddingFeedback
from .search import SearchLog
from .tags import ScoutLevel, Tag, TagSuggestion

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
    # Audit
    "ChangeAuditLog",
    # Data Quality
    "DuplicateDismissal",
]
