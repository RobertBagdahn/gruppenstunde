## Context

Das Backend speichert seit `ai-cost-tracking` (backend `content/migrations/0018`) Token-Verbrauch und Kosten in Euro für jeden KI-Call im `AiInteraction`-Model. Die Aggregations-Endpoints (`stats/`, `user-costs/`) liefern diese Felder aus, aber die Frontend-Komponente `AiFeedbackTab.tsx` rendert nur Vote-Metriken (total_calls, voted_calls, vote_rate). Kosten und Tokens sind im API-Response vorhanden, werden aber nicht angezeigt.

Die bestehende `AiFeedbackTab` ist ein Admin-Tab unter `/admin/ai-feedback`, ausschließlich für Staff-User sichtbar.

**Constraints:**
- Keine neuen Python-Dependencies (Django, Ninja, Pydantic reichen)
- `recharts` v3.8.1 ist im Food-Frontend bereits installiert
- Mobile-First (320px Minimum), aber Admin-Dashboard wird primär auf Desktop genutzt
- Alle Texte Deutsch, Code Englisch

## Goals / Non-Goals

**Goals:**
- Kosten (EUR) und Token-Verbrauch auf drei Ebenen sichtbar machen: Gesamtsumme, pro KI-Kontext, pro User
- Zeitraum-Filter (All Time / 30 Tage / 90 Tage / Dieses Jahr) für alle Kosten-Aggregationen
- Toggle für Embedding-Calls (`is_background=true`)
- Kosten-Chart als Liniendiagramm über 30 Tage
- Pro-User-Kosten-Tabelle mit klickbarem Detail-Modal (paginierte Einzel-Calls)
- Aktuelle GEMINI_PRICING-Tabelle als ausklappbare Sektion zur Transparenz
- Alles in der bestehenden `AiFeedbackTab`-Komponente (kein neuer Tab/Route)

**Non-Goals:**
- Kein CSV/PDF-Export der Kostendaten
- Kein Budget-Limit/Alarm bei Kostenüberschreitung
- Keine Änderung am Haupt-Frontend (`frontend/`) — nur `frontend-food/`
- Keine neuen Django-Modelle oder Migrationen
- Keine Änderung an der Gemini-Pricing-Logik selbst

## Decisions

### D1: Backend — Neuer Pricing-Endpoint

**Entscheidung:** Neuer Admin-Endpoint `GET /api/content/admin/ai-pricing/` gibt die `GEMINI_PRICING`-Tabelle + `USD_TO_EUR`-Rate als JSON zurück. Keine DB-Query, nur Settings-Daten.

**Rationale:** Die Pricing-Daten leben in `settings/base.py` als Python-Dict. Sie können sich ändern (neue Modelle, Preisänderungen) und sollten im Frontend sichtbar sein, ohne dass Admins den Code lesen müssen. Ein dedizierter Endpoint ist sauberer als die Daten in einen bestehenden Response zu packen.

**Alternativen verworfen:**
- Pricing in den `stats/`-Response einbetten → vermischt Reporting-Daten mit Konfiguration
- Pricing hart im Frontend codieren → driftet auseinander, single source of truth ist das Backend

### D2: Backend — Zeitraum-Filter als Query-Parameter

**Entscheidung:** Die bestehenden Endpoints `stats/` und `user-costs/` erhalten optionale Query-Parameter `date_from` und `date_to` (ISO-8601 Datum, z.B. `2026-01-01`). Ohne Parameter bleibt das Verhalten unverändert (All Time).

**Rationale:** Bestehendes API-Design wird nicht gebrochen. Ohne Parameter verhalten sich die Endpoints wie bisher (rückwärtskompatibel). Die Logik beschränkt sich auf einen einfachen `created_at__date__gte`/`lte`-Filter.

**Zeitraum-Presets im Frontend:**
```
All Time   → keine Parameter
30 Tage    → date_from = today - 30 days
90 Tage    → date_from = today - 90 days
Dieses Jahr → date_from = 2026-01-01
```

### D3: Frontend — Komponenten-Aufteilung

**Entscheidung:** Die `AiFeedbackTab.tsx` wird in mehrere Sub-Komponenten aufgeteilt:

```
AiFeedbackTab.tsx (Container — State, API-Aufrufe, Layout)
├── AiCostOverviewCards.tsx     (6 Karten: 4 bestehende + 2 neue für Kosten/Tokens)
├── AiContextTable.tsx          (Kontext-Tabelle mit neuen Kosten/Token-Spalten)
├── AiCostChart.tsx             (Recharts-Liniendiagramm)
├── AiUserCostsTable.tsx        (Pro-User-Tabelle)
├── AiUserCallsModal.tsx        (Modal mit paginierter Einzel-Call-Liste)
├── AiPricingSection.tsx        (Ausklappbare Pricing-Tabelle)
├── AiFilterBar.tsx             (Zeitraum-Dropdown + Embedding-Toggle)
```

