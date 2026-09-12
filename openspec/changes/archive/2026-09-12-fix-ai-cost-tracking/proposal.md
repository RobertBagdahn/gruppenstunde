## Why

Das KI-Kosten-Tracking hat drei konkrete Fehler: (1) `gemini-2.5-flash-lite` ist nicht in der Preisliste, sodass ein realer Batch-Job `cost_eur = NULL` schreibt — ohne die im Spec geforderte Warnung; (2) die `by_context`-Aggregation im Dashboard vergleicht gegen ein Enum mit `content_*`-Präfixen, das nie mit den tatsächlich gespeicherten `context`-Strings übereinstimmt, sodass die Kontext-Kostentabelle immer leer ist; (3) zwei Background-Commands setzen `is_background` nicht und verfälschen die User-Kostensummen. Zusätzlich weicht das Rate-Limit (200/5min) vom Spec (100/15min) ab.

## What Changes

- `gemini-2.5-flash-lite` in `GEMINI_PRICING` aufnehmen oder das Model auf `gemini-3.1-flash-lite` vereinheitlichen.
- Unbekanntes Model loggt eine Warnung statt still `None` zurückzugeben (`_calculate_cost_eur`).
- Thinking-Token-Doppelzählung beheben (`candidates_token_count` enthält bereits Thinking-Tokens).
- `AiContextChoices` mit den realen `context`-Strings synchronisieren (oder Enum entfernen), damit `by_context` korrekt aggregiert.
- `import_rezeptkalkulator_ingredients` und `repair_portion_integrity` mit `is_background=True` versehen.
- Dashboard-Kostenanzeige auf 2 Dezimalstellen vereinheitlichen (Spec `ai-cost-dashboard`).
- Rate-Limit auf 100/15min angleichen.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
- `ai-cost-tracking`: Warnung bei unbekanntem Model; Thinking-Token-Korrektur; `is_background`-Flaggung für Batch-Jobs.
- `ai-cost-dashboard`: `by_context`-Aggregation gegen echte Kontext-Strings; 2-Dezimal-Formatierung.
- `gemini-rate-limit`: Globales Limit 100/15min statt 200/5min.

## Impact

- Backend: `backend/core/services/gemini.py`, `backend/inspi/settings/base.py`, `backend/content/choices.py`, `backend/content/api/admin.py`, `backend/core/management/commands/batch_generate_default_portions.py`, `backend/supply/management/commands/import_rezeptkalkulator_ingredients.py`, `backend/supply/management/commands/repair_portion_integrity.py`.
- Frontend: `frontend/src/pages/KiKostenPage.tsx` (Dezimalformat), ggf. `frontend-food/src/lib/aiContextLabels.ts` (Enum-Sync).
- Keine Migration nötig (kein Schema-Wandel am Model; `context` bleibt Freitext-CharField).
