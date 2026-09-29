# meal-planner-actionable-alerts Specification

## Purpose
TBD - created by archiving change redesign-meal-planner-ux. Update Purpose after archive.
## Requirements
### Requirement: Header Plan-Check Button
The meal plan header SHALL provide a `[ 🔔 Plan-Check (X) ]` trigger button displaying the current count of unresolved planning warnings or gaps.

#### Scenario: Displaying alert count badge
- **WHEN** a meal plan contains empty mandatory meal slots or budget exceedances
- **THEN** header button displays an attention badge showing the exact count of identified issues (e.g., "Plan-Check (3)")

### Requirement: Actionable Alerts Flyout
Clicking the Plan-Check trigger SHALL open a structured flyout listing prioritized issues, each accompanied by a 1-click action button.

#### Scenario: Resolving empty meal slot via action button
- **WHEN** user views an alert stating "Samstagmittag ist noch leer" and clicks "[ 🪄 Gericht vorschlagen ]"
- **THEN** system triggers AI suggestion generation tailored to that specific slot and displays suggestions immediately

### Requirement: Plan-Check meldet Integritäts- und Plausibilitätsprobleme
`GET /api/meal-plans/{id}/plan-check/` MUST zusätzlich zu den bestehenden Hinweisen folgende Typen liefern, jeweils mit Tag, Mahlzeit und einer 1-Klick-Aktion:
- `recipe_type_mismatch` (Hinweis): Ein Rezept-Eintrag passt nicht zum Mahlzeitentyp. Erlaubt sind:
  - Frühstück: `breakfast`, `drink`, `snack`
  - Mittag- und Abendessen: `warm_meal`, `cold_meal`, `dessert`, `drink`
  - Snack: `snack`, `dessert`, `drink`
  - Getränke: `drink`
  Rezepte ohne Typ (`""`) oder vom Typ `recipe_part` werden nicht gemeldet. Aktion: „Rezept tauschen“.
- `missing_quantity` (Warnung): Ein Zutaten-Eintrag hat keine Menge, oder ein Eintrag liefert 0 kcal. Aktion: „Menge setzen“.
- `meal_outside_range` (Warnung): Eine reguläre Mahlzeit liegt außerhalb des Planzeitraums. Aktion: „Mahlzeit verschieben“ bzw. „Zeitraum anpassen“.
- `empty_day` (Hinweis): Ein Tag innerhalb des Zeitraums hat keine Mahlzeit. Aktion: „Mahlzeiten anlegen“.

Pydantic (`PlanCheckAlertOut.type`) und Zod MUST die neuen Typen als Enum führen.

#### Scenario: Wraps zum Frühstück
- **GIVEN** ein Frühstück enthält das Rezept „Wraps mit Gemüsefüllung“ (`cold_meal`)
- **WHEN** ein Editor den Plan-Check öffnet
- **THEN** enthält die Liste einen Hinweis `recipe_type_mismatch` für dieses Frühstück

#### Scenario: Zutat ohne Menge
- **GIVEN** ein Altbestands-Eintrag „4-Kornflocken Bio“ ohne Menge
- **WHEN** der Plan-Check geladen wird
- **THEN** enthält er eine Warnung `missing_quantity`, und der Zähler im Button steigt um 1

#### Scenario: Leser ohne Bearbeitungsrecht
- **GIVEN** ein Collaborator mit Rolle `viewer`
- **WHEN** er den Plan-Check öffnet
- **THEN** sieht er die Hinweise, aber keine Aktions-Buttons

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Nutzer `GET /api/meal-plans/{id}/plan-check/` aufruft
- **THEN** antwortet die API mit HTTP 403
