## 1. Backend: Schemas

- [x] 1.1 `AiModelStatsOut` in `backend/content/schemas/ai_interaction.py` ergänzen (`model`, `total_calls`, `total_tokens`, `total_cost_eur`, `thumbs_up`, `thumbs_down`)
- [x] 1.2 `AiTimelineEntryOut` um `embedding_cost_eur: float = 0` erweitern
- [x] 1.3 `AiInteractionStatsOut` um `by_model: list[AiModelStatsOut] = []` erweitern

## 2. Backend: Stats-Endpoint

- [x] 2.1 `by_model`-Aggregation in `admin_ai_interaction_stats` implementieren (Gruppierung über `model`, leere Model-Strings ausschließen, Sortierung nach Aufrufen absteigend, `include_background` respektieren)
- [x] 2.2 Timeline-Loop um tägliche Embedding-Kosten (`is_background=True`) erweitern und als `embedding_cost_eur` ausliefern
- [x] 2.3 Tests in `backend/content/tests/test_ai_interaction_api.py`: `by_model` (mehrere Modelle, Sortierung, include_background) und `embedding_cost_eur` (mit/ohne Embedding-Calls)

## 3. Frontend: Schema-Sync

- [x] 3.1 `frontend-food/src/schemas/aiInteraction.ts`: `AiModelStatsSchema`/Typ ergänzen, `AiTimelineEntrySchema` um `embedding_cost_eur` erweitern, `AiInteractionStatsSchema` um `by_model` erweitern

## 4. Frontend: Dashboard-Komponenten

- [x] 4.1 Neue Komponente `AiModelBreakdown.tsx` (`components/admin/ai/`): Tabelle Modell/Aufrufe/Tokens/Kosten/👍/👎, Formatierung wie `AiContextTable`, Leerzustand, Unbekannt-Label für leeres Modell
- [x] 4.2 `AiCostChart.tsx`: gestrichelte graue Embedding-Linie (`embedding_cost_eur`) bei aktivem Embedding-Toggle inkl. Legende
- [x] 4.3 `AiCostOverviewCards.tsx`: "Heute"-Karte zeigt "—" wenn Zeitraum-Filter aktiv (neues Prop)
- [x] 4.4 `AiUserCallsModal.tsx`: Spalte "Modell" ergänzen; "Mehr laden"-Pagination implementieren (Seitenzustand, kumulierte Liste, Reset bei User-Wechsel, Button-Zustände)
- [x] 4.5 `AiFeedbackTab.tsx`: `AiModelBreakdown` einbinden, Heute-Karten-Prop durchreichen, Fehlerzustand mit Retry-Button

## 5. Verifikation

- [x] 5.1 `uv run python manage.py makemigrations --check` ausführen
- [x] 5.2 Backend-Tests: `uv run pytest backend/content/tests/test_ai_interaction_api.py`
- [x] 5.3 Frontend: Lint/Typecheck (`pnpm --dir frontend-food run lint` bzw. `tsc`) ausführen und relevante Tests laufen lassen
- [x] 5.4 Openspec-Validierung: `openspec validate --strict` für den Change
