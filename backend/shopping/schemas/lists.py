"""Pydantic schemas for the Shopping app."""

from datetime import datetime
from typing import Literal

from django.db.models import Prefetch
from ninja import Schema
from pydantic import Field

from core.services.user_directory import public_display_name
from shopping.models import ShoppingListItemSource
from supply.schemas.ingredients import UnitOptionOut

from .trips import PlannedTripOut

# --- Collaborator schemas ---


class ShoppingListCollaboratorOut(Schema):
    """Output schema for a shopping list collaborator."""

    id: int
    user_id: int
    display_name: str = ""
    role: str

    @staticmethod
    def resolve_display_name(obj) -> str:
        return public_display_name(obj.user)


# --- Item schemas ---


class ShoppingItemSourceOut(Schema):
    """Output schema for a shopping list item source (provenance)."""

    id: int
    recipe_id: int | None = None
    meal_id: int | None = None
    ingredient_id: int | None = None
    recipe_name: str = ""
    recipe_slug: str = ""
    meal_label: str = ""
    quantity_g: float = 0.0

    # Display quantity in `unit`: grams, or millilitres for beverages/liquids
    # (converted via the ingredient's physical_density).
    quantity: float = 0.0
    package_surplus_g: float | None = None

    @staticmethod
    def resolve_quantity_g(obj) -> float:
        return float(round(obj.quantity_g, 2))

    @staticmethod
    def _display_quantity(obj) -> tuple[float, str]:
        # ``quantity_g`` is always grams. Entries with an ingredient derive the
        # display unit from it (ml via density); free-text entries show as stored.
        if obj.ingredient is None:
            return float(obj.quantity_g or 0), obj.unit
        from supply.utils import shopping_quantity

        quantity, unit = shopping_quantity(float(obj.quantity_g or 0), obj.ingredient)
        return float(round(quantity, 2)), unit

    @staticmethod
    def resolve_quantity(obj) -> float:
        return ShoppingListItemOut._display_quantity(obj)[0]

    @staticmethod
    def resolve_unit(obj) -> str:
        return ShoppingListItemOut._display_quantity(obj)[1]


class ShoppingItemPortionOptionOut(Schema):
    """Output schema for a single portion option in the shopping list."""

    name: str
    is_default: bool
    weight_g: float = 0.0
    count: float = 0.0


class ShoppingPackageOptionOut(Schema):
    """A shop-bought package count for a quantity (e.g. "2 × 500 g Packung").
    Only present when the ingredient has a rank=1 Package."""

    count: int
    package_name: str
    weight_g: float
    # Package size in millilitres for liquids (shown in the same unit as the quantity).
    volume_ml: float | None = None


