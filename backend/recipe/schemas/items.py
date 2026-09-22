"""RecipeItem schemas."""

from datetime import datetime
from typing import cast

from ninja import Schema

from supply.schemas.ingredients import PortionOut


class RecipeItemOut(Schema):
    id: int
    portion_id: int | None = None
    portion_name: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str = ""
    ingredient_slug: str | None = None
    quantity: float
    client_request_id: str | None = None
    idempotency_key: str | None = None
    measuring_unit_id: int | None = None
    measuring_unit_name: str | None = None
    sort_order: int
    note: str
    ingredient_portions: list[PortionOut] = []
    ingredient_density: float | None = None
    ingredient_viscosity: str | None = None
    ingredient_price_per_kg: float | None = None
    ingredient_nutri_class: int | None = None
    ingredient_retail_section_id: int | None = None
    ingredient_retail_section_name: str | None = None
    weight_g: float
    is_optional: bool = False
    exchange_group_id: int | None = None
    exchange_position: int | None = None
    portion_display: str = ""
    has_missing_weight: bool = False
    weight_status: str | None = None
    weight_source: str | None = None
    weight_confirmed_at: datetime | None = None
    is_weight_trusted: bool = False

    @staticmethod
    def resolve_idempotency_key(obj) -> str | None:
        return getattr(obj, "client_request_id", None)

    @staticmethod
    def resolve_weight_status(obj) -> str | None:
        if obj.portion:
            return cast(str | None, obj.portion.weight_status)
        return None

    @staticmethod
    def resolve_weight_source(obj) -> str | None:
        if obj.portion:
            return cast(str | None, obj.portion.weight_source)
        return None

    @staticmethod
    def resolve_weight_confirmed_at(obj) -> datetime | None:
        if obj.portion:
            return cast(datetime | None, obj.portion.weight_confirmed_at)
        return None

    @staticmethod
    def resolve_is_weight_trusted(obj) -> bool:
        if obj.portion:
            trusted = getattr(obj.portion, "is_weight_trusted", None)
            return bool(trusted) if trusted is not None else False
        return False

    @staticmethod
    def resolve_portion_name(obj) -> str | None:
        if obj.portion:
            return str(obj.portion)
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        if obj.portion and obj.portion.ingredient:
            return cast(str, obj.portion.ingredient.name)
        if obj.portion and obj.portion.name:
            return cast(str, obj.portion.name)
        if obj.note:
            return cast(str, obj.note)
        return "Zutat"

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        if obj.portion and obj.portion.ingredient_id:
            return cast(int, obj.portion.ingredient_id)
        return None

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        if obj.portion and obj.portion.ingredient:
            return cast(str, obj.portion.ingredient.slug)
        return None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        if obj.portion and obj.portion.measuring_unit:
            return cast(str, obj.portion.measuring_unit.name)
        return None

    @staticmethod
    def resolve_measuring_unit_id(obj) -> int | None:
        if obj.portion and obj.portion.measuring_unit_id:
            return cast(int, obj.portion.measuring_unit_id)
        return None

    @staticmethod
    def resolve_ingredient_portions(obj) -> list:
        from supply.services.portion_resolution import is_piece_like_name

        ingredient = None
        if obj.portion and obj.portion.ingredient:
            ingredient = obj.portion.ingredient

        if not ingredient:
            return []

        return [
            {
                "id": p.id,
                "name": p.name,
                "quantity": p.quantity,
                "weight_g": p.weight_g,
                "rank": p.rank,
                "measuring_unit_id": p.measuring_unit_id,
                "measuring_unit_name": p.measuring_unit.name if p.measuring_unit else None,
                "weight_status": p.weight_status,
                "weight_source": p.weight_source,
                "weight_confirmed_at": p.weight_confirmed_at,
                "weight_confidence": p.weight_confidence,
                "is_weight_trusted": p.is_weight_trusted,
                "is_piece_like": is_piece_like_name(p.name),
            }
            for p in ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit").all()
        ]

    @staticmethod
    def resolve_ingredient_density(obj) -> float | None:
        if obj.portion and obj.portion.ingredient:
            return cast(float, obj.portion.ingredient.physical_density)
        return None

    @staticmethod
    def resolve_ingredient_viscosity(obj) -> str | None:
        if obj.portion and obj.portion.ingredient:
            return cast(str, obj.portion.ingredient.physical_viscosity)
        return None

    @staticmethod
    def resolve_ingredient_price_per_kg(obj) -> float | None:
        if obj.portion and obj.portion.ingredient:
            return cast(float, obj.portion.ingredient.price_per_kg)
        return None

    @staticmethod
    def resolve_ingredient_nutri_class(obj) -> int | None:
        if obj.portion and obj.portion.ingredient:
            return cast(int, obj.portion.ingredient.nutri_class)
        return None

    @staticmethod
    def resolve_ingredient_retail_section_id(obj) -> int | None:
        if obj.portion and obj.portion.ingredient and obj.portion.ingredient.retail_section_id:
            return cast(int, obj.portion.ingredient.retail_section_id)
        return None

    @staticmethod
    def resolve_ingredient_retail_section_name(obj) -> str | None:
        if obj.portion and obj.portion.ingredient and obj.portion.ingredient.retail_section:
            return cast(str, obj.portion.ingredient.retail_section.name)
        return None

    @staticmethod
    def resolve_weight_g(obj) -> float:
        from supply.services.portion_resolution import is_piece_like_name, resolve_trusted_weight

        if obj.portion:
            trusted = resolve_trusted_weight(obj.portion)
            if trusted is not None:
                return cast(float, obj.quantity * trusted)
            if obj.portion.measuring_unit and not is_piece_like_name(obj.portion.name):
                return cast(float, obj.quantity * obj.portion.quantity * obj.portion.measuring_unit.quantity)
            # Unresolved piece weight — no fabricated gram value.
            return 0.0
        return cast(float, obj.quantity)

    @staticmethod
    def resolve_portion_display(obj) -> str:
        from supply.utils import build_portion_display

        ingredient = obj.portion.ingredient if obj.portion else None
        display, _ = build_portion_display(obj.quantity, obj.portion, ingredient)
        return display

    @staticmethod
    def resolve_has_missing_weight(obj) -> bool:
        from supply.utils import build_portion_display

        ingredient = obj.portion.ingredient if obj.portion else None
        _, has_missing = build_portion_display(obj.quantity, obj.portion, ingredient)
        return has_missing


