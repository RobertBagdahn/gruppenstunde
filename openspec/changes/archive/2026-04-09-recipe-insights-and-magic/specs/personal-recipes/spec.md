## ADDED Requirements

### Requirement: Rezept als persönliche Kopie speichern

Das System MUSS es authentifizierten Usern ermöglichen, ein (ggf. modifiziertes) Rezept als persönliche Kopie zu speichern.

#### Scenario: Modifiziertes Rezept speichern
- **WHEN** ein User auf „Als persönliches Rezept speichern" klickt
- **THEN** MUSS ein POST-Request an `/api/recipes/{recipe_id}/fork/` gesendet werden mit den modifizierten RecipeItems
- **THEN** MUSS das Backend eine Kopie des Rezepts erstellen mit `owner=current_user`, `forked_from=original_recipe`, `visibility=private`
- **THEN** MÜSSEN alle RecipeItems des Originals kopiert und mit den modifizierten Mengen/Zutaten überschrieben werden
- **THEN** MUSS der User zur neuen persönlichen Rezeptseite weitergeleitet werden

#### Scenario: Unmodifiziertes Rezept speichern
- **WHEN** ein User ein Rezept ohne Änderungen als persönliches Rezept speichern möchte
- **THEN** MUSS das System eine 1:1-Kopie erstellen mit `forked_from`-Referenz zum Original
- **THEN** MUSS ein Hinweis angezeigt werden: „Rezept wurde als persönliche Kopie gespeichert"

#### Scenario: Nicht-authentifizierter User
- **WHEN** ein nicht-authentifizierter User „Als persönliches Rezept speichern" klickt
- **THEN** MUSS das System zum Login weiterleiten mit Redirect zurück zur Rezeptseite

### Requirement: Persönliche Rezepte Sichtbarkeit

Das Recipe-Modell MUSS um Felder für Ownership und Sichtbarkeit erweitert werden.

#### Scenario: Recipe-Modell-Erweiterung
- **WHEN** ein neues Rezept mit `owner` erstellt wird
- **THEN** MUSS das Rezept die Felder `owner` (FK zu User, nullable), `forked_from` (FK zu Recipe, nullable, self-referential), und `visibility` (CharField: private/group/public, default=private) haben

#### Scenario: Standard-Sichtbarkeit
- **WHEN** ein persönliches Rezept erstellt wird
- **THEN** MUSS die Standard-Sichtbarkeit `private` sein
- **THEN** MUSS das Rezept nur für den Owner sichtbar sein in Listen und Suche

### Requirement: Sichtbarkeit ändern

Das System MUSS es dem Owner ermöglichen, die Sichtbarkeit seines persönlichen Rezepts zu ändern.

#### Scenario: Rezept öffentlich setzen
- **WHEN** ein Owner die Sichtbarkeit auf `public` setzt
- **THEN** MUSS das Rezept den `status=submitted` erhalten (Moderation nötig)
- **THEN** MUSS das Rezept erst nach Freigabe (`status=approved`) für andere User sichtbar sein

#### Scenario: Rezept für Gruppe freigeben
- **WHEN** ein Owner die Sichtbarkeit auf `group` setzt
- **THEN** MUSS das Rezept für alle Mitglieder der Gruppen des Owners sichtbar sein
- **THEN** MUSS kein Moderations-Workflow nötig sein

#### Scenario: Rezept privat setzen
- **WHEN** ein Owner die Sichtbarkeit auf `private` setzt
- **THEN** MUSS das Rezept sofort aus allen Listen und Suchen anderer User verschwinden

### Requirement: Rezept-Kategorisierung und Badges

Das System MUSS Rezepte visuell nach ihrer Herkunft kategorisieren.

#### Scenario: Verified-by-Inspi Badge
- **WHEN** ein Rezept `owner=null` und `status=approved` hat
- **THEN** MUSS ein grüner „Inspi-verifiziert" Badge angezeigt werden (in Listen und Detailseite)

#### Scenario: Community-Rezept Badge
- **WHEN** ein Rezept `owner != null`, `visibility=public` und `status=approved` hat
- **THEN** MUSS ein blauer „Community" Badge angezeigt werden

#### Scenario: Persönliches Rezept Badge
- **WHEN** ein Rezept `owner=current_user` hat
- **THEN** MUSS ein gelber „Mein Rezept" Badge angezeigt werden mit dem Hinweis „Basiert auf [Original-Name]" wenn `forked_from` gesetzt ist

### Requirement: Persönliche Rezepte Liste

Das System MUSS eine eigene Seite für persönliche Rezepte bereitstellen.

#### Scenario: Persönliche Rezepte anzeigen
- **WHEN** ein authentifizierter User `/recipes/my-recipes/` aufruft
- **THEN** MUSS eine paginierte Liste aller Rezepte mit `owner=current_user` angezeigt werden
- **THEN** MUSS die Liste nach `created_at` absteigend sortiert sein

#### Scenario: API-Endpunkt für persönliche Rezepte
- **WHEN** ein GET-Request an `/api/recipes/my-recipes/` gesendet wird
- **THEN** MUSS das System nur Rezepte zurückgeben wo `owner=current_user`
- **THEN** MUSS die Response das Standard-Paginierungsformat verwenden: `{ items, total, page, page_size, total_pages }`

#### Scenario: Nicht-authentifizierter Zugriff
- **WHEN** ein nicht-authentifizierter User `/recipes/my-recipes/` aufruft
- **THEN** MUSS ein 401-Statuscode zurückgegeben werden

### Requirement: Rezept-Filter Erweiterung

Die Rezeptliste MUSS um Filter für Rezept-Herkunft erweitert werden.

#### Scenario: Nach Herkunft filtern
- **WHEN** ein User den Filter „Herkunft" auf der Rezeptliste nutzt
- **THEN** MUSS er zwischen „Alle", „Inspi-verifiziert", „Community" und „Meine Rezepte" wählen können
- **THEN** MUSS der Filter als URL-Parameter `origin` gesetzt werden (Werte: `all`, `verified`, `community`, `mine`)
