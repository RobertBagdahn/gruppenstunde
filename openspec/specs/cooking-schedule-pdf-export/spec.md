## ADDED Requirements

### Requirement: Kochplan-PDF-Export
Der Server SHALL GET /api/meal-plans/{id}/cooking-schedule/export/pdf/ bereitstellen, das eine PDF-Datei des Kochplans mit WeasyPrint generiert. Das PDF SHALL im Kochbuch-Layout mit Deckblatt, Tagesabschnitten, Rezept-Karten, Zutatenlisten, Zubereitungsschritten, Allergen-Badges und Kosten-Übersichten gerendert werden.

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
