## MODIFIED Requirements

### Requirement: Proportional scaling on display portion change
When the user changes the displayed portion count (servings) in the recipe detail view or InlineIngredientEditor, all ingredient quantities SHALL be scaled proportionally. The database SHALL always store per-1-person quantities (servings=1). Scaling SHALL be for display purposes only and SHALL NOT change stored values. The InlineIngredientEditor SHALL use the recipe's servings value as the display scaling factor without normalizing quantities to 1-portion. AI-estimated quantities from `POST /api/recipes/{recipe_id}/estimate-quantities/` SHALL be multiplied by the current display servings before being set as the editor's display `quantity`, so that the save logic (which divides by `effectiveServings`) persists the correct per-1-portion value.

#### Scenario: User views recipe for 4 persons
- **WHEN** User selects "4 Portionen" in the portion scaler
- **THEN** All ingredient quantities SHALL be multiplied by 4 for display (e.g., 62.5g → 250g, 0.75 Stück → 3 Stück)

#### Scenario: User views recipe for 1 person (default)
- **WHEN** User views recipe with default portion scaler (1 Portion)
- **THEN** All ingredient quantities SHALL be shown as stored in DB (per-person values)

#### Scenario: Quantities are rounded for display
- **WHEN** Scaling produces fractional values
- **THEN** Quantities SHALL be rounded according to quantity-display-formatting rules (< 2 → 0.1, 2-10 → 1, etc.)

#### Scenario: Edit mode shows scaled quantities
- **WHEN** User opens the InlineIngredientEditor while recipe servings is N
- **THEN** Ingredient quantities SHALL be displayed as per-N-portions (not normalized to 1 portion)
- **THEN** Saving changes SHALL persist per-1-portion quantities (current values divided by N) with servings unchanged at 1

#### Scenario: AI estimate applied at servings > 1
- **WHEN** User applies AI-estimated quantities while `effectiveServings = N > 1`
- **THEN** The editor's display `quantity` SHALL be set to `quantity_per_portion * N` for each selected item
- **THEN** On save, the stored per-1-portion quantity SHALL equal `quantity_per_portion` (because save divides by N)

#### Scenario: AI estimate applied at servings = 1
- **WHEN** User applies AI-estimated quantities while `effectiveServings = 1`
- **THEN** The editor's display `quantity` SHALL be set to `quantity_per_portion` directly
- **THEN** On save, the stored per-1-portion quantity SHALL equal `quantity_per_portion`
