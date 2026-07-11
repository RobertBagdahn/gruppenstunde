## ADDED Requirements

### Requirement: Draft-Erstellung in Step 1
Das System SHALL einen Recipe-Draft (status=`draft`) in der Datenbank anlegen, sobald im Wizard Step 1 ein Titel, ein Rezept-Typ und mindestens eine Zutat existieren. Der Draft wird via `POST /api/recipes/` erstellt.

#### Scenario: Draft bei manueller Erstellung
- **WHEN** der Nutzer im Wizard Step 1 (Manuell-Methode) einen Titel eingibt, einen Rezept-Typ auswählt und mindestens eine Zutat hinzufügt
- **THEN** wird `POST /api/recipes/` mit `title`, `recipe_type` und `recipe_items` aufgerufen
- **THEN** der erstellte Recipe-Datensatz hat `status="draft"`, `visibility="private"`

#### Scenario: Draft existiert bereits nach KI/URL
- **WHEN** der Nutzer Step 1 nach KI-Generierung oder URL-Import betritt
- **THEN** der Draft existiert bereits in der DB (durch `POST /api/recipes/ai-create/` oder `POST /api/recipes/` nach URL-Bestätigung)
- **THEN** Änderungen an Zutaten werden via `POST/PATCH/DELETE /api/recipes/{id}/recipe-items/` persistiert

#### Scenario: Kein Draft ohne Zutaten
- **WHEN** der Nutzer in Step 1 auf "Weiter" klickt, ohne mindestens eine Zutat hinzugefügt zu haben
- **THEN** eine Validierungsmeldung erscheint: "Füge mindestens eine Zutat hinzu"
- **THEN** es wird KEIN Draft erstellt

### Requirement: Inkrementelles Speichern zwischen Wizard-Steps
Jeder "Weiter"-Klick im Wizard SHALL die Daten des aktuellen Steps via API persistieren. Step 1 speichert Zutaten via Recipe-Item-Endpoints. Step 2 speichert Metadaten via `PATCH /api/recipes/{id}/`. Step 3 speichert Steps via `PUT /api/recipes/{slug}/steps/batch`.

#### Scenario: Zutaten in Step 1 speichern
- **WHEN** der Nutzer in Step 1 auf "Weiter" klickt
- **THEN** alle ungespeicherten Zutaten-Änderungen werden via `POST/PATCH/DELETE /api/recipes/{id}/recipe-items/` persistiert
- **THEN** der Wizard navigiert zu Step 2

#### Scenario: Metadaten in Step 2 speichern
- **WHEN** der Nutzer in Step 2 auf "Weiter" klickt
- **THEN** `PATCH /api/recipes/{id}/` wird mit den Metadaten-Feldern (summary, description, difficulty, execution_time, preparation_time, tag_ids, scout_level_ids, visibility) aufgerufen
- **THEN** die existierenden `recipe_items` werden NICHT verändert

#### Scenario: Steps in Step 3 speichern
- **WHEN** der Nutzer in Step 3 auf "Weiter" klickt
- **THEN** `PUT /api/recipes/{slug}/steps/batch` wird mit dem aktuellen Stand des StepEditors aufgerufen
- **THEN** der Wizard navigiert zu Step 4

#### Scenario: Speichern schlägt fehl
- **WHEN** ein API-Call beim Speichern fehlschlägt
- **THEN** eine Fehlermeldung (Toast) wird angezeigt
- **THEN** der Nutzer bleibt im aktuellen Step und kann es erneut versuchen

### Requirement: Drafts sind unsichtbar in öffentlichen Listings
Rezepte mit `status="draft"` SHALL NICHT in öffentlichen Rezept-Listen, Suchergebnissen oder ähnlichen Rezepten erscheinen. Nur der Owner und Staff können eigene Drafts sehen. Diese Anforderung wird bereits vom Backend (`_get_visible_recipes_qs`) erfüllt und SHALL durch diesen Change nicht gebrochen werden.

