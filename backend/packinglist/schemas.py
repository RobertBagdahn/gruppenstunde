"""Pydantic schemas for the Packing List API (Django Ninja)."""

from datetime import datetime
from uuid import UUID

from ninja import Schema

# ---------------------------------------------------------------------------
# Packing Item Schemas
# ---------------------------------------------------------------------------


class PackingItemOut(Schema):
    id: int
    name: str
    quantity: str
    description: str
    is_checked: bool
    is_do_not_bring: bool
    sort_order: int
    supply_type: str | None = None
    supply_id: int | None = None
    supply_name: str | None = None
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_supply_type(obj) -> str | None:
        if obj.supply_content_type:
            return obj.supply_content_type.model
        return None

    @staticmethod
    def resolve_supply_id(obj) -> int | None:
        return obj.supply_object_id

    @staticmethod
    def resolve_supply_name(obj) -> str | None:
        if obj.supply_content_type and obj.supply_object_id:
            try:
                supply = obj.supply_content_type.get_object_for_this_type(pk=obj.supply_object_id)
                return getattr(supply, "name", None)
            except Exception:
                pass
        return None


class PackingItemCreateIn(Schema):
    name: str
    quantity: str = ""
    description: str = ""
    sort_order: int = 0
    is_do_not_bring: bool = False
    supply_type: str | None = None
    supply_id: int | None = None


class PackingItemUpdateIn(Schema):
    name: str | None = None
    quantity: str | None = None
    description: str | None = None
    is_checked: bool | None = None
    is_do_not_bring: bool | None = None
    sort_order: int | None = None
    supply_type: str | None = None
    supply_id: int | None = None


# ---------------------------------------------------------------------------
# Packing Category Schemas
# ---------------------------------------------------------------------------


class PackingCategoryOut(Schema):
    id: int
    name: str
    sort_order: int
    items: list[PackingItemOut]
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_items(obj) -> list:
        return obj.items.all()


class PackingCategoryCreateIn(Schema):
    name: str
    sort_order: int = 0


class PackingCategoryUpdateIn(Schema):
    name: str | None = None
    sort_order: int | None = None


# ---------------------------------------------------------------------------
# Share Schemas
# ---------------------------------------------------------------------------


class ShareOut(Schema):
    id: int
    token: UUID
    label: str
    is_active: bool
    created_at: datetime


class ShareCreateIn(Schema):
    label: str = ""


class ShareCheckUpdateIn(Schema):
    item_id: int
    is_checked: bool


# ---------------------------------------------------------------------------
# Shared Packing List Item (with share-specific check state)
# ---------------------------------------------------------------------------


class SharedPackingItemOut(Schema):
    id: int
    name: str
    quantity: str
    description: str
    is_checked: bool
    is_do_not_bring: bool
    sort_order: int
    supply_type: str | None = None
    supply_id: int | None = None
    supply_name: str | None = None

    @staticmethod
    def resolve_supply_type(obj) -> str | None:
        if obj.supply_content_type:
            return obj.supply_content_type.model
        return None

    @staticmethod
    def resolve_supply_id(obj) -> int | None:
        return obj.supply_object_id

    @staticmethod
    def resolve_supply_name(obj) -> str | None:
        if obj.supply_content_type and obj.supply_object_id:
            try:
                supply = obj.supply_content_type.get_object_for_this_type(pk=obj.supply_object_id)
                return getattr(supply, "name", None)
            except Exception:
                pass
        return None


class SharedPackingCategoryOut(Schema):
    id: int
    name: str
    sort_order: int
    items: list[SharedPackingItemOut]


class SharedPackingListOut(Schema):
    """Packing list data as seen via a share link, with share-specific check state."""

    id: int
    title: str
    description: str
    owner_name: str = ""
    categories: list[SharedPackingCategoryOut]
    share_token: str = ""
    share_label: str = ""


# ---------------------------------------------------------------------------
# Packing List Schemas
# ---------------------------------------------------------------------------


class PackingListOut(Schema):
    id: int
    title: str
    description: str
    owner_id: int
    owner_name: str = ""
    group_id: int | None
    group_name: str = ""
    is_template: bool
    visibility: str
    activity_type: str | None = None
    duration: str | None = None
    season: str | None = None
    age_group: str | None = None
    can_edit: bool = False
    categories: list[PackingCategoryOut]
    shares: list[ShareOut] = []
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_owner_name(obj) -> str:
        profile = getattr(obj.owner, "profile", None)
        if profile and profile.scout_display_name:
            return profile.scout_display_name
        return obj.owner.email

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""

    @staticmethod
    def resolve_categories(obj) -> list:
        return obj.categories.prefetch_related("items").all()

    @staticmethod
    def resolve_shares(obj) -> list:
        if getattr(obj, "can_edit", False):
            return obj.shares.filter(is_active=True)
        return []


