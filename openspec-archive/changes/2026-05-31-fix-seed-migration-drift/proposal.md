## Why

Die `supply_contentmaterialitem`-Tabelle hat noch die Spalte `quantity_type` (NOT NULL), obwohl Migration `0013_remove_material_quantity_type` als "applied" markiert ist. Dadurch bricht `seed_all` mit einem `IntegrityError` ab, bevor Ingredients, Portions und RecipeItems erstellt werden. Rezepte wie "Brotzeit" haben dadurch keine Zutaten.

## What Changes

- **BREAKING**: Spalte `quantity_type` wird aus der DB-Tabelle `supply_contentmaterialitem` tatsächlich entfernt (Migration-Drift beheben)
- `seed_all` Command wird danach erneut ausführbar sein und Rezept-Zutaten korrekt anlegen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — reiner Bugfix._

### Modified Capabilities

_Keine Spec-Änderungen._

## Impact

- **Betroffene App**: `supply` (Migration-Drift in DB)
- **Betroffener Command**: `core/management/commands/seed_all.py` (bricht ab bei ContentMaterialItem-Erstellung)
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen (Feld war bereits aus Model entfernt)
- **Migration**: Keine neue Migration nötig — bestehende Migration muss nur tatsächlich auf die DB angewandt werden
