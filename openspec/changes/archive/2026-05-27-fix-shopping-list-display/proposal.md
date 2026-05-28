## Why

Die Einkaufsliste zeigt bei vielen Zutaten "0 g" und "Unbekannt" an, weil die Shopping-Service-Berechnung bei fehlender `weight_g` auf Portionen zu 0 evaluiert und weil RecipeItems ohne verknüpftes Ingredient keinen Namen auflösen können. Zusätzlich erzeugt Skalierung unnatürliche Bruchzahlen wie "0,3 x Knoblauchzehe".

## What Changes

- **Fix "0 g"-Anzeige**: Wenn `portion.weight_g = 0`, Fallback auf Mengenangabe mit Portionsname (z.B. "2 EL", "1 Prise") statt Gramm-Berechnung
- **Fix "Unbekannt"-Anzeige**: Fallback auf `portion.name` oder einen gespeicherten Freitext-Namen wenn kein Ingredient verlinkt ist
- **Fix Bruchzahl-Portionen**: Natürliche Portionen < 1 auf 1 aufrunden in der Einkaufslisten-Darstellung
- Backend: `shopping_service.py` Berechnungslogik anpassen
- Frontend: `IngredientList.tsx` und `MealEventDetailPage.tsx` Display-Logik verbessern

## Capabilities

### New Capabilities

(keine)

### Modified Capabilities

- `shopping-list-views`: Darstellungslogik für Zutaten ohne Grammgewicht und ohne verknüpftes Ingredient verbessern

## Impact

- **Backend**: `supply/services/shopping_service.py` — Berechnungslogik, Fallback-Pfade
- **Backend**: `recipe/schemas/items.py` — `resolve_ingredient_name` Fallback erweitern
- **Frontend**: `frontend-food/src/components/supply/IngredientList.tsx` — Display-Fallback
- **Frontend**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Anzeige bei 0g
- **Schemas**: Pydantic `RecipeItemOut` ggf. um Fallback-Felder erweitern, Zod-Schema synchron halten
- **Migrations**: Keine DB-Migrationen nötig (reine Logik-Änderungen)
