"""Nutrition-related schemas (NutriScore, Breakdown, Improvements, Suggestions)."""

from ninja import Schema


# --- Nutri Score Schemas ---


class NutriScoreDetailOut(Schema):
    """Detailed Nutri-Score breakdown."""

    negative_points: int
    positive_points: int
    total_points: int
    nutri_class: int
    nutri_label: str
    details: dict = {}


class ContributionOut(Schema):
    """Per-item contribution to a single nutritional parameter."""

    parameter: str  # enum: energy, protein, fat, sat_fat, carbs, sugar, salt, fiber
    absolute: float
    percent_of_recipe: float  # 0–100


class RecipeItemNutritionOut(Schema):
    """Nutritional breakdown for a single recipe item."""

    recipe_item_id: int
    ingredient_id: int | None
    ingredient_name: str
    quantity: float
    portion_name: str
    weight_g: float
    price_eur: float | None
    energy_kj: float
    energy_kcal: float
    protein_g: float
    fat_g: float
    fat_sat_g: float
    carbohydrate_g: float
    sugar_g: float
    fibre_g: float
    salt_g: float
    weight_pct: float  # percentage of total recipe weight
    # Vitamins
    vitamin_c_mg: float | None = None
    # Per-item contributions to nutritional parameters
    contributions: list[ContributionOut] = []


class RecipeNutritionBreakdownOut(Schema):
    """Complete nutritional breakdown for a recipe."""

    total_weight_g: float
    total_price_eur: float | None
    total_energy_kj: float
    total_energy_kcal: float
    total_protein_g: float
    total_fat_g: float
    total_fat_sat_g: float
    total_carbohydrate_g: float
    total_sugar_g: float
    total_fibre_g: float
    total_salt_g: float
    # Micronutrient totals
    total_vitamin_c_mg: float | None = None
    # Per-serving values
    per_serving_energy_kcal: float | None
    per_serving_protein_g: float | None
    per_serving_fat_g: float | None
    per_serving_carbohydrate_g: float | None
    per_serving_vitamin_c_mg: float | None = None
    # DGE coverage percentages (nutrient -> %)
    dge_coverage: dict[str, float | None] = {}
    positive_traits: list[str] = []
    items: list[RecipeItemNutritionOut]


# --- Improvement Ranking Schemas ---


class SuggestedIngredientOut(Schema):
    """Ingredient contributing most to a parameter, attached to an improvement item."""

    id: int
    name: str
    contribution_g: float
    unit: str


class ImprovementOut(Schema):
    """A single ranked improvement suggestion for a recipe."""

    parameter: str
    parameter_label: str
    current_value: float
    threshold_value: float
    delta: float
    unit: str
    direction: str  # "reduce" | "increase"
    impact_score: float  # 0–100
    suggested_ingredients: list[SuggestedIngredientOut]
    source: str  # "nutri_score" | "recipe_hint" | "merged"
    recommendation_text: str


class ImprovementListOut(Schema):
    """Ranked list of improvements with all-good signalling."""

    items: list[ImprovementOut]
    all_good: bool
    message: str = ""


# --- LLM Suggestion Schemas ---


class LlmSuggestionRequestIn(Schema):
    """Request body for LLM suggestion endpoint."""

    objective: str
    direction: str = "reduce"  # "reduce" | "increase"


class LlmSuggestionOut(Schema):
    """A single LLM-generated ingredient suggestion."""

    ingredient_name: str
    recommended_amount: float
    unit: str
    reasoning: str
    expected_improvement: str


# --- Unified Recipe Rule Schemas ---


class RecipeRuleResult(Schema):
    """Evaluation result of a single Recipe rule."""

    rule_id: int
    name: str
    parameter: str
    status: str  # "green" | "yellow" | "red"
    value_per_serving: float
    display_value: str | None = None
    unit: str
    threshold: float | None = None
    threshold_direction: str | None = None  # "min" | "max"
    tip_text: str


class RecipeRulesOut(Schema):
    """Consolidated Recipe scope rule evaluation."""

    green_count: int
    yellow_count: int
    red_count: int
    items: list[RecipeRuleResult]
    is_applicable: bool = True
    message: str = ""
