## Why

Im Ingredient-Frontend und -Backend gibt es mehrere kritische Fehler: (1) `IngredientEditPage` verwendet `energyKj` als State-Variable für einen kcal-Wert — ein falscher Name, der Nutzer und KI zur Eingabe von kJ-Werten verleitet (4×-Fehler). (2) `cooking_factor` hat `min="1"` im Formular, was Schrumpffaktoren (<1) für Fleisch, Eier etc. blockiert. (3) Das Portions-Rang-Tausch-System ist 0-basiert statt 1-basiert, was nach Reordering die Ränge korrumpiert. (4) `"powder"` fehlt als Viskositätsoption — bestehende Powder-Zutaten werden beim Speichern auf `"solid"` überschrieben. (5) Mehrere UI-Texte verwenden `ae`/`oe`/`ue` statt echter Umlaute.

## What Changes

- `IngredientEditPage.tsx`: `energyKj`/`setEnergyKj` → `energyKcal`/`setEnergyKcal` umbenennen (alle Vorkommen)
- `IngredientEditPage.tsx`: `cooking_factor`-Input: `min="0.1"` statt `min="1"`; Beschriftung klarstellen
- `IngredientDetailPage.tsx`: Rang-Tausch-Logik auf tatsächliche `rank`-Feldwerte statt Array-Index umschreiben
- `IngredientEditPage.tsx`: `"powder"`-Option (`Pulver/Schüttgut`) im Viskositäts-Dropdown ergänzen
- `IngredientEditPage.tsx`: Alle `ae`/`oe`/`ue`-Ersatzschreibweisen durch echte Umlaute ersetzen (7 Stellen)
- Backend `supply/api/ingredients.py`: Non-Staff-Nutzer können `status` nicht auf `"verified"` setzen — Guard im `update_ingredient`-Endpunkt

## Capabilities

### New Capabilities
_(kein neues Feature)_

### Modified Capabilities
_(keine Spec-Level-Änderungen)_

## Impact

- **Frontend**: `frontend-food/src/pages/ingredients/IngredientEditPage.tsx`, `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx`
- **Backend**: `backend/supply/api/ingredients.py`
- **Keine Migrationen** erforderlich
