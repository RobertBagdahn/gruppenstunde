"""RecipeItem schemas."""

from ninja import Schema

from supply.schemas.ingredients import PortionOut


class RecipeItemOut(Schema):
    id: int
    portion_id: int
    portion_name: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str = ""
    ingredient_slug: str | None = None
    quantity: float
    measuring_unit_id: int | None = None
    measuring_unit_name: str | None = None
    sort_order: int
    note: str
    ingredient_portions: list[PortionOut] = []
    ingredient_density: float | None = None
    ingredient_viscosity: str | None = None
    ingredient_price_per_kg: float | None = None
    ingredient_nutri_class: int | None = None
    weight_g: float

    @staticmethod
    def resolve_portion_name(obj) -> str | None:
        if obj.portion:
            return str(obj.portion)
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.name
        if obj.portion and obj.portion.name:
            return obj.portion.name
        if obj.note:
            return obj.note
        return "Zutat"

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        if obj.portion and obj.portion.ingredient_id:
            return obj.portion.ingredient_id
        return None

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.slug
        return None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        if obj.portion and obj.portion.measuring_unit:
            return obj.portion.measuring_unit.name
        return None

    @staticmethod
    def resolve_measuring_unit_id(obj) -> int | None:
        if obj.portion and obj.portion.measuring_unit_id:
            return obj.portion.measuring_unit_id
        return None

    @staticmethod
    def resolve_ingredient_portions(obj) -> list:
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
                "priority": p.priority,
                "is_default": p.is_default,
                "measuring_unit_id": p.measuring_unit_id,
                "measuring_unit_name": p.measuring_unit.name if p.measuring_unit else None,
            }
            for p in ingredient.portions.filter(deleted_at__isnull=True).select_related("measuring_unit").all()
        ]

    @staticmethod
    def resolve_ingredient_density(obj) -> float | None:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.physical_density
        return None

    @staticmethod
    def resolve_ingredient_viscosity(obj) -> str | None:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.physical_viscosity
        return None

    @staticmethod
    def resolve_ingredient_price_per_kg(obj) -> float | None:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.price_per_kg
        return None

    @staticmethod
    def resolve_ingredient_nutri_class(obj) -> int | None:
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.nutri_class
        return None

    @staticmethod
    def resolve_weight_g(obj) -> float:
        if obj.portion and obj.portion.weight_g:
            return obj.quantity * obj.portion.weight_g
        elif obj.portion and obj.portion.measuring_unit:
            return obj.quantity * obj.portion.quantity * obj.portion.measuring_unit.quantity
        return 0.0


class RecipeItemCreateIn(Schema):
    portion_id: int
    quantity: float = 1
    sort_order: int = 0
    note: str = ""


class RecipeItemUpdateIn(Schema):
    portion_id: int | None = None
    quantity: float | None = None
    sort_order: int | None = None
    note: str | None = None


# ---------------------------------------------------------------------------
# AI Ingredient Suggestion schemas
# ---------------------------------------------------------------------------


class AiIngredientSuggestionOut(Schema):
    """Single AI-suggested ingredient with portion and quantity."""

    ingredient_id: int
    ingredient_name: str
    portion_id: int
    portion_name: str | None = None
    quantity: float
    is_new_ingredient: bool = False


class AiIngredientApplyIn(Schema):
    """Input for applying a single AI suggestion."""

    portion_id: int
    quantity: float = 1.0


# ---------------------------------------------------------------------------
# AI Quantity Estimation schemas (inline edit)
# ---------------------------------------------------------------------------


class EstimateQuantityItemOut(Schema):
    """Single item in the quantity estimation response."""

    item_id: int
    ingredient_name: str
    quantity_per_portion: float
    unit: str


class EstimateQuantitiesOut(Schema):
    """Response for AI-based quantity estimation of existing recipe items."""

    items: list[EstimateQuantityItemOut]
