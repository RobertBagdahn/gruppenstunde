# meal-plan-suggestions Specification

## Purpose
Defines rule-based and system-generated suggestions for MealPlans.
## Requirements
### Requirement: Rule data model
The system SHALL provide a unified `Rule` model replacing both `HealthRule` and `RecipeHint`. Each rule SHALL have: `name` (CharField), `description` (TextField), `parameter` (CharField, choices from nutrition parameters), `scope` (CharField, choices: "meal_event", "day", "meal", "recipe"), `rule_type` (CharField, choices: "nutrition"), `min_yellow` (DecimalField, nullable), `min_green` (DecimalField, nullable), `max_green` (DecimalField, nullable), `max_yellow` (DecimalField, nullable), `unit` (CharField), `hint_level` (CharField, choices: "info", "warn", "error"), `tip_text` (TextField), `improvement_text` (TextField), `is_active` (BooleanField, default True), `sort_order` (IntegerField). Min-fields and max-fields SHALL be independently nullable to support min-only rules (e.g. fibre) and max-only rules (e.g. sugar).

#### Scenario: Creating a nutrition rule for sugar per meal
- **WHEN** an admin creates a Rule with rule_type="nutrition", parameter="sugar_g", scope="meal", min_yellow=null, min_green=null, max_green=20, max_yellow=35
- **THEN** meals with ≤20g sugar SHALL evaluate as "green"
- **THEN** meals with 20-35g sugar SHALL evaluate as "yellow"
- **THEN** meals with >35g sugar SHALL evaluate as "red"

#### Scenario: Creating a min-only rule for fibre per day
- **WHEN** an admin creates a Rule with parameter="fibre_g", scope="day", min_yellow=15, min_green=25, max_green=null, max_yellow=null
- **THEN** days with ≥25g fibre SHALL evaluate as "green"
- **THEN** days with 15-25g fibre SHALL evaluate as "yellow"
- **THEN** days with <15g fibre SHALL evaluate as "red"

#### Scenario: Rule with scope recipe
- **WHEN** a Rule with scope="recipe" exists
- **THEN** it SHALL be evaluated against individual recipe nutrition values (replacing RecipeHint behavior)

### Requirement: Rules API
The system SHALL provide a public REST endpoint to retrieve all active rules.

#### Scenario: List active rules
- **WHEN** a GET request is made to `/api/rules/`
- **THEN** the system SHALL return all active Rule entries ordered by sort_order
- **THEN** each entry SHALL include all rule fields

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user requests `/api/rules/`
- **THEN** the system SHALL return the rules (no authentication required)

### Requirement: Rules admin CRUD
The system SHALL provide staff-only CRUD endpoints for Rules at `/api/rules/admin/`. The admin UI SHALL display a single "Regeln" tab (replacing both "Gesundheitsregeln" and "Rezept-Hinweise" tabs).

#### Scenario: Staff creates a rule
- **WHEN** a staff user sends POST `/api/rules/admin/` with valid rule data
- **THEN** the rule is created and returned with 201

#### Scenario: Staff lists rules in admin
- **WHEN** a staff user views the admin "Regeln" tab
- **THEN** all rules are shown in a table with columns: name, parameter, scope, rule_type, thresholds, is_active

#### Scenario: Non-staff access denied
- **WHEN** a non-staff user calls any admin rule endpoint
- **THEN** the system returns 403

### Requirement: MealPlan budget field
The MealPlan model SHALL have a `budget_per_person_per_day` field (DecimalField, max_digits=8, decimal_places=2, nullable). This field SHALL be editable in the MealPlan settings.

#### Scenario: Setting a budget
- **WHEN** a user updates a MealPlan with budget_per_person_per_day=8.00
- **THEN** the value is persisted and used for budget rule evaluations

#### Scenario: No budget set
- **WHEN** a MealPlan has no budget_per_person_per_day (null)
- **THEN** budget rules SHALL evaluate as "green" (no constraint)

