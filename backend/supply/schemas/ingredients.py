"""Pydantic schemas for Ingredient, Portion, Alias."""

from datetime import datetime

from ninja import Schema

from .reference import IngredientGroupOut, NutritionalTagOut


class IngredientAliasOut(Schema):
    """Output schema for an ingredient alias."""

    id: int
    name: str
    rank: int
    is_generic: bool = False


class AliasCreateIn(Schema):
    """Input schema for creating an ingredient alias."""

    name: str
    rank: int = 1
    is_generic: bool = False


class PortionOut(Schema):
    """Output schema for a portion."""

    id: int
    name: str
    quantity: float
    weight_g: float | None
    rank: int
    is_system: bool = False
    measuring_unit_id: int | None
    measuring_unit_name: str | None = None

    @staticmethod
    def resolve_measuring_unit_name(obj) -> str | None:
        # Support both ORM objects and dicts (from resolve_ingredient_portions)
        if isinstance(obj, dict):
            return obj.get("measuring_unit_name")
        if hasattr(obj, "measuring_unit") and obj.measuring_unit:
            return obj.measuring_unit.name
        return None


class PortionCreateIn(Schema):
    """Input schema for creating a portion."""

    name: str
    quantity: float = 1.0
    measuring_unit_id: int | None = None
    weight_g: float | None = None
    rank: int = 1


class PortionUpdateIn(Schema):
    """Input schema for updating a portion."""

    name: str | None = None
    quantity: float | None = None
    measuring_unit_id: int | None = None
    weight_g: float | None = None
    rank: int | None = None


class PortionReorderItem(Schema):
    """Single item in reorder request."""

    id: int
    rank: int


class PortionReorderIn(Schema):
    """Input schema for reordering multiple portions."""

    orders: list[PortionReorderItem]


class IngredientListOut(Schema):
    """Compact ingredient for list views."""

    id: int
    name: str
    slug: str
    status: str
    energy_kcal: float | None
    protein_g: float | None
    fat_g: float | None
    carbohydrate_g: float | None
    nutri_class: int | None
    price_per_kg: float | None
    retail_section_id: int | None
    retail_section_name: str | None = None
    quality_score: int | None = None
    usage_count: int = 0
    groups: list[IngredientGroupOut] = []

    @staticmethod
    def resolve_retail_section_name(obj) -> str | None:
        if obj.retail_section:
            return obj.retail_section.name
        return None

    @staticmethod
    def resolve_groups(obj) -> list:
        return [{"id": g.id, "name": g.name, "slug": g.slug} for g in obj.groups.all()]


class IngredientDetailOut(Schema):
    """Full ingredient detail with portions, prices, aliases, tags."""

    id: int
    name: str
    slug: str
    description: str
    status: str
    name_warning: str | None = None

    # Physical
    physical_density: float
    physical_viscosity: str
    durability_in_days: int | None
    max_storage_temperature: int | None

    # Scout/camp fields
    storage_type: str | None = None
    cooking_factor: float | None = None
    camp_suitable: bool = False
    preparation_time_min: int | None = None
    season_start: int | None = None
    season_end: int | None = None

    # Nutritional values per 100g
    energy_kcal: float | None
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

    # Vitamins per 100g
    vitamin_c_mg: float | None = None

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
    nan_art_id_rewe: int | None
    ean: str

    # Standalone food
    is_standalone_food: bool = False

    # Reference
    ingredient_ref_id: int | None = None

    # Relations
    retail_section_id: int | None
    retail_section_name: str | None = None
    nutritional_tags: list[NutritionalTagOut] = []
    portions: list[PortionOut] = []
    aliases: list[IngredientAliasOut] = []
    groups: list[IngredientGroupOut] = []

    created_at: str = ""
    updated_at: str = ""
    created_by_id: int | None = None
    quality_score: int | None = None
    quality_score_updated_at: datetime | None = None

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
                "is_system": p.is_system,
                "measuring_unit_id": p.measuring_unit_id,
                "measuring_unit_name": p.measuring_unit.name if p.measuring_unit else None,
            }
            for p in obj.portions.select_related("measuring_unit").filter(deleted_at__isnull=True)
        ]

    @staticmethod
    def resolve_aliases(obj) -> list:
        return [{"id": a.id, "name": a.name, "rank": a.rank, "is_generic": a.is_generic} for a in obj.aliases.all()]

    @staticmethod
    def resolve_name_warning(obj) -> str | None:
        from supply.services.generic_terms import generic_name_warning

        return generic_name_warning(obj.name)

    @staticmethod
    def resolve_groups(obj) -> list:
        return [{"id": g.id, "name": g.name, "slug": g.slug} for g in obj.groups.all()]

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

    # Scout/camp fields
    storage_type: str | None = None
    cooking_factor: float | None = None
    camp_suitable: bool = False
    preparation_time_min: int | None = None
    season_start: int | None = None
    season_end: int | None = None

    # Nutritional values
    energy_kcal: float | None = None
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

    # Vitamins
    vitamin_c_mg: float | None = None

    # Scores
    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    nova_score: int | None = None
    fruit_factor: float | None = None

    # References
    fdc_id: int | None = None
    nan_art_id_rewe: int | None = None
    ean: str = ""

    # Standalone food
    is_standalone_food: bool = False
    ingredient_ref_id: int | None = None
    price_per_kg: float | None = None

    # Relations
    retail_section_id: int | None = None
    nutritional_tag_ids: list[int] = []
    group_ids: list[int] = []


