# meal-plan-budget-cockpit Specification

## Purpose

Permanente, leicht verständliche Visualisierung des finanziellen Budgets und der Nährwertabdeckung direkt oberhalb der Essensplan-Arbeitsflächen.

## Requirements

### Requirement: Sticky Budget- und Nährwert-Cockpit

Die Essensplan-Detailseite SHALL oberhalb der Tab-Navigation oder direkt über der Arbeitsfläche
ein kompaktes, immer sichtbares Budget- und Nährwert-Cockpit anzeigen, wenn ein Budget konfiguriert ist.
Das Cockpit zeigt:
- Gesamt-Budget pro Person und Tag (Soll) vs. aktueller Durchschnitt (Ist)
- Verbleibendes Restbudget oder Überziehung in Euro und Prozent
- Farbkodierte Status-Ampel: Grün (im Budget <= 100%), Gelb (100–120%), Rot (> 120%)
- Kalorien-Abdeckung (Ist-Kcal vs. 2.000 kcal Richtwert)

#### Scenario: Budget im grünen Bereich
- **WHEN** die geplanten Gesamtkosten pro Person und Tag unterhalb des Tagesbudgets liegen
- **THEN** zeigt das Cockpit den verbleibenden Betrag und eine grüne Statusanzeige

#### Scenario: Budget überzogen
- **WHEN** die geplanten Gesamtkosten pro Person und Tag das Budget um mehr als 20% übersteigen
- **THEN** hebt das Cockpit die Überziehung mit einer roten Warnfarbe hervor

#### Scenario: Plan ohne Budgetvorgabe
- **WHEN** für einen Essensplan kein `budget_per_person_per_day` hinterlegt ist
- **THEN** zeigt das Cockpit die Gesamtkosten pro Person und Tag ohne Soll/Ist-Ampelwarnung sowie die Kalorienbilanz an
