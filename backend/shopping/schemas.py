"""Pydantic schemas for the Shopping app."""

from datetime import datetime

from ninja import Schema


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
    recipe_name: str = ""
    recipe_slug: str = ""
    meal_label: str = ""
    quantity_g: float = 0.0


class ShoppingItemPortionOptionOut(Schema):
    """Output schema for a single portion option in the shopping list."""

    name: str
    display: str
    is_default: bool


class ShoppingListItemOut(Schema):
    """Output schema for a shopping list item."""

    id: int
    name: str
    quantity_g: float
    unit: str
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
    display_quantity: str = ""
    natural_portions: str = ""
    portion_options: list[ShoppingItemPortionOptionOut] = []
    sources: list[ShoppingItemSourceOut] = []

    @staticmethod
    def resolve_retail_section_name(obj) -> str:
        if obj.retail_section:
            return obj.retail_section.name
        return ""

    @staticmethod
    def resolve_checked_by_username(obj) -> str | None:
        if obj.checked_by:
            return obj.checked_by.username
        return None

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        if obj.ingredient:
            return obj.ingredient.slug
        return None

    @staticmethod
    def resolve_sources(obj) -> list:
        return obj.sources.all()

    @staticmethod
    def resolve_estimated_price_eur(obj) -> float | None:
        if not obj.ingredient or not obj.ingredient.price_per_kg or not obj.quantity_g:
            return None
        from supply.services.price_service import get_portion_price
        price = get_portion_price(obj.ingredient, obj.quantity_g)
        return float(price) if price is not None else None

    @staticmethod
    def resolve_display_quantity(obj) -> str:
        if not obj.quantity_g or obj.quantity_g <= 0:
            return ""
        if obj.unit != "g":
            return f"{obj.quantity_g} {obj.unit}"
        return _format_weight(obj.quantity_g)

    @staticmethod
    def resolve_natural_portions(obj) -> str:
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0:
            return ""
        portions = list(obj.ingredient.portions.order_by("-priority", "rank", "name"))
        if not portions:
            return ""
        from supply.services.shopping_service import compute_portion_options
        best_display, _ = compute_portion_options(obj.quantity_g, portions)
        return best_display

    @staticmethod
    def resolve_portion_options(obj) -> list[dict]:
        if not obj.ingredient or not obj.quantity_g or obj.quantity_g <= 0:
            return []
        portions = list(obj.ingredient.portions.order_by("-priority", "rank", "name"))
        if not portions:
            return []
        from supply.services.shopping_service import compute_portion_options
        _, options = compute_portion_options(obj.quantity_g, portions)
        return options


class ShoppingListItemCreateIn(Schema):
    """Input schema for adding an item to a shopping list."""

    name: str
    quantity_g: float = 0
    unit: str = "g"
    retail_section_id: int | None = None
    ingredient_id: int | None = None
    sort_order: int = 0
    note: str = ""


class ShoppingListItemUpdateIn(Schema):
    """Input schema for updating a shopping list item (partial)."""

    name: str | None = None
    quantity_g: float | None = None
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

    @staticmethod
    def resolve_owner_username(obj) -> str:
        return obj.owner.username if obj.owner else ""

    @staticmethod
    def resolve_items_count(obj) -> int:
        return obj.items.count()

    @staticmethod
    def resolve_checked_count(obj) -> int:
        return obj.items.filter(is_checked=True).count()

    @staticmethod
    def resolve_collaborators_count(obj) -> int:
        return obj.collaborators.count()


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
    created_at: datetime
    updated_at: datetime

    @staticmethod
    def resolve_owner_username(obj) -> str:
        return obj.owner.username if obj.owner else ""

    @staticmethod
    def resolve_items(obj) -> list:
        return obj.items.select_related(
            "retail_section", "checked_by", "ingredient"
        ).prefetch_related("sources", "ingredient__portions").all()

    @staticmethod
    def resolve_collaborators(obj) -> list:
        return obj.collaborators.select_related("user").all()

    @staticmethod
    def resolve_can_edit(obj) -> bool:
        return getattr(obj, "_can_edit", False)


def _format_weight(weight_g: float) -> str:
    """Format weight with smart unit conversion (g->kg) and rounding."""
    if weight_g >= 1000:
        kg = weight_g / 1000
        if kg == int(kg):
            return f"{int(kg)} kg"
        return f"{kg:.1f} kg"
    if weight_g >= 100:
        rounded = round(weight_g / 10) * 10
        return f"{int(rounded)} g"
    if weight_g >= 10:
        rounded = round(weight_g / 5) * 5
        return f"{int(rounded)} g"
    if weight_g >= 1:
        return f"{round(weight_g)} g"
    return f"{weight_g:.1f} g"


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

    servings: int = 1


class UserSimpleOut(Schema):
    """Minimal user info for collaborator selection."""

    id: int
    username: str


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
