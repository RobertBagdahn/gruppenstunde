"""RecipeItem schemas."""

from datetime import datetime
from typing import cast

from ninja import Schema
from pydantic import Field

from supply.schemas.ingredients import PortionOut


class CurrentPortionOut(Schema):
    """The active portion a superseded `RecipeItem.portion` was replaced by."""

    id: int
    name: str
    weight_g: float | None


class RecipeItemOut(Schema):
    id: int
    portion_id: int | None = None
    portion_name: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str = ""
    ingredient_slug: str | None = None
    quantity: float
    standard_measure_key: str = ""
    unit_kind: str | None = None
    unit_label: str = ""
    is_weight_approx: bool = False
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
    current_portion: CurrentPortionOut | None = None

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
            return cast(str, obj.portion.name)
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        if ingredient:
            return cast(str, ingredient.name)
        if obj.portion and obj.portion.name:
            return cast(str, obj.portion.name)
        if obj.note:
            return cast(str, obj.note)
        return "Zutat"

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(int, ingredient.id) if ingredient else None

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(str, ingredient.slug) if ingredient else None

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
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient
        from supply.services.portion_resolution import is_piece_like_name

        ingredient = get_recipe_item_ingredient(obj)
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
            for p in ingredient.portions.active().select_related("measuring_unit").all()
        ]

    @staticmethod
    def resolve_ingredient_density(obj) -> float | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(float, ingredient.physical_density) if ingredient else None

    @staticmethod
    def resolve_ingredient_viscosity(obj) -> str | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(str, ingredient.physical_viscosity) if ingredient else None

    @staticmethod
    def resolve_ingredient_price_per_kg(obj) -> float | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(float, ingredient.price_per_kg) if ingredient else None

    @staticmethod
    def resolve_ingredient_nutri_class(obj) -> int | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(int, ingredient.nutri_class) if ingredient else None

    @staticmethod
    def resolve_ingredient_retail_section_id(obj) -> int | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(int, ingredient.retail_section_id) if ingredient and ingredient.retail_section_id else None

    @staticmethod
    def resolve_ingredient_retail_section_name(obj) -> str | None:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(str, ingredient.retail_section.name) if ingredient and ingredient.retail_section else None

    @staticmethod
    def resolve_standard_measure_key(obj) -> str:
        return cast(str, getattr(obj, "standard_measure_key", "") or "")

    @staticmethod
    def resolve_unit_kind(obj) -> str | None:
        from supply.services.portion_resolution import is_direct_metric_portion

        if getattr(obj, "standard_measure_key", ""):
            return "standard"
        if obj.portion is None or is_direct_metric_portion(obj.portion):
            return "grams"
        return "portion"

    @staticmethod
    def resolve_unit_label(obj) -> str:
        from supply.services.portion_resolution import is_direct_metric_portion
        from supply.services.quantity_units import STANDARD_MEASURE_LABELS, portion_label

        standard_key = getattr(obj, "standard_measure_key", "") or ""
        if standard_key:
            return STANDARD_MEASURE_LABELS.get(standard_key, standard_key)
        if obj.portion is None or is_direct_metric_portion(obj.portion):
            return "g"
        return portion_label(obj.portion)

    @staticmethod
    def resolve_is_weight_approx(obj) -> bool:
        from recipe.services.recipe_item_helpers import is_recipe_item_weight_approx

        return is_recipe_item_weight_approx(obj)

    @staticmethod
    def resolve_weight_g(obj) -> float:
        from supply.services.portion_resolution import is_piece_like_name, resolve_trusted_weight

        if getattr(obj, "standard_measure_key", ""):
            from recipe.services.recipe_item_helpers import resolve_recipe_item_grams

            return resolve_recipe_item_grams(obj) or 0.0
        if obj.portion is None:
            return cast(float, obj.quantity)
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

        if getattr(obj, "standard_measure_key", ""):
            from recipe.services.recipe_amount_display import format_amount_label, format_recipe_item_amount
            from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

            ingredient = get_recipe_item_ingredient(obj)
            amount = format_recipe_item_amount(obj, ingredient)
            return format_amount_label(amount, ingredient.name if ingredient else "")
        if obj.portion is None:
            from recipe.services.recipe_item_helpers import get_recipe_item_ingredient
            from supply.utils import format_weight

            ingredient = get_recipe_item_ingredient(obj)
            amount = format_weight(float(obj.quantity))
            return f"{amount} {ingredient.name}" if ingredient else amount

        display, _ = build_portion_display(obj.quantity, obj.portion, obj.portion.ingredient)
        return display

    @staticmethod
    def resolve_has_missing_weight(obj) -> bool:
        if getattr(obj, "standard_measure_key", ""):
            from recipe.services.recipe_item_helpers import resolve_recipe_item_grams

            return resolve_recipe_item_grams(obj) is None
        if obj.portion is None:
            return False

        from supply.utils import build_portion_display

        _, has_missing = build_portion_display(obj.quantity, obj.portion, obj.portion.ingredient)
        return has_missing

    @staticmethod
    def resolve_current_portion(obj) -> dict | None:
        """The portion `obj.portion` was superseded by, if any and still active.

        `None` when the item's portion was never superseded, or when its
        successor was itself deleted/further superseded (rebinding on delete
        should prevent that — see `delete_portion` — but this stays defensive).
        """
        if not obj.portion:
            return None
        successor = obj.portion.superseded_by
        if successor is None:
            return None
        if successor.deleted_at is not None or successor.superseded_by_id is not None:
            return None
        return {"id": successor.id, "name": successor.name, "weight_g": successor.weight_g}


