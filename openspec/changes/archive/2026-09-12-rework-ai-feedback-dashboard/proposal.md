## Why

Das Admin-Dashboard unter `/admin/ai-feedback` (KI-Feedback-Tab im Food-Frontend) zeigt Kosten und Votes, aber nirgends das verwendete Gemini-Modell — genau die Information, die Admins für Modell-Entscheidungen und Budget-Planung brauchen (das `model`-Feld existiert seit jeher im `AiInteraction`-Model und wird in der Log-API bereits geliefert, aber nicht gerendert). Zusätzlich hat die Seite mehrere konkrete Mängel: der "Mehr laden"-Button im User-Detail-Modal ist tot (keine Pagination implementiert), die im Spec geforderte Embedding-Kostenlinie im Chart fehlt, und die "Heute"-Karte zeigt bei aktivem Zeitraum-Filter irreführend "0".

## What Changes

- **Backend Stats-Endpoint**: `GET /api/content/admin/ai-interactions/stats/` liefert zusätzlich `by_model` (Modell, Aufrufe, Tokens, Kosten, 👍/👎) und pro Timeline-Eintrag die Embedding-Kosten (`embedding_cost_eur`) für die gestrichelte Chart-Linie.
- **Frontend AI-Feedback-Tab**: neuer Abschnitt "Auswertung nach Modell" (`AiModelBreakdown`), Embedding-Kostenlinie im Kosten-Verlaufschart bei aktivem Toggle, "Heute"-Karte zeigt "—" statt "0" bei aktivem Zeitraum-Filter, Fehlerzustände mit Retry.
- **User-Detail-Modal**: Spalte "Modell" ergänzen und "Mehr laden"-Pagination tatsächlich implementieren (Seitenzustand, Laden der Folgeseiten).
- **Schema-Sync**: Pydantic `AiInteractionStatsOut`/`AiTimelineEntryOut` erweitern, Zod-Schemas in `frontend-food/src/schemas/aiInteraction.ts` synchron halten.

## Capabilities

### New Capabilities

<!-- none -->

### Modified Capabilities

- `ai-cost-dashboard`: Stats-Antwort um `by_model` und `embedding_cost_eur` erweitern; Dashboard zeigt Modell-Auswertung, Embedding-Linie im Chart und korrigierte "Heute"-Karte.
- `ai-log-viewer`: User-Detail-Modal zeigt das Modell je Aufruf und lädt Folgeseiten über den "Mehr laden"-Button.

## Impact

- Backend: `backend/content/api/admin.py` (Stats-Aggregation), `backend/content/schemas/ai_interaction.py` (`AiModelStatsOut`, `AiTimelineEntryOut.embedding_cost_eur`), Tests in `backend/content/tests/test_ai_interaction_api.py`.
- Frontend: `frontend-food/src/schemas/aiInteraction.ts`, `frontend-food/src/api/aiInteraction.ts`, `frontend-food/src/pages/admin/AiFeedbackTab.tsx`, `frontend-food/src/components/admin/ai/` (`AiModelBreakdown` neu, `AiCostChart`, `AiCostOverviewCards`, `AiUserCallsModal`).
- Keine Migration nötig (kein Model-Feld; `AiInteraction.model` existiert bereits).