### Requirement: Suggestion evaluation service
The system SHALL provide a `suggestion_service` that evaluates all rules and system checks for a MealPlan and returns a list of suggestions sorted by priority. Rule evaluation SHALL include active `Rule` entries for `scope="meal"`, `scope="day"`, and `scope="meal_event"` across nutrition, price, weight, and Nutri-Score parameters when those values are available from aggregations. Bei der Evaluierung von day-scope Regeln MUSS der Service die Tagesabdeckung (`sum(day_part_factor)` der Mahlzeiten) berechnen und die Schwellwerte entsprechend skalieren.

Planner-level rule evaluation MUST apply to all meal types in the plan. It MUST NOT skip breakfast, snack, dessert, drink, side dish, or simple meal slots merely because recipe-level rules are hidden for those recipe types.

#### Scenario: Evaluating a complete plan
- **WHEN** suggestions are requested for a fully populated MealPlan
- **THEN** the service SHALL evaluate: completeness (system), duplicates (system), budget rules, nutrition rules, price rules, weight rules, and Nutri-Score rules
- **THEN** results SHALL be sorted by priority: completeness (1) > budget (2) > nutrition (3) > duplicates (4)

#### Scenario: Evaluating an empty plan
- **WHEN** suggestions are requested for a MealPlan with no recipes assigned
- **THEN** the service SHALL return red suggestions for each empty meal slot with text "Kein Rezept zugewiesen"

#### Scenario: Evaluating all meal types
- **WHEN** a MealPlan contains breakfast, snack, dessert, drink, side dish, simple meal, warm meal, and cold meal slots with assigned items
- **THEN** the service SHALL include all of those slots in meal, day, and plan aggregations
- **THEN** matching `scope="meal"`, `scope="day"`, and `scope="meal_event"` rules SHALL be evaluated for the aggregated values

### Requirement: Portion-based suggestion evaluation
The suggestion evaluation service SHALL evaluate all nutrition rules at the meal plan, day, and meal levels using aggregated values computed in Normportion logic. Since every recipe represents exactly one Normportion, `Recipe.servings` is always treated as `1` and there SHALL be no division by `servings`. Nutrient contributions SHALL be computed as `value per 100g × total_weight_g / 100 × MealItem.factor` and summed per scope.

#### Scenario: Day cockpit suggestion evaluation uses Normportion-scaled values
- **WHEN** a day cockpit contains a recipe with 13.5g protein per 100g, weight = 800g, and meal item factor = 1.0 (108.0g protein for the Normportion)
- **AND** a day-scope rule requires "protein_g >= 45.0"
- **THEN** the suggestion service SHALL evaluate the Normportion value (13.5 × 800 / 100 × 1.0 = 108.0g) instead of the per-100g value (13.5g)
- **AND** there SHALL be no division by `servings`
- **AND** generate a green suggestion because 108.0g ≥ 45.0g

### Requirement: Normportion-basierte Suggestion-Auswertung

Der Suggestion-Service MUST alle Nährwert-, Preis-, Gewicht- und Nutri-Regeln auf Mahlzeit-, Tages- und Plan-Ebene anhand von Normportion-Aggregaten auswerten. Die der Regelbewertung zugrunde liegenden Werte MÜSSEN in Normportion-Logik berechnet sein (Rezept-Normportionwert × `MealItem.factor`, summiert je Scope). Es DARF KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen in die Regelbewertung einfließen.

#### Scenario: Mahlzeitregel nutzt Normportion-Aggregat

- **WHEN** eine `scope="meal"`-Regel `protein_g >= 30` für eine Mahlzeit ausgewertet wird, deren Normportion-Aggregat 35.0g Eiweiß beträgt
- **THEN** wertet der Service den Wert 35.0g aus und erzeugt eine grüne Bewertung

#### Scenario: Keine Personen-Skalierung in der Bewertung

- **WHEN** Vorschläge für einen MealPlan mit `norm_portions = 10` angefordert werden
- **THEN** verwenden die Regelbewertungen ausschließlich Normportion-Aggregate
- **AND** die Werte werden NICHT mit `norm_portions`, `activity_factor` oder `reserve_factor` multipliziert

#### Scenario: Tagesregel summiert Mahlzeiten in Normportion-Logik

- **WHEN** eine `scope="day"`-Regel für einen Tag mit drei Mahlzeiten ausgewertet wird
- **THEN** basiert die Bewertung auf der Summe der Normportion-Mahlzeitwerte des Tages

