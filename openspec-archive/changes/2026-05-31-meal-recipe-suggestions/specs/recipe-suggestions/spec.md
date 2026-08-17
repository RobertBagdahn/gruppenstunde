## ADDED Requirements

### Requirement: Rezept-Vorschläge beim Öffnen des Suchfelds
Das System MUSS beim Öffnen des Rezept-Suchfelds sofort bis zu 10 Rezept-Vorschläge anzeigen, sortiert nach globaler Verwendungshäufigkeit in Essensplänen.

#### Scenario: Suchfeld öffnen ohne Eingabe
- **WHEN** User den "+"-Button bei einer Mahlzeit klickt
- **THEN** werden sofort bis zu 10 Rezepte angezeigt, sortiert nach Häufigkeit der Verwendung in MealItems

#### Scenario: Suchfeld öffnen mit meal_type Kontext
- **WHEN** User den "+"-Button bei einem Frühstücks-Slot klickt
- **THEN** werden primär Rezepte angezeigt die häufig in Frühstücks-Mahlzeiten verwendet werden, aufgefüllt mit global häufigen Rezepten falls weniger als 10 typspezifische existieren

### Requirement: Suche ab erstem Buchstaben
Das System MUSS Suchergebnisse ab dem ersten eingegebenen Buchstaben liefern, mit 200ms Debounce.

#### Scenario: Ein Buchstabe eingegeben
- **WHEN** User einen einzelnen Buchstaben "P" eingibt und 200ms vergehen
- **THEN** werden passende Rezepte angezeigt deren Titel "P" enthält, sortiert nach Verwendungshäufigkeit

#### Scenario: Schnelles Tippen
- **WHEN** User mehrere Buchstaben schnell hintereinander tippt
- **THEN** wird nur ein API-Request nach 200ms Pause gesendet (Debounce)

### Requirement: Sortierung nach Verwendungshäufigkeit
Alle Rezept-Vorschläge und Suchergebnisse MÜSSEN nach globaler Verwendungshäufigkeit in Essensplänen sortiert sein (häufigste zuerst).

#### Scenario: Sortierung der Vorschläge
- **WHEN** Vorschläge angezeigt werden (mit oder ohne Suchtext)
- **THEN** steht das am häufigsten in MealItems verwendete Rezept an erster Stelle

#### Scenario: Verwendungszähler anzeigen
- **WHEN** ein Rezept in der Vorschlagsliste erscheint
- **THEN** wird die Anzahl der Verwendungen als Badge angezeigt (z.B. "12x")

### Requirement: API-Endpunkt für Vorschläge
Das System MUSS einen API-Endpunkt bereitstellen der Rezept-Vorschläge nach Häufigkeit liefert.

#### Scenario: Request ohne Suchtext
- **WHEN** `GET /api/planner/recipes/suggestions/?meal_type=breakfast&limit=10` aufgerufen wird
- **THEN** werden bis zu 10 Rezepte zurückgegeben mit `id`, `title`, `usage_count`, `image_thumbnail`, sortiert nach `usage_count` DESC

#### Scenario: Request mit Suchtext
- **WHEN** `GET /api/planner/recipes/suggestions/?meal_type=lunch&q=Nudel&limit=10` aufgerufen wird
- **THEN** werden nur Rezepte zurückgegeben deren Titel "Nudel" enthält (case-insensitive), sortiert nach `usage_count` DESC