class RecipeItemCreateIn(Schema):
    portion_id: int | None = None  # NULL means quantity is stored directly in grams
    ingredient_id: int | None = None  # Required for ingredient-based calculations when portion_id is NULL
    # Standard measure key (el, tl, tasse, prise, msp); quantity is then a count of
    # that measure and portion_id must be the ingredient's "g" base portion (or NULL).
    standard_measure_key: str | None = None
    client_request_id: str | None = None
    idempotency_key: str | None = None
    quantity: float = 1
    sort_order: int = 0
    note: str = ""
    is_optional: bool = False


class RecipeItemAlternativeCreateIn(Schema):
    portion_id: int
    quantity: float = Field(gt=0)
    client_request_id: str = Field(min_length=1, max_length=64)


class RecipeItemUpdateIn(Schema):
    portion_id: int | None = None
    ingredient_id: int | None = None
    # "" or null clears the standard measure; omitted keeps it unless the portion changes.
    standard_measure_key: str | None = None
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
    portion_id: int | None = None
    ingredient_name: str = ""
    quantity: float

    @staticmethod
    def resolve_recipe_item_id(obj) -> int:
        return cast(int, obj.id)

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        from recipe.services.recipe_item_helpers import get_recipe_item_ingredient

        ingredient = get_recipe_item_ingredient(obj)
        return cast(str, ingredient.name) if ingredient else ""


class RecipeItemExchangeGroupOut(Schema):
    id: int
    recipe_id: int
    name: str = ""
    members: list[ExchangeGroupMemberOut] = []

    @staticmethod
    def resolve_members(obj) -> list:
        return list(obj.items.select_related("portion__ingredient", "ingredient").order_by("exchange_position"))


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


class AdoptCurrentPortionsIn(Schema):
    """Input for `POST .../recipe-items/adopt-current-portions/`.

    `item_ids=None` adopts the current portion for every RecipeItem of the
    recipe whose portion has been superseded; an explicit list restricts it
    to those items (used by the single-item "Aktualisieren" action, which
    passes exactly one id).
    """

    item_ids: list[int] | None = None


class AdoptCurrentPortionsOut(Schema):
    """Response of `POST .../recipe-items/adopt-current-portions/`."""

    updated_count: int
    items: list[RecipeItemOut]


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
