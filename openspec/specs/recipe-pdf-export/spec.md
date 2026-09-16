# recipe-pdf-export Specification

## Purpose
Defines the recipe PDF export with description, structured preparation steps, ingredient list, nutrition and allergen notes, scalable to a temporary target serving count without changing stored recipes.
## Requirements
### Requirement: Rezept-PDF-Export
Der Server SHALL GET `/api/recipes/{slug}/export/pdf/` bereitstellen, das eine PDF-Datei mit Beschreibung, strukturierter Zubereitung, Zutatenliste, Nährwerten und Allergen-Hinweisen generiert. Der optionale Parameter `servings` SHALL die temporäre Zielpersonenzahl bestimmen; die gespeicherte Normportion SHALL unverändert bleiben.

#### Scenario: Erfolgreicher Rezept-PDF-Export
- **WHEN** ein authentifizierter Nutzer den Endpunkt für ein gültiges Rezept mit `servings=4` aufruft
- **THEN** die Response SHALL `Content-Type: application/pdf` und `Content-Disposition: inline; filename="{slug}-rezept.pdf"` haben
- **THEN** das PDF SHALL Mengen für vier Portionen enthalten
- **THEN** das PDF SHALL Beschreibung und Zubereitungsschritte getrennt enthalten

#### Scenario: Zutatenliste mit Mengen
- **WHEN** das PDF ein Rezept mit RecipeItems rendert
- **THEN** SHALL die Zutatenliste jeden RecipeItem einschließlich direkter Grammitems, fachlicher Portionsnamen, skalierter Menge und Notiz ausgeben

#### Scenario: Stückportion
- **WHEN** ein RecipeItem `2 kleine Zwiebeln` mit bestätigtem Stückgewicht exportiert wird
- **THEN** SHALL das PDF `2 kleine Zwiebeln` sowie den technischen Grammwert anzeigen

#### Scenario: Zubereitungsschritte
- **WHEN** das Rezept RecipeStep-Einträge besitzt
- **THEN** SHALL diese als nummerierte, aufgelöste Zubereitungsschritte mit Reihenfolge, Sektionen, Platzhalterauflösung, Dauer und Schritt-Zutaten erscheinen
- **THEN** SHALL das PDF nur bei fehlenden RecipeSteps auf Markdown zurückfallen

#### Scenario: Nährwert-Übersicht
- **WHEN** das Rezept `cached_*`-Felder hat
- **THEN** eine Tabelle SHALL Energie (kcal), Eiweiß (g), Fett (g), Kohlenhydrate (g), Zucker (g), Ballaststoffe (g), Salz (g) pro 100g und pro Portion anzeigen
- **THEN** die pro-Portion-Werte SHALL anhand der angeforderten Zielpersonenzahl berechnet werden, während pro-100-g-Werte unverändert bleiben

#### Scenario: Allergen-Hinweise
- **WHEN** das Rezept Zutaten mit NutritionalTags (Allergenen) hat
- **THEN** das PDF SHALL eine Zeile „Enthält: Gluten, Laktose, ..." anzeigen
- **THEN** bei keinen Allergenen SHALL „Keine kennzeichnungspflichtigen Allergene" erscheinen

#### Scenario: Rezept nicht gefunden
- **WHEN** der Slug auf kein Rezept verweist
- **THEN** das System SHALL HTTP 404 mit „Rezept nicht gefunden" zurückgeben

#### Scenario: Nicht authentifiziert
- **WHEN** ein nicht authentifizierter Nutzer den Endpunkt aufruft
- **THEN** das System SHALL HTTP 403 mit „Anmeldung erforderlich" zurückgeben