### Requirement: Completeness system rule
The system SHALL check that every Meal in the MealPlan has at least one MealItem (recipe or ingredient). This is a hardcoded system rule, not admin-configurable.

#### Scenario: Missing meal detected
- **WHEN** a Meal has no MealItems
- **THEN** a red suggestion SHALL be generated with category "completeness", scope_label including day and meal_type (e.g. "Tag 1 Mittagessen")

#### Scenario: All meals populated
- **WHEN** every Meal has at least one MealItem
- **THEN** a single green suggestion SHALL be generated: "Alle Mahlzeiten belegt"

### Requirement: Duplicate recipe system rule
The system SHALL detect when the same Recipe is used more than once across the entire MealPlan. This is a hardcoded system rule.

#### Scenario: Duplicate recipe detected
- **WHEN** the same recipe appears in 2+ meals
- **THEN** a yellow suggestion SHALL be generated with message "'Müsli' kommt 3x vor"

#### Scenario: No duplicates
- **WHEN** all recipes are unique across the plan
- **THEN** no duplicate suggestion SHALL be generated

### Requirement: Recipe suggestions for empty meals
When a meal is empty (completeness violation), the system SHALL suggest up to 3 recipes that match the meal's `meal_type`, have `status=approved`, and are sorted by `like_score` descending.

#### Scenario: Suggesting breakfast recipes
- **WHEN** a breakfast meal is empty
- **THEN** the suggestion SHALL include up to 3 recipes with recipe_type="breakfast"
- **THEN** each recipe suggestion SHALL include: id, title, slug, image_url, recipe_type

#### Scenario: No matching recipes in database
- **WHEN** a meal is empty and no recipes match the meal_type
- **THEN** the suggestion SHALL have an empty recipe_suggestions list

### Requirement: Suggestions API endpoint
The system SHALL provide a REST endpoint `GET /api/meal-plans/{id}/suggestions/` that returns all suggestions for a MealPlan. The endpoint SHALL include suggestions produced from system checks and active Rules for price, weight, Nutri-Score, and supported nutrition parameters. The endpoint SHALL remain accessible only to authorized owners or collaborators.

#### Scenario: Successful evaluation
- **WHEN** GET `/api/meal-plans/{id}/suggestions/` is called by an authorized user
- **THEN** the response SHALL include: suggestions (list), summary_status (worst color), red_count, yellow_count, green_count, total_count
- **THEN** suggestions generated from price, weight, Nutri-Score, and nutrition rules SHALL use the same response shape as existing nutrition suggestions

#### Scenario: Unauthorized access
- **WHEN** a user who is not owner or collaborator requests suggestions
- **THEN** the system SHALL return 403

#### Scenario: Unauthenticated access
- **WHEN** an unauthenticated user requests suggestions for a MealPlan
- **THEN** the system SHALL return 403

### Requirement: Suggestions tab in MealPlan UI
The frontend SHALL display a "Vorschläge" tab in the MealPlan detail page, replacing the existing "Cockpit" tab. The tab SHALL show a badge with the worst status color and count of non-green suggestions.

#### Scenario: Tab badge display
- **WHEN** the MealPlan detail page loads
- **THEN** the "Vorschläge" tab SHALL show a badge like "🔴 5" (worst color + count of non-green)

#### Scenario: All suggestions green
- **WHEN** all rules evaluate to green and no system rule violations exist
- **THEN** the tab SHALL show a green badge with count 0
- **THEN** the tab content SHALL display "Alles gut! Dein Plan sieht solide aus."

#### Scenario: Suggestion card with recipe suggestions
- **WHEN** a completeness suggestion has recipe_suggestions
- **THEN** the card SHALL display up to 3 recipe cards with title and image
- **THEN** each recipe card SHALL have an "Übernehmen" button
- **THEN** a "Mehr suchen" link SHALL open the recipe search filtered by meal_type

#### Scenario: Suggestion card with tip
- **WHEN** a nutrition or budget suggestion has a tip
- **THEN** the card SHALL display the tip text below the status message

#### Scenario: Sorting
- **WHEN** suggestions are displayed
- **THEN** they SHALL be sorted: red first, then yellow, then green
- **THEN** within same status: by priority (completeness > budget > nutrition > duplicates)

