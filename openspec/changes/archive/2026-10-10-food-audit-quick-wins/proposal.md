# Quick-Wins für bestätigte Food-Audit-Bugs

## Why

Der aktuelle Food-Audit enthält mehrere klar eingrenzbare Fehler, die falsche PDF-Werte, ungültige API-Daten oder irreführende UI-Zustände erzeugen. Diese Korrekturen sollen unabhängig von den größeren Änderungen an Plan-Eingaben, Einkaufslisten-Lebenszyklus und Berechnungsarchitektur schnell und mit gezielten Regressionstests umgesetzt werden.

## What Changes

- Kochplan-PDF: Preisberechnungen verwenden einen konsistenten Zahlentyp; ein Regressionstest prüft den Betrag mit einem `Decimal`-Cachewert.
- Rezept-PDF: Nährwerte pro Portion bleiben bei einer Änderung der angeforderten Ziel-Portionszahl fachlich korrekt; Tests bilden die gespeicherte Normportion und skalierte Zutaten gemeinsam ab.
- MealItem-Faktoren kleiner oder gleich null werden bei Anlage und Änderung abgelehnt.
- Rezept- und Plan-Anlage lehnen leere oder nur aus Leerzeichen bestehende Namen, zu lange Titel sowie unbekannte Rezepttypen mit einem verständlichen Validierungsfehler ab.
- Der Frühstücksassistent kann nicht über einen leeren erforderlichen Basiskatalog hinweg fortgesetzt werden und zeigt keine scheinbar belastbaren Nährwertsummen aus fehlenden Daten.
- Die betroffenen Food-Ansichten werden auf die gemeldeten kleinen Darstellungsfehler geprüft: Rezeptvorschau ohne rohes Markdown, kaufmännische Rundung von Einkaufsgewichten und bedienbare Zutatenzeilen bei 320 px.

Nicht enthalten sind die Aktualisierung bereits erstellter Einkaufslisten, umfassende Obergrenzen für Planparameter, direkte Gramm-Zeilen in allen Berechnungen oder die produktive Bereinigung des Zutatenkatalogs.

## Capabilities

### Modified Capabilities
- `cooking-schedule-pdf-export`
- `recipe-pdf-export`
- `food-error-presentation`
- `breakfast-wizard`
- `quantity-display-formatting`

## Impact

- Backend: `planner`, `recipe` und gemeinsame Content-Schemas.
- Food-Frontend: Frühstücksassistent, Rezeptvorschau, API-Zod-Schemas und mobile Zutatenansichten.
- Tests: gezielte Backend-Regressionen für Dezimal-/Portionsberechnung sowie Frontend-Tests für Validierung, leeren Katalog und Darstellung.
