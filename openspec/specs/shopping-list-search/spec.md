# shopping-list-search Specification

## Purpose
Suche und Filter der Einträge auf der Einkaufslisten-Detailseite im Food-Frontend: Treffer über Groß-/Kleinschreibung und Umlaute, Suchbegriff im URL-State, Hinzufügen bei fehlendem Treffer.

## Requirements
### Requirement: Suchfeld auf der Einkaufsliste
Die Detailseite SHALL über der Eintragsliste ein Suchfeld „Auf der Liste suchen …“ zeigen, sobald die Liste mindestens einen Eintrag hat. Das Suchfeld MUST im normalen Modus und im Einkaufsmodus für alle Betrachter gelten, die die Liste sehen dürfen. Es MUST „Suche leeren“ und Escape zum Leeren bieten. Im Einkaufsmodus MUST es mindestens 48 px hoch sein.

#### Scenario: Suchfeld für angemeldete Nutzer
- **GIVEN** ein angemeldeter Besitzer öffnet eine Liste mit 30 Einträgen
- **WHEN** die Seite geladen ist
- **THEN** steht über den Abteilungen das Suchfeld „Auf der Liste suchen …“

#### Scenario: Suchfeld für Gäste
- **GIVEN** ein Gast ohne Konto ist über den Einladungslink beigetreten
- **WHEN** er die Liste öffnet
- **THEN** sieht er dasselbe Suchfeld und kann suchen

#### Scenario: Suchfeld im Einkaufsmodus
- **GIVEN** der Einkaufsmodus ist aktiv
- **WHEN** die Seite angezeigt wird
- **THEN** bleibt das Suchfeld sichtbar und ist mindestens 48 px hoch

#### Scenario: Leere Liste
- **GIVEN** die Liste hat keine Einträge
- **WHEN** die Seite geladen ist
- **THEN** wird kein Suchfeld angezeigt, nur der Leerzustand

#### Scenario: Nicht angemeldet ohne Gast-Token
- **GIVEN** ein Besucher ohne Konto und ohne Gast-Token öffnet `/shopping-lists/{id}`
- **WHEN** die Seite geladen ist
- **THEN** erscheint der Anmeldehinweis und kein Suchfeld

#### Scenario: Schrift 16 px in beiden Modi
- **WHEN** die Seite im normalen Modus oder im Einkaufsmodus angezeigt wird
- **THEN** hat die Eingabe eine Schriftgröße von 16 px, damit iOS-Safari beim Antippen nicht heranzoomt

#### Scenario: Ohne horizontales Scrollen bei 320 px
- **GIVEN** die Liste wird auf einem 320 px breiten Bildschirm angezeigt
- **WHEN** der Nutzer den Einkaufsmodus ein- und ausschaltet
- **THEN** entsteht kein horizontales Scrollen
- **AND** das Suchfeld ist im Einkaufsmodus mindestens 48 px hoch, die Checkbox mindestens 56 px

#### Scenario: Suche bleibt aus dem Verlauf heraus
- **WHEN** der Nutzer den Suchbegriff Buchstabe für Buchstabe eingibt
- **THEN** entstehen keine zusätzlichen Einträge im Browser-Verlauf
- **AND** „Zurück“ verlässt die Seite statt die Suche rückgängig zu machen

#### Scenario: Fortschritt zählt die ganze Liste
- **GIVEN** die Liste hat 3 Einträge, davon 1 abgehakt
- **WHEN** der Nutzer „brot“ sucht
- **THEN** zeigt der Fortschritt weiterhin „1 / 3 erledigt“

### Requirement: Filterung der Einträge
Bei einem Suchbegriff SHALL die Seite nur Einträge zeigen, deren Name den Begriff enthält. Der Vergleich MUST Groß- und Kleinschreibung, Umlaute, Akzente und „ß“ ignorieren und abgehakte Einträge einschließen. Abteilungen ohne Treffer MUST entfallen. Der Fortschrittsbalken MUST weiter die ganze Liste zählen. Die Suche MUST ohne API-Anfrage erfolgen.

#### Scenario: Treffer über Groß-/Kleinschreibung und Umlaute
- **GIVEN** die Liste enthält „Möhren“, „Brötchen“ und „Milch“
- **WHEN** der Nutzer „mohr“ eingibt
- **THEN** wird nur „Möhren“ angezeigt und „1 Treffer“ steht über der Liste

