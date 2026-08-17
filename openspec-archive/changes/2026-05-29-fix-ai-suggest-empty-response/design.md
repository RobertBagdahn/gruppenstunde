## Context

`suggest_all_fields()` in `backend/supply/services/ingredient_ai_suggest_service.py` gibt `{}` zurück wenn `gemini_call()` → `None` (Client nicht verfügbar). Der API-Endpoint returned dann 200 OK mit allen Feldern auf `null`. Das Frontend zeigt fälschlicherweise "Keine neuen Vorschläge" statt eines Fehlers.

## Goals / Non-Goals

**Goals:**
- Bei nicht erreichbarer KI einen HTTP-Fehler (503) zurückgeben
- Im Frontend den Fehler als verständliche Meldung im Dialog anzeigen

**Non-Goals:**
- Retry-Logik im Frontend
- Änderung am `gemini_call()` Interface selbst
- Andere AI-Endpoints fixen (nur `suggest_all_fields`)

## Decisions

### 1. Backend: Exception statt leeres Dict

`suggest_all_fields()` wirft `GeminiUnavailableError` (503) statt `return {}`.

**Begründung:** Alle anderen AI-Funktionen (z.B. `ai_create_ingredient`) werfen bereits Exceptions. `suggest_all_fields` ist der einzige Ausreißer.

**Betroffene Datei:** `backend/supply/services/ingredient_ai_suggest_service.py` Zeile 153-155

### 2. Frontend: Error-State im AiSuggestDialog

`AiSuggestDialog` bekommt ein optionales `error: string | null` Prop. Bei Fehler wird eine Fehlermeldung statt Skeleton/Vorschläge angezeigt.

**Betroffene Dateien:**
- `frontend-food/src/components/shared/AiSuggestDialog.tsx`
- `frontend-food/src/pages/supplies/IngredientDetailPage.tsx`

### API-Änderung

- `POST /api/ingredients/{slug}/ai-suggest-all/`
  - Bisheriges Verhalten: 200 OK mit null-Feldern bei KI-Ausfall
  - Neues Verhalten: 503 mit `{"detail": "KI nicht verfügbar"}`

### Datenbank-Migrationen

Keine.

## Risks / Trade-offs

- [Kein Risiko] Breaking Change im Error-Case — Frontend fängt den Fehler bereits über `!res.ok` ab, nur die UX-Darstellung ändert sich.