#### Scenario: Budget coverage warning
- **WHEN** budget suggestions are shown and ingredient price coverage is below 100%
- **THEN** a note SHALL display "Basierend auf X% der Zutaten mit Preisdaten"

### Requirement: Budget system rule
The system SHALL check the MealPlan's `budget_per_person_per_day` against actual costs per person per day. This is a hardcoded system rule (not admin-configurable) because each plan has an individual budget.

#### Scenario: Budget exceeded
- **WHEN** a MealPlan has budget_per_person_per_day=8.00 and actual cost is 10.50€/person/day
- **THEN** a red suggestion SHALL be generated with message "10,50€/Person/Tag (Budget: 8,00€)"
- **THEN** the tip SHALL identify the most expensive recipe: "Lachs-Auflauf (4,20€) ist das teuerste Rezept"

#### Scenario: Budget slightly exceeded (within 20%)
- **WHEN** actual cost is ≤ budget × 1.2
- **THEN** a yellow suggestion SHALL be generated

#### Scenario: Budget met
- **WHEN** actual cost ≤ budget
- **THEN** a green suggestion SHALL be generated

#### Scenario: No budget set
- **WHEN** budget_per_person_per_day is null
- **THEN** no budget suggestion SHALL be generated (skip entirely)

#### Scenario: Incomplete price data
- **WHEN** budget is set but not all ingredients have price_per_kg
- **THEN** the suggestion SHALL include a note: "Basierend auf X% der Zutaten mit Preisdaten"

### Requirement: Seed rules management command
The system SHALL provide a management command `seed_rules` that creates a comprehensive set of default rules based on practical scout-camp meal planning. The command SHALL be idempotent and SHALL create or update default rules without creating duplicates.

#### Scenario: Seeding day-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** day-scope rules SHALL be created for energy, protein, fat, carbohydrate, fibre, sugar, saturated fat, sodium or salt, price per day, total food weight per day, and average Nutri-Score

#### Scenario: Seeding meal-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** meal-scope rules SHALL be created for energy, protein, sugar, fibre, saturated fat, sodium or salt, price, total meal weight, and average Nutri-Score

#### Scenario: Seeding recipe-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** recipe-scope rules SHALL be created for protein, sugar, saturated fat, sodium or salt, fibre, price, weight, energy, fat range, and Nutri-Score

#### Scenario: Seeding event-scope rules
- **WHEN** `uv run python manage.py seed_rules` is executed
- **THEN** event-scope rules SHALL be created for average daily energy, average daily protein, average daily sugar, average daily fibre, average daily price, and average Nutri-Score

#### Scenario: Idempotent execution
- **WHEN** the command is run twice
- **THEN** no duplicate rules SHALL be created

### Requirement: Admin rule form with visual ampel preview
The admin rule create/edit form SHALL include a visual traffic-light range preview that updates live as the user changes threshold values. The preview SHALL display a colored bar showing red/yellow/green/yellow/red zones with the current threshold values labeled.

#### Scenario: Live preview updates
- **WHEN** an admin changes max_green from 60 to 80
- **THEN** the green zone in the preview bar SHALL visually expand immediately

#### Scenario: Min-only rule preview
- **WHEN** an admin sets min_yellow=15, min_green=25 and leaves max_green/max_yellow empty
- **THEN** the preview SHALL show: red | yellow | green (no right-side zones)

#### Scenario: Max-only rule preview
- **WHEN** an admin sets max_green=60, max_yellow=90 and leaves min_yellow/min_green empty
- **THEN** the preview SHALL show: green | yellow | red (no left-side zones)

### Requirement: Admin rule form parameter dropdown
The rule form SHALL use a dropdown for the `parameter` field with human-readable German labels instead of free text input. Options SHALL include: "Energie (kJ)", "Eiweiß (g)", "Fett (g)", "Kohlenhydrate (g)", "Zucker (g)", "Ballaststoffe (g)", "Gesättigte Fettsäuren (g)", "Natrium (mg)", and vitamin/mineral parameters.

#### Scenario: Selecting a parameter
- **WHEN** an admin opens the parameter dropdown
- **THEN** options SHALL be displayed with German labels (e.g. "Eiweiß (g)" for protein_g)

