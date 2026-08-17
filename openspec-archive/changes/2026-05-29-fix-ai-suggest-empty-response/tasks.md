## 1. Backend

- [x] 1.1 In `backend/supply/services/ingredient_ai_suggest_service.py`: `suggest_all_fields()` soll `raise GeminiUnavailableError("KI nicht verfügbar")` statt `return {}` wenn `response is None`
- [x] 1.2 Import `GeminiUnavailableError` aus `core.services.gemini` hinzufügen

## 2. Frontend

- [x] 2.1 `AiSuggestDialog` um `error?: string | null` Prop erweitern — bei gesetztem Error eine Fehlermeldung anzeigen (vor der "Keine Vorschläge"-Meldung prüfen)
- [x] 2.2 In `IngredientDetailPage.tsx`: `aiSuggest.error?.message` als `error` Prop an den Dialog übergeben