class PackingListSummaryOut(Schema):
    id: int
    title: str
    description: str
    owner_id: int
    owner_name: str = ""
    group_id: int | None
    group_name: str = ""
    is_template: bool
    visibility: str
    activity_type: str | None = None
    duration: str | None = None
    season: str | None = None
    age_group: str | None = None
    category_count: int = 0
    item_count: int = 0
    checked_count: int = 0
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_owner_name(obj) -> str:
        profile = getattr(obj.owner, "profile", None)
        if profile and profile.scout_display_name:
            return profile.scout_display_name
        return obj.owner.email

    @staticmethod
    def resolve_group_name(obj) -> str:
        if obj.group:
            return obj.group.name
        return ""

    @staticmethod
    def resolve_category_count(obj) -> int:
        return obj.categories.count()

    @staticmethod
    def resolve_item_count(obj) -> int:
        from .models import PackingItem

        return PackingItem.objects.filter(category__packing_list=obj).count()

    @staticmethod
    def resolve_checked_count(obj) -> int:
        from .models import PackingItem

        return PackingItem.objects.filter(category__packing_list=obj, is_checked=True).count()


class PackingListCreateIn(Schema):
    title: str
    description: str = ""
    group_id: int | None = None
    visibility: str = "link_only"


class PackingListUpdateIn(Schema):
    title: str | None = None
    description: str | None = None
    group_id: int | None = None
    visibility: str | None = None


# ---------------------------------------------------------------------------
# Sort Order Schemas
# ---------------------------------------------------------------------------


class SortOrderIn(Schema):
    """Reorder items or categories by providing a list of IDs in desired order."""

    ordered_ids: list[int]


# ---------------------------------------------------------------------------
# Pagination
# ---------------------------------------------------------------------------


class PaginatedPackingListOut(Schema):
    """Paginated response for packing list summaries."""

    items: list[PackingListSummaryOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# Suggestion Schemas
# ---------------------------------------------------------------------------


class SuggestionItemOut(Schema):
    """A single suggested packing item."""

    name: str
    quantity: str = ""
    description: str = ""
    category: str = ""
    tags: list[str] = []
    is_do_not_bring: bool = False


class SuggestionCategoryOut(Schema):
    """A category of suggested items."""

    name: str
    items: list[SuggestionItemOut]


class CatalogSuggestionsOut(Schema):
    """Response for catalog-based suggestions."""

    categories: list[SuggestionCategoryOut]
    total_available: int


class RandomSuggestionsOut(Schema):
    """Response for random quick-add suggestions."""

    items: list[SuggestionItemOut]


class AiSuggestIn(Schema):
    """Input for AI-powered item suggestions."""

    category: str | None = None
    count: int = 5


class AiSuggestOut(Schema):
    """Response for AI-powered item suggestions."""

    items: list[SuggestionItemOut]
    ai_interaction_id: str | None = None


class AiSuggestErrorOut(Schema):
    """Error response for AI suggestions."""

    detail: str
    error_code: str = "ai_error"


# ---------------------------------------------------------------------------
# Wizard / Generate Schemas
# ---------------------------------------------------------------------------


class GenerateContextIn(Schema):
    """Context for dynamic packing list generation."""

    activity: str
    duration: str
    season: str
    age_group: str | None = None


class GeneratePackingListIn(Schema):
    """Input for generating a packing list via the wizard."""

    title: str
    context: GenerateContextIn


class PreviewIn(Schema):
    """Input for previewing a dynamic packing list."""

    context: GenerateContextIn


class PreviewCategoryOut(Schema):
    """A category in the live preview with item count."""

    name: str
    item_count: int


class PreviewOut(Schema):
    """Live preview response showing categories and total items."""

    categories: list[PreviewCategoryOut]
    total_items: int


class PresetOut(Schema):
    """A predefined context preset for quick selection."""

    name: str
    icon: str
    description: str
    context: GenerateContextIn


class CatalogItemOut(Schema):
    """A single item from the unified catalog."""

    name: str
    quantity: str
    description: str
    category: str
    tags: list[str]


class FullCatalogOut(Schema):
    """Full catalog response for client-side autocomplete."""

    items: list[CatalogItemOut]
