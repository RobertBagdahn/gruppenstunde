"""Pydantic schemas for Ingredient, Portion, Alias."""

from ninja import Schema

from .reference import NutritionalTagOut


class IngredientAliasOut(Schema):
    """Output schema for an ingredient alias."""

    id: int
    name: str
    rank: int


class AliasCreateIn(Schema):
    """Input schema for creating an ingredient alias."""

    name: str
    rank: int = 1


class PortionOut(Schema):
    """Output schema for a portion."""

    id: int
    name: str
    quantity: float
    weight_g: float | None
    rank: int
    priority: int
    is_default: bool
    measuring_unit_id: int | None
    measuring_unit_name: str | None = None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        if obj.measuring_unit:
            return obj.measuring_unit.name
        return None


class PortionCreateIn(Schema):
    """Input schema for creating a portion."""

    name: str
    quantity: float = 1.0
    measuring_unit_id: int | None = None
    rank: int = 1
    priority: int = 0
    is_default: bool = False


class PortionUpdateIn(Schema):
    """Input schema for updating a portion."""

    name: str | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    rank: int | None = None
    priority: int | None = None
    is_default: bool | None = None


class IngredientListOut(Schema):
    """Compact ingredient for list views."""

    id: int
    name: str
    slug: str
    status: str
    energy_kj: float | None
    protein_g: float | None
    fat_g: float | None
    carbohydrate_g: float | None
    nutri_class: int | None
    price_per_kg: float | None
    retail_section_id: int | None
    retail_section_name: str | None = None

    @staticmethod
    def resolve_retail_section_name(obj) -> str | None:
        if obj.retail_section:
            return obj.retail_section.name
        return None


class IngredientDetailOut(Schema):
    """Full ingredient detail with portions, prices, aliases, tags."""

    id: int
    name: str
    slug: str
    description: str
    status: str

    # Physical
    physical_density: float
    physical_viscosity: str
    durability_in_days: int | None
    max_storage_temperature: int | None

    # Nutritional values per 100g
    energy_kj: float | None
    protein_g: float | None
    fat_g: float | None
    fat_sat_g: float | None
    carbohydrate_g: float | None
    sugar_g: float | None
    fibre_g: float | None
    salt_g: float | None
    sodium_mg: float | None
    fructose_g: float | None
    lactose_g: float | None

    # Scores
    child_score: int | None
    scout_score: int | None
    environmental_score: int | None
    nova_score: int | None
    fruit_factor: float | None

    # Calculated
    nutri_score: int | None
    nutri_class: int | None
    price_per_kg: float | None

    # References
    fdc_id: int | None
    ean: str

    # Relations
    retail_section_id: int | None
    retail_section_name: str | None = None
    nutritional_tags: list[NutritionalTagOut] = []
    portions: list[PortionOut] = []
    aliases: list[IngredientAliasOut] = []

    created_at: str = ""
    updated_at: str = ""

    @staticmethod
    def resolve_retail_section_name(obj) -> str | None:
        if obj.retail_section:
            return obj.retail_section.name
        return None

    @staticmethod
    def resolve_nutritional_tags(obj) -> list:
        return [
            {
                "id": t.id,
                "name": t.name,
                "name_opposite": t.name_opposite,
                "description": t.description,
                "rank": t.rank,
                "is_dangerous": t.is_dangerous,
            }
            for t in obj.nutritional_tags.all()
        ]

    @staticmethod
    def resolve_portions(obj) -> list:
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
            for p in obj.portions.select_related("measuring_unit").all()
        ]

    @staticmethod
    def resolve_aliases(obj) -> list:
        return [{"id": a.id, "name": a.name, "rank": a.rank} for a in obj.aliases.all()]

    @staticmethod
    def resolve_created_at(obj) -> str:
        return obj.created_at.isoformat() if obj.created_at else ""

    @staticmethod
    def resolve_updated_at(obj) -> str:
        return obj.updated_at.isoformat() if obj.updated_at else ""


class IngredientCreateIn(Schema):
    """Input schema for creating an ingredient."""

    name: str
    description: str = ""
    physical_density: float = 1.0
    physical_viscosity: str = "solid"
    durability_in_days: int | None = None
    max_storage_temperature: int | None = None

    # Nutritional values
    energy_kj: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fat_sat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    sodium_mg: float | None = None
    fructose_g: float | None = None
    lactose_g: float | None = None

    # Scores
    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    nova_score: int | None = None
    fruit_factor: float | None = None

    # References
    fdc_id: int | None = None
    ean: str = ""

    # Relations
    retail_section_id: int | None = None
    nutritional_tag_ids: list[int] = []


class IngredientUpdateIn(Schema):
    """Input schema for updating an ingredient."""

    name: str | None = None
    description: str | None = None
    physical_density: float | None = None
    physical_viscosity: str | None = None
    durability_in_days: int | None = None
    max_storage_temperature: int | None = None

    energy_kj: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fat_sat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    sodium_mg: float | None = None
    fructose_g: float | None = None
    lactose_g: float | None = None

    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    nova_score: int | None = None
    fruit_factor: float | None = None

    fdc_id: int | None = None
    ean: str | None = None

    retail_section_id: int | None = None
    nutritional_tag_ids: list[int] | None = None
    status: str | None = None


class PaginatedIngredientOut(Schema):
    """Paginated ingredient response."""

    items: list[IngredientListOut]
    total: int
    page: int
    page_size: int
    total_pages: int
