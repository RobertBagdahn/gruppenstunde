## Context

KI-Vorschläge werden aktuell an 13 Endpunkten generiert (Content AI, Ingredient AI, Recipe AI, Packing List AI, Event AI, Documents). Jeder Aufruf durchläuft die zentrale `gemini_call()` in `core/services/gemini.py`. Bisher gibt es keine Persistenz — jeder Call ist ephemeral, es gibt keine Audit-Trail, kein User-Feedback, keine Möglichkeit die Qualität zu messen.

Das Ziel ist ein generisches Feedback-System, das alle KI-Kontexte abdeckt: Jeder AI-Call wird automatisch geloggt (Prompt + Response + Metadaten), User können im Nachhinein 👍/👎 voten, und Admins können die Daten im Frontend auswerten.

## Goals / Non-Goals

**Goals:**
- Automatisches Logging aller AI-Calls (zentral in `gemini_call()`)
- Persistenz von Prompt, rohem Response, Kontext, User, Dauer, Erfolg/Fehler
- 👍/👎 Vote-Mechanismus für authenticated User
- Admin-Dashboard mit aggregierten Statistiken (Vote-Rate pro Kontext, Timeline, Fehlerquote)
- Rückwärtiges Update aller bestehenden `gemini_call()`-Aufrufer
- Zod-Schemas + TanStack Query Hooks für Frontend

**Non-Goals:**
- Kein Fine-Tuning oder Modell-Training aus den gesammelten Daten
- Keine Echtzeit-Auswertung (Dashboard muss nicht live sein)
- Kein Feedback zu Embedding-basierten Content-Links (dafür gibt es bereits `EmbeddingFeedback`)
- Keine Änderung an der Gemini-Response-Verarbeitung in den Services

## Decisions

### 1. Logging-Ort: Zentral in `gemini_call()`

Jeder AI-Call durchläuft `gemini_call()`. Das Logging wird direkt dort eingebaut — vor dem Call wird der Prompt gespeichert, nach dem Call wird die Response nachgetragen. Kein extra Decorator, kein Signal, kein Middleware.

**Alternative**: Logging in jedem Service dezentral (13+ Stellen). Verworfen wegen höherem Wartungsaufwand und Risiko, Calls zu vergessen.

### 2. Return-Type: `(GenerateContentResponse | None, UUID)`

`gemini_call()` gibt neu ein Tupel aus Response und `interaction_id` zurück. Der UUID wird beim Anlegen des `AiInteraction`-Records generiert.

**Alternative**: `interaction_id` per Thread-Local oder Global State verfügbar machen. Verworfen — intransparent, schwer testbar, unsicher bei parallelen Requests.

### 3. `AiInteraction`-Modell in `content` App

Das Modell ist ein Querschnitts-Feature (alle Apps nutzen KI) und `content` ist bereits die App für generische/querschnittliche Funktionalität. Dort liegen auch `EmbeddingFeedback`, `ContentEmotion` etc.

```
AiInteraction
───────────────────────────────────────────────────
id              UUIDField (PK, default=uuid4)
context         CharField(50)   → AiContextChoices
prompt          JSONField       → der Input-Inhalt
response        TextField       → roher Gemini-Response (blank bei Fehler)
model           CharField(100)  → Modellname
user            FK → User      → nullable
duration_ms     Integer         → nullable
success         BooleanField    → True/False
error_code      CharField(50)   → blank bei Erfolg
vote            CharField(10)   → "up"/"down"/null
voted_at        DateTimeField   → nullable
created_at      DateTimeField   → auto_now_add
```

### 4. Vote-API: Einfacher PATCH

`PATCH /api/ai-interactions/{interaction_id}/vote/` — Body: `{"vote": "up" | "down"}`. Nur der Owner der Interaction (der User, der den AI-Call ausgelöst hat) kann voten. Staff/Admins können alle Votes einsehen.

### 5. Aggregations-API für Dashboard

