## ADDED Requirements

### Requirement: MealItem schema exposes recipe image as image_url
`MealItemOut` and `CookingScheduleRecipeBlockOut` (`backend/planner/schemas/meal_plan.py`) SHALL expose the linked recipe's image under the field name `image_url` (not `recipe_image`), consistent with `RecipeListOut`/`ContentListOut` elsewhere in the platform.

#### Scenario: MealItem with a recipe that has an image
- **WHEN** a `MealItem` references a `Recipe` that has an uploaded image
- **THEN** the API response SHALL include `image_url` set to the recipe's image URL

#### Scenario: MealItem with a recipe that has no image
- **WHEN** a `MealItem` references a `Recipe` without an image
- **THEN** the API response SHALL include `image_url` set to `null`

#### Scenario: Cooking schedule recipe block exposes image_url
- **WHEN** a `CookingScheduleRecipeBlockOut` is serialized for the kitchen dashboard or PDF export
- **THEN** it SHALL expose the recipe's image under `image_url`, matching the same naming as `MealItemOut`

### Requirement: Cooking schedule PDF export service uses image_url naming
The `cooking_schedule_service.py` dataclass used for PDF export generation SHALL name its recipe-image field `image_url`, consistent with the API schema naming.

#### Scenario: PDF export dataclass field renamed
- **WHEN** the cooking schedule PDF export service builds its internal recipe-block dataclass
- **THEN** the image field SHALL be named `image_url` instead of `recipe_image`
</content>
