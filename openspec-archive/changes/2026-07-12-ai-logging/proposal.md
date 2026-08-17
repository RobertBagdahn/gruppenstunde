## Why

Jeder Gemini-KI-Call der Plattform wird bereits zentral geloggt (`AiInteraction`-Model), aber ohne Token-Zählung, ohne Kostenberechnung und ohne eine durchsuchbare Admin-Oberfläche. Admins können weder sehen, welcher User wieviel KI-Kosten verursacht, noch Fehler gezielt untersuchen. Gleichzeitig fehlt bei den meisten KI-Endpoints die Rückgabe der `ai_interaction_id`, sodass User kein Feedback (👍/👎) geben können. Diese Lücken machen Kostenkontrolle und Qualitätsmanagement der KI-Features unmöglich.

## What Changes

- **Token-Tracking**: `AiInteraction`-Model erhält Felder für Prompt-Tokens, Completion-Tokens, Total-Tokens und `cost_eur`. Jeder `gemini_call()` extrahiert `usage_metadata` aus der Gemini-Response und berechnet Kosten über eine Modell-Preis-Tabelle.
- **Embedding-Logging**: `gemini_embed()` loggt intern (is_background=True), Signatur bleibt unverändert.
- **Background-Flag**: Neuer `is_background`-Parameter in `gemini_call()`/`gemini_image_call()` unterscheidet User-Requests von Management-Commands/System-Calls. Auth-Check erfolgt VOR dem Logging.
- **Admin-Log-Viewer**: Drei neue Staff-Only Admin-Seiten — paginierter Interaktions-Log (mit Expand für Prompt/Response), Kosten-pro-User-Tabelle, erweiterte Aggregat-Stats mit Kosten.
- **Vollständige Vote-Abdeckung**: Alle 13 KI-Endpoints, die bisher keine `ai_interaction_id` zurückgeben, erhalten das Feld in ihrem Response-Schema. **BREAKING**: Alle AI-Response-Schemas (Backend Pydantic + Frontend Zod) werden erweitert.

## Capabilities

### New Capabilities
- `ai-cost-tracking`: Token-Zählung, Kostenberechnung in €, Modell-Preis-Tabelle, USD→EUR-Konvertierung, Background-Flag für System-Calls
- `ai-log-viewer`: Paginierter Admin-Log mit Prompt/Response-Expand, Filter (Context, User, Success, Date), Kosten-pro-User-Ansicht, erweiterte Stats
- `ai-vote-coverage`: `ai_interaction_id` in allen 13 KI-Response-Schemas (Backend + Frontend), `AiVoteButtons`-Komponente an allen KI-Ergebnis-Stellen

### Modified Capabilities
- `ai-features`: Alle AI-Response-Schemas (improve_text, suggest_tags, refurbish, generate_image, suggest_supplies, recipe-endpoints, event-invitation, packing-list, meal-plan) erhalten `ai_interaction_id: str | None`

## Impact

- **Backend Models**: `content/models/ai_interaction.py` — 7 neue Felder (prompt_tokens, completion_tokens, total_tokens, thoughts_tokens, cost_eur, pricing_model, is_background)
- **Backend Services**: `core/services/gemini.py` — Token-Extraktion, Kostenberechnung, is_background-Param, Auth-Reihenfolge-Fix, gemini_embed-Logging
- **Backend Schemas**: 13 Pydantic-Schemas erweitert (content/schemas/ai.py, supply/schemas/ingredients.py, recipe/schemas/*, event/schemas/*, packinglist/schemas.py, planner/schemas/*)
- **Backend API**: Neue Admin-Endpoints für Log-Liste + Kosten-pro-User; erweiterter Stats-Endpoint; ~15 Service-Funktionen propagieren interaction_id
- **Frontend (Haupt)**: Zod-Schemas in `schemas/aiInteraction.ts`, `schemas/content.ts`; Neue Admin-Pages `AdminKiLogPage`, `AdminKiKostenPage`; `AiVoteButtons` in ~8 Komponenten
- **Frontend (Food)**: Zod-Schemas synchronisieren; `AiVoteButtons` in Recipe-/Ingredient-Komponenten
- **Migration**: 1 Django-Migration für AiInteraction-Model-Änderungen
- **Settings**: Neue `GEMINI_PRICING`-Dict + `USD_TO_EUR` in Django Settings
