## Why

Das Konzept "Für wie viele Personen ist das?" wird im Codebase mit unterschiedlichen Bezeichnern benannt: `servings` (Recipe), `norm_portions` (MealPlan), `override_portions` (Meal), `portions` (UI-Text), `normPerson` (API). `participants` vs `players` vs `Teilnehmer` für Content-Typen, `location_type` vs `play_area` vs `location` für Lokalisierung, und `physical_viscosity` mit Label "Aggregatzustand" für Lebensmittel-Kategorien. Diese Inkonsistenz erhöht den kognitiven Aufwand für Entwickler und KI-Agenten erheblich.

## What Changes

**BREAKING** — API-Feld- und Model-Feld-Umbenennungen (keine Rückwärtskompatibilität nötig):

- **Recipe Model**: `servings` → `portions` (Feldname im Code, verbose_name bleibt "Portionen")
- **MealPlan Model**: `norm_portions` → `portions` (Feldname im Code)
- **Meal Model**: `override_portions` → `portions_override` (Feldname, klarer mit Suffix)
- **Shopping API**: `servings` Parameter → `portions`
- **Frontend Schemas**: Alle `servings` → `portions` Feld-Namen
- **GroupSession/Game**: `min_players`/`max_players` → `min_participants`/`max_participants`
- **Game**: `play_area` → `location_type` (Alignment mit Content-Basis)
- **Game**: `game_duration_minutes` → bei `execution_time` belassen (bereits einheitlich auf Content-Ebene)
- **Ingredient**: `physical_viscosity` → `food_category` (Feldname und verbose_name "Lebensmittelkategorie", Choices bleiben SOLID/BEVERAGE mit Labels "Essen"/"Getränk")

## Capabilities

### New Capabilities

Keine.

### Modified Capabilities

- `recipe`: `servings` → `portions` in Model, Schema, API, Frontend
- `meal-plan`: `norm_portions` → `portions`, `override_portions` → `portions_override`
- `shopping`: `servings`-Parameter → `portions`
- `game`: `play_area` → `location_type`, `min_players`/`max_players` → `min_participants`/`max_participants`
- `supply`: `physical_viscosity` → `food_category`
- `norm-portion-simulator`: API-Feld-Referenzen anpassen

## Impact

- **Backend**: Recipe Model, MealPlan Model, Meal Model, Ingredient Model, Game Model, GroupSession Model (nur verbose_name), Shopping API, Schemas — jeweils Feldname + Migration
- **Frontend**: Alle Schemas (`recipe.ts`, `mealPlan.ts`, `supply.ts`, `game.ts`), API-Hooks, UI-Komponenten die diese Felder referenzieren
- **Frontend-Food**: Alle Food-spezifischen Schemas und Komponenten die `servings`/`norm_portions`/`override_portions` referenzieren
- **Migrationen**: 5+ Django-Migrationen für Feld-Umbenennungen