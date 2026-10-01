"""Pydantic schemas for the Shopping app."""

from datetime import datetime

from ninja import Schema
from pydantic import Field

from planner.schemas.buffet import QuantityWarningOut

# --- Collaborator schemas ---


class ShoppingListCollaboratorOut(Schema):
    """Output schema for a shopping list collaborator."""

    id: int
    user_id: int
    username: str = ""
    role: str

    @staticmethod
    def resolve_username(obj) -> str:
        return obj.user.username if obj.user else ""


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


class ShoppingPieceEquivalentOut(Schema):
    """The single best-matching natural portion for a quantity (e.g. "≈ 3
    Scheiben"). Structured so the frontend formats the count and word."""

    count: float
    portion_name: str


class ShoppingPackageOptionOut(Schema):
    """A shop-bought package count for a quantity (e.g. "2 × 500 g Packung").
    Only present when the ingredient has a rank=1 Package."""

    count: int
    package_name: str
    weight_g: float


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
    is_checked: bool
    checked_by_username: str | None = None
    checked_at: datetime | None = None
    sort_order: int
    note: str = ""
    ingredient_id: int | None = None
    ingredient_slug: str | None = None
    estimated_price_eur: float | None = None
    piece_equivalent: ShoppingPieceEquivalentOut | None = None
    portion_options: list[ShoppingItemPortionOptionOut] = []
    package_options: list[ShoppingPackageOptionOut] = []
    sources: list[ShoppingItemSourceOut] = []

    @staticmethod
    def resolve_retail_section_name(obj) -> str:
        if obj.retail_section:
            return str(obj.retail_section.name)
        return ""

    @staticmethod
    def resolve_checked_by_username(obj) -> str | None:
        if obj.checked_by:
            return str(obj.checked_by.username)
        return None

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
    def resolve_piece_equivalent(obj) -> dict | None:
        from supply.choices import LIQUID_VISCOSITIES

        if (
            not obj.ingredient
            or obj.ingredient.physical_viscosity in LIQUID_VISCOSITIES
            or not obj.quantity_g
            or obj.quantity_g <= 0
            or obj.unit != "g"
        ):
            return None
        portions = list(obj.ingredient.portions.order_by("rank", "name"))
        if not portions:
            return None
        from supply.services.shopping_service import compute_portion_options

        best, _ = compute_portion_options(obj.quantity_g, portions)
        if not best:
            return None
        return {"count": best["count"], "portion_name": best["name"]}

    @staticmethod
    def resolve_portion_options(obj) -> list[dict]:
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0:
            return []
        portions = list(obj.ingredient.portions.order_by("rank", "name"))
        if not portions:
            return []
        from supply.services.shopping_service import compute_portion_options

        _, options = compute_portion_options(obj.quantity_g, portions)
        return options

    @staticmethod
    def _package_need(obj):
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0 or obj.unit != "g":
            return None, None
        from supply.utils import compute_package_need, get_shopping_portion

        package = get_shopping_portion(obj.ingredient)
        if not package:
            return None, None
        return package, compute_package_need(obj.quantity_g, package.weight_g)

    @staticmethod
    def resolve_package_options(obj) -> list[dict]:
        package, need = ShoppingListItemOut._package_need(obj)
        if not package or not need:
            return []
        return [{"count": need[0], "package_name": package.name, "weight_g": package.weight_g}]

    @staticmethod
    def resolve_package_surplus_g(obj) -> float | None:
        _, need = ShoppingListItemOut._package_need(obj)
        return need[1] if need else None


class ShoppingListItemCreateIn(Schema):
    """Input schema for adding an item to a shopping list."""

    name: str
    quantity_g: float = Field(default=0, ge=0)
    unit: str = "g"
    retail_section_id: int | None = None
    ingredient_id: int | None = None
    sort_order: int = 0
    note: str = ""


class ShoppingListItemUpdateIn(Schema):
    """Input schema for updating a shopping list item (partial)."""

    name: str | None = None
    quantity_g: float | None = Field(default=None, ge=0)
    unit: str | None = None
    retail_section_id: int | None = None
    is_checked: bool | None = None
    sort_order: int | None = None
    note: str | None = None


# --- List schemas ---


class ShoppingListOut(Schema):
    """Output schema for shopping list in list views (summary)."""

    id: int
    name: str
    owner_id: int
    owner_username: str = ""
    source_type: str
    source_id: int | None = None
    items_count: int = 0
    checked_count: int = 0
    collaborators_count: int = 0
    created_at: datetime
    updated_at: datetime
    can_edit: bool = False
    can_delete: bool = False

    @staticmethod
    def resolve_owner_username(obj) -> str:
        return obj.owner.username if obj.owner else ""

    @staticmethod
    def resolve_items_count(obj) -> int:
        # Use annotated value from queryset when available (avoids N+1)
        return int(getattr(obj, "items_count", None) or obj.items.count())

    @staticmethod
    def resolve_checked_count(obj) -> int:
        return int(getattr(obj, "checked_count", None) or obj.items.filter(is_checked=True).count())

    @staticmethod
    def resolve_collaborators_count(obj) -> int:
        return int(getattr(obj, "collaborators_count", None) or obj.collaborators.count())


class ShoppingListDetailOut(Schema):
    """Output schema for shopping list detail view with items and collaborators."""

    id: int
    name: str
    owner_id: int
    owner_username: str = ""
    source_type: str
    source_id: int | None = None
    items: list[ShoppingListItemOut] = []
    collaborators: list[ShoppingListCollaboratorOut] = []
    can_edit: bool = False
    is_owner: bool = False
    created_at: datetime
    updated_at: datetime
    # Only filled when the list is generated from a meal plan.
    warnings: list[QuantityWarningOut] = []

    @staticmethod
    def resolve_warnings(obj) -> list[dict]:
        return [warning.as_dict() for warning in getattr(obj, "quantity_warnings", [])]

    @staticmethod
    def resolve_owner_username(obj) -> str:
        return obj.owner.username if obj.owner else ""

    @staticmethod
    def resolve_items(obj) -> list:
        return list(
            obj.items.select_related("retail_section", "checked_by", "ingredient")
            .prefetch_related("sources", "ingredient__portions")
            .all()
        )

    @staticmethod
    def resolve_collaborators(obj) -> list:
        return list(obj.collaborators.select_related("user").all())

    @staticmethod
    def resolve_can_edit(obj) -> bool:
        return getattr(obj, "_can_edit", False)

    @staticmethod
    def resolve_is_owner(obj) -> bool:
        return getattr(obj, "_is_owner", False)


class ShoppingListCreateIn(Schema):
    """Input schema for creating a new shopping list."""

    name: str


class ShoppingListUpdateIn(Schema):
    """Input schema for updating a shopping list (partial)."""

    name: str | None = None


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
    """Input schema for creating a shopping list from a recipe."""

    portions: int = Field(default=1, ge=1)


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
