## Why

Das Backend trackt seit Längerem Kosten und Token-Verbrauch jedes KI-Calls (GEMINI_PRICING-Tabelle, `AiInteraction.cost_eur`, `total_tokens`), und die API liefert diese Daten auch aus — aber im Admin-Dashboard "KI-Feedback" (`AiFeedbackTab.tsx`) werden sie nirgends gerendert. Admins können heute sehen, wie viele KI-Aufrufe stattfinden und wie sie bewertet wurden, aber sie wissen nicht, was diese Aufrufe kosten. Das macht Budget-Planung und Modell-Entscheidungen unmöglich.

## What Changes

- **Neue Backend-Endpunkte**: Pricing-Tabelle-Endpoint (`GET /api/content/admin/ai-pricing/`) + Zeitraum-Filter auf den bestehenden Stats- und User-Costs-Endpoints
- **Übersichtskarten erweitert**: Zwei zusätzliche Karten für `total_cost_eur` und `total_tokens_all`
- **Kontext-Tabelle erweitert**: Neue Spalten für Tokens und Kosten pro AI-Kontext
- **Kosten-Chart**: Recharts-Liniendiagramm für tägliche Kosten über den gewählten Zeitraum
- **Zeitraum-Dropdown**: Preset-Filter (All Time / 30 Tage / 90 Tage / Dieses Jahr) für alle Kosten-Daten
- **Embedding-Toggle**: Checkbox "inkl. Embeddings" zum Ein-/Ausblenden von `is_background=true`-Calls
- **Pro-User-Kosten**: Neue Sektion mit Tabelle (User, Calls, Tokens, Kosten gesamt, Kosten 30d, Vote-Rate) + klickbare Zeilen
- **User-Detail-Modal**: Paginierte Liste aller KI-Calls eines Users (Datum, Kontext, Tokens, Kosten, Dauer, Vote)
- **Pricing-Sektion**: Ausklappbarer Bereich mit der aktuellen GEMINI_PRICING-Tabelle

## Capabilities

### New Capabilities
- `ai-cost-dashboard`: Frontend-Visualisierung der KI-Kostendaten — Übersichtskarten, Kontext-Tabelle, Kosten-Chart, Zeitraum-Filter, Embedding-Toggle, Pro-User-Kosten, User-Detail-Modal, Pricing-Transparenz

### Modified Capabilities
- `ai-cost-tracking`: Neuer Backend-Endpoint `GET /api/content/admin/ai-pricing/` für die Pricing-Tabelle; Zeitraum-Filter (`date_from`/`date_to`) auf `/admin/ai-interactions/stats/` und `/admin/ai-interactions/user-costs/`
- `food-admin`: Der bestehende KI-Feedback-Tab (`AiFeedbackTab.tsx`) wird um Kosten-Visualisierung erweitert — keine Änderung an anderen Tabs

## Impact

- **Backend**: `content/api/admin.py` — neue Route + Query-Parameter auf bestehenden Endpoints
- **Backend**: `content/schemas/ai_interaction.py` — neues `GeminiPricingOut` Schema
- **Frontend-Food**: `src/pages/admin/AiFeedbackTab.tsx` — Hauptänderung (neue Cards, Tabellenspalten, Chart, Filter)
- **Frontend-Food**: `src/api/aiInteraction.ts` — neue Hooks (`useAiPricing`, angepasste Stats-Hooks mit Query-Parametern)
- **Frontend-Food**: `src/schemas/aiInteraction.ts` — neue Zod-Schemas (Pricing, erweiterte Stats)
- **Chart-Library**: `recharts` ist bereits installiert (v3.8.1)
