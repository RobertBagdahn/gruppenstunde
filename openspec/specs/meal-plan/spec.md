## MODIFIED Requirements

### Requirement: Meal-Level Portion Override
Each Meal SHALL have an optional `override_portions` field (nullable Integer) that overrides the MealPlan's `norm_portions` for that specific meal (e.g. for day guests).

#### Scenario: Meal with override portions
- **WHEN** a Meal has `override_portions` set
- **THEN** all calculations (nutrition, shopping list, scaling) for that meal SHALL use `override_portions` instead of `norm_portions`

#### Scenario: Meal without override portions
- **WHEN** a Meal has `override_portions` as null
- **THEN** the MealPlan's `norm_portions` SHALL be used

### Requirement: MealItem Display Name
Each MealItem SHALL have an optional `display_name` field (CharField, nullable) that overrides the automatic recipe/ingredient name in the plan display.

#### Scenario: Custom display name set
- **WHEN** a MealItem has `display_name` set
- **THEN** the plan view and PDF export SHALL show the `display_name` instead of the recipe title

#### Scenario: No custom display name
- **WHEN** a MealItem has `display_name` as null
- **THEN** the recipe title or ingredient name SHALL be displayed

### Requirement: Meal Notes with Visibility
Each Meal SHALL support notes with a publish/unpublish flag to control visibility in print/export.

#### Scenario: Note marked as published
- **WHEN** a Meal has `note` text and `note_is_published=true`
- **THEN** the note SHALL appear in all views including PDF export and print

#### Scenario: Note marked as unpublished
- **WHEN** a Meal has `note` text and `note_is_published=false`
- **THEN** the note SHALL appear only in the edit view, NOT in PDF export or print

#### Scenario: Kitchen vs. public print
- **WHEN** user exports/prints the meal plan
- **THEN** the system SHALL offer two modes: "Mit Notizen" (kitchen copy) and "Ohne Notizen" (public display)

### Requirement: MealPlanItem supports ingredient as alternative to recipe
A MealPlanItem SHALL support either a Recipe OR an Ingredient (with portion and quantity), enforced by a database XOR constraint.

#### Scenario: Add ingredient to meal plan
- **WHEN** user selects a standalone ingredient and specifies portion + quantity
- **THEN** a MealPlanItem SHALL be created with `ingredient`, `portion`, and `quantity` fields set (recipe=null)

#### Scenario: Add recipe to meal plan (unchanged)
- **WHEN** user selects a recipe
- **THEN** a MealPlanItem SHALL be created with `recipe` set (ingredient=null, portion=null, quantity=null)

#### Scenario: XOR constraint enforcement
- **WHEN** attempting to create a MealPlanItem with both recipe and ingredient set
- **THEN** the database SHALL reject the record

#### Scenario: Ingredient meal plan item display
- **WHEN** viewing a meal plan that contains ingredient items
- **THEN** the ingredient name, portion name, and quantity SHALL be displayed

### Requirement: Quantity dialog for ingredient selection
The frontend SHALL display a quantity selection dialog when a user selects a standalone ingredient from search results.

#### Scenario: User selects ingredient from search
- **WHEN** user clicks on an ingredient in the search results
- **THEN** a dialog SHALL appear showing available portions for that ingredient and a quantity input

#### Scenario: User confirms quantity
- **WHEN** user selects a portion and enters a quantity and clicks "Hinzufügen"
- **THEN** the ingredient SHALL be added to the meal plan with the selected portion and quantity

### Requirement: MealPlan PDF Export
The MealPlan SHALL provide a PDF export endpoint.

#### Scenario: Export PDF with notes
- **WHEN** GET /api/meal-plans/{id}/export/pdf/?include_notes=true is called
- **THEN** a PDF SHALL be returned including published meal notes

#### Scenario: Export PDF without notes
- **WHEN** GET /api/meal-plans/{id}/export/pdf/ is called without include_notes or with include_notes=false
- **THEN** a PDF SHALL be returned WITHOUT meal notes

### Requirement: MealItem Overrides in Nutrition
Nutrition calculations for MealPlan SHALL respect MealItemOverrides.

#### Scenario: Override affects nutrition summary
- **WHEN** a MealItem has overrides that change ingredient quantities
- **THEN** the nutrition summary endpoint SHALL use overridden quantities

### Requirement: Default Meal Slots
When creating a new day in the MealPlan, the system SHALL create 4 default meal slots: Frühstück, Mittagessen, Abendessen, Snacks/Sonstiges.

#### Scenario: New day added
- **WHEN** a new day is added to the meal plan
- **THEN** 4 meal slots (breakfast, lunch, dinner, snack) SHALL be created automatically
