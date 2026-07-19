# ai-cost-dashboard Specification

## Purpose
Definiert die Visualisierung von KI-Kosten und Token-Verbrauch im Food-Frontend Admin-Dashboard. Erweitert den bestehenden KI-Feedback-Tab um Kosten-Metriken, Charts und Filter.

## ADDED Requirements

### Requirement: Kosten-Übersichtskarten
Das Dashboard SHALL zwei zusätzliche Übersichtskarten anzeigen: Gesamtkosten in EUR und Gesamttoken-Verbrauch.

#### Scenario: Kostenkarte zeigt Gesamtkosten
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL eine Karte "Gesamtkosten" mit dem Wert `total_cost_eur` angezeigt werden
- **THEN** der Wert SHALL mit 2 Dezimalstellen und "€"-Suffix formatiert sein (z.B. "0,42 €")
- **THEN** bei Nullkosten SHALL "0,00 €" angezeigt werden

#### Scenario: Token-Karte zeigt Gesamtverbrauch
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL eine Karte "Token-Verbrauch" mit dem Wert `total_tokens_all` angezeigt werden
- **THEN** der Wert SHALL als lokalisierte Zahl mit Tausender-Trennzeichen formatiert sein (z.B. "1.234.567")

#### Scenario: Mobile Darstellung der Übersichtskarten
- **WHEN** der Viewport kleiner als 640px ist
- **THEN** SHALL das Karten-Grid von 4 auf 2 Spalten wechseln
- **THEN** die neuen Kosten/Token-Karten SHALL Teil desselben Grids sein (6 Karten in 2 Spalten)

### Requirement: Kosten- und Token-Spalten in der Kontext-Tabelle
Die Kontext-Tabelle SHALL zwei zusätzliche Spalten enthalten: Token-Verbrauch und Kosten in EUR.

#### Scenario: Kontext-Tabelle mit Kosten und Tokens
- **WHEN** die Kontext-Tabelle gerendert wird
- **THEN** SHALL jede Zeile die Spalten `ctx.total_tokens` und `ctx.total_cost_eur` enthalten
- **THEN** Token-Werte SHALL mit Tausender-Trennzeichen formatiert sein
- **THEN** Kosten-Werte SHALL mit 2 Dezimalstellen und "€"-Suffix formatiert sein

#### Scenario: Keine Kosten bei Null-Werten
- **WHEN** ein Kontext `total_tokens=0` oder `total_cost_eur=0` hat
- **THEN** SHALL "—" anstelle von "0" angezeigt werden

#### Scenario: Spaltenreihenfolge
- **WHEN** die Kontext-Tabelle gerendert wird
- **THEN** SHALL die Spaltenreihenfolge sein: Kontext, Aufrufe, Tokens, Kosten, 👍, 👎, Quote, Fehler

### Requirement: Kosten-Verlaufschart
Das Dashboard SHALL ein Liniendiagramm anzeigen, das die täglichen KI-Kosten über 30 Tage visualisiert.

#### Scenario: Chart zeigt tägliche Kosten
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL ein `LineChart` mit X-Achse=Datum und Y-Achse=EUR angezeigt werden
- **THEN** die Hauptlinie SHALL die täglichen Gesamtkosten (User-initiated) darstellen
- **THEN** die Daten SHALL aus dem `timeline`-Array der `/admin/ai-interactions/stats/`-Antwort stammen

#### Scenario: Embedding-Kosten separat sichtbar
- **WHEN** der Embedding-Toggle aktiviert ist
- **THEN** SHALL eine zweite gestrichelte Linie die täglichen Embedding-Kosten anzeigen
- **THEN** die Embedding-Linie SHALL in Grau dargestellt werden

#### Scenario: Chart mit leeren Daten
- **WHEN** der gewählte Zeitraum keine KI-Calls enthält
- **THEN** SHALL der Chart eine leere Fläche mit dem Text "Keine Daten im gewählten Zeitraum" anzeigen

#### Scenario: Chart-Responsivität
- **WHEN** der Viewport kleiner als 640px ist
- **THEN** SHALL der Chart auf volle Breite skalieren und eine reduzierte Höhe (200px) haben

### Requirement: Zeitraum-Filter
Das Dashboard SHALL ein Dropdown-Menü bieten, um den betrachteten Zeitraum für alle Kosten-Aggregationen zu filtern.

#### Scenario: Zeitraum-Presets anzeigen
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL ein Dropdown mit den Optionen "Gesamte Zeit", "Letzte 30 Tage", "Letzte 90 Tage", "Dieses Jahr" angezeigt werden
- **THEN** der Default-Wert SHALL "Gesamte Zeit" sein

#### Scenario: Zeitraum ändern
- **WHEN** der Staff-User "Letzte 30 Tage" auswählt
- **THEN** SHALL der API-Call `date_from` auf `today - 30 days` setzen
- **THEN** alle Übersichtskarten, die Kontext-Tabelle und das Chart SHALL mit den gefilterten Daten aktualisiert werden

#### Scenario: Zeitraum "Dieses Jahr"
- **WHEN** der Staff-User "Dieses Jahr" auswählt
- **THEN** SHALL `date_from` auf den 1. Januar des aktuellen Jahres gesetzt werden

### Requirement: Embedding-Toggle
Das Dashboard SHALL eine Checkbox bieten, um Embedding-Calls (`is_background=true`) in die Statistiken ein- oder auszublenden.

