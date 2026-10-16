## ADDED Requirements

### Requirement: Review-Zeilen tragen den Zutaten-Slug
Jede Review-Zeile mit gewählter Zutat MUST `selected_ingredient_slug` gefüllt liefern, auch bei KI-Vorschlägen und bei Vorschlägen für bestehende Rezepte.

#### Scenario: KI-Vorschlag
- **WHEN** der KI-Import eine Zeile mit zugeordneter Zutat zurückgibt
- **THEN** ist `selected_ingredient_slug` der Slug dieser Zutat

### Requirement: Dialog „Menge und Portion“ öffnet verlässlich
Ein Klick auf „Menge und Portion“ MUST den Dialog immer öffnen. Während die Portionen laden, SHALL ein Skeleton erscheinen; bei Ladefehler eine deutsche Meldung mit „Erneut versuchen“.

#### Scenario: Portionen laden langsam
- **WHEN** der Nutzer auf „Menge und Portion“ klickt, während die Portionen laden
- **THEN** öffnet der Dialog mit Skeleton und zeigt danach die Portionen

#### Scenario: Ladefehler
- **WHEN** das Laden der Portionen fehlschlägt
- **THEN** zeigt der Dialog eine Fehlermeldung und „Erneut versuchen“

### Requirement: Slug wird beim Auswählen weitergereicht
Der Dialog „Unbekannte Zutat“ MUST den Slug der gewählten Zutat an den Aufrufer übergeben.

#### Scenario: Auswahl im Unbekannte-Zutat-Dialog
- **WHEN** der Nutzer einen Vorschlag wählt
- **THEN** erhält die Review-Zeile ID, Name und Slug der Zutat