class IngredientUpdateIn(Schema):
    """Input schema for updating an ingredient."""

    name: str | None = None
    description: str | None = None
    physical_density: float | None = None
    physical_viscosity: str | None = None
    durability_in_days: int | None = None
    max_storage_temperature: int | None = None

    # Scout/camp fields
    storage_type: str | None = None
    cooking_factor: float | None = None
    camp_suitable: bool | None = None
    preparation_time_min: int | None = None
    season_start: int | None = None
    season_end: int | None = None

    energy_kcal: float | None = None
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

    # Vitamins
    vitamin_c_mg: float | None = None

    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    nova_score: int | None = None
    fruit_factor: float | None = None

    fdc_id: int | None = None
    nan_art_id_rewe: int | None = None
    ean: str | None = None

    price_per_kg: float | None = None
    retail_section_id: int | None = None
    nutritional_tag_ids: list[int] | None = None
    group_ids: list[int] | None = None
    status: str | None = None
    is_standalone_food: bool | None = None
    ingredient_ref_id: int | None = None


class PaginatedIngredientOut(Schema):
    """Paginated ingredient response."""

    items: list[IngredientListOut]
    total: int
    page: int
    page_size: int
    total_pages: int


# ---------------------------------------------------------------------------
# AI Suggest schemas
# ---------------------------------------------------------------------------


class PortionSuggestionOut(Schema):
    """A suggested portion."""

    name: str
    weight_g: float
    rank: int = 1


class IngredientSuggestAllOut(Schema):
    """Response schema for AI-powered ingredient suggestions."""

    # AI interaction tracking
    ai_interaction_id: str | None = None

    # Nährwerte
    energy_kcal: float | None = None
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

    # Bewertungen
    nutri_score: int | None = None
    nova_score: int | None = None
    child_score: int | None = None
    scout_score: int | None = None
    environmental_score: int | None = None
    fruit_factor: float | None = None

    # Name suggestion
    name_suggestion: str | None = None

    # Physik
    physical_density: float | None = None
    physical_viscosity: str | None = None
    durability_in_days: int | None = None
    max_storage_temperature: int | None = None

    # Scout/camp fields
    storage_type: str | None = None
    cooking_factor: float | None = None
    camp_suitable: bool | None = None
    preparation_time_min: int | None = None
    season_start: int | None = None
    season_end: int | None = None

    # Preis
    price_per_kg: float | None = None

    # Portionen und Aliase
    portions: list[PortionSuggestionOut] = []
    stueck_weight_g: float | None = None
    packung_weight_g: float | None = None
    aliases: list[str] = []
    nutritional_tags: list[NutritionalTagOut] = []


class IngredientAiCreateIn(Schema):
    """Input for AI ingredient creation."""

    name: str


class IngredientImportUrlIn(Schema):
    """Input for URL-based ingredient import."""

    url: str


class IngredientDraftOut(Schema):
    """Stammdaten extracted from a URL import."""

    name: str
    description: str | None = None
    status: str = "draft"
    retail_section_id: int | None = None


class IngredientNutritionDraftOut(Schema):
    """Optional nutritional values extracted from a URL import."""

    energy_kcal: float | None = None
    protein_g: float | None = None
    fat_g: float | None = None
    fat_sat_g: float | None = None
    carbohydrate_g: float | None = None
    sugar_g: float | None = None
    fibre_g: float | None = None
    salt_g: float | None = None
    sodium_mg: float | None = None


class IngredientImportUrlOut(Schema):
    """Response for URL-based ingredient import."""

    ai_interaction_id: str | None = None
    ingredient_draft: IngredientDraftOut
    nutrition: IngredientNutritionDraftOut | None = None


class IngredientSimilarOut(Schema):
    """Compact schema for similar ingredients."""

    id: int
    name: str
    slug: str
    distance: float
