"""Pydantic schemas for the Packing List API (Django Ninja)."""

from datetime import datetime

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
    sort_order: int
    created_at: datetime
    updated_at: datetime


class PackingItemCreateIn(Schema):
    name: str
    quantity: str = ""
    description: str = ""
    sort_order: int = 0


class PackingItemUpdateIn(Schema):
    name: str | None = None
    quantity: str | None = None
    description: str | None = None
    is_checked: bool | None = None
    sort_order: int | None = None


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
    can_edit: bool = False
    categories: list[PackingCategoryOut]
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


class PackingListSummaryOut(Schema):
    id: int
    title: str
    description: str
    owner_id: int
    owner_name: str = ""
    group_id: int | None
    group_name: str = ""
    is_template: bool
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


class PackingListUpdateIn(Schema):
    title: str | None = None
    description: str | None = None
    group_id: int | None = None


# ---------------------------------------------------------------------------
# Sort Order Schemas
# ---------------------------------------------------------------------------


class SortOrderIn(Schema):
    """Reorder items or categories by providing a list of IDs in desired order."""

    ordered_ids: list[int]
