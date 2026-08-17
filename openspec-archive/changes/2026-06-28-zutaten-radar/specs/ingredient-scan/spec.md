## ADDED Requirements

### Requirement: Alle NutritionalTags von Ingredient zu Recipe syncen

Das System SHALL alle NutritionalTags (nicht nur `is_dangerous=True`) von den Ingredients eines Rezepts auf das Recipe übertragen. Manuell gesetzte nicht-dangeröse Tags auf dem Recipe SHALL erhalten bleiben.

#### Scenario: Vollständiger Sync von Ingredient-Tags

- **WHEN** ein RecipeItem mit einem Ingredient erstellt wird, der NutritionalTags hat
- **THEN** werden ALLE Tags dieses Ingredients via Sync auf das Recipe übertragen
- **AND** das Recipe behält seine manuell gesetzten Tags zusätzlich

#### Scenario: Nicht-dangeröse manuelle Tags bleiben erhalten

- **WHEN** ein Recipe den manuellen Tag "vegetarisch" (`is_dangerous=False`) hat
- **AND** die Ingredients des Rezepts nur den Tag "vegan" beisteuern
- **THEN** hat das Recipe nach dem Sync beide Tags ("vegetarisch" und "vegan")

#### Scenario: Sync feuert bei RecipeItem-Änderungen

- **WHEN** ein RecipeItem gelöscht wird
- **THEN** werden die Tags des gelöschten Ingredients aus dem Recipe entfernt
- **AND** nur wenn kein anderes RecipeItem im selben Recipe diese Tags beisteuert

#### Scenario: Rekursionsschutz

- **WHEN** der Sync das Recipe speichert
- **THEN** wird ein Flag gesetzt, das erneutes Auslösen des Syncs verhindert

### Requirement: Zutaten-Scan (Ingredient Scan) im MealPlan

Das System SHALL einen Endpunkt `GET /api/meal-plans/{id}/ingredient-scan/` bereitstellen, der alle MealItems auf NutritionalTag-Konflikte mit den Plan-Einschränkungen prüft – sowohl Recipe-Items als auch Standalone-Ingredient-Items.

#### Scenario: Scan erkennt Verstoß bei Rezept mit Ingredient-Tag (via Sync)

- **WHEN** ein MealPlan auf "nussfrei" eingeschränkt ist
- **AND** ein Rezept im Plan eine Zutat enthält, die den Tag "nussfrei" hat (via Sync aufs Recipe übertragen)
- **THEN** meldet der Scan einen Verstoß für dieses Rezept

#### Scenario: Scan erkennt Verstoß bei Standalone-Ingredient

- **WHEN** ein MealPlan auf "laktosefrei" eingeschränkt ist
- **AND** ein MealItem im Plan eine Standalone-Zutat ohne Rezept referenziert
- **AND** diese Zutat hat den Tag "laktosefrei"
- **THEN** meldet der Scan einen Verstoß für diese Zutat

#### Scenario: Scan meldet keine Verstöße bei konformen Rezepten

- **WHEN** ein MealPlan auf "vegan" und "nussfrei" eingeschränkt ist
- **AND** alle Rezepte und Standalone-Zutaten im Plan KEINE dieser Tags haben
- **THEN** meldet der Scan 0 Verstöße

#### Scenario: Authentifizierung erforderlich

- **WHEN** ein nicht eingeloggter Nutzer den Scan-Endpunkt aufruft
- **THEN** antwortet der Server mit 403

### Requirement: Backfill bestehender Rezepte

Das System SHALL ein Management Command bereitstellen, das für alle bestehenden Rezepte den Sync der NutritionalTags von Ingredients anstößt.

#### Scenario: Backfill mit dry-run

- **WHEN** das Management Command mit `--dry-run` ausgeführt wird
- **THEN** werden keine Änderungen an der Datenbank vorgenommen
- **AND** die Anzahl der zu aktualisierenden Rezepte wird ausgegeben

#### Scenario: Backfill aktualisiert alle Rezepte

- **WHEN** das Management Command ohne `--dry-run` ausgeführt wird
- **THEN** werden alle Rezepte mit dem aktuellen Sync-Stand ihrer Ingredients aktualisiert

### Requirement: Rename von Allergen auf Zutaten-Radar

Alle sichtbaren UI-Texte, API-Endpunkte und Komponenten-Namen SHALL von "Allergen"/"Allergene" auf "Zutaten-Radar"/"Ingredient" umbenannt werden.

#### Scenario: API-Endpunkt umbenannt

- **WHEN** ein Client `GET /api/meal-plans/{id}/ingredient-scan/` aufruft
- **THEN** erhält er die gleiche Response wie zuvor unter `/allergen-scan/`
- **AND** der alte Pfad `/allergen-scan/` existiert nicht mehr

#### Scenario: Frontend-Komponenten umbenannt

- **WHEN** die UI den Zutaten-Scan anzeigt
- **THEN** lauten alle sichtbaren Labels "Zutaten-Radar" (nicht "Allergene Radar")
- **AND** die Komponenten-Hierarchie verwendet neue Namen (IngredientScanView, NutriTagIndicator, NutriTagBadge)