#### Scenario: Abgehakte Einträge werden gefunden
- **GIVEN** „Milch“ ist abgehakt
- **WHEN** der Nutzer „milch“ sucht
- **THEN** erscheint „Milch“ als abgehakter Eintrag, damit sichtbar ist, dass sie schon gekauft wurde

#### Scenario: Abteilungen ohne Treffer verschwinden
- **GIVEN** „Nudeln“ steht in „Grundnahrungsmittel“ und „Nudelsoße“ in „Konserven“
- **WHEN** der Nutzer „nudel“ sucht
- **THEN** werden nur die Abteilungen „Grundnahrungsmittel“ und „Konserven“ mit je einem Eintrag gezeigt

#### Scenario: Änderung durch eine andere Person während der Suche
- **GIVEN** der Nutzer sucht „käse“
- **WHEN** eine andere Person „Reibekäse“ einträgt und der Abgleich die Liste neu lädt
- **THEN** erscheint „Reibekäse“ ohne erneute Eingabe in den Treffern

#### Scenario: Abhaken in der Trefferliste
- **WHEN** der Nutzer in der Trefferliste „Milch“ abhakt
- **THEN** wird der Eintrag abgehakt, der Suchbegriff bleibt erhalten und der Fortschrittsbalken zählt die ganze Liste

#### Scenario: Keine zusätzliche Anfrage
- **WHEN** der Nutzer einen Suchbegriff eingibt oder ändert
- **THEN** sendet die Seite dafür keine Anfrage an `/api/shopping-lists/`

### Requirement: Suchbegriff im URL-State
Der Suchbegriff SHALL im Query-Parameter `q` der Detailseite stehen (`/shopping-lists/{id}?q=milch`). Eingaben MUST den bestehenden Verlaufseintrag ersetzen, statt pro Tastendruck einen neuen anzulegen. Beim Laden der Seite mit `q` MUST das Suchfeld vorbelegt und die Liste gefiltert sein. Leeren der Suche MUST den Parameter entfernen. Andere Query-Parameter MUST erhalten bleiben.

#### Scenario: Neuladen behält die Suche
- **GIVEN** der Nutzer hat „milch“ gesucht
- **WHEN** er die Seite neu lädt oder nach einem App-Wechsel zurückkehrt und die Seite neu geladen wird
- **THEN** steht „milch“ im Suchfeld und die Liste ist gefiltert

#### Scenario: Zurück-Navigation
- **GIVEN** der Nutzer öffnet die Liste von der Übersicht aus und tippt „mi“, dann „milch“
- **WHEN** er einmal „Zurück“ wählt
- **THEN** landet er wieder auf der Übersicht und nicht bei „mi“

#### Scenario: Suche leeren
- **WHEN** der Nutzer „Suche leeren“ wählt
- **THEN** verschwindet `q` aus der URL und alle Einträge werden gezeigt

### Requirement: Kein Treffer und Hinzufügen
Findet die Suche nichts, SHALL die Seite „Nichts gefunden für „<Suchbegriff>““ zeigen. Bearbeiter MUST „„<Suchbegriff>“ hinzufügen“ angeboten bekommen, Betrachter nur den Hinweis. Das Anlegen MUST den getrimmten Suchbegriff über den bestehenden Endpunkt speichern; der Suchbegriff bleibt danach erhalten.

#### Scenario: Fehlenden Eintrag direkt ergänzen
- **GIVEN** ein Bearbeiter sucht „senf“ und die Liste enthält keinen Senf
- **WHEN** er „„senf“ hinzufügen“ wählt
- **THEN** wird der Eintrag „senf“ angelegt und erscheint als einziger Treffer

#### Scenario: Gast ergänzt einen Eintrag
- **GIVEN** ein Gast mit gültigem Gast-Token sucht „Brot“ ohne Treffer
- **WHEN** er „„Brot“ hinzufügen“ wählt
- **THEN** wird der Eintrag mit dem Gast als Urheber angelegt

#### Scenario: Betrachter ohne Bearbeitungsrecht
- **GIVEN** ein Mitglied mit Rolle „viewer“ sucht „senf“ ohne Treffer
- **THEN** sieht es „Nichts gefunden für „senf““ und keine Hinzufügen-Schaltfläche

#### Scenario: Anlegen schlägt fehl
- **GIVEN** der Server antwortet beim Anlegen mit einem Fehler
- **WHEN** der Nutzer „„senf“ hinzufügen“ wählt
- **THEN** erscheint „Eintrag konnte nicht hinzugefügt werden“ und „senf“ bleibt im Suchfeld
