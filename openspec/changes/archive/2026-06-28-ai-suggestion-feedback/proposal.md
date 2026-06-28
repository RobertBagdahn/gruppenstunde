## Why

KI-Vorschläge werden aktuell an 13 Stellen im Projekt generiert, aber es gibt keinerlei Rückmeldung, ob ein Vorschlag dem User gefällt oder nicht. Ohne Feedback können wir die Qualität der KI-Vorschläge nicht messen, nicht verbessern und nicht nachweisen, dass sie Mehrwert bieten. Wir brauchen ein System, das Input, Output und User-Meinung speichert und im Admin auswertbar macht.

## What Changes

- **AiInteraction-Modell** wird eingeführt: speichert Kontext, Prompt (JSON), rohen Response, User, Dauer, Erfolg/Fehler, und optionalen Vote (👍/👎)
- **`gemini_call()`** wird zentral um Logging erweitert → speichert jede Interaktion automatisch, gibt `interaction_id` zurück
- **Vote-API**: `PATCH /api/ai-interactions/{id}/vote/` — authenticated User können 👍 oder 👎 abgeben
- **Frontend Vote-UI**: 👍/👎 Buttons erscheinen bei KI-Vorschlägen, senden Vote an API
- **Admin Dashboard**: React-Seite im Frontend mit aggregierten Statistiken (Vote-Rate pro Kontext, Timeline, Erfolgsquote, Detail-Ansicht)
- **Aggregations-API**: `GET /api/admin/ai-interactions/stats/` — liefert aggregierte Daten für das Dashboard
- **BREAKING**: `gemini_call()` Return-Type ändert sich von `GenerateContentResponse` zu `(GenerateContentResponse, UUID)` — alle 13+ Aufrufer müssen angepasst werden

## Capabilities

### New Capabilities
- `ai-interaction-feedback`: Erfassung, Speicherung und Bewertung von KI-Interaktionen — vom automatischen Logging über User-Votes bis zur Admin-Auswertung

### Modified Capabilities
- `error-handling`: Neue AI-spezifische Error-Handling-Patterns für Vote-Endpunkt (z.B. 404 bei unbekannter interaction_id)

## Impact

- **Backend**: Neues Model `AiInteraction` in `content` App. Änderung an `core/services/gemini.py` (Logging in `gemini_call()`). Neue API-Endpunkte für Vote und Admin-Stats. Neue Tests für Model, API, Logging.
- **Frontend (food + main)**: Neue Vote-Komponente, Integration in alle AI-Suggestion-Dialoge. Neue Admin-Dashboard-Seite. Neue Zod-Schemas für Interaction + Vote + Stats.
- **Migration**: `makemigrations` für das neue Model.
- **Keine neuen Dependencies** — JSONField, UUIDField sind built-in. Chart.js für Dashboard-Charts (optional, client-seitig).
