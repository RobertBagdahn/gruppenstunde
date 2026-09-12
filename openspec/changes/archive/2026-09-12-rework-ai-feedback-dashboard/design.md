## Context

Der KI-Feedback-Tab (`/admin/ai-feedback`, `AiFeedbackTab.tsx`) ist ein Staff-only-Bereich im Food-Frontend. Er zeigt heute Übersichtskarten, Kontext-Tabelle, Kosten-Chart, Pro-User-Kosten und die Gemini-Preisliste. Das Backend speichert pro Call bereits das `model`-Feld (`AiInteraction.model`), liefert es im Log-Viewer aus (`AiInteractionItemOut.model`), aber die Stats-API aggregiert nicht nach Modell und das Dashboard rendert es nirgends.

Zusätzliche bekannte Mängel: Der "Mehr laden"-Button im `AiUserCallsModal` ist ein toter Button (kein Seitenzustand), die Embedding-Linie im Chart fehlt (Spec `ai-cost-dashboard` fordert sie), und die "Heute"-Karte zeigt bei aktivem Zeitraum-Filter "0".

## Goals / Non-Goals

**Goals:**
- Modell-Transparenz: Stats-Endpoint aggregiert `by_model`; Dashboard zeigt eine Modell-Auswertung; das User-Detail-Modal zeigt das Modell pro Call.
- Chart-Erweiterung: gestrichelte graue Embedding-Linie über `embedding_cost_eur` aus der Stats-Antwort.
- UX-Korrekturen: funktionierende "Mehr laden"-Pagination im Modal, "—" für die Heute-Karte bei Zeitraum-Filter.

**Non-Goals:**
- Kein neuer eigener KI-Log-Viewer-Tab (existiert als Spec, wird hier nicht gebaut).
- Keine Änderung an Pricing-Berechnung oder Gemini-Konfiguration.
- Keine URL-State-Migration des Tabs (Zeitraum-Filter bleibt lokaler React-State).
- Kein Umbau der Tabellen auf `CardTable`/`DataCardRow` in diesem Change (dichte Admin-Tabellen folgen dem bestehenden Muster aus `CompletenessGrid`/`PriceAnalysisTable`).

## Decisions

**1. `by_model` als neues Aggregat im bestehenden Stats-Endpoint**
Der Endpoint `admin_ai_interaction_stats` liefert bereits `by_context` und `timeline`; ein drittes Aggregat `by_model` folgt demselben Muster (Gruppierung über `values("model")`, Summen für Tokens/Kosten, Counts für Votes). Kein neuer Endpoint, kein zusätzlicher Request. Alternative verworfen: eigener `/admin/ai-interactions/models/`-Endpoint — wäre ein zweiter Admin-Call ohne Mehrwert.

Schema: `AiModelStatsOut` mit `model`, `total_calls`, `total_tokens`, `total_cost_eur`, `thumbs_up`, `thumbs_down`; Sortierung nach `total_calls` absteigend.

**2. `embedding_cost_eur` pro Timeline-Eintrag**
Der Timeline-Loop kennt pro Tag bereits die QuerySets. Für jeden Tag wird zusätzlich die Kostensumme der `is_background=True`-Calls aggregiert und als `embedding_cost_eur` ausgeliefert (unabhängig vom Toggle, damit die Linie beim Aktivieren ohne weiteren Request erscheint). Der Chart rendert die Linie nur bei aktivem Embedding-Toggle, gestrichelt in `--muted-foreground`.

**3. Modal-Pagination über React-State**
`AiUserCallsModal` hält `page` als `useState`, nutzt `useAiUserInteractions(userId, page)` und hängt geladene Seiten an eine kumulierte Liste an. "Mehr laden" ist sichtbar solange `page < total_pages`, disabled während `isFetching`. Alternative verworfen: TanStack `useInfiniteQuery` — der bestehende Hook ist page-basiert, die Anpassung wäre größer als der Nutzen für ein Admin-Modal.

**4. "Heute"-Karte**
Die Karte zeigt "—" wenn `dateRange !== 'all'` (reiner Frontend-Fix im `AiCostOverviewCards`-Props). Das Backend liefert `calls_today` nur bei leerem Zeitraum — Verhalten bleibt, die Anzeige wird nur ehrlich.

**5. Komponenten-Struktur**
Neue Komponente `AiModelBreakdown.tsx` unter `components/admin/ai/`, analog zu `AiContextTable`. Keine weiteren neuen Dateien; Änderungen an `AiCostChart`, `AiCostOverviewCards`, `AiUserCallsModal`, `AiFeedbackTab`.

## Risks / Trade-offs

- [Stats-Endpoint wird teurer] → Jede zusätzliche Aggregation kostet DB-Queries; `by_model` ist eine Gruppierung über das gesamte gefilterte QuerySet (gleich wie `by_context`), vertretbar für Staff-only-Endpoints mit `staleTime` 60s.
- [Unbekannte/leere Model-Strings] → Einträge mit leerem `model` werden wie bei `context` gefiltert (`exclude(model="")`) und im UI mit "Unbekannt" gelabelt.
- [Schema-Bruch für Frontend] → Zod-Schemas werden im selben Change synchronisiert; da Backend und Frontend gemeinsam deployed werden, ist kein Übergangszustand nötig.
- [Modal-Liste verdoppelt Items bei Rerender] → Kumulierung erfolgt per `useMemo` über die geladenen Seiten; Reset beim Öffnen (Seitenzustand auf 1 bei User-Wechsel).
