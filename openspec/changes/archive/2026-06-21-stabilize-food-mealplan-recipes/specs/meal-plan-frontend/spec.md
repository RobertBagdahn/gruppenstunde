# meal-plan-frontend Delta Spec

## MODIFIED Requirements

### Requirement: Meal plan list page

The system SHALL display a list of meal plans at `/meal-plans/app` showing all plans the user owns or collaborates on. Each list item SHALL show name, date range, meal count, visibility badge (verified/community/personal), and portion count using `norm_portions`.

#### Scenario: User views their meal plans
- **WHEN** an authenticated user navigates to `/meal-plans/app`
- **THEN** the system shows a list of meal plans with name, date, meal count, and visibility badge

#### Scenario: MealPlan card shows visibility badge
- **WHEN** a MealPlan with `owner_id === null` is displayed
- **THEN** the card SHALL show "Inspi-verifiziert" badge

#### Scenario: MealPlan card shows public community plan
- **WHEN** a MealPlan with `visibility === "public"` and `owner_id !== null` is displayed
- **THEN** the card SHALL show "Community" badge

#### Scenario: MealPlan card shows personal plan
- **WHEN** a MealPlan with `visibility === "private"` and `owner_id === userId` is displayed
- **THEN** the card SHALL show "Mein Plan" badge

### Requirement: Meal plan detail page

The system SHALL display a meal plan detail view at `/meal-plans/:id` with a day-based layout showing meals grouped by date. The detail view MUST include tabs: Tagesplan, Tabelle, Nährwerte, Kosten, Einkaufsliste, Vorschläge, and optionally Allergie-Scanner (only when `nutritional_tag_ids.length > 0`).

#### Scenario: Allergen scan tab visible only with tags
- **WHEN** a MealPlan has `nutritional_tag_ids.length > 0`
- **THEN** the "Allergie-Scanner" tab SHALL be visible

#### Scenario: Allergen scan tab hidden without tags
- **WHEN** a MealPlan has `nutritional_tag_ids.length === 0`
- **THEN** the "Allergie-Scanner" tab SHALL NOT be visible

### Requirement: Recipe selection excludes plan tags

The inline recipe search and RecipeSearchDialog SHALL exclude recipes that match the MealPlan's nutritional tags (exclusion semantics). The dietary filter checkbox SHALL be removed or relabeled to reflect exclusion semantics.

#### Scenario: Recipe search excludes plan tags
- **WHEN** the user searches recipes for a MealPlan with nutritional tags [Erdnuss, Milch]
- **THEN** recipes containing those tags SHALL NOT appear in results

#### Scenario: Random recipe suggestion excludes plan tags
- **WHEN** the user clicks "Rezept vorschlagen"
- **THEN** the random suggestion SHALL NOT contain any of the plan's nutritional tags
