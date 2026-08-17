## Why

Der Frühstücks-Wizard speichert Zutaten-Items (Brot, Belag, Extras) ohne `measuring_unit_id`, wodurch das Backend keine Energie/Kosten berechnen kann — alle Zutaten tragen 0 kcal bei. Zudem zeigt die UI für Zutaten nur "× 1,0" als Faktor an (statt sinnvoller Portionsangabe) und Zutaten-Namen sind nicht verlinkt.

## What Changes

- **Fix**: Wizard `buildItems()` sendet `measuring_unit_id` für alle Zutaten-Items
- **Fix**: `MealItemOut` berechnet `energy_kcal` auch für Zutaten-Items (nicht nur Rezept-Items)
- **Feature**: Zutaten-Items zeigen Portionsmenge/Stückzahl statt Faktor in der UI
- **Feature**: Zutaten-Namen sind klickbar und verlinken zur Zutaten-Detailseite

## Capabilities

### New Capabilities
- *(none — alle Änderungen betreffen bestehende Capabilities)*

### Modified Capabilities
- `breakfast-wizard`: Zutaten-Items werden mit `measuring_unit_id` gespeichert, sodass Energie/Kosten korrekt berechnet werden
- `meal-item-factor-edit`: Zutaten-Items zeigen Portionsmenge statt Faktor; Faktor ist nur für Rezept-Items editierbar
- `meal-plan-frontend`: Zutaten-Namen in der Item-Liste sind verlinkt

## Impact

- **Backend**: `MealItemOut` erhält `resolve_energy_kcal` für ingredient-basierte Items
- **Frontend**: `BreakfastWizardPage.tsx` (`buildItems`) — `measuring_unit_id` setzen, `MealSlot.tsx` — Zutaten-Links + Portionsanzeige, `FactorInput.tsx` — ingredient-spezifische Anzeige
- **Pydantic Schemas**: `MealItemOut.energy_kcal` erweitert (resolve für Ingredients)
- **Zod Schemas**: Synchron mit Pydantic, ggf. neues Feld für Portionsmenge
