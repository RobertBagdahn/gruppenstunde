## ADDED Requirements

### Requirement: Nährwerte pro Mahlzeit im Kochplan

Das System SHALL pro CookingScheduleItem die Nährwerte des Rezepts skaliert auf die tatsächlichen Portionen zurückgeben: `total_energy_kcal`, `total_protein_g`, `total_fat_g`, `total_carbohydrate_g`.

Die Berechnung SHALL identisch zur existierenden NutritionSummary-Logik erfolgen: Skalierung basierend auf `factor * (effective_portions / recipe_portions)`.

#### Scenario: Nährwerte für ein Rezept

- **WHEN** ein Rezept mit 4 Portionen und 2000 kcal Gesamtenergie für 20 Personen mit factor=1.0 eingeplant ist
- **THEN** beträgt `total_energy_kcal` = 2000 * 1.0 * (20/4) = 10000 kcal

### Requirement: Nährwert-Anzeige im Frontend

Das Frontend SHALL in der Druckansicht pro Mahlzeit die Nährwerte (kcal, Protein, Fett, Kohlenhydrate) anzeigen. Format: kompakt als Badge-Zeile unter dem Rezepttitel.

#### Scenario: Nährwerte in der Druckansicht

- **WHEN** ein Rezept Nährwerte enthält
- **THEN** zeigt die Druckansicht eine Zeile mit z.B. "384 kcal · 12g P · 8g F · 45g KH"

#### Scenario: Keine Nährwerte verfügbar

- **WHEN** ein Rezept keine gecachten Nährwerte hat
- **THEN** werden keine Nährwerte angezeigt (kein Platzhalter)