class ShoppingListItemOut(Schema):
    """Output schema for a shopping list item."""

    id: int
    name: str
    quantity_g: float
    unit: str

    # Display quantity in `unit`: grams, or millilitres for beverages/liquids
    # (converted via the ingredient's physical_density).
    quantity: float = 0.0
    package_surplus_g: float | None = None

    @staticmethod
    def resolve_quantity_g(obj) -> float:
        return float(round(obj.quantity_g, 2))

    @staticmethod
    def _display_quantity(obj) -> tuple[float, str]:
        # ``quantity_g`` is always grams. Entries with an ingredient derive the
        # display unit from it (ml via density); free-text entries show as stored.
        if obj.ingredient is None:
            return float(obj.quantity_g or 0), obj.unit
        from supply.utils import shopping_quantity

        quantity, unit = shopping_quantity(float(obj.quantity_g or 0), obj.ingredient)
        return float(round(quantity, 2)), unit

    @staticmethod
    def resolve_quantity(obj) -> float:
        return ShoppingListItemOut._display_quantity(obj)[0]

    @staticmethod
    def resolve_unit(obj) -> str:
        return ShoppingListItemOut._display_quantity(obj)[1]

    retail_section_id: int | None = None
    retail_section_name: str = ""
    material_id: int | None = None
    is_material: bool = False
    is_checked: bool
    checked_by_display_name: str | None = None
    checked_at: datetime | None = None
    # Who put the entry on the list and when (null for entries generated from a recipe or plan).
    added_by_display_name: str | None = None
    created_at: datetime
    # Who takes care of buying it ("Ich hole das"); `claimed_by_me` is resolved per viewer.
    claimed_by_display_name: str | None = None
    claimed_by_me: bool = False
    # Resolved per viewer: guests may only remove entries they added themselves.
    can_delete: bool = False
    sort_order: int
    note: str = ""
    ingredient_id: int | None = None
    ingredient_slug: str | None = None
    estimated_price_eur: float | None = None
    # Unit the amount is shown in first (standard portion, else g/ml); the amount itself stays `quantity_g`.
    start_unit: UnitOptionOut | None = None
    portion_options: list[ShoppingItemPortionOptionOut] = []
    package_options: list[ShoppingPackageOptionOut] = []
    sources: list[ShoppingItemSourceOut] = []

    @staticmethod
    def _retail_section(obj):
        # Items snapshot the section when created; a section assigned to the
        # ingredient afterwards still applies unless the item has its own.
        if obj.retail_section:
            return obj.retail_section
        if obj.ingredient and obj.ingredient.retail_section:
            return obj.ingredient.retail_section
        return None

    @staticmethod
    def resolve_retail_section_id(obj) -> int | None:
        section = ShoppingListItemOut._retail_section(obj)
        return section.id if section else None

    @staticmethod
    def resolve_retail_section_name(obj) -> str:
        section = ShoppingListItemOut._retail_section(obj)
        return str(section.name) if section else ""

    @staticmethod
    def resolve_is_material(obj) -> bool:
        return obj.material_id is not None

    @staticmethod
    def resolve_checked_by_display_name(obj) -> str | None:
        if obj.checked_by:
            return public_display_name(obj.checked_by)
        if obj.checked_by_guest:
            return str(obj.checked_by_guest.name)
        return None

    @staticmethod
    def resolve_claimed_by_display_name(obj) -> str | None:
        if obj.claimed_by:
            return public_display_name(obj.claimed_by)
        if obj.claimed_by_guest:
            return str(obj.claimed_by_guest.name)
        return None

    @staticmethod
    def resolve_claimed_by_me(obj) -> bool:
        return bool(getattr(obj, "_claimed_by_me", False))

    @staticmethod
    def resolve_added_by_display_name(obj) -> str | None:
        if obj.added_by:
            return public_display_name(obj.added_by)
        if obj.added_by_guest:
            return str(obj.added_by_guest.name)
        return None

    @staticmethod
    def resolve_can_delete(obj) -> bool:
        return bool(getattr(obj, "_can_delete", False))

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        if obj.ingredient:
            return str(obj.ingredient.slug)
        return None

    @staticmethod
    def resolve_sources(obj) -> list:
        return list(obj.sources.all())

    @staticmethod
    def resolve_estimated_price_eur(obj) -> float | None:
        if not obj.ingredient or not obj.quantity_g:
            return None
        from supply.services.price_service import get_portion_price

        price = get_portion_price(obj.ingredient, obj.quantity_g)
        return round(float(price), 2) if price is not None else None

    @staticmethod
    def resolve_start_unit(obj) -> dict | None:
        if not obj.ingredient:
            return None
        from supply.services.shopping_service import compute_portion_options, start_unit_for

        portions = [p for p in ShoppingListItemOut._sorted_portions(obj) if p.deleted_at is None]
        best = None
        if portions and obj.quantity_g and obj.quantity_g > 0:
            best, _ = compute_portion_options(obj.quantity_g, portions)
        return start_unit_for(obj.ingredient, portions, set(), best["name"] if best else None, obj.unit)

    @staticmethod
    def resolve_portion_options(obj) -> list[dict]:
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0:
            return []
        portions = ShoppingListItemOut._sorted_portions(obj)
        if not portions:
            return []
        from supply.services.shopping_service import compute_portion_options

        _, options = compute_portion_options(obj.quantity_g, portions)
        return options

    @staticmethod
    def _sorted_portions(obj) -> list:
        """Portions by rank and name, sorted in Python so a prefetch is reused (order_by would re-query per item)."""
        return sorted(obj.ingredient.portions.all(), key=lambda p: (p.rank, p.name))

    @staticmethod
    def _package_need(obj):
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0 or obj.unit != "g":
            return None, None
        cached = getattr(obj, "_package_need_cache", None)
        if cached is not None:
            return cached
        from supply.utils import compute_package_need, get_shopping_portion

        package = get_shopping_portion(obj.ingredient)
        result = (package, compute_package_need(obj.quantity_g, package.weight_g)) if package else (None, None)
        obj._package_need_cache = result
        return result

    @staticmethod
    def resolve_package_options(obj) -> list[dict]:
        package, need = ShoppingListItemOut._package_need(obj)
        if not package or not need:
            return []
        from supply.utils import shopping_quantity

        volume, unit = shopping_quantity(float(package.weight_g or 0), obj.ingredient)
        return [
            {
                "count": need[0],
                "package_name": package.name,
                "weight_g": package.weight_g,
                "volume_ml": volume if unit == "ml" else None,
            }
        ]

    @staticmethod
    def resolve_package_surplus_g(obj) -> float | None:
        _, need = ShoppingListItemOut._package_need(obj)
        return need[1] if need else None


