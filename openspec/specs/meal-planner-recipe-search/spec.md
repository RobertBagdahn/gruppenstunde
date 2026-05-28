## ADDED Requirements

### Requirement: Quick Search mit Full-Text und Debouncing
Die Inline-Rezeptsuche im Meal Planner nutzt Full-Text-Search mit Debouncing und Keyboard-Navigation.

#### Scenario: User tippt Suchbegriff
- **WHEN** User mindestens 2 Zeichen eingibt und 300ms vergehen ohne weitere Eingabe
- **THEN** werden max 8 Rezepte angezeigt, sortiert nach Relevanz (SearchRank)

#### Scenario: Full-Text nicht verfügbar
- **WHEN** der search_vector eines Rezepts leer ist
- **THEN** wird auf title__icontains als Fallback zurückgegriffen

#### Scenario: Keyboard-Navigation
- **WHEN** Quick Search Ergebnisse sichtbar sind
- **THEN** kann User mit ↑↓ navigieren, Enter zum Auswählen, Esc zum Schließen

#### Scenario: Rezept auswählen
- **WHEN** User ein Ergebnis anklickt oder mit Enter bestätigt
- **THEN** wird das Rezept dem Meal zugewiesen und die Suche schließt

---

### Requirement: Dialog Search mit Filtern und Meal-Type-Kontext
Ein Dialog bietet erweiterte Rezeptsuche mit Vorfilterung basierend auf dem Meal-Type.

#### Scenario: Dialog öffnen
- **WHEN** User den Dialog-Button neben dem Suchfeld klickt
- **THEN** öffnet sich ein Dialog mit recipe_type vorausgewählt basierend auf meal_type Mapping

#### Scenario: Kontext-Mapping
- **WHEN** meal_type = breakfast → recipe_type Filter zeigt breakfast, simple_meal
- **WHEN** meal_type = lunch oder dinner → recipe_type Filter zeigt warm_meal, cold_meal, side_dish
- **WHEN** meal_type = snack → recipe_type Filter zeigt snack, simple_meal
- **WHEN** meal_type = dessert → recipe_type Filter zeigt dessert

#### Scenario: Filter ändern
- **WHEN** User den recipe_type Filter auf "Alle" setzt
- **THEN** werden alle Rezepttypen in den Ergebnissen angezeigt

#### Scenario: Nutritional Tags filtern
- **WHEN** User Nutritional Tags auswählt (z.B. vegetarisch)
- **THEN** werden nur Rezepte mit diesen Tags angezeigt

#### Scenario: Rezept im Dialog auswählen
- **WHEN** User ein Rezept in der Ergebnisliste anklickt
- **THEN** wird es dem Meal zugewiesen und der Dialog schließt

---

### Requirement: Suchfeld und Dialog-Button Sichtbarkeit
Quick Search und Dialog-Button erscheinen nur nach ⊕ Klick.

#### Scenario: Initialer Zustand
- **WHEN** kein Suchvorgang aktiv ist
- **THEN** sind weder Suchfeld noch Dialog-Button sichtbar

#### Scenario: Suche aktivieren
- **WHEN** User den ⊕ Button eines Meals klickt
- **THEN** erscheinen Suchfeld und Dialog-Button gemeinsam

---

### Requirement: Recipe search endpoint returns unified results
The search endpoint `GET /api/meal-plans/recipes/search/` SHALL return both recipes and standalone ingredients in a structured response with two separate arrays.

#### Scenario: Search with text query
- **WHEN** user searches with `q=apfel`
- **THEN** response SHALL contain `recipes` array (matching recipes) and `ingredients` array (matching standalone ingredients with `name__icontains`)

#### Scenario: Search with recipe_type filter
- **WHEN** user filters by `recipe_type=snack`
- **THEN** `recipes` array SHALL contain only recipes with `recipe_type=snack`
- **AND** `ingredients` array SHALL contain only standalone ingredients with `standalone_type=snack`

#### Scenario: Search with nutritional_tag_ids
- **WHEN** user filters with `nutritional_tag_ids=1,2`
- **THEN** both recipes and ingredients SHALL be filtered by ALL specified tag IDs

#### Scenario: Ingredient results include portions
- **WHEN** standalone ingredients are returned in search results
- **THEN** each ingredient SHALL include its `portions` array with `id`, `name`, `measuring_unit`, `quantity`, `weight_g`

#### Scenario: Empty search returns results based on filters
- **WHEN** `q` is empty but `recipe_type` is set
- **THEN** system SHALL return recipes and ingredients matching the type filter (up to limit)
