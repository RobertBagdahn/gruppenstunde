## ADDED Requirements

### Requirement: Modell-Auswertung
Das Dashboard SHALL eine Sektion "Auswertung nach Modell" anzeigen, die die KI-Aufrufe je verwendetem Gemini-Modell aufschlüsselt.

#### Scenario: Modell-Tabelle anzeigen
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL eine Sektion "Auswertung nach Modell" mit den Spalten Modell, Aufrufe, Tokens, Kosten, 👍 und 👎 erscheinen
- **THEN** die Daten SHALL aus dem `by_model`-Array der `/admin/ai-interactions/stats/`-Antwort stammen
- **THEN** die Zeilen SHALL nach Aufrufen absteigend sortiert sein
- **THEN** Token-Werte SHALL mit Tausender-Trennzeichen formatiert sein
- **THEN** Kosten-Werte SHALL mit 2 Dezimalstellen und "€"-Suffix formatiert sein
- **THEN** bei Nullwerten SHALL "—" angezeigt werden

#### Scenario: Keine Modell-Daten
- **WHEN** der gewählte Zeitraum keine KI-Calls enthält
- **THEN** SHALL die Modell-Sektion "Keine Daten im gewählten Zeitraum" anzeigen

#### Scenario: Zeitraum-Filter auf Modell-Auswertung
- **WHEN** der Staff-User den Zeitraum-Filter ändert
- **THEN** SHALL die Modell-Auswertung mit den gefilterten Daten aktualisiert werden

## MODIFIED Requirements

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
- **THEN** die Embedding-Kosten SHALL aus dem Feld `embedding_cost_eur` des jeweiligen Timeline-Eintrags stammen
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
- **THEN** alle Übersichtskarten, die Kontext-Tabelle, die Modell-Auswertung und das Chart SHALL mit den gefilterten Daten aktualisiert werden

#### Scenario: Zeitraum "Dieses Jahr"
- **WHEN** der Staff-User "Dieses Jahr" auswählt
- **THEN** SHALL `date_from` auf den 1. Januar des aktuellen Jahres gesetzt werden

#### Scenario: Heute-Karte bei aktivem Zeitraum-Filter
- **WHEN** der Staff-User einen Zeitraum-Filter ungleich "Gesamte Zeit" wählt
- **THEN** SHALL die "Heute"-Übersichtskarte "—" statt "0" anzeigen

### Requirement: User-Detail-Modal
Ein Modal SHALL die paginierte Liste aller KI-Calls eines einzelnen Users anzeigen.

#### Scenario: Modal öffnen
- **WHEN** der Staff-User auf eine User-Zeile in der Pro-User-Tabelle klickt
- **THEN** SHALL ein shadcn/ui `Dialog` mit dem Titel "KI-Aufrufe von {username}" geöffnet werden

#### Scenario: Einzel-Call-Daten anzeigen
- **WHEN** das Modal geöffnet ist
- **THEN** SHALL jeder Eintrag folgende Felder zeigen: Datum, Kontext (Label), Modell, Tokens, Kosten, Dauer (ms), Vote
- **THEN** die Liste SHALL paginiert sein (20 Einträge pro Seite, "Mehr laden"-Button)

#### Scenario: Mehr laden lädt Folgeseite
- **WHEN** der Staff-User im Modal auf "Mehr laden" klickt
- **THEN** SHALL die nächste Seite der KI-Calls geladen und an die bestehende Liste angehängt werden
- **THEN** der Button SHALL solange sichtbar sein, bis alle Seiten geladen sind
- **THEN** während des Ladens SHALL der Button deaktiviert sein

#### Scenario: Modal schließen
- **WHEN** der Staff-User auf "Schließen" klickt oder außerhalb des Dialogs klickt
- **THEN** SHALL das Modal geschlossen werden

#### Scenario: Modal mit leeren Daten
- **WHEN** der User keine KI-Calls hat
- **THEN** SHALL "Keine KI-Aufrufe gefunden" angezeigt werden
