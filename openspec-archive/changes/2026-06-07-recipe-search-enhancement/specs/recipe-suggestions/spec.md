## MODIFIED Requirements

### Requirement: Rezept-Vorschläge beim Öffnen des Suchfelds
Das System MUSS beim Öffnen des Rezept-Suchfelds sofort bis zu 10 Rezept-Vorschläge anzeigen, sortiert nach globaler Verwendungshäufigkeit in Essensplänen, bei Gleichstand nach Preis (günstiger zuerst).

#### Scenario: Suchfeld öffnen ohne Eingabe
- **WHEN** User den "+"-Button bei einer Mahlzeit klickt
- **THEN** werden sofort bis zu 10 Rezepte angezeigt, sortiert nach Häufigkeit der Verwendung in MealItems, bei Gleichstand nach Preis

#### Scenario: Suchfeld öffnen mit meal_type Kontext
- **WHEN** User den "+"-Button bei einem Frühstücks-Slot klickt
- **THEN** werden primär Rezepte angezeigt die häufig in Frühstücks-Mahlzeiten (inkl. dessert) verwendet werden, aufgefüllt mit global häufigen Rezepten falls weniger als 10 typspezifische existieren

### Requirement: Suche ab erstem Buchstaben
Das System MUSS Suchergebnisse ab dem ersten eingegebenen Buchstaben liefern, mit 200ms Debounce.

#### Scenario: Ein Buchstabe eingegeben
- **WHEN** User einen einzelnen Buchstaben "P" eingibt und 200ms vergehen
- **THEN** werden passende Rezepte angezeigt deren Titel "P" enthält, sortiert nach Verwendungshäufigkeit, dann Preis

#### Scenario: Schnelles Tippen
- **WHEN** User mehrere Buchstaben schnell hintereinander tippt
- **THEN** wird nur ein API-Request nach 200ms Pause gesendet (Debounce)

### Requirement: Sortierung nach Verwendungshäufigkeit
Alle Rezept-Vorschläge und Suchergebnisse MÜSSEN nach globaler Verwendungshäufigkeit in Essensplänen sortiert sein (häufigste zuerst), bei Gleichstand nach Preis (günstiger zuerst, NULLS LAST).

#### Scenario: Sortierung der Vorschläge
- **WHEN** Vorschläge angezeigt werden (mit oder ohne Suchtext)
- **THEN** steht das am häufigsten verwendete (bzw. bei Gleichstand günstigste) Rezept an erster Stelle

#### Scenario: Verwendungszähler anzeigen
- **WHEN** ein Rezept in der Vorschlagsliste erscheint
- **THEN** wird die Anzahl der Verwendungen als Badge angezeigt (z.B. "12x")

### Requirement: API-Endpunkt für Vorschläge
Das System MUSS einen API-Endpunkt bereitstellen der Rezept-Vorschläge nach Häufigkeit liefert. Vorschläge MÜSSEN recipe_badge, price_per_serving und recipe_type enthalten.

#### Scenario: Request ohne Suchtext
- **WHEN** `GET /api/meal-plans/recipes/suggestions/?meal_type=breakfast&limit=10` aufgerufen wird
- **THEN** werden bis zu 10 Rezepte zurückgegeben mit `id`, `title`, `usage_count`, `image_thumbnail`, `recipe_badge`, `price_per_serving`, `recipe_type`, sortiert nach `usage_count` DESC, `cached_price_total` ASC NULLS LAST

#### Scenario: Request mit Suchtext
- **WHEN** `GET /api/meal-plans/recipes/suggestions/?meal_type=lunch&q=Nudel&limit=10` aufgerufen wird
- **THEN** werden nur Rezepte zurückgegeben deren Titel "Nudel" enthält (case-insensitive), sortiert nach `usage_count` DESC, `cached_price_total` ASC NULLS LAST

## ADDED Requirements

### Requirement: Fallback auf alle Rezepttypen bei leeren Vorschlägen
Wenn kategoriespezifische Vorschläge weniger als `limit` Ergebnisse liefern, MUSS der Endpoint mit Ergebnissen aus allen recipe_types auffüllen (ohne Duplikate). Der Response MUSS `fallback_applied: true` enthalten.

#### Scenario: Keine Frühstücks-Vorschläge
- **WHEN** keine Rezepte vom Typ breakfast+simple_meal+dessert existieren
- **THEN** werden Rezepte aus allen recipe_types zurückgegeben mit fallback_applied: true

### Requirement: Harter Diät-Filter für Vorschläge
Der Vorschlags-Endpoint MUSS den Query-Parameter `require_nutritional_tags` unterstützen. Wenn `true`, werden nur Rezepte zurückgegeben die ALLE in `nutritional_tag_ids` spezifizierten Tags haben (AND).

#### Scenario: Vegan-Filter aktiv
- **WHEN** `require_nutritional_tags=true&nutritional_tag_ids=1` (vegan)
- **THEN** werden nur Rezepte mit dem Tag "vegan" zurückgegeben

#### Scenario: Vegan+Glutenfrei-Filter aktiv
- **WHEN** `require_nutritional_tags=true&nutritional_tag_ids=1,3` (vegan, glutenfrei)
- **THEN** werden nur Rezepte zurückgegeben die BEIDE Tags haben

### Requirement: Zufalls-Vorschlag
Der Vorschlags-Endpoint MUSS den Query-Parameter `random=true` unterstützen. Bei `random=true` wird EIN zufälliges Rezept aus den Top-20 Ergebnissen (nach Ranking + Filter) zurückgegeben.

#### Scenario: Zufalls-Vorschlag
- **WHEN** `GET /api/meal-plans/recipes/suggestions/?meal_type=lunch&random=true&limit=1`
- **THEN** wird genau EIN zufälliges Rezept aus den Top-20 zurückgegeben, das die Filter respektiert

#### Scenario: Zufalls-Vorschlag mit Diät-Filter
- **WHEN** `random=true&require_nutritional_tags=true&nutritional_tag_ids=1`
- **THEN** wird ein zufälliges veganes Rezept aus den Top-20 zurückgegeben

### Requirement: Erweiterte Vorschlags-Felder für Inline-Suche
Jeder Vorschlag MUSS recipe_badge ("verified"|"community"|"draft"), price_per_serving (nullable), und recipe_type enthalten, damit die Inline-Suche die gleichen Informationen wie der Dialog anzeigen kann.

#### Scenario: Vorschlag mit Ampel
- **WHEN** ein Rezept in der Vorschlagsliste erscheint
- **THEN** wird recipe_badge mit passendem Wert ausgeliefert und als farbiger Punkt angezeigt

#### Scenario: Vorschlag mit Preis
- **WHEN** ein Rezept mit cached_price_total in der Vorschlagsliste erscheint
- **THEN** wird price_per_serving berechnet und als "X,XX €" angezeigt
