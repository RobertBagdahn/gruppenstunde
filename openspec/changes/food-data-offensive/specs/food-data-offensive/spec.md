# food-data-offensive Specification

## Purpose
Staff können die Food-Stammdaten in einem Cockpit mit wenigen Klicks, nachvollziehbar und kosteneffizient bereinigen. Regeln kommen vor KI, KI nur gezielt, und Menschen entscheiden über Umbenennen, Zusammenführen und Löschen.

## ADDED Requirements

### Requirement: Nutrition plausibility rules
The system SHALL evaluate every ingredient against one shared rule set (per 100 g): sugar ≤ carbohydrates, saturated fat ≤ fat, protein+fat+carbohydrates+fibre ≤ 105 g, energy within ±25 % of Atwater energy, energy ≤ 900 kcal, salt/sodium consistency, placeholder zeros and the broken-import signature (parent value 0 while sub-value > 0). "Unknown" SHALL be stored as `NULL`.

#### Scenario: Broken import detected
- **WHEN** an ingredient has `fat_g = 0` and `fat_sat_g = 0.1`
- **THEN** the issue `broken_import` is reported and the deterministic repair sets energy, fat and carbohydrates to `NULL`

#### Scenario: kJ stored as kcal
- **WHEN** `energy_kcal = 1500`
- **THEN** the deterministic repair sets `energy_kcal = 358.5`

### Requirement: Retail section catalog v2
The system SHALL provide 38 retail sections in supermarket walk order and classify ingredient names by compound head noun and process markers. A manually chosen retail section SHALL never be overwritten by rules or AI.

#### Scenario: Juice is not fruit
- **WHEN** the classifier sees "Orangensaft"
- **THEN** it returns "Säfte & Smoothies"

#### Scenario: Manual choice kept
- **WHEN** an ingredient has `retail_section_source = "manual"`
- **THEN** reclassification and AI review leave its retail section unchanged

### Requirement: Batch AI review
The system SHALL review up to 15 ingredients per Gemini call with current values and rule findings, fill unknown and suspicious values, keep plausible values (differences become suggestions), enforce hard rules after applying, and store verdict, reason, confidence and suggestions. Renames, merges and deletions SHALL only be suggested.

#### Scenario: Plausible value kept
- **WHEN** protein is plausible and the AI proposes a different value
- **THEN** protein stays unchanged and the AI value is stored as a suggestion when confidence ≥ 0.8

### Requirement: Cockpit
The data quality page SHALL open on a cockpit with a 6-step pipeline (retail sections, nutrition repair, exact duplicates, AI review with cost estimate, embeddings, publish), clickable KPI tiles, a work list with URL-state filters, inline editing, one-click acceptance of AI suggestions and bulk actions across all matches, a near-duplicate merge panel and a recipe cleanup panel. Long runs SHALL be processed in chunks with progress and stop.

#### Scenario: Select all matches
- **WHEN** staff click "Alle N Treffer auswählen"
- **THEN** all ingredient ids matching the current filters are selected for bulk actions

### Requirement: Publishing gate
Only draft ingredients without blocking issues (implausible or missing nutrition, missing price, missing retail section, suspect name, pending rename or duplicate) SHALL be set to `verified` by the publish action.

#### Scenario: Implausible draft stays draft
- **WHEN** publish runs for all ingredients
- **THEN** an ingredient with `sugar_gt_carbs` remains `draft`

### Requirement: Transfer package
The system SHALL export offensive results as a slug-keyed JSON package and apply it idempotently in another environment without AI calls, with dry-run by default.

#### Scenario: Apply respects manual sections
- **WHEN** the target environment has a manual retail section for an ingredient
- **THEN** applying the package keeps it
