## ADDED Requirements

### Requirement: Schritte werden über IDs adressiert
Der Rezept-Wizard SHALL seine Schritte über feste IDs adressieren: `input`, `basis`, `review`, `ingredients`, `materials`, `preparation`, `preview`. Der Schritt `review` SHALL nur sichtbar sein, wenn die Analyse mindestens eine Zutatenzeile geliefert hat; alle anderen Schritte sind immer sichtbar. Die Fortschrittsanzeige SHALL nur sichtbare Schritte zeigen.

#### Scenario: KI liefert Zutaten
- **WHEN** die Analyse 8 Zutatenzeilen liefert
- **THEN** zeigt die Fortschrittsanzeige Eingabe, Basis & Portionen, Zutaten prüfen, Zutaten, Materialien, Zubereitung, Vorschau

#### Scenario: Manueller Start
- **WHEN** der Nutzer ohne KI beginnt
- **THEN** fehlt der Schritt „Zutaten prüfen“ in der Fortschrittsanzeige

### Requirement: Genau ein Anlegepunkt für das Rezept
Das Rezept SHALL genau einmal serverseitig angelegt werden, und zwar beim Verlassen des letzten sichtbaren Schritts vor `ingredients` (`review`, falls sichtbar, sonst `basis`). Das Anlegen MUST idempotent sein (bestehender `idempotency_key`), damit ein Doppelklick kein zweites Rezept erzeugt.

#### Scenario: KI ohne Zutaten
- **GIVEN** die Analyse liefert einen Titel, aber keine Zutaten
- **WHEN** der Nutzer den Schritt Basis & Portionen verlässt
- **THEN** wird ein Rezept-Entwurf ohne Zutaten angelegt und der Schritt Zutaten geöffnet

#### Scenario: Doppelklick auf Weiter
- **WHEN** der Nutzer zweimal schnell auf „Weiter“ im Schritt `review` klickt
- **THEN** existiert genau ein neues Rezept

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer `/recipes/new` aufruft
- **THEN** wird er zur Anmeldung geleitet und es wird kein Entwurf angelegt

### Requirement: Entwurf und Schritt in der URL
Nach dem Anlegen SHALL der Wizard `draft=<recipeId>` und `step=<stepId>` in die URL von `/recipes/new` schreiben und bei jedem Schrittwechsel `step` aktualisieren (mit History-Eintrag). Vor dem Anlegen SHALL nur `step` in der URL stehen.

#### Scenario: URL nach dem Anlegen
- **WHEN** das Rezept mit ID 512 beim Verlassen von `review` angelegt wurde
- **THEN** lautet die URL `/recipes/new?draft=512&step=ingredients`

#### Scenario: Browser-Zurück
- **WHEN** der Nutzer in `preparation` den Browser-Zurück-Button nutzt
- **THEN** zeigt der Wizard den Schritt `materials` desselben Entwurfs

### Requirement: Wiederaufnahme nach Neuladen
Enthält die URL `draft`, SHALL der Wizard das Rezept vom Server laden und im angegebenen Schritt fortsetzen; Titel, Typ, Personenzahl (`source_servings`), Zutaten, Materialien und Schritte MUST aus dem Server-Zustand kommen. Ist `step` ein Schritt vor dem Anlegepunkt oder ungültig, SHALL der Wizard `ingredients` öffnen. Gehört der Entwurf nicht dem Nutzer oder existiert er nicht, SHALL der Wizard die Meldung „Entwurf nicht gefunden“ zeigen und einen neuen Wizard anbieten.

#### Scenario: Neuladen im Zutatenschritt
- **GIVEN** der Nutzer ist in `/recipes/new?draft=512&step=ingredients` und hat 3 Zutaten ergänzt
- **WHEN** er die Seite neu lädt
- **THEN** zeigt der Wizard den Schritt Zutaten mit allen gespeicherten Zutaten und der Original-Personenzahl

#### Scenario: Fremder Entwurf
- **WHEN** ein Nutzer `/recipes/new?draft=512` eines anderen Nutzers öffnet
- **THEN** sieht er „Entwurf nicht gefunden“ und keine Daten des Entwurfs

#### Scenario: Neuladen vor dem Anlegen
- **WHEN** der Nutzer im Schritt `basis` (noch ohne Entwurf) neu lädt
- **THEN** warnt der Browser vor dem Verlassen (bestehende Warnung), und nach dem Neuladen beginnt der Wizard bei `input`

### Requirement: Einheitliches Speichern je Schritt
Jeder Schritt SHALL seine Speicherlogik über einen gemeinsamen Registrierungsmechanismus bereitstellen (`onLeave`), den der Wizard beim Weiter- und Zurück-Navigieren aufruft. Liefert `onLeave` `false`, MUST der Wizard im Schritt bleiben. Fehler MUST als ein einzelner Fehler-Toast erscheinen; ein Erfolgs-Toast DARF NICHT gleichzeitig mit einem Fehler-Toast angezeigt werden.

#### Scenario: Validierungsfehler im Schritt Basis
- **WHEN** der Nutzer im Schritt `basis` ohne Titel auf „Weiter“ klickt
- **THEN** bleibt der Wizard in `basis` und zeigt „Bitte gib einen Titel ein.“
