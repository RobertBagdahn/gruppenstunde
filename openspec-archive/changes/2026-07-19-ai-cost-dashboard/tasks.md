## 1. Backend: Pydantic-Schemas

- [x] 1.1 `GeminiPricingOut`-Schema in `content/schemas/ai_interaction.py` hinzufügen (felder: `pricing`, `usd_to_eur`)
- [x] 1.2 `AiInteractionStatsOut` um optionale Query-Parameter-Dokumentation ergänzen (kein Schema-Change, nur API-Docs)

## 2. Backend: Pricing-Endpoint

- [x] 2.1 Route `GET /api/content/admin/ai-pricing/` in `content/api/admin.py` implementieren
- [x] 2.2 `GEMINI_PRICING` aus `settings` lesen und als `GeminiPricingOut`-Response serialisieren
- [x] 2.3 Admin-Auth-Check (`_require_admin`) wie bei allen anderen `/admin/`-Endpoints

## 3. Backend: Zeitraum-Filter auf Stats-Endpoint

- [x] 3.1 `admin_ai_interaction_stats()` um `date_from: str = ""` und `date_to: str = ""` Query-Parameter erweitern
- [x] 3.2 ISO-8601 Datum-Validierung mit HTTP 400 bei ungültigem Format
- [x] 3.3 `base_qs` mit `.filter(created_at__date__gte=date_from, created_at__date__lte=date_to)` einschränken
- [x] 3.4 Timeline-Generierung auf den gefilterten Zeitraum begrenzen

## 4. Backend: Zeitraum- und Background-Filter auf User-Costs-Endpoint

- [x] 4.1 `admin_ai_interactions_user_costs()` um `date_from`, `date_to`, `include_background` Query-Parameter erweitern
- [x] 4.2 `include_background`-Parameter (default `false`) — wenn `true`, `is_background`-Filter entfernen
- [x] 4.3 Datum-Filter wie beim Stats-Endpoint anwenden
- [x] 4.4 `cost_30d_eur`-Berechnung unabhängig vom Zeitraum-Filter belassen (immer letzte 30 Tage ab heute)

## 5. Backend: Tests

- [x] 5.1 Test für `GET /api/content/admin/ai-pricing/` — Staff sieht Pricing, Non-Staff bekommt 403
- [x] 5.2 Test für Stats-Endpoint mit `date_from`/`date_to` — korrekte Filterung
- [x] 5.3 Test für Stats-Endpoint mit ungültigem Datum — HTTP 400
- [x] 5.4 Test für User-Costs mit `date_from`/`date_to`/`include_background`

## 6. Frontend: Zod-Schemas

- [x] 6.1 `GeminiPricingEntrySchema` und `GeminiPricingSchema` in `schemas/aiInteraction.ts` hinzufügen
- [x] 6.2 `AiInteractionStatsSchema` prüfen — kein Schema-Change nötig (Felder sind vorhanden)
- [x] 6.3 `UserCostSchema` prüfen — kein Schema-Change nötig (Felder sind vorhanden)
- [x] 6.4 `PaginatedAiInteractionsSchema` prüfen — bereits vorhanden, wird für User-Detail-Modal verwendet

## 7. Frontend: API-Hooks

- [x] 7.1 `useAiPricing()` in `api/aiInteraction.ts` — ruft `GET /api/content/admin/ai-pricing/` auf
- [x] 7.2 `useAiInteractionStats()` um optionale Parameter `dateFrom`, `dateTo`, `includeBackground` erweitern
- [x] 7.3 `useAiUserCosts()` in `api/aiInteraction.ts` — ruft `GET /api/content/admin/ai-interactions/user-costs/` mit Query-Parametern auf
- [x] 7.4 `useAiUserInteractions()` in `api/aiInteraction.ts` — ruft `GET /api/content/admin/ai-interactions/?user_id=X` paginiert auf (für User-Detail-Modal)

## 8. Frontend: Sub-Komponenten

