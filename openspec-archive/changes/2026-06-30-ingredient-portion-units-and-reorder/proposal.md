## Why

Zwei bestätigte Bugs rund um Zutaten-Portionen: (1) Die **Stück→Gramm-Umrechnung zeigt ein falsches Symbol (vorangestelltes „x") und falsche Gramm-Werte** — Ursache ist, dass die „Stück"-Einheit intern als `unit="g"` geführt wird, wodurch der Umrechnungsschutz löchrig ist und eine Doppelskalierung über `Portion.weight_g` und `UnitConversion.factor` entsteht. (2) **Drag & Drop für die Standardportion funktioniert nicht** — beim Sortieren wird die `g`-Portion (rank 9999) fälschlich mit umnummeriert, woraufhin das Backend mit HTTP 422 ablehnt.

## What Changes

- **Eigener „Stück"-Einheitentyp** — `MeasuringUnitType` erhält einen `PIECE`-Wert; die System-„Stück"/„Packung"-Einheiten werden damit angelegt statt als `MASS` getarnt. Der Umrechnungsschutz filtert dann zuverlässig echte g/ml-Quellen. **BREAKING** für die bisherige Einheiten-Typisierung.
- **Eine einzige Skalierungsquelle für Gramm** — Stück→Gramm läuft konsistent über genau einen Mechanismus (Gramm-Basis + invertierter Conversion-Faktor), keine zusätzliche Multiplikation mit `Portion.weight_g`. Behebt falsche Gramm-Werte.
- **Korrektes Stück-Symbol** — Die „x"-Voranstellung in der natürlichen Portions-Formatierung erkennt Stück-/Verpackungsnamen tolerant (inkl. zusammengesetzter Namen wie „Stück (150g)"), sodass kein falsches Symbol erscheint.
- **Drag & Drop schließt die `g`-Portion aus** — Beim Reorder wird die `g`-Portion nicht mehr mit umnummeriert; sie behält rank 9999.

## Capabilities

### New Capabilities
- `piece-unit-type`: Eigener Einheitentyp für zählbare Einheiten (Stück/Packung) und daraus folgender korrekter, einfach skalierter Stück→Gramm-Umrechnung inkl. korrektem Anzeige-Symbol.
- `portion-reorder-fix`: Drag-&-Drop-Sortierung der Portionen, die die fixe `g`-Portion (rank 9999) korrekt ausschließt.

### Modified Capabilities
- (keine)

## Impact

- **Backend-Apps**: `supply` (`choices.py` `MeasuringUnitType`, `signals.py` System-Einheiten, `api/unit_conversions.py` Quellen-Filter, `services/shopping_service.py` `_format_natural_portion`/`units_without_x`, `api/ingredients.py` Reorder-Validierung).
- **Frontend-Pages**: `frontend-food` — `pages/ingredients/IngredientDetailPage.tsx` (Reorder), `components/recipe/UnitSwitcher.tsx` (Skalierung), `pages/recipes/RecipeDetailPage.tsx` (hart gesetzte `from_unit_id`), `lib/unitConversion.ts`.
- **Pydantic-Schemas**: Einheiten-/Conversion-Schemas, falls Typ exponiert wird.
- **Zod-Schemas**: `frontend-food/src/schemas/supply.ts` synchron.
- **Migration**: Neue `supply`-Migration für `MeasuringUnitType.PIECE` und Umstellung der System-„Stück"/„Packung"-Einheiten von `MASS` auf `PIECE` (Datenmigration für bestehende Einheiten).
- **Tests**: Stück→Gramm-Umrechnung (Symbol + Gramm), Reorder mit `g`-Portion.
