## Why

Portionen (Rezept-Mengen) und Packungen (Einkaufsgrößen) sind aktuell in einem einzigen `Portion`-Model vermischt. Das `is_system`-Flag, auto-erstellte System-Portionen (`g`/`Stück`/`Packung`), rank=9999 für `g` und diverse Backfill-Commands sind Workarounds für diese konzeptionelle Vermischung. Die Folge: überkomplexe Signale, fragile String-Matching-Filter in Shopping-Services und inkonsistente UI-Logik. Pull the two concepts apart.

## What Changes

- **BREAKING** `is_system`-Feld auf `Portion` entfernt
- **BREAKING** Auto-Erstellung von System-Portionen (`g`, `Stück`, `Packung`) via Signal entfernt
- **BREAKING** `system_gramm`-Kategorie aus KI-Prompt und Schema entfernt
- **BREAKING** `g`-Portion (rank=9999) existiert nicht mehr — Gramm-Fallback wird implizit berechnet
- **BREAKING** `RecipeItem.portion` wird nullable — kein Gramm-Portion-DB-Eintrag nötig
- Neues `Package`-Model (`name`, `weight_g`, `rank`) für Einkaufspackungen, getrennt von `Portion`
- `Portion`-Model bleibt strukturell gleich (name, quantity, weight_g, rank, measuring_unit), nur `is_system` fällt weg
- Existierende `Packung`-System-Portionen werden per `RunPython`-Migration ins `Package`-Model überführt
- Existierende `Stück`-System-Portionen werden zu normalen Portionen (is_system entfernt)
- Existierende `g`-Portionen werden gelöscht (Gramm ist jetzt implizit)
- Kombinierter `ai-apply`-Endpunkt für Portionen + Packages in einer Transaktion
- Frontend: getrennte Sektionen für „Portionen" und „Packungen" auf der Zutat-Detailseite
- `QualityScore`-Prüfung für System-Portionen entfällt

## Capabilities

### New Capabilities

- `ingredient-packages`: Eigenständiges `Package`-Model mit API-CRUD, Reorder und KI-Vorschlägen für Einkaufspackungen. Getrennt von `Portion`.

### Modified Capabilities

- `ingredient-portion-redesign`: System-Portionen (`g`, `Stück`, `Packung`), `is_system`-Flag, rank=9999 und „Packung"-Gewichtswarnung entfallen. Portionen und Packungen sind getrennte Entitäten.
- `ingredient-portion-ai-apply`: `system_gramm`-Kategorie entfällt aus Prompt und Schema. AI liefert `portions` + `packages`. `replace_all` arbeitet auf beiden Entitäten.

## Impact

- **DB**: Neue Tabelle `supply_package`, `is_system`-Spalte aus `supply_portion` entfernt, `supply_recipeitem.portion` wird nullable
- **Models**: `supply/models/ingredient.py` (Portion bereinigt, Package neu), `recipe/models/items.py` (portion nullable)
- **Schemas**: `PortionOut.is_system` entfernt, neue `PackageOut`/`PackageCreateIn`/etc., `IngredientDetailOut` um `packages` erweitert, Zod-Schemas synchron
- **APIs**: Neue Package-Endpoints unter `/{slug}/packages/`, `/{slug}/portions/ai-apply/` → `/{slug}/ai-apply/` (kombiniert)
- **Signals**: `_create_system_portions()` entfernt, `calculate_portion_weight_g` bleibt
- **Services**: `portion_knowledge.py` (Prompt ohne system_gramm), `ingredient_ai_suggest_service.py` (Package-Erstellung), `quality_score.py` (System-Portion-Check entfernt), `shopping_service.py` (nutzt `.packages` statt is_system-Filter), `utils.py` (get_shopping_portion, build_package_display)
- **Commands**: `backfill_system_portions.py` entfernt
- **Frontend**: `schemas/supply.ts`, `pages/ingredients/IngredientDetailPage.tsx`, `api/supplies.ts`