`GET /api/admin/ai-interactions/stats/` — nur für Staff. Liefert:
- Gesamt-Calls, Calls heute, Calls mit Vote
- Pro Kontext: total, thumbs_up, thumbs_down, error_count, success_rate, vote_rate
- Timeline (letzte 30 Tage, gruppiert)
- Admin-Route unter `content/api/admin.py` (wo bereits `EmbeddingFeedbackAdminEndpoint` lebt)

### 6. Admin Dashboard als React-Seite

Neue Route `/admin/ai-feedback` im React-Frontend (nicht im Django-Admin). Geschützt per `is_staff`-Check. Enthält:
- Statistik-Karten (Gesamt, Heute, Vote-Rate, Fehlerquote)
- Tabelle pro Kontext mit Quoten
- Timeline-Chart (Votes über Zeit, via Chart.js)
- Detail-Ansicht pro Interaction (Input, Output, Vote, Metadaten)
- Filter: Kontext, Vote, Datum, Erfolg/Fehler

### 7. Frontend Vote-UI

Neue Komponente `AiVoteButtons` (oder `AiInteractionFeedback`), die nach einem AI-Suggestion-Vorgang eingeblendet wird:
- Zeigt 👍 und 👎 als Outline-Icons
- Nach Klick wird der gewählte Button gefüllt dargestellt
- Sendet `PATCH` an Vote-API mit der `interaction_id`
- Integration in: `AiCreateDialog`, `AiSuggestDialog`, `InlineIngredientEditor` und alle weiteren AI-Frontend-Komponenten
- Die `interaction_id` wird von der API als Teil der Response mitgeliefert

### 8. AiContextChoices

Alle KI-Kontexte als Enum:

```
content_improve_text       content_refurbish
content_suggest_tags       content_generate_image
content_suggest_supplies   ingredient_ai_create
ingredient_ai_suggest_all  ingredient_import_url
recipe_ai_create           recipe_ai_suggest_all
recipe_ai_suggest_ings     packing_list_ai_suggest
event_generate_invitation  documents_generate_text
```

### 9. Fehler-Logging

Bei Fehlern in `gemini_call()` oder vorgelagerten Rate-Limit/Auth-Checks:
- `prompt` wird gespeichert
- `response` bleibt leer
- `success = False`
- `error_code` enthält den Fehlertyp (`rate_limit`, `auth_error`, `timeout`, `unavailable`, `invalid_response`, `internal_error`)
- `duration_ms` wird trotzdem gespeichert (wenn verfügbar)
- Kein Vote möglich (vote bleibt null)

## Risks / Trade-offs

| Risk | Mitigation |
|---|---|
| **Speicherwachstum**: Jeder AI-Call wird für immer behalten. Bei 1000 Calls/Tag × 365 Tage = 365k Records/Jahr. Prompt/Response können groß sein (Kilobytes). | PostgreSQL JSONField + TextField sind effizient. Bei Bedarf: Kompression oder spätere Archivierung. |
| **Latenz**: Zusätzlicher DB-Write in `gemini_call()` kann AI-Call verlangsamen. | Der Write erfolgt synchron im selben Request. Der Write ist trivial schnell (UUID PK, kein Index-Overhead). Bei Bedarf: async write via django-q2. |
| **interaction_id Threading**: 13+ Aufrufer von `gemini_call()` müssen geändert werden. | Rückwärtskompatibilität nicht nötig. Alle Aufrufer sind bekannt und werden systematisch durchgegangen. |
| **Frontend-Komplexität**: Vote-Buttons müssen in beiden Frontends (food + main) in viele Komponenten integriert werden. | Zentrale `AiVoteButtons`-Komponente minimiert Duplikation. Nur die `interaction_id` muss von den Host-Komponenten durchgereicht werden. |

## Open Questions

- Soll der Vote-Button sofort nach dem AI-Call erscheinen (Inline) oder erst nach einer Verzögerung (z.B. beim Verlassen der Seite)?
- Sollen auch nicht-eingeloggte anonyme Sessions voten können (mit session_key statt user)?
