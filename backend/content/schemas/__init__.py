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
    # Base
    "TagOut",
    "TagTreeOut",
    "TagSuggestIn",
    "ScoutLevelOut",
    "ContentAuthorOut",
    "ContentListOut",
    "ContentDetailOut",
    "ContentSimilarOut",
    "ContentCreateIn",
    "ContentUpdateIn",
    "ContentCommentOut",
    "ContentCommentIn",
    "ContentEmotionOut",
    "ContentEmotionIn",
    "ContentLinkOut",
    "ContentLinkCreateIn",
    "ApprovalLogOut",
    "ApprovalActionIn",
    "FeaturedContentOut",
    "FeaturedContentIn",
    "ImageFromUrlIn",
    "ImageOut",
    "PaginatedContentOut",
    # Search
    "UnifiedSearchFilterIn",
    "UnifiedSearchResultOut",
    "PaginatedSearchOut",
    "AutocompleteResultOut",
    # AI
    "AiImproveTextIn",
    "AiImproveTextOut",
    "AiSuggestTagsIn",
    "AiSuggestTagsOut",
    "AiRefurbishIn",
    "AiRefurbishOut",
    "AiErrorOut",
    "AiGenerateImageIn",
    "AiGenerateImageOut",
    "AiSuggestSuppliesIn",
    "AiSuggestSuppliesOut",
    "AiMaterialSuggestionOut",
    "AiIngredientSuggestionOut",
    "SuggestedTagOut",
    "SuggestedMaterialOut",
    # Admin
    "ApprovalQueueItemOut",
    "PaginatedApprovalQueueOut",
    "AdminApprovalActionIn",
    "ApprovalActionOut",
    "ApprovalLogItemOut",
    "EmbeddingStatusItemOut",
    "PaginatedEmbeddingStatusOut",
    "BatchEmbeddingIn",
    "BatchEmbeddingOut",
    "EmbeddingFeedbackItemOut",
    "PaginatedEmbeddingFeedbackOut",
    # Content Links detail
    "ContentLinkDetailOut",
    "FeaturedContentDetailOut",
]