#### Scenario: Toggle standardmäßig deaktiviert
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL der Embedding-Toggle deaktiviert sein
- **THEN** Embedding-Calls SHALL von allen Metriken ausgeschlossen sein

#### Scenario: Toggle aktivieren
- **WHEN** der Staff-User den Toggle "inkl. Embeddings" aktiviert
- **THEN** SHALL `include_background=true` als Query-Parameter an die Stats-API gesendet werden
- **THEN** alle Metriken (Karten, Tabelle, Chart, User-Tabelle) SHALL Embedding-Calls einschließen
- **THEN** das Chart SHALL die Embedding-Kosten-Linie anzeigen

### Requirement: Pro-User-Kosten-Tabelle
Das Dashboard SHALL eine Tabelle mit Kosten pro User anzeigen, inklusive klickbarer Zeilen für Detail-Ansicht.

#### Scenario: User-Tabelle anzeigen
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL unterhalb des Charts eine Sektion "Kosten pro Nutzer" erscheinen
- **THEN** die Tabelle SHALL folgende Spalten enthalten: Nutzer, Aufrufe, Tokens, Kosten gesamt, Kosten 30d, Vote-Rate
- **THEN** die Tabelle SHALL nach `total_cost_eur` absteigend sortiert sein

#### Scenario: User-Zeile anklicken
- **WHEN** der Staff-User auf eine User-Zeile klickt
- **THEN** SHALL ein Modal mit der paginierten Liste aller KI-Calls dieses Users geöffnet werden

#### Scenario: Zeitraum-Filter auf User-Tabelle
- **WHEN** der Staff-User den Zeitraum-Filter ändert
- **THEN** SHALL die User-Tabelle mit `date_from`/`date_to`-Parametern neu geladen werden

#### Scenario: Embedding-Toggle auf User-Tabelle
- **WHEN** der Staff-User den Embedding-Toggle aktiviert
- **THEN** SHALL die User-Tabelle Embedding-Calls für die Kostenzählung einschließen

### Requirement: User-Detail-Modal
Ein Modal SHALL die paginierte Liste aller KI-Calls eines einzelnen Users anzeigen.

#### Scenario: Modal öffnen
- **WHEN** der Staff-User auf eine User-Zeile in der Pro-User-Tabelle klickt
- **THEN** SHALL ein shadcn/ui `Dialog` mit dem Titel "KI-Aufrufe von {username}" geöffnet werden

#### Scenario: Einzel-Call-Daten anzeigen
- **WHEN** das Modal geöffnet ist
- **THEN** SHALL jeder Eintrag folgende Felder zeigen: Datum, Kontext (Label), Tokens, Kosten, Dauer (ms), Vote
- **THEN** die Liste SHALL paginiert sein (20 Einträge pro Seite, "Mehr laden"-Button)

#### Scenario: Modal schließen
- **WHEN** der Staff-User auf "Schließen" klickt oder außerhalb des Dialogs klickt
- **THEN** SHALL das Modal geschlossen werden

#### Scenario: Modal mit leeren Daten
- **WHEN** der User keine KI-Calls hat
- **THEN** SHALL "Keine KI-Aufrufe gefunden" angezeigt werden

### Requirement: Pricing-Transparenz
Das Dashboard SHALL eine ausklappbare Sektion mit der aktuellen Gemini-Pricing-Tabelle enthalten.

#### Scenario: Pricing-Sektion ausklappen
- **WHEN** der Staff-User auf "Gemini-Preise anzeigen" klickt
- **THEN** SHALL eine Tabelle mit den Spalten Modell, Typ, Input (pro 1M Tokens), Output (pro 1M Tokens), USD/EUR-Rate erscheinen
- **THEN** die Tabelle SHALL die Daten vom `GET /api/content/admin/ai-pricing/`-Endpoint beziehen

#### Scenario: Pricing-Sektion einklappen
- **WHEN** der Staff-User erneut auf "Gemini-Preise anzeigen" klickt
- **THEN** SHALL die Pricing-Tabelle ausgeblendet werden

#### Scenario: Pricing-Sektion standardmäßig eingeklappt
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL die Pricing-Sektion eingeklappt sein

### Requirement: TanStack Query Integration
Alle API-Aufrufe für Kosten-Daten SHALL über TanStack Query Hooks erfolgen.

#### Scenario: Stats-Hook mit Filter-Parametern
- **WHEN** `useAiInteractionStats({ date_from: "2026-06-01", include_background: true })` aufgerufen wird
- **THEN** SHALL der Query-Key die Parameter enthalten: `['ai-interaction-stats', '2026-06-01', undefined, true]`
- **THEN** der API-Call SHALL `?date_from=2026-06-01&include_background=true` anhängen

#### Scenario: User-Costs-Hook
- **WHEN** `useAiUserCosts()` aufgerufen wird
- **THEN** SHALL der Endpoint `GET /api/content/admin/ai-interactions/user-costs/` mit optionalen `date_from`/`date_to`-Parametern aufgerufen werden

#### Scenario: Pricing-Hook
- **WHEN** `useAiPricing()` aufgerufen wird
- **THEN** SHALL der Endpoint `GET /api/content/admin/ai-pricing/` aufgerufen werden
- **THEN** die Antwort SHALL ein `GeminiPricingSchema` validieren