#### Scenario: Draft erscheint nicht in öffentlicher Liste
- **WHEN** ein anonymer Nutzer `GET /api/recipes/` aufruft
- **THEN** Rezepte mit `status="draft"` sind NICHT in der Antwort enthalten

#### Scenario: Owner sieht eigenen Draft
- **WHEN** der Owner `GET /api/recipes/my-recipes/` aufruft
- **THEN** eigene Drafts sind in der Antwort enthalten

#### Scenario: Draft erscheint nicht in "Ähnliche Rezepte"
- **WHEN** `GET /api/recipes/{id}/similar/` aufgerufen wird
- **THEN** Rezepte mit `status="draft"` sind NICHT in den Ergebnissen

### Requirement: PATCH /api/recipes/{id}/ löscht keine Zutaten bei Metadaten-Update
Der `PATCH /api/recipes/{id}/` Endpoint SHALL `recipe_items` nur dann ersetzen (delete-all + bulk-create), wenn das Feld `recipe_items` explizit im Request-Body enthalten ist. Wenn `recipe_items` nicht gesendet wird, SHALL der Endpoint nur die anderen Felder aktualisieren und die existierenden RecipeItems unverändert lassen.

#### Scenario: Metadaten-Update ohne recipe_items
- **WHEN** `PATCH /api/recipes/{id}/` mit `{"description": "Neue Beschreibung"}` aufgerufen wird
- **THEN** die Description wird aktualisiert
- **THEN** die existierenden RecipeItems bleiben erhalten

#### Scenario: Metadaten-Update mit recipe_items
- **WHEN** `PATCH /api/recipes/{id}/` mit `{"description": "...", "recipe_items": [...]}` aufgerufen wird
- **THEN** die Description wird aktualisiert
- **THEN** die existierenden RecipeItems werden gelöscht und durch die neuen ersetzt (bestehendes Verhalten)

### Requirement: Draft-Status-Lifecycle
Ein Rezept durchläuft folgende Status-Übergänge: `draft` (nach Wizard Step 1) → `submitted` (wenn visibility=public und "Fertigstellen" geklickt) → `approved` (nach Admin-Review). Bei `visibility=private` oder `visibility=group` bleibt der Status `draft` auch nach "Fertigstellen".

#### Scenario: Öffentliches Rezept wird eingereicht
- **WHEN** der Nutzer in Step 4 "Fertigstellen" klickt und `visibility="public"` gesetzt ist
- **THEN** der Status wird auf `submitted` gesetzt
- **THEN** das Rezept erscheint NICHT sofort öffentlich, sondern wartet auf Admin-Approval

#### Scenario: Privates Rezept wird fertiggestellt
- **WHEN** der Nutzer in Step 4 "Fertigstellen" klickt und `visibility="private"` gesetzt ist
- **THEN** der Status bleibt `draft`
- **THEN** das Rezept ist nur für den Owner sichtbar

### Requirement: Wizard-State bei Seiten-Verlassen
Wenn der Nutzer den Wizard verlässt (Browser-Tab schließen, zu anderer Seite navigieren), SHALL der teilweise erstellte Draft in der DB erhalten bleiben. Beim erneuten Aufruf von `/recipes/new` startet ein neuer Wizard (neuer Draft).

#### Scenario: Browser-Tab geschlossen
- **WHEN** der Nutzer den Browser-Tab während des Wizards schließt
- **THEN** bereits gespeicherte Drafts bleiben in der DB
- **THEN** der Nutzer kann sie später über "Meine Rezepte" finden und weiter bearbeiten

#### Scenario: Neuer Wizard startet frisch
- **WHEN** der Nutzer `/recipes/new` aufruft, während ein alter Draft existiert
- **THEN** ein neuer, leerer Wizard wird gestartet
- **THEN** der alte Draft wird nicht gelöscht