class ShoppingListItemCreateIn(Schema):
    """Input schema for adding an item to a shopping list."""

    name: str = Field(min_length=1, max_length=255)
    quantity_g: float = Field(default=0, ge=0)
    unit: str = Field(default="g", max_length=20)
    retail_section_id: int | None = None
    ingredient_id: int | None = None
    sort_order: int = 0
    note: str = Field(default="", max_length=500)
    # Lets "Rückgängig" restore a deleted entry including its checked state.
    is_checked: bool = False


class ShoppingListItemUpdateIn(Schema):
    """Input schema for updating a shopping list item (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    quantity_g: float | None = Field(default=None, ge=0)
    unit: str | None = Field(default=None, max_length=20)
    retail_section_id: int | None = None
    is_checked: bool | None = None
    sort_order: int | None = None
    note: str | None = Field(default=None, max_length=500)
    # True: "Ich hole das"; False: release it.
    claimed: bool | None = None


# --- List schemas ---


def _freshness_of(obj):
    """Freshness attached by the API (batched for lists); computed on demand for a single list."""
    from shopping.services.source_status import NO_STATUS, freshness_for_lists

    cached = getattr(obj, "_source_freshness", None)
    if cached is not None:
        return cached
    user = getattr(obj, "_request_user", None)
    if user is None:
        return NO_STATUS
    return freshness_for_lists(user, [obj]).get(obj.id, NO_STATUS)


class ShoppingListOut(Schema):
    """Output schema for shopping list in list views (summary)."""

    id: int
    name: str
    owner_id: int
    owner_display_name: str = ""
    source_type: str
    source_id: int | None = None
    items_count: int = 0
    checked_count: int = 0
    collaborators_count: int = 0
    created_at: datetime
    updated_at: datetime
    can_edit: bool = False
    can_delete: bool = False
    # Only for lists created from a meal plan; null for others and without read access to the plan.
    source_status: Literal["current", "changed", "deleted"] | None = None
    source_updated_at: datetime | None = None
    # Event trips: the event, shop and time a trip belongs to; `trip_status` is derived (planned/created).
    event_id: int | None = None
    event_slug: str | None = None
    event_name: str | None = None
    store_id: int | None = None
    store_name: str | None = None
    scheduled_at: datetime | None = None
    materialized_at: datetime | None = None
    plan_synced_at: datetime | None = None
    trip_status: Literal["planned", "created"] | None = None

    @staticmethod
    def resolve_event_slug(obj) -> str | None:
        return obj.event.slug if obj.event_id else None

    @staticmethod
    def resolve_event_name(obj) -> str | None:
        return obj.event.name if obj.event_id else None

    @staticmethod
    def resolve_store_name(obj) -> str | None:
        return obj.store.name if obj.store_id else None

    @staticmethod
    def resolve_source_status(obj) -> str | None:
        return _freshness_of(obj).status

    @staticmethod
    def resolve_source_updated_at(obj) -> datetime | None:
        return _freshness_of(obj).updated_at

    @staticmethod
    def resolve_owner_display_name(obj) -> str:
        return public_display_name(obj.owner)

    @staticmethod
    def resolve_items_count(obj) -> int:
        # Use annotated value from queryset when available (avoids N+1)
        annotated = getattr(obj, "items_count", None)
        return int(annotated) if annotated is not None else int(obj.items.count())

    @staticmethod
    def resolve_checked_count(obj) -> int:
        annotated = getattr(obj, "checked_count", None)
        return int(annotated) if annotated is not None else int(obj.items.filter(is_checked=True).count())

    @staticmethod
    def resolve_collaborators_count(obj) -> int:
        annotated = getattr(obj, "collaborators_count", None)
        return int(annotated) if annotated is not None else int(obj.collaborators.count())


class ShoppingListGuestOut(Schema):
    """A person who joined through the invitation link (never exposes the guest token)."""

    id: int
    name: str
    created_at: datetime


class ShoppingListDetailOut(Schema):
    """Output schema for shopping list detail view with items and collaborators."""

    id: int
    name: str
    owner_id: int
    owner_display_name: str = ""
    source_type: str
    source_id: int | None = None
    items: list[ShoppingListItemOut] = []
    collaborators: list[ShoppingListCollaboratorOut] = []
    can_edit: bool = False
    is_owner: bool = False
    # Admins and the owner: invitation link and the people who joined through it.
    can_manage: bool = False
    share_token: str | None = None
    guests: list[ShoppingListGuestOut] = []
    # Set for guests: who the viewer is on this list.
    viewer_guest_id: int | None = None
    viewer_display_name: str = ""
    # Change marker; clients poll `/pulse/` and reload the list when it differs.
    stamp: str = ""
    items_count: int = 0
    checked_count: int = 0
    # Event team members may plan the trips of the event; preview rows exist for planned trips only.
    can_plan: bool = False
    preview: PlannedTripOut | None = None
    created_at: datetime
    updated_at: datetime
    source_status: Literal["current", "changed", "deleted"] | None = None
    source_updated_at: datetime | None = None
    # Event trips: the event, shop and time a trip belongs to; `trip_status` is derived (planned/created).
    event_id: int | None = None
    event_slug: str | None = None
    event_name: str | None = None
    store_id: int | None = None
    store_name: str | None = None
    scheduled_at: datetime | None = None
    materialized_at: datetime | None = None
    plan_synced_at: datetime | None = None
    trip_status: Literal["planned", "created"] | None = None

    @staticmethod
    def resolve_event_slug(obj) -> str | None:
        return obj.event.slug if obj.event_id else None

    @staticmethod
    def resolve_event_name(obj) -> str | None:
        return obj.event.name if obj.event_id else None

    @staticmethod
    def resolve_store_name(obj) -> str | None:
        return obj.store.name if obj.store_id else None

    @staticmethod
    def resolve_source_status(obj) -> str | None:
        return _freshness_of(obj).status

    @staticmethod
    def resolve_source_updated_at(obj) -> datetime | None:
        return _freshness_of(obj).updated_at

    @staticmethod
    def resolve_owner_display_name(obj) -> str:
        return public_display_name(obj.owner)

    @staticmethod
    def resolve_items(obj) -> list:
        items = list(
            obj.items.select_related(
                "retail_section",
                "checked_by__profile",
                "checked_by_guest",
                "added_by__profile",
                "added_by_guest",
                "claimed_by__profile",
                "claimed_by_guest",
                "ingredient",
                "ingredient__retail_section",
            )
            .prefetch_related(
                Prefetch("sources", queryset=ShoppingListItemSource.objects.select_related("ingredient")),
                "ingredient__portions__measuring_unit",
                "ingredient__packages",
            )
            .all()
        )
        can_edit = getattr(obj, "_can_edit", False)
        guest_id = getattr(obj, "_viewer_guest_id", None)
        viewer = getattr(obj, "_viewer_actor", None)
        for item in items:
            item._claimed_by_me = bool(viewer and viewer.owns_claim(item))
            # Generated entries are rebuilt from their source; guests remove only their own additions.
            manual = not item.sources.all()
            item._can_delete = can_edit and manual and (guest_id is None or item.added_by_guest_id == guest_id)
        return items

    @staticmethod
    def resolve_collaborators(obj) -> list:
        if getattr(obj, "_viewer_guest_id", None) is not None:
            return []
        return list(obj.collaborators.select_related("user__profile").all())

    @staticmethod
    def resolve_can_manage(obj) -> bool:
        return getattr(obj, "_can_manage", False)

    @staticmethod
    def resolve_share_token(obj) -> str | None:
        if not getattr(obj, "_can_manage", False) or obj.share_token is None:
            return None
        return str(obj.share_token)

    @staticmethod
    def resolve_guests(obj) -> list:
        if not getattr(obj, "_can_manage", False):
            return []
        return list(obj.guests.all())

    @staticmethod
    def resolve_viewer_guest_id(obj) -> int | None:
        return getattr(obj, "_viewer_guest_id", None)

    @staticmethod
    def resolve_items_count(obj) -> int:
        return obj.items.count()

    @staticmethod
    def resolve_checked_count(obj) -> int:
        return obj.items.filter(is_checked=True).count()

    @staticmethod
    def resolve_can_plan(obj) -> bool:
        return bool(obj.event_id and getattr(obj, "_can_manage", False))

    @staticmethod
    def resolve_preview(obj):
        return getattr(obj, "_preview", None)

    @staticmethod
    def resolve_stamp(obj) -> str:
        from shopping.services.pulse import list_stamp

        return list_stamp(obj)

    @staticmethod
    def resolve_viewer_display_name(obj) -> str:
        return getattr(obj, "_viewer_display_name", "")

    @staticmethod
    def resolve_can_edit(obj) -> bool:
        return getattr(obj, "_can_edit", False)

    @staticmethod
    def resolve_is_owner(obj) -> bool:
        return getattr(obj, "_is_owner", False)


class BoardItemOut(Schema):
    """One entry on the shopping board: only what the screen shows and acts on."""

    id: int
    name: str
    quantity: float = 0.0
    unit: str = "g"
    retail_section_id: int | None = None
    retail_section_name: str = ""
    is_material: bool = False
    is_checked: bool = False
    checked_by_name: str | None = None
    claimed_by_name: str | None = None
    claimed_by_me: bool = False
    can_delete: bool = False
    sort_order: int = 0
    note: str = ""


class ShoppingListBoardOut(Schema):
    """Compact board of a shopping list; `stamp` is the same change marker that `/pulse/` reports."""

    id: int
    name: str
    stamp: str
    can_edit: bool = False
    viewer_display_name: str = ""
    total: int = 0
    checked: int = 0
    items: list[BoardItemOut] = []


class ShoppingListCreateIn(Schema):
    """Input schema for creating a new shopping list."""

    name: str = Field(min_length=1, max_length=255)


class ShoppingListUpdateIn(Schema):
    """Input schema for updating a shopping list (partial)."""

    name: str | None = Field(default=None, min_length=1, max_length=255)
    store_id: int | None = None
    scheduled_at: datetime | None = None


# --- Collaborator input schemas ---


class CollaboratorCreateIn(Schema):
    """Input schema for inviting a collaborator."""

    user_id: int
    role: str = "editor"


class CollaboratorUpdateIn(Schema):
    """Input schema for changing a collaborator's role."""

    role: str


