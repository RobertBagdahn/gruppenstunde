## MODIFIED Requirements

### Requirement: Kostenübersicht mit Preisabdeckung
Meal-Plan-Kosten SHALL nur bestätigte positive Zutatenpreise verwenden und die Preisabdeckung über alle aktiven Zutaten transparent ausgeben. Die Kostenantwort SHALL `total_ingredients`, `priced_ingredients`, `missing_ingredients` und `coverage` liefern.

#### Scenario: KI-Preis noch ausstehend
- **WHEN** eine Zutat nur einen pending KI-Preisvorschlag besitzt
- **THEN** SHALL sie als unbepreist gelten
- **THEN** SHALL der Meal-Plan keinen unbestätigten Preis in Summen verwenden
- **THEN** SHALL sie in `missing_ingredients` gezählt werden

#### Scenario: Preis nach Bestätigung
- **WHEN** der Preisvorschlag bestätigt wurde
- **THEN** SHALL die Kostenberechnung den globalen Preis verwenden
- **THEN** SHALL die Preisabdeckung aktualisiert erscheinen

#### Scenario: Vollständige Abdeckungsantwort
- **WHEN** ein Meal-Plan aktive Rezeptzutaten und Direktzutaten enthält
- **THEN** SHALL jede aktive Zutat genau einmal in der Abdeckung gezählt werden
- **THEN** SHALL `coverage` `priced_ingredients / total_ingredients` entsprechen oder `null` sein, wenn keine Zutaten vorhanden sind

#### Scenario: Teilweise bepreister Meal-Plan
- **WHEN** nur ein Teil der aktiven Zutaten einen positiven Preis besitzt
- **THEN** SHALL der bekannte Teilbetrag weiterhin berechnet werden
- **THEN** SHALL API und Food-UI den Betrag als unvollständig kennzeichnen
