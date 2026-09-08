## ADDED Requirements

### Requirement: Wizard überschreibt vorhandene Inhalte nicht mit Leerwerten
Der Wizard SHALL beim Wechsel zwischen Schritten ausschließlich Werte übermitteln, die aus dem geladenen Rezept stammen oder vom Nutzer geändert wurden. Er MUST NICHT uninitialisierte Standardwerte an das Backend senden.

#### Scenario: Nutzer durchläuft den Metadatenschritt ohne Änderung
- **WHEN** der Nutzer den Metadatenschritt betritt und ohne Eingabe auf "Weiter" klickt
- **THEN** SHALL die vorhandene Beschreibung des Rezepts unverändert bleiben
- **THEN** SHALL die vorhandene Kurzbeschreibung unverändert bleiben
- **THEN** SHALL Schwierigkeit, Zubereitungszeit und Vorbereitungszeit unverändert bleiben

#### Scenario: Nutzer navigiert im Metadatenschritt zurück
- **WHEN** der Nutzer im Metadatenschritt ohne Eingabe auf "Zurück" klickt
- **THEN** SHALL kein Feld des Rezepts geleert werden

#### Scenario: Nutzer ändert ein einzelnes Feld
- **WHEN** der Nutzer ausschließlich die Kurzbeschreibung ändert und fortfährt
- **THEN** SHALL nur die Kurzbeschreibung aktualisiert werden
- **THEN** SHALL die übrigen Felder unverändert bleiben

#### Scenario: KI-generierte Zubereitung überlebt den gesamten Wizard
- **WHEN** ein KI-generiertes Rezept ohne weitere Eingaben bis zur Fertigstellung durchgeklickt wird
- **THEN** SHALL die KI-generierte Beschreibung nach dem Speichern weiterhin vorhanden sein
- **THEN** SHALL sie nach einem Neuladen der Detailseite sichtbar sein

### Requirement: Serverseitige Ablehnung leerer Auswahlfelder
Der Endpunkt zum Aktualisieren eines Rezepts SHALL leere Werte für Auswahlfelder ablehnen. Betroffen sind Schwierigkeit, Zubereitungszeit und Vorbereitungszeit.

#### Scenario: Leerer Wert für ein Auswahlfeld
- **WHEN** ein Aktualisierungsaufruf eine leere Zeichenkette für Schwierigkeit, Zubereitungszeit oder Vorbereitungszeit enthält
- **THEN** SHALL das System mit HTTP 422 antworten
- **THEN** SHALL die Fehlermeldung auf Deutsch das betroffene Feld benennen
- **THEN** SHALL kein Feld des Rezepts verändert werden

#### Scenario: Gültiger Wert für ein Auswahlfeld
- **WHEN** ein Aktualisierungsaufruf einen gültigen Wert für ein Auswahlfeld enthält
- **THEN** SHALL das System den Wert übernehmen und mit HTTP 200 antworten

#### Scenario: Auswahlfeld ist nicht Teil des Aufrufs
- **WHEN** ein Aktualisierungsaufruf ein Auswahlfeld gar nicht enthält
- **THEN** SHALL der bestehende Wert unverändert bleiben
- **THEN** SHALL das System mit HTTP 200 antworten

#### Scenario: Freitextfelder bleiben leerbar
- **WHEN** ein Aktualisierungsaufruf eine leere Kurzbeschreibung oder Beschreibung enthält
- **THEN** SHALL das System diesen Wert annehmen, da Freitextfelder bewusst geleert werden dürfen

### Requirement: Zubereitungsbereich bleibt bei leerem Inhalt bearbeitbar
Die Rezept-Detailseite SHALL den Bearbeitungsbereich für die Zubereitung auch dann anzeigen, wenn noch kein Text vorhanden ist, sofern der Nutzer Bearbeitungsrechte besitzt.

#### Scenario: Rezept ohne Zubereitungstext mit Bearbeitungsrecht
- **WHEN** ein Nutzer mit Bearbeitungsrecht ein Rezept ohne Zubereitungstext öffnet
- **THEN** SHALL ein Bearbeitungsbereich für die Zubereitung sichtbar sein
- **THEN** SHALL ein Leerzustand mit deutschem Hinweis zum Ergänzen angezeigt werden

#### Scenario: Rezept ohne Zubereitungstext ohne Bearbeitungsrecht
- **WHEN** ein Nutzer ohne Bearbeitungsrecht ein Rezept ohne Zubereitungstext öffnet
- **THEN** SHALL kein Bearbeitungsbereich angezeigt werden

#### Scenario: Nutzer ergänzt die Zubereitung nachträglich
- **WHEN** ein Nutzer mit Bearbeitungsrecht den leeren Zubereitungsbereich befüllt und speichert
- **THEN** SHALL der Text persistiert werden
- **THEN** SHALL er nach einem Neuladen sichtbar sein
