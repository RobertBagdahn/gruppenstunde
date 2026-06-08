## ADDED Requirements

### Requirement: Allergen warning badge component
The system SHALL provide a reusable AllergenWarningBadge React component that displays red warning icons with allergen names.

#### Scenario: Badge shows allergen names in tooltip
- **WHEN** component receives allergenTags: [{id: 3, name: "Erdnüsse"}, {id: 7, name: "Gluten"}]
- **THEN** renders red alert-circle icon (🚨)
- **THEN** hover shows tooltip "Enthält: Erdnüsse, Gluten"

#### Scenario: Badge handles single allergen
- **WHEN** component receives allergenTags: [{id: 3, name: "Erdnüsse"}]
- **THEN** tooltip shows "Enthält: Erdnüsse"

#### Scenario: Badge renders nothing for empty allergens
- **WHEN** component receives allergenTags: []
- **THEN** renders null (no DOM element)

### Requirement: Allergen Scanner Tab in MealPlan detail
The system SHALL add a new "Allergie-Scanner" tab in MealPlan detail view showing all violations grouped by allergen.

#### Scenario: Scanner tab visible when MealPlan has allergen tags
- **WHEN** MealPlan has allergen_tag_ids.length > 0
- **THEN** "Allergie-Scanner" tab appears in tab bar
- **THEN** tab shows alert-triangle icon

#### Scenario: Scanner tab hidden when no allergen tags
- **WHEN** MealPlan has no allergen_tag_ids
- **THEN** "Allergie-Scanner" tab is NOT rendered

#### Scenario: Scanner tab displays violations grouped by allergen
- **WHEN** opening Allergie-Scanner tab
- **THEN** fetches /api/meal-plans/{id}/allergen-scan/
- **THEN** displays accordion per allergen: "Erdnüsse (3 Verstöße)"
- **THEN** expanding shows list: "15.07. Mittagessen – Satay-Sauce"
- **THEN** clicking recipe navigates to recipe detail

#### Scenario: Scanner tab shows empty state
- **WHEN** scanner returns zero violations
- **THEN** displays "Keine Allergenverstöße gefunden ✓" with check-circle icon

### Requirement: Warning badges in DayPlanView / TableView
The system SHALL display AllergenWarningBadge on meal items that violate MealPlan allergens.

#### Scenario: Meal item with violating recipe shows badge
- **WHEN** MealItem.recipe has nutritional_tag matching MealPlan.allergen_tag_ids
- **WHEN** rendering DayPlanView or TableView
- **THEN** meal item row shows AllergenWarningBadge with that recipe's violating allergens

#### Scenario: Badge positioned consistently
- **WHEN** badge renders in meal item row
- **THEN** positioned at end of recipe title (inline) or as column in TableView

### Requirement: Warning banner in NutritionView / CostDashboard / ShoppingView
The system SHALL show a prominent warning banner when current view contains allergen violations.

#### Scenario: Nutrition view shows banner if violations exist
- **WHEN** NutritionView loads and MealPlan has violations
- **THEN** banner at top: "⚠️ Dieser Essensplan enthält Allergene: Erdnüsse, Gluten. 3 Mahlzeiten betroffen."
- **THEN** banner links to Allergie-Scanner tab

#### Scenario: Shopping list highlights violating ingredients
- **WHEN** ShoppingView loads and MealPlan has violations
- **THEN** shopping list rows from violating recipes have red left border
- **THEN** row tooltip: "Rezept enthält: Erdnüsse"

#### Scenario: No banner when no violations
- **WHEN** MealPlan has allergen tags but zero violations
- **THEN** no warning banner rendered in any view