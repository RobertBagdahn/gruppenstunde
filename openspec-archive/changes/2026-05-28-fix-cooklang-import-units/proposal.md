## Why

Der `import_cooklang` Command verliert Einheiten-Informationen beim Import. Einheiten wie "L", "kg", "Packung", "kleines Paket" werden nicht in `unit_aliases` aufgelöst und fallen auf `gram_unit` zurück. Dadurch werden z.B. `@Wasser{12%L}` als "12 g" statt "12 L" importiert, und `@Zucker{0.3%kg}` als "0.3 g" statt "300 g".

## What Changes

- `unit_aliases` im Cooklang-Importer wird um fehlende Einheiten erweitert (L, kg, ml, Packung, etc.)
- Mengeneinheiten wie "kg" und "L" werden in Gramm/Milliliter umgerechnet, damit `weight_g`-basierte Berechnungen korrekt funktionieren
- Nicht auflösbare Einheiten werden als `note` auf dem RecipeItem gespeichert statt still auf Gramm zu fallen

## Capabilities

### New Capabilities
- `cooklang-unit-resolution`: Korrekte Auflösung und Umrechnung von Einheiten beim Cooklang-Import

### Modified Capabilities

## Impact

- `backend/recipe/management/commands/import_cooklang.py`: unit_aliases erweitern, Umrechnungslogik hinzufügen
- Bestehende falsch importierte Rezepte bleiben unverändert (manueller Re-Import nötig)
