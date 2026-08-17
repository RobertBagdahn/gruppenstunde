## 1. Backend: Unit im Schema und Service ergänzen

- [x] 1.1 `recipe/schemas/nutrition.py`: Feld `unit: str` zu `SuggestedIngredientOut` hinzufügen
- [x] 1.2 `recipe/services/improvement_ranking_service.py`: `_format_ingredients(raw, parameter)` um `parameter`-Argument erweitern und `unit` aus `_UNIT_MAP` ableiten
- [x] 1.3 Alle Aufrufe von `_format_ingredients` aktualisieren (den `parameter`-String übergeben)

## 2. Frontend: Dynamische Einheit anzeigen

- [x] 2.1 Zod-Schema für `SuggestedIngredient` um `unit: z.string()` erweitern (beide Frontends)
- [x] 2.2 `frontend-food/src/components/recipe/RecipeImprovements.tsx`: `{ing.contribution_g.toFixed(0)}g` → `{ing.contribution_g.toFixed(0)}{ing.unit}` ändern
- [x] 2.3 `frontend/src/components/recipe/RecipeImprovements.tsx`: gleiche Änderung

## 3. Verifikation

- [x] 3.1 Backend-Server starten und Improvement-API für ein Rezept mit Energie-Verbesserung aufrufen — Unit muss `kJ` sein
- [x] 3.2 Frontend prüfen: Vanillezucker zeigt `2096 kJ` statt `2096g`
