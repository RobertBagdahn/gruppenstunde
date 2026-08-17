## Why

In der Rezept-Detailansicht werden Zutaten nach Gewicht (schwerste zuerst) sortiert — beim Umschalten in den Bearbeitungsmodus springt die Reihenfolge jedoch auf `sort_order` aus der Datenbank um. Das verwirrt Nutzer, weil sie die gewohnte Sortierung verlieren.

## What Changes

- `InlineIngredientEditor` sortiert die `editItems` beim Initialisieren nach `weight_g` absteigend, identisch zum View-Mode (`IngredientList`)
- `EditableItem`-Type bekommt ein `weight_g`-Feld zur Berechnung im `normalizeItems`-Helper

## Capabilities

### New Capabilities
- `recipe-ingredient-sort`: Zutaten sowohl in View- als auch Edit-Mode konsistent nach Gewicht sortieren

### Modified Capabilities
<!-- Keine bestehenden Specs definieren Sortierverhalten — rein implementierungsseitige Änderung -->

## Impact

- **Frontend**: `InlineIngredientEditor.tsx` (Type-Erweiterung + Sortierung), kein Backend-Touch
- **Keine Schema-Änderungen**, keine Migration