- [x] 8.1 `AiCostOverviewCards.tsx` — 6 Übersichtskarten (4 bestehende + Gesamtkosten + Token-Verbrauch) mit Formatierung
- [x] 8.2 `AiContextTable.tsx` — Erweiterung der Kontext-Tabelle um Token- und Kosten-Spalten
- [x] 8.3 `AiFilterBar.tsx` — Zeitraum-Dropdown (All Time / 30 Tage / 90 Tage / Dieses Jahr) + Embedding-Toggle-Checkbox
- [x] 8.4 `AiCostChart.tsx` — Recharts `LineChart` mit ResponsiveContainer, zwei Linien (Gesamtkosten + Embeddings), Tooltip mit EUR-Formatierung
- [x] 8.5 `AiUserCostsTable.tsx` — Pro-User-Tabelle (Nutzer, Aufrufe, Tokens, Kosten gesamt, Kosten 30d, Vote-Rate) mit `onUserClick`-Callback
- [x] 8.6 `AiUserCallsModal.tsx` — shadcn/ui `Dialog` mit paginierter Liste (Datum, Kontext-Label, Tokens, Kosten, Dauer ms, Vote), "Mehr laden"-Button
- [x] 8.7 `AiPricingSection.tsx` — Collapsible-Bereich mit Gemini-Pricing-Tabelle, Toggle per Button

## 9. Frontend: AiFeedbackTab-Integration

- [x] 9.1 `AiFeedbackTab.tsx` um `useState` für `dateRange`, `includeEmbeddings` erweitern
- [x] 9.2 Bestehende Übersichtskarten durch `AiCostOverviewCards` ersetzen
- [x] 9.3 Bestehende Kontext-Tabelle durch `AiContextTable` ersetzen
- [x] 9.4 `AiFilterBar` oberhalb des Dashboards einbauen
- [x] 9.5 `AiCostChart` nach der Kontext-Tabelle einbauen
- [x] 9.6 `AiUserCostsTable` + `AiUserCallsModal` nach dem Chart einbauen
- [x] 9.7 `AiPricingSection` am Ende des Tabs einbauen
- [x] 9.8 Alle API-Hooks mit korrekten Filter-Parametern verdrahten

## 10. Frontend: Formatierung & UX

- [x] 10.1 EUR-Formatierung: `new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2 })`
- [x] 10.2 Token-Formatierung: `new Intl.NumberFormat('de-DE').format(n)`
- [x] 10.3 Kontext-Label-Mapping (context → deutsches Label aus `AiContextChoices`)
- [x] 10.4 Dauer-Formatierung: ms → "1,2 s" oder "3.450 ms"
- [x] 10.5 Loading-Skeletons für neue Sektionen (Chart, User-Tabelle)
- [x] 10.6 Empty States: "Keine KI-Aufrufe im gewählten Zeitraum", "Keine Nutzer mit KI-Aufrufen"

## 11. Frontend: Mobile Responsiveness

- [x] 11.1 Übersichtskarten: `grid-cols-2 md:grid-cols-3 lg:grid-cols-6`
- [x] 11.2 Kontext-Tabelle: horizontales Scrollen auf Mobile (`overflow-x-auto`)
- [x] 11.3 Chart: reduzierte Höhe (200px) auf Mobile
- [x] 11.4 User-Tabelle: horizontales Scrollen, Stack-Layout wie `CardTable` bei < 768px
- [x] 11.5 User-Detail-Modal: `DialogContent` mit `sm:max-w-2xl` und Mobile-Scroll

## 12. Schema-Sync & QA

- [x] 12.1 Pydantic ↔ Zod Schemas auf Sync prüfen (alle Felder, Typen, Nullable)
- [x] 12.2 Backend-Tests ausführen: `uv run pytest content/tests/test_ai_interaction_api.py -xvs`
- [x] 12.3 Frontend Build prüfen: `npm run build` im `frontend-food/`
- [x] 12.4 Manuell testen: Admin → KI Feedback → alle Filter/Karten/Chart/Modal prüfen
