"""RecipeItem schemas."""

from ninja import Schema

from supply.schemas.ingredients import PortionOut


class RecipeItemOut(Schema):
    id: int
    portion_id: int | None = None
    portion_name: str | None = None
    ingredient_id: int | None = None
    ingredient_name: str | None = None
    ingredient_slug: str | None = None
    quantity: float
    measuring_unit_id: int | None = None
    measuring_unit_name: str | None = None
    sort_order: int
    note: str
    quantity_type: str
    ingredient_portions: list[PortionOut] = []
    ingredient_density: float | None = None
    ingredient_viscosity: str | None = None

    @staticmethod
    def resolve_portion_name(obj) -> str | None:
        if obj.portion:
            return str(obj.portion)
        return None

    @staticmethod
    def resolve_ingredient_name(obj) -> str | None:
        if obj.ingredient:
            return obj.ingredient.name
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.name
        return None

    @staticmethod
    def resolve_ingredient_id(obj) -> int | None:
        if obj.ingredient_id:
            return obj.ingredient_id
        if obj.portion and obj.portion.ingredient_id:
            return obj.portion.ingredient_id
        return None

    @staticmethod
    def resolve_ingredient_slug(obj) -> str | None:
        if obj.ingredient:
            return obj.ingredient.slug
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.slug
        return None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        if obj.measuring_unit:
            return obj.measuring_unit.name
        if obj.portion and obj.portion.measuring_unit:
            return obj.portion.measuring_unit.name
        return None

    @staticmethod
    def resolve_measuring_unit_id(obj) -> int | None:
        if obj.measuring_unit_id:
            return obj.measuring_unit_id
        if obj.portion and obj.portion.measuring_unit_id:
            return obj.portion.measuring_unit_id
        return None

    @staticmethod
    def resolve_ingredient_portions(obj) -> list:
        ingredient = None
        if obj.ingredient:
            ingredient = obj.ingredient
        elif obj.portion and obj.portion.ingredient:
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
            for p in ingredient.portions.select_related("measuring_unit").all()
        ]

    @staticmethod
    def resolve_ingredient_density(obj) -> float | None:
        if obj.ingredient:
            return obj.ingredient.physical_density
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.physical_density
        return None

    @staticmethod
    def resolve_ingredient_viscosity(obj) -> str | None:
        if obj.ingredient:
            return obj.ingredient.physical_viscosity
        if obj.portion and obj.portion.ingredient:
            return obj.portion.ingredient.physical_viscosity
        return None


class RecipeItemCreateIn(Schema):
    portion_id: int | None = None
    ingredient_id: int | None = None
    quantity: float = 1
    measuring_unit_id: int | None = None
    sort_order: int = 0
    note: str = ""
    quantity_type: str = "once"


class RecipeItemUpdateIn(Schema):
    portion_id: int | None = None
    ingredient_id: int | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    sort_order: int | None = None
    note: str | None = None
    quantity_type: str | None = None
