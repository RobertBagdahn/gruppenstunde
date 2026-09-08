# recipe-import-integrity Specification

## Purpose
Integrität der Rezept-Import-Pipeline: bestehende Portionsstammdaten bleiben unverändert, Zutaten werden eindeutig zugeordnet und Backend-/Frontend-Verträge bleiben synchron.

## Requirements

### Requirement: Import verändert bestehende Portionen nicht
Die Import-Pipeline SHALL bestehende `Portion`-Datensätze weder umbenennen noch in ihrer Einheit verändern. Sie MUST ausschließlich exakt passende Portionen wiederverwenden oder neue anlegen.

#### Scenario: Passende Portion existiert bereits
- **WHEN** für eine Zutat bereits eine Portion mit passender Einheit und Menge existiert
- **THEN** SHALL diese Portion unverändert wiederverwendet werden
- **THEN** SHALL ihr Name nicht geändert werden

#### Scenario: Zielname kollidiert mit bestehender Portion
- **WHEN** der Import eine Portion anlegen möchte, deren Name bei derselben Zutat bereits vergeben ist
- **THEN** SHALL ein eindeutiger Name verwendet werden
- **THEN** SHALL kein `IntegrityError` auftreten
- **THEN** SHALL der Endpunkt nicht mit HTTP 500 antworten

#### Scenario: Kollision mit soft-gelöschter Portion
- **WHEN** eine soft-gelöschte Portion denselben Namen bei derselben Zutat belegt
- **THEN** SHALL das Anlegen einer neuen aktiven Portion mit diesem Namen zulässig sein
- **THEN** SHALL der Import erfolgreich abschließen

#### Scenario: Import bleibt für fremde Rezepte folgenlos
- **WHEN** ein Import eine Portion wiederverwendet, die von anderen Rezepten referenziert wird
- **THEN** SHALL die Anzeige dieser anderen Rezepte unverändert bleiben

### Requirement: Keine Zutaten-Duplikate durch KI-Abgleich
Der KI-gestützte Abgleich der geparsten Zutaten SHALL über eine stabile, nicht textbasierte Zuordnung erfolgen. Die Anzahl der erzeugten Rezeptpositionen MUST der Anzahl der Quellzutaten entsprechen.

#### Scenario: Anzahl der Positionen entspricht der Quelle
- **WHEN** eine Quelle zehn Zutaten enthält
- **THEN** SHALL das Ergebnis zehn Rezeptpositionen enthalten
- **THEN** SHALL keine Zutat mehrfach vorkommen

#### Scenario: KI liefert abweichende Zutatenbezeichnung
- **WHEN** die KI eine Zutat mit abweichender Schreibweise oder mit Mengenpräfix zurückgibt
- **THEN** SHALL die Zuordnung zur ursprünglichen Zutat dennoch gelingen
- **THEN** SHALL keine zusätzliche Position entstehen

#### Scenario: Zutatensuche verwendet den bereinigten Namen
- **WHEN** eine Zutat im Zutatenbestand gesucht wird
- **THEN** SHALL der Suchbegriff keine Mengen- oder Einheitenangabe enthalten

### Requirement: Keine stillen Null-Portionen
Der Import SHALL keine Rezeptposition ohne aufgelöste Portion speichern. Positionen ohne erkennbare Einheit MUST als klärungsbedürftig gekennzeichnet und vom Nutzer entschieden werden.

#### Scenario: Einheit ist nicht auflösbar
- **WHEN** für eine Zutat keine Einheit ermittelt werden kann
- **THEN** SHALL die Position als klärungsbedürftig gekennzeichnet zurückgegeben werden
- **THEN** SHALL ein KI-Vorschlag für die Einheit mitgeliefert werden
- **THEN** SHALL die Position nicht stillschweigend als Gramm interpretiert werden

#### Scenario: Klärungsbedürftige Position blockiert das Speichern
- **WHEN** mindestens eine Position noch klärungsbedürftig ist
- **THEN** SHALL der Wizard das Verlassen des Zutatenschritts verhindern
- **THEN** SHALL eine deutsche Meldung die betroffenen Zutaten benennen

#### Scenario: Nutzer klärt die Einheit
- **WHEN** der Nutzer für eine klärungsbedürftige Position eine Einheit auswählt
- **THEN** SHALL die Position eine gültige Portion erhalten
- **THEN** SHALL die Kennzeichnung entfallen

#### Scenario: Gespeicherte Positionen haben immer eine Portion
- **WHEN** ein über den Wizard erzeugtes Rezept gespeichert wurde
- **THEN** SHALL jede zugehörige Rezeptposition eine aufgelöste Portion besitzen

### Requirement: Synchrone Import-Verträge zwischen Backend und Frontend
Das Pydantic-Antwortschema des Imports und das Zod-Schema im Food-Frontend SHALL feldweise typgleich sein. Eine gültige Backend-Antwort MUST vom Frontend ohne Validierungsfehler verarbeitet werden.

#### Scenario: Tag-Bezeichner sind Zeichenketten
- **WHEN** die Import-Antwort Tag-Bezeichner enthält
- **THEN** SHALL das Backend sie als Zeichenketten liefern
- **THEN** SHALL das Frontend sie als Zeichenketten validieren

#### Scenario: Antwort mit Tags wird angenommen
- **WHEN** die Import-Antwort mindestens einen Tag enthält
- **THEN** SHALL die Frontend-Validierung erfolgreich sein
- **THEN** SHALL keine Fehlermeldung angezeigt werden

#### Scenario: Vertragstest deckt die Antwortform ab
- **WHEN** die Testsuite ausgeführt wird
- **THEN** SHALL ein Vertragstest eine aus dem Backend-Schema abgeleitete Beispielantwort gegen das Zod-Schema prüfen

### Requirement: Report über Rezeptpositionen ohne Portion
Das System SHALL einen Management Command bereitstellen, der bestehende Rezeptpositionen ohne aufgelöste Portion auflistet.

#### Scenario: Report listet betroffene Rezepte
- **WHEN** der Command ausgeführt wird
- **THEN** SHALL er die betroffenen Rezepte mit Titel, Slug und betroffener Zutat ausgeben
- **THEN** SHALL er keine Daten verändern

#### Scenario: Keine betroffenen Positionen vorhanden
- **WHEN** keine Rezeptposition ohne Portion existiert
- **THEN** SHALL der Command dies ausgeben und ohne Fehler beenden
