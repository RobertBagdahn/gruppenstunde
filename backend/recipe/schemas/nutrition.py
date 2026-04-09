"""Nutrition-related schemas (NutriScore, Hints, Checks, Breakdown)."""

from ninja import Schema


# --- Recipe Hint Schemas ---


class RecipeHintOut(Schema):
    id: int
    name: str
    description: str
    parameter: str
    min_value: float | None
    max_value: float | None
    min_max: str
    hint_level: str
    recipe_type: str
    recipe_objective: str


class RecipeHintMatchOut(Schema):
    """A hint that matched against recipe nutritional values."""

    hint: RecipeHintOut
    actual_value: float
    message: str


class RecipeCheckOut(Schema):
    """Recipe check result for one dimension."""

    label: str
    value: str
    color: str
    score: float


class NutriScoreDetailOut(Schema):
    """Detailed Nutri-Score breakdown."""

    negative_points: int
    positive_points: int
    total_points: int
    nutri_class: int
    nutri_label: str
    details: dict = {}


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
    per_serving_energy_kcal: float | None
    per_serving_protein_g: float | None
    per_serving_fat_g: float | None
    per_serving_carbohydrate_g: float | None
    items: list[RecipeItemNutritionOut]
