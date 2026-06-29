## ADDED Requirements

### Requirement: Rezept-Aggregationen schließen Austausch-Alternativen aus

Die Rezept-Detailseite SHALL in allen rezeptweiten Aggregationen (Gesamtpreis, Gesamtenergie, Gesamtnährwerte) ausschließlich die primäre Zutat einer Exchange-Gruppe (`exchange_position = 0`) berücksichtigen. Austausch-Alternativen (`exchange_group IS NOT NULL AND exchange_position > 0`) SHALL aus diesen Aggregationen ausgeschlossen werden.

Optionale Zutaten (`is_optional = True`) SHALL immer in Aggregationen eingeschlossen werden, unabhängig davon, ob sie Teil einer Exchange-Gruppe sind.

#### Scenario: Nutrition Breakdown schließt Alternative aus

- **WHEN** ein Rezept eine Exchange-Gruppe mit Nudeln (primary, `exchange_position=0`) und Barilla Fusilli (alternative, `exchange_position=1`) hat
- **THEN** enthält der Nutrition-Breakdown-Response nur Nudeln in den Aggregationen (Preis, Energie, Nährwerte)
- **THEN** enthält der Response nicht die Werte von Barilla Fusilli

#### Scenario: Optionale Zutat bleibt in der Aggregation

- **WHEN** ein Rezept eine optionale Zutat (z.B. Schnittlauch, `is_optional=True`) hat
- **THEN** wird die optionale Zutat in allen Aggregationen (Preis, Energie, Nährwerte) berücksichtigt

#### Scenario: Gemischtes Rezept mit Optionals und Alternativen

- **WHEN** ein Rezept normale, optionale und Austausch-Alternativen enthält
- **THEN** werden normale + optionale + primäre Zutaten (pos=0) aggregiert
- **THEN** werden Austausch-Alternativen (pos>0) nicht aggregiert

### Requirement: Cache-Neuberechnung schließt Austausch-Alternativen aus

Die Funktion `recalculate_recipe_cache` SHALL bei der Berechnung von `cached_price_total` und allen gecachten Nährwerten Austausch-Alternativen ausschließen. Die Logik folgt denselben Regeln wie die Nutrition-Breakdown-API.

#### Scenario: Cache ignoriert Alternative

- **WHEN** `recalculate_recipe_cache` für ein Rezept mit Exchange-Gruppe läuft
- **THEN** enthält `cached_price_total` nicht den Preis der Alternative
- **THEN** enthält `cached_energy_total_kcal` nicht die Energie der Alternative

#### Scenario: Cache nach Item-Änderung aktualisiert

- **WHEN** ein Signal `recalculate_recipe_cache_on_item_change` feuert (nach RecipeItem-Save/Delete)
- **THEN** wird der Cache gemäß der korrekten Filter-Regeln neu berechnet

### Requirement: Varianten-Kalkulation bleibt unverändert

Die Berechnung von MealPlan-Varianten (`compute_variant_cost`, `compute_variant_energy` im `variant_service.py`) SHALL weiterhin über `active_recipe_item_ids` gesteuert werden. Die Änderung der Cache-Basis (Alternative nicht mehr enthalten) SHALL korrekt durch die Delta-Logik ausgeglichen werden: Wenn eine Alternative selektiert wird, berechnet das Delta die Differenz zwischen Alternative und Primärzutat.

#### Scenario: Variante mit selektierter Alternative

- **WHEN** ein MealItem eine Alternative (exchange_position=1) statt der Primärzutat (pos=0) aktiviert hat
- **THEN** berechnet `compute_variant_cost` den korrekten Preis (Cache-Basis + Delta(Alternative - Primärzutat))

#### Scenario: Variante ohne selektierte Alternative

- **WHEN** ein MealItem keine Alternative aktiviert hat
- **THEN** bleibt der Preis der Primärzutat aus dem Cache als Basis erhalten
- **THEN** ist das Delta = 0
