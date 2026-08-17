## 1. Backend API

- [x] 1.1 Pydantic-Schema `RecipeSuggestionOut` erstellen in `backend/planner/schemas/meal_plan.py`
- [x] 1.2 API-Endpunkt `GET /api/planner/recipes/suggestions/` implementieren in `backend/planner/api/meal_plan.py` mit Query-Logik (meal_type-Filter, Textsuche, Häufigkeits-Sortierung, Fallback)
- [x] 1.3 Endpunkt manuell testen (curl/httpie)

## 2. Frontend API-Hook

- [x] 2.1 Zod-Schema `recipeSuggestionSchema` erstellen in `frontend-food/src/api/mealPlans.ts`
- [x] 2.2 TanStack Query Hook `useRecipeSuggestions({ mealType, q, limit })` implementieren

## 3. Frontend UI

- [x] 3.1 Inline-Suche in `MealEventDetailPage.tsx` anpassen: beim Öffnen sofort Suggestions laden (leerer Query)
- [x] 3.2 Debounce auf 200ms ändern, Suche ab 1 Buchstabe auslösen
- [x] 3.3 Ergebnisliste um Usage-Count-Badge erweitern (z.B. "12x")
- [x] 3.4 Manuell testen: Öffnen zeigt Vorschläge, Tippen filtert, Sortierung stimmt
