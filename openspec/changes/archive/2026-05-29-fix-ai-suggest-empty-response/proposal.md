## Why

Wenn der Gemini-Client nicht verfügbar ist (z.B. ADC-Token abgelaufen), gibt `suggest_all_fields()` ein leeres Dict `{}` zurück. Django Ninja serialisiert das zu einem JSON-Objekt mit allen Feldern auf `null`. Das Frontend interpretiert das als "keine Vorschläge" und zeigt "Keine neuen Vorschläge gefunden." — ohne Fehlermeldung. Der User denkt, die KI hat nichts gefunden, obwohl sie gar nicht erreichbar war.

## What Changes

- Backend: `suggest_all_fields()` wirft einen HTTP 503 Fehler statt `{}` zurückzugeben, wenn der Gemini-Client nicht verfügbar ist
- Frontend: Mutation-Fehler (503) werden als Toast/Fehlermeldung im Dialog angezeigt statt als "Keine Vorschläge"

## Capabilities

### New Capabilities

_Keine neuen Capabilities._

### Modified Capabilities

_Keine Spec-Level-Änderungen — reine Bugfix-Implementierung._

## Impact

- **Backend**: `supply/services/ingredient_ai_suggest_service.py` — `suggest_all_fields()` Error-Handling
- **Frontend**: `frontend-food/src/pages/supplies/IngredientDetailPage.tsx` — Error-State im AI-Suggest-Dialog
- **Frontend**: `frontend-food/src/components/shared/AiSuggestDialog.tsx` — optionaler Error-State
- **Schemas**: Keine Änderungen nötig
- **Migrations**: Keine