class RecipeItemCreateIn(Schema):
    portion_id: int | None = None  # NULL means quantity is stored directly in grams
    client_request_id: str | None = None
    idempotency_key: str | None = None
    quantity: float = 1
    sort_order: int = 0
    note: str = ""
    is_optional: bool = False


class RecipeItemUpdateIn(Schema):
    portion_id: int | None = None
    quantity: float | None = None
    sort_order: int | None = None
    note: str | None = None
    is_optional: bool | None = None
    exchange_group_id: int | None = None
    exchange_position: int | None = None
    # Optional: set by the frontend when applying an AI quantity estimate, so
    # the backend can verify `quantity * portion.weight_g` matches the AI's
    # intended gram amount (safety net against portion/quantity mismatches,
    # see openspec change `fix-portion-integrity-and-ai-estimate`).
    expected_grams_total: float | None = None


class RecipeItemExchangeGroupCreateIn(Schema):
    name: str = ""


class ExchangeGroupMemberOut(Schema):
    """A member RecipeItem of an exchange group (lightweight)."""

    recipe_item_id: int
    exchange_position: int | None = None
    portion_id: int
    ingredient_name: str = ""
    quantity: float

    @staticmethod
    def resolve_recipe_item_id(obj) -> int:
        return cast(int, obj.id)

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        if obj.portion and obj.portion.ingredient:
            return cast(str, obj.portion.ingredient.name)
        return ""


class RecipeItemExchangeGroupOut(Schema):
    id: int
    recipe_id: int
    name: str = ""
    members: list[ExchangeGroupMemberOut] = []

    @staticmethod
    def resolve_members(obj) -> list:
        return list(obj.items.select_related("portion__ingredient").order_by("exchange_position"))


# ---------------------------------------------------------------------------
# AI Ingredient Suggestion schemas
# ---------------------------------------------------------------------------


class AiIngredientSuggestionOut(Schema):
    """Single AI-suggested ingredient with portion and quantity.

    Unresolved candidates (no matching ingredient) keep `ingredient_id` and
    `portion_id` as None and `is_new_ingredient=True`. Replacement candidates
    carry `replacement_for_item_id`/`replacement_reason`/`replacement_confidence`.
    """

    ingredient_id: int | None = None
    ingredient_name: str
    portion_id: int | None = None
    portion_name: str | None = None
    quantity: float
    is_new_ingredient: bool = False
    note: str = ""
    replacement_for_item_id: int | None = None
    replacement_reason: str | None = None
    replacement_confidence: float | None = None


class AiIngredientSuggestionsOut(Schema):
    """Wrapper for AI-suggested ingredients including the interaction id for feedback."""

    items: list[AiIngredientSuggestionOut]
    ai_interaction_id: str | None = None


class AiIngredientApplyIn(Schema):
    """Input for applying a single AI suggestion.

    Resolved candidates provide `portion_id`. Unresolved candidates provide
    `name` (and optionally a known `ingredient_id`); the ingredient and a
    gram fallback portion are then created at apply time.
    """

    portion_id: int | None = None
    ingredient_id: int | None = None
    name: str | None = None
    quantity: float = 1.0
    note: str = ""
    is_optional: bool = False


class RecipeItemReplaceIn(Schema):
    """Input for replacing a RecipeItem's portion with a target portion."""

    portion_id: int
    ingredient_id: int | None = None
    quantity: float | None = None
    client_request_id: str | None = None


# ---------------------------------------------------------------------------
# AI Quantity Estimation schemas (inline edit)
# ---------------------------------------------------------------------------


class EstimateQuantityItemOut(Schema):
    """Single item in the quantity estimation response."""

    item_id: int
    ingredient_name: str
    quantity_per_portion: float
    portion_id: int
    unit: str
    grams_total: float
    weight_status: str | None = None
    is_weight_trusted: bool = False


class EstimateQuantitiesOut(Schema):
    """Response for AI-based quantity estimation of existing recipe items."""

    items: list[EstimateQuantityItemOut]
