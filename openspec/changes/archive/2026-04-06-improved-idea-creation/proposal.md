## Why

Der aktuelle Idea-Erstellungsfluss (`/create/idea`, `/create/knowledge`) erzwingt den KI-Weg: Benutzer müssen Freitext eingeben und auf die Gemini-Verarbeitung warten. Es gibt keinen Timeout, keinen Abbrechen-Button, keine Zeitschätzung und keinen manuellen Fallback. Wenn Gemini langsam oder nicht erreichbar ist, bleibt der Benutzer ohne Feedback hängen. Zusätzlich generiert der Refurbish-Call 4 Bilder, die erst in Step 2 benötigt werden — das verlängert die Wartezeit unnötig auf 30-55 Sekunden.

## What Changes

- **Manueller Erstellungsweg**: Benutzer können direkt zum leeren Formular springen, ohne KI-Verarbeitung
- **Bildgenerierung entkoppelt**: Refurbish generiert keine Bilder mehr. Bilder werden nur manuell per Button in Step 2 über den bestehenden `POST /api/ai/generate-image/`-Endpunkt ausgelöst. Refurbish-Dauer sinkt von ~50s auf ~12s.
- **Gemini SDK Timeout**: Timeout direkt auf Gemini SDK-Ebene (30s Refurbish, 90s Bilder) — keine verwaisten Threads
- **Abbrechbarer KI-Call**: Frontend nutzt `AbortController`
- **Geschätzte Wartezeit**: Frontend zeigt "ca. 10-20 Sekunden" als UX-Hint (kein eigener Config-Endpunkt)
- **Spezifische Fehlercodes**: `AI_TIMEOUT` (504), `AI_UNAVAILABLE` (503), `AI_INVALID_RESPONSE` (502), `AI_INTERNAL_ERROR` (500) — jeweils mit deutschen Fehlermeldungen und "Erneut versuchen" + "Manuell erstellen" als Optionen

## Capabilities

### New Capabilities
- `idea-creation-flow`: Verbesserter Idea-Erstellungsfluss mit Zwei-Wege-Auswahl (KI/Manuell), abbrechbarem KI-Call, Wartezeit-Anzeige und robuster Fehlerbehandlung

### Modified Capabilities
- `ai-features`: Bildgenerierung aus Refurbish entfernt, Gemini SDK Timeout, spezifische Exception-Klassen und Fehlercodes
- `error-handling`: Neue KI-spezifische Fehlercodes (`AI_TIMEOUT`, `AI_UNAVAILABLE`, `AI_INVALID_RESPONSE`) mit zugehörigen HTTP-Statuscodes

## Impact

### Backend
- **Django App**: `idea`
- **Dateien**: `backend/idea/api.py`, `backend/idea/schemas.py`, `backend/idea/services/ai_service.py`
- **Pydantic-Schemas**: Erweitertes `AiRefurbishOut` um `processing_time_seconds`; neue Exception-Klassen
- **Migrations**: Keine DB-Migrationen erforderlich (nur API-Logik-Änderungen)

### Frontend
- **Dateien**: `frontend/src/pages/NewIdeaPage.tsx`, `frontend/src/api/ai.ts`, `frontend/src/schemas/idea.ts`
- **Zod-Schemas**: Erweitertes `AiRefurbishSchema`
- **Hooks**: Erweiterter `useRefurbish` mit AbortController

### Abhängigkeiten
- Keine neuen Pakete erforderlich
