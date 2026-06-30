"""
Content schemas package.

Re-exports all schemas so that existing imports like
``from content.base_schemas import ContentListOut`` and
``from content.schemas import ContentListOut`` both work.
"""

# Base schemas (previously in base_schemas.py)
# Admin schemas (previously inline in api.py)
from .admin import (
    AdminApprovalActionIn,
    ApprovalActionOut,
    ApprovalLogItemOut,
    ApprovalQueueItemOut,
    BatchEmbeddingIn,
    BatchEmbeddingOut,
    EmbeddingFeedbackItemOut,
    EmbeddingStatusItemOut,
    PaginatedApprovalQueueOut,
    PaginatedEmbeddingFeedbackOut,
    PaginatedEmbeddingStatusOut,
)

# AI schemas (previously inline in api.py)
from .ai import (
    AiErrorOut,
    AiGenerateImageIn,
    AiGenerateImageOut,
    AiImproveTextIn,
    AiImproveTextOut,
    AiIngredientSuggestionOut,
    AiMaterialSuggestionOut,
    AiRefurbishIn,
    AiRefurbishOut,
    AiSuggestSuppliesIn,
    AiSuggestSuppliesOut,
    AiSuggestTagsIn,
    AiSuggestTagsOut,
    SuggestedMaterialOut,
    SuggestedTagOut,
)
from .ai_interaction import (
    AiContextStatsOut,
    AiInteractionStatsOut,
    AiTimelineEntryOut,
    AiVoteIn,
    AiVoteOut,
)
from .base import (
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
    ImageFromUrlIn,
    ImageOut,
    PaginatedContentOut,
    ScoutLevelOut,
    TagOut,
    TagSuggestIn,
    TagTreeOut,
)

# Collaborator schemas
from .collaborator import (
    ContentCollaboratorIn,
    ContentCollaboratorOut,
    ContentCollaboratorUpdateIn,
)

# Content link detail schemas (previously inline in api.py)
from .content_links import (
    ContentLinkDetailOut,
    FeaturedContentDetailOut,
)

# Search schemas (previously inline in api.py)
from .search import (
    AutocompleteResultOut,
    PaginatedSearchOut,
    UnifiedSearchFilterIn,
    UnifiedSearchResultOut,
)

__all__ = [
    "AdminApprovalActionIn",
    "AiContextStatsOut",
    "AiErrorOut",
    "AiGenerateImageIn",
    "AiGenerateImageOut",
    "AiImproveTextIn",
    "AiImproveTextOut",
    "AiIngredientSuggestionOut",
    "AiInteractionStatsOut",
    "AiMaterialSuggestionOut",
    "AiRefurbishIn",
    "AiRefurbishOut",
    "AiSuggestSuppliesIn",
    "AiSuggestSuppliesOut",
    "AiSuggestTagsIn",
    "AiSuggestTagsOut",
    "AiTimelineEntryOut",
    "AiVoteIn",
    "AiVoteOut",
    "ApprovalActionIn",
    "ApprovalActionOut",
    "ApprovalLogItemOut",
    "ApprovalLogOut",
    "ApprovalQueueItemOut",
    "AutocompleteResultOut",
    "BatchEmbeddingIn",
    "BatchEmbeddingOut",
    "ContentAuthorOut",
    "ContentCommentIn",
    "ContentCommentOut",
    "ContentCreateIn",
    "ContentDetailOut",
    "ContentEmotionIn",
    "ContentEmotionOut",
    "ContentLinkCreateIn",
    "ContentLinkDetailOut",
    "ContentLinkOut",
    "ContentListOut",
    "ContentSimilarOut",
    "ContentUpdateIn",
    "EmbeddingFeedbackItemOut",
    "EmbeddingStatusItemOut",
    "FeaturedContentDetailOut",
    "FeaturedContentIn",
    "FeaturedContentOut",
    "ImageFromUrlIn",
    "ImageOut",
    "PaginatedApprovalQueueOut",
    "PaginatedContentOut",
    "PaginatedEmbeddingFeedbackOut",
    "PaginatedEmbeddingStatusOut",
    "PaginatedSearchOut",
    "ScoutLevelOut",
    "SuggestedMaterialOut",
    "SuggestedTagOut",
    "TagOut",
    "TagSuggestIn",
    "TagTreeOut",
    "UnifiedSearchFilterIn",
    "UnifiedSearchResultOut",
]
