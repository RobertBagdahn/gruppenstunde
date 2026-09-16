# cooking-schedule-pdf-export Specification

## Purpose
Defines the cooking schedule (Kochplan) PDF export: cookbook layout with cover page, day sections, recipe cards, ingredients and preparation steps scaled to effective portions, allergen badges and cost overviews.
## Requirements
### Requirement: Kochplan-PDF-Export
Der Server SHALL GET /api/meal-plans/{id}/cooking-schedule/export/pdf/ bereitstellen, das eine PDF-Datei des Kochplans mit WeasyPrint generiert. Das PDF SHALL im Kochbuch-Layout mit Deckblatt, Tagesabschnitten, Rezept-Karten, Zutatenlisten, Zubereitungsschritten, Allergen-Badges und Kosten-Übersichten gerendert werden. Eine Kochplan-Rezeptkarte SHALL strukturierte RecipeSteps bevorzugen, Platzhalter und Mengen im Planmaßstab auflösen und nur bei fehlenden Steps die Markdown-Beschreibung verwenden.

#### Scenario: Deckblatt
- **WHEN** das Kochplan-PDF generiert wird
- **THEN** die erste Seite SHALL Inspi-Logo, Plan-Name, Zeitraum, Portionen und eine Übersicht der enthaltenen Tage zeigen

#### Scenario: Rezept pro Seite mit Kochbuch-Layout
- **WHEN** das Kochplan-PDF Tagesabschnitte enthält
- **THEN** jedes Rezept SHALL auf einer neuen Seite beginnen (`page-break-before: always`)
- **THEN** Serifen-Schrift SHALL für Fließtext verwendet werden, serifenlos für Überschriften
- **THEN** A4-Optimierung mit Rändern 6–8 mm und max-width 21 cm

#### Scenario: Rezept-Karte mit Zutaten und Schritten
- **WHEN** eine Rezept-Karte im PDF gerendert wird
- **THEN** SHALL sie enthalten: Rezept-Titel, Portionsangabe (skaliert auf effective_portions), vollständige Zutatenliste mit Mengen, Zubereitungsschritte, Allergen-Badges (farbige Labels für Laktose, Gluten, Nüsse, etc.)
- **THEN** Mengen SHALL auf die tatsächliche Personenzahl (effective_portions) skaliert sein

#### Scenario: Kochplan mit strukturierten Schritten
- **WHEN** ein MealPlan ein Rezept mit RecipeSteps enthält
- **THEN** SHALL die Kochplan-PDF-Karte diese Schritte anzeigen
- **THEN** SHALL die Schrittmengen auf `effective_portions` skaliert sein

#### Scenario: Kochplan mit Legacy-Rezept
- **WHEN** ein Rezept keine RecipeSteps, aber eine Beschreibung besitzt
- **THEN** SHALL die PDF-Karte die Beschreibung heuristisch als Schritte darstellen

#### Scenario: Tagesüberschrift mit Kosten
- **WHEN** ein neuer Tag im PDF beginnt
- **THEN** eine Tagesüberschrift SHALL das Datum, den Wochentag und die geschätzten Gesamtkosten für diesen Tag anzeigen

#### Scenario: Allergen-Badges pro Rezept
- **WHEN** ein Rezept Allergene enthält
- **THEN** farbige Badges SHALL die enthaltenen Allergene anzeigen (z. B. rot für Nüsse, orange für Gluten, blau für Laktose)

#### Scenario: Kochplan nicht gefunden
- **WHEN** der MealPlan keine Meals hat oder nicht existiert
- **THEN** das System SHALL HTTP 404 mit „Keine Mahlzeiten für Kochplan gefunden" zurückgeben

#### Scenario: Nicht authentifiziert
- **WHEN** ein nicht authentifizierter Nutzer den Endpunkt aufruft
- **THEN** das System SHALL HTTP 403 mit „Anmeldung erforderlich" zurückgeben
