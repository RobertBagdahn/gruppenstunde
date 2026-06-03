## 1. Backend-Erweiterungen

- [x] 1.1 `_evaluate_rules` in `nutrition_aggregation.py` anpassen, um `min_green`, `max_green` und `target_mid` zurückzugeben
- [x] 1.2 `SuggestionOut` Schema in `backend/recipe/schemas/suggestions.py` um `min_green`, `max_green` und `target_mid` erweitern
- [x] 1.3 `_evaluate_admin_rules` in `suggestion_service.py` anpassen, um Soll-Werte für alle Geltungsbereiche (inklusive Normierung für Event-Regeln) zu befüllen
- [x] 1.4 `_check_budget` in `suggestion_service.py` anpassen, um `current_value`, `max_green` und `target_mid` zu befüllen
- [x] 1.5 Optionalen `date` Query-Parameter zum Endpunkt `/api/meal-plans/{meal_plan_id}/nutrition-summary/` hinzufügen
- [x] 1.6 Backend-Tests für Soll-Grenzwerte und Datums-Filter in der nutrition-summary erstellen

## 2. Frontend-Schema & Client-State

- [x] 2.1 Zod-Schemas in `frontend-food/src/schemas/mealPlan.ts` für `SuggestionOut` synchronisieren (`min_green`, `max_green`, `target_mid`)
- [x] 2.2 TanStack Query Query-Funktionen für `nutrition-summary` um den optionalen `date` Parameter erweitern

## 3. UI-Komponenten & Ansichten

- [x] 3.1 Reusable `SollIstBar` Komponente in `frontend-food/src/components/` implementieren
- [x] 3.2 Tag-/Gesamtplan-Auswahl und `SollIstBar` im Nährwerte-Tab (`NutritionView` in `MealEventDetailPage.tsx`) integrieren
- [x] 3.3 `SuggestionCard.tsx` anpassen, um `SollIstBar` für regelbasierte Benachrichtigungen zu rendern
- [x] 3.4 Budget-Auswertung in der Kosten-Ansicht um `SollIstBar` erweitern
- [x] 3.5 Visuelle Prüfung und Frontend-Build durchführen
