"""
Content models package.

Re-exports all models so that existing imports like
``from content.models import Content`` continue to work.
"""

from .ai_interaction import AiInteraction
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
from .collaborator import ContentCollaborator, ContentCollaboratorRole
from .links import ContentLink, EmbeddingFeedback
from .search import SearchLog
from .tags import ScoutLevel, Tag, TagSuggestion

__all__ = [
    "AiInteraction",
    "AllObjectsManager",
    "ApprovalLog",
    "ChangeAuditLog",
    "Content",
    "ContentCollaborator",
    "ContentCollaboratorRole",
    "ContentComment",
    "ContentEmotion",
    "ContentLink",
    "ContentView",
    "DuplicateDismissal",
    "EmbeddingFeedback",
    "FeaturedContent",
    "ScoutLevel",
    "SearchLog",
    "SoftDeleteManager",
    "SoftDeleteModel",
    "SoftDeleteQuerySet",
    "Tag",
    "TagSuggestion",
]