### Requirement: Admin rule table with visual enhancements
The rule list table SHALL display: colored scope badges, a compact inline ampel bar per row, grouping by scope (collapsible sections), and a quick-toggle for is_active directly in the table.

#### Scenario: Scope badges
- **WHEN** rules are displayed in the table
- **THEN** scope SHALL be shown as colored badges (e.g. blue for "Tag", green for "Mahlzeit", purple for "Rezept", orange for "Essensplan")

#### Scenario: Quick active toggle
- **WHEN** an admin clicks the active toggle in the table row
- **THEN** the rule's is_active status SHALL be toggled without opening the edit form

#### Scenario: Grouped by scope
- **WHEN** rules are displayed
- **THEN** they SHALL be grouped under collapsible scope headers (Essensplan, Tag, Mahlzeit, Rezept)

### Requirement: Ampel indicators preserved
The traffic-light (Ampel) visual pattern from the Cockpit SHALL be preserved in the Vorschläge tab. Each suggestion SHALL display a colored indicator (green/yellow/red dot) alongside its message.

#### Scenario: Red indicator
- **WHEN** a suggestion has status "red"
- **THEN** a red dot SHALL be displayed prominently with the message

#### Scenario: Green indicator
- **WHEN** a suggestion has status "green"
- **THEN** a green dot SHALL be displayed (no tip needed)

### Requirement: Scope-specific food quality rule set
The system SHALL support a consistent default rule set across `recipe`, `meal`, `day`, and `meal_event` scopes for practical food quality evaluation. Rules SHALL cover at least price, weight, Nutri-Score, energy, protein, sugar, fibre, saturated fat, and sodium or salt where the parameter is meaningful for that scope.

#### Scenario: Recipe and meal share comparable rules
- **WHEN** default rules are seeded
- **THEN** recipe-scope and meal-scope rules SHALL include comparable parameters for price, weight, Nutri-Score, protein, sugar, fibre, saturated fat, and sodium or salt

#### Scenario: Day and plan use aggregate rules
- **WHEN** default rules are seeded
- **THEN** day-scope and meal_event-scope rules SHALL evaluate aggregate or average values appropriate for the scope

#### Scenario: Admin can tune thresholds
- **WHEN** a staff user edits any seeded rule in the Food Admin
- **THEN** the adjusted thresholds SHALL be used by subsequent recipe or planner evaluations

### Requirement: SuggestionCard displays evaluation scope as visible badge

The `SuggestionCard` component SHALL display the evaluation scope prominently as a colored badge above the suggestion message. For `category="nutrition"` suggestions, the badge SHALL indicate whether the evaluation is a sum (`scope=day`) or an average (`scope=meal_event`).

#### Scenario: Day-scope suggestion shows "Summe" badge

- **WHEN** a nutrition suggestion has `scope="day"` and `scope_label="Tag 3: Energie"`
- **THEN** the SuggestionCard SHALL display a badge with text "Summe Tag 3" above the message
- **AND** the badge SHALL use `day`-scope styling (e.g. blue tint)

#### Scenario: Event-scope suggestion shows "Ø Plan" badge

- **WHEN** a nutrition suggestion has `scope="meal_event"` or `scope="event"` and `scope_label="Gesamt: Energie (Durchschnitt)"`
- **THEN** the SuggestionCard SHALL display a badge with text "Ø Plan" above the message
- **AND** the badge SHALL use `event`-scope styling (e.g. orange tint)

#### Scenario: Non-nutrition suggestions use category badge

- **WHEN** a suggestion has `category="completeness"` or `category="budget"` or `category="duplicate"`
- **THEN** the SuggestionCard SHALL display the `scope_label` as-is without a scope-type prefix badge
- **AND** the badge SHALL use category-appropriate styling

#### Scenario: Meal-scope suggestion shows "Mahlzeit" badge

- **WHEN** a nutrition suggestion has `scope="meal"` and `scope_label="Tag 2 Mittagessen: Energie (Mahlzeit)"`
- **THEN** the SuggestionCard SHALL display a badge with text "Mahlzeit" above the message
- **AND** the badge SHALL use `meal`-scope styling (e.g. green tint)