# --- Recipe export schema ---


class FromRecipeIn(Schema):
    """Input schema for buying a recipe: a new trip (`store_id` + `scheduled_at`) or an existing list."""

    portions: int = Field(default=1, ge=1)
    include_consumables: bool = True
    store_id: int | None = None
    scheduled_at: datetime | None = None
    shopping_list_id: int | None = None


from core.schemas import PaginatedUserOut, UserSimpleOut  # noqa: F401 — re-export for backward compat

# --- Pagination ---


class PaginatedShoppingListOut(Schema):
    """Paginated response for shopping lists."""

    items: list[ShoppingListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# --- Kitchen Reminder schemas ---


class KitchenReminderOut(Schema):
    """Output schema for a single kitchen reminder item."""

    id: int
    name: str
    is_published: bool
    is_own_suggestion: bool = False


class KitchenReminderCategoryOut(Schema):
    """Output schema for a kitchen reminder category with its items."""

    id: int
    name: str
    sort_order: int
    reminders: list[KitchenReminderOut]


class KitchenReminderSuggestIn(Schema):
    """Input schema for suggesting a new kitchen reminder."""

    name: str


# --- REWE Export schemas ---


class ReweExportTokenResponse(Schema):
    """Response after generating a REWE export token."""

    token: str
    export_url: str
    expires_at: datetime


class ReweExportItem(Schema):
    """Single item in a REWE export list."""

    item_id: int
    ingredient_name: str
    nan_art_id_rewe: int | None = None
    order_quantity: float
    unit: str
    already_added_at: datetime | None = None
    matched: bool = False


class ReweExportListResponse(Schema):
    """Response for the REWE export endpoint."""

    items: list[ReweExportItem]
    shopping_list_id: int
    shopping_list_name: str


class ReweReportFailedItem(Schema):
    """A failed item in the REWE export report."""

    item_id: int
    reason: str


class ReweReportRequest(Schema):
    """Report from the bookmarklet about export results."""

    successful_item_ids: list[int] = []
    failed_item_ids: list[ReweReportFailedItem] = []


# --- Sharing by link ---


class ShoppingListShareOut(Schema):
    """Invitation link state; `share_token` is null while sharing is off."""

    share_token: str | None = None
    guests: list[ShoppingListGuestOut] = []


class SharedListPreviewOut(Schema):
    """What a visitor sees before joining: no entries, only the list's identity and their own guest status."""

    list_id: int
    name: str
    owner_display_name: str
    items_count: int
    checked_count: int
    # Set when the request's guest token (or session) already belongs to this list.
    already_member: bool = False
    guest_name: str | None = None


class SharedListJoinIn(Schema):
    """Name a guest wants to appear under; ignored for logged-in users."""

    name: str = Field(default="", max_length=40)


class SharedListJoinOut(Schema):
    list_id: int
    display_name: str
    # Secret the browser keeps for later requests; null when an account was added as member.
    guest_token: str | None = None
    guest_id: int | None = None


class ShoppingListPulseOut(Schema):
    """Cheap change marker the clients poll; the full list is fetched only when it changes."""

    stamp: str
