## ADDED Requirements

### Requirement: Kosten-Aggregation API

Das Backend berechnet aggregierte Kosten eines MealPlans basierend auf `Ingredient.price_per_kg`, Mengen und Portionsskalierung.

#### Scenario: Kostenübersicht abrufen
- **WHEN** ein GET-Request an `/api/planner/meal-plans/{id}/costs/` gesendet wird
- **THEN** wird eine Zusammenfassung mit Gesamtkosten, Kosten pro Person, und Aufschlüsselung pro Tag/Mahlzeit zurückgegeben

#### Scenario: Zutaten ohne Preis
- **WHEN** Zutaten in einem MealItem kein `price_per_kg` haben
- **THEN** werden diese bei der Berechnung übersprungen und die Antwort enthält Informationen über die Abdeckung (z.B. "12 von 15 Zutaten mit Preis")

### Requirement: Kosten-Dashboard UI

Ein Tab "Kosten" in der MealPlan-Detailseite zeigt die aggregierten Preisdaten.

#### Scenario: Dashboard-Anzeige
- **WHEN** der Benutzer den Tab "Kosten" auswählt
- **THEN** werden angezeigt: Gesamtkosten, Kosten pro Person, eine Tabelle mit Kosten pro Tag und Kosten pro Tag pro Person

#### Scenario: Kosten pro Mahlzeit
- **WHEN** der Benutzer die Tagesaufschlüsselung betrachtet
- **THEN** sind die Kosten pro Mahlzeit (Frühstück, Mittag, Abend, Snack) innerhalb jedes Tages sichtbar

#### Scenario: Unvollständige Preisdaten
- **WHEN** nicht alle Zutaten einen Preis haben
- **THEN** wird ein Hinweis angezeigt, dass die Kosten geschätzt sind, mit Angabe der Abdeckung

### Requirement: Display recipe costs in meal plan
The cost dashboard SHALL clearly communicate when recipe cost data is incomplete or unavailable, instead of showing "–" or "0,00 €".

#### Scenario: Recipe with no priced ingredients
- **WHEN** a recipe has zero ingredients with `price_per_kg` set
- **THEN** the UI SHALL display "Keine Preise" in muted/gray text instead of "–"

#### Scenario: Recipe with partial price coverage
- **WHEN** a recipe has some but not all ingredients with prices
- **THEN** the UI SHALL display the calculated cost with a visual indicator that the cost is incomplete (e.g., "~12,50 €" or a warning icon)

#### Scenario: Summary cards show price coverage
- **WHEN** the total price coverage across all recipes is below 100%
- **THEN** the summary section SHALL display "X von Y Zutaten mit Preis" as context

#### Scenario: Daily cost table with missing prices
- **WHEN** a day has meals where all ingredients lack prices
- **THEN** the table SHALL show "–" instead of "0,00 €" to avoid implying the meal is free