**Rationale:** Die aktuelle `AiFeedbackTab` ist 158 Zeilen und tut eine Sache. Mit den Erweiterungen würde sie mehrere hundert Zeilen lang. Sub-Komponenten halten die Dateien fokussiert und testbar. Die Aufteilung folgt dem bestehenden Muster (z.B. `DataDistributionsPage` hat `ChartCard` als eigene Komponente).

**Alternativen verworfen:**
- Alles in einer Datei → unwartbar bei 500+ Zeilen
- Separate Tab/Route für Kosten → vom Nutzer explizit abgelehnt (Q3)

### D4: Frontend — State Management für Filter

**Entscheidung:** Lokaler React-State (`useState`) in `AiFeedbackTab` für Zeitraum-Filter und Embedding-Toggle. Kein URL-State, kein Zustand.

**Rationale:** Der Admin-Bereich nutzt nirgends URL-State. Die Filter sind einfach (ein Dropdown + ein Toggle) und müssen nicht persistiert werden. TanStack Query-Key wird mit den Filter-Werten gebaut, sodass Änderungen automatisch neue Daten fetchen.

### D5: Frontend — Chart-Typ

**Entscheidung:** `LineChart` von Recharts für den Kosten-Verlauf über 30 Tage. X-Achse: Datum, Y-Achse: EUR. Zwei Linien: Gesamtkosten (blau) + Embedding-Kosten (grau gestrichelt, nur bei aktiviertem Toggle).

**Rationale:** Recharts ist bereits im Projekt (`DataDistributionsPage` nutzt `BarChart`, `ScatterChart`, `PieChart`). `LineChart` ist der natürlichste Typ für Zeitreihen. Das Muster `ChartCard` (Card mit Title + ResponsiveContainer) wird von `DataDistributionsPage` übernommen.

**Alternativen verworfen:**
- BarChart → weniger geeignet für kontinuierliche Zeitreihen
- Kein Chart, nur Zahlen → vom Nutzer explizit gewünscht (Q7)

### D6: User-Detail-Modal — API-Design

**Entscheidung:** Der bestehende Endpoint `GET /api/content/admin/ai-interactions/` mit `user_id`-Filter wird für das Modal verwendet. Kein neuer Endpoint nötig.

**Rationale:** Der Endpoint existiert bereits, supportet `user_id`, Paginierung und alle Felder die wir brauchen (`total_tokens`, `cost_eur`, `duration_ms`, `vote`, etc.). Ein neuer Endpoint wäre Redundanz.

### D7: Pricing-Sektion — Sicherheit

**Entscheidung:** Der Pricing-Endpoint `GET /api/content/admin/ai-pricing/` erfordert `is_staff` (wie alle anderen `/admin/`-Endpoints). Die Pricing-Daten sind nicht geheim (öffentliche Google-Preise), aber der Endpoint gibt auch `USD_TO_EUR` preis, was eine Geschäftsentscheidung sein könnte.

**Rationale:** Konsistent mit allen anderen Admin-Endpoints. Kein Grund, Pricing öffentlich zu machen.

## Risits / Trade-offs

| Risiko | Mitigation |
|--------|-----------|
| **N+1 Query bei user-costs/**: Der bestehende Endpoint macht pro User eine Extra-Query für `cost_30d`. Bei vielen Usern wird das langsam. | Aktuell wenige User (< 50). Bei Skalierungsproblemen: `Subquery` oder `Window`-Annotation statt Schleife. |
| **Keine Caching-Strategie**: Jeder Tab-Wechsel triggert neue API-Calls. | `staleTime: 60_000` wie bei den bestehenden Stats. Admin-Dashboard wird selten genutzt, Live-Daten sind wichtiger als Caching. |
| **Große Datasets im Chart**: Bei > 1000 KI-Calls pro Tag könnte die Timeline-Aggregation langsam werden. | Aktuell < 200 Calls/Tag global. Die Aggregation läuft bereits über `created_at__date` mit Django-Aggregation, also DB-seitig. Kein Problem. |
| **Zeitraum-Filter bricht bestehende API**: Bestehende Consumer (falls vorhanden) könnten brechen. | Query-Parameter sind optional. Ohne Parameter identisches Verhalten. **BREAKING** nur wenn jemand bereits unerwartete Query-Parameter sendet (unwahrscheinlich). |
