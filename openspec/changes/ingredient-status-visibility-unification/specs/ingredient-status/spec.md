## ADDED Requirements

### Requirement: Erlaubte Zutat-Status
Eine Zutat MUST genau einen der Status `draft` oder `verified` haben. Die Datenbank SHALL andere Werte per CheckConstraint ablehnen. Pydantic-Ein- und -Ausgabeschemas MUST den Status als `Literal["draft", "verified"]` typisieren, das Zod-Schema als `z.enum(['draft', 'verified'])`.

#### Scenario: Ungültiger Status per API
- **GIVEN** ein Staff-Nutzer ist angemeldet
- **WHEN** er `PATCH /api/ingredients/{slug}/` mit `status: "approved"` sendet
- **THEN** antwortet die API mit HTTP 422 und der Status bleibt unverändert

#### Scenario: Ungültiger Status direkt in der Datenbank
- **WHEN** ein Datensatz mit `status="user_content"` gespeichert werden soll
- **THEN** SHALL die Datenbank den Schreibvorgang mit einer IntegrityError ablehnen

#### Scenario: Neue Zutat ignoriert übergebenen Status
- **GIVEN** ein angemeldeter Nutzer (Staff oder Nicht-Staff)
- **WHEN** er `POST /api/ingredients/` mit `status: "verified"` sendet
- **THEN** wird die Zutat mit `status="draft"` angelegt

### Requirement: Verifizieren nur durch Staff
Nur Staff-Nutzer SHALL eine Zutat auf `verified` setzen oder von `verified` auf `draft` zurücksetzen. Die API MUST je Zutat ein Feld `can_verify` liefern, das genau diese Berechtigung abbildet; das Frontend MUST die Verifizierungs-UI ausschließlich daran koppeln.

#### Scenario: Nicht-Staff versucht zu verifizieren
- **GIVEN** ein angemeldeter Nicht-Staff-Nutzer ist Owner einer Entwurfs-Zutat
- **WHEN** er `PATCH /api/ingredients/{slug}/` mit `status: "verified"` sendet
- **THEN** antwortet die API mit HTTP 403 und der Status bleibt `draft`

#### Scenario: Staff verifiziert
- **GIVEN** ein Staff-Nutzer ist angemeldet
- **WHEN** er `PATCH /api/ingredients/{slug}/` mit `status: "verified"` sendet
- **THEN** wird der Status auf `verified` gesetzt

#### Scenario: Anonymer Nutzer ändert Status
- **GIVEN** kein Nutzer ist angemeldet
- **WHEN** `PATCH /api/ingredients/{slug}/` gesendet wird
- **THEN** antwortet die API mit HTTP 403 und nichts wird geändert

#### Scenario: can_verify im Detail
- **WHEN** ein Nicht-Staff-Nutzer `GET /api/ingredients/{slug}/` abruft
- **THEN** enthält die Antwort `can_verify: false`
- **AND** für einen Staff-Nutzer `can_verify: true`

### Requirement: Verifizierte Nutzer-Zutaten werden öffentlich
Wird eine Zutat mit gesetztem Owner verifiziert, MUST das System `visibility="public"` setzen; der Owner bleibt erhalten. Der Wert `public` SHALL ausschließlich über die Verifizierung entstehen; die Datenbank MUST per CheckConstraint sicherstellen, dass `visibility="public"` nur mit `status="verified"` vorkommt. Wird eine solche Zutat auf `draft` zurückgesetzt, MUST `visibility` auf `private` zurückfallen.

#### Scenario: Staff verifiziert Nutzer-Zutat
- **GIVEN** eine Zutat mit `owner=Nutzer A`, `visibility="private"`, `status="draft"`
- **WHEN** ein Staff-Nutzer sie verifiziert
- **THEN** hat sie `status="verified"`, `visibility="public"` und weiterhin `owner=Nutzer A`
- **AND** ein anonymer Nutzer erhält auf `GET /api/ingredients/{slug}/` HTTP 200

#### Scenario: Owner setzt public selbst
- **GIVEN** Nutzer A ist Owner einer Entwurfs-Zutat
- **WHEN** er `PATCH` mit `visibility: "public"` sendet
- **THEN** antwortet die API mit HTTP 422

#### Scenario: Zurücksetzen auf Entwurf
- **WHEN** Staff eine verifizierte Nutzer-Zutat auf `draft` setzt
- **THEN** hat sie `visibility="private"`

### Requirement: Erzeugungspfade legen Entwürfe mit Ersteller an
Jeder Erzeugungspfad (manuelles Anlegen, Rezept-Erstellung mit Zutatenprüfung, Rezept-Items, URL-Import, Cooklang-Import, KI-Zutaten, KI-Vorschläge) MUST neue Zutaten mit `status="draft"` anlegen und `created_by` auf den auslösenden Nutzer setzen, sofern einer angemeldet ist. Management-Befehle ohne Nutzerkontext MUST `created_by=NULL` setzen.

#### Scenario: Rezept-Import legt neue Zutat an
- **GIVEN** Nutzer A ist angemeldet
- **WHEN** er ein Rezept mit einer unbekannten Zutat speichert
- **THEN** hat die neue Zutat `status="draft"` und `created_by=A`
- **AND** erscheint sie für A in der Zutatensuche

#### Scenario: KI-Vorschlag legt Zutat an
- **WHEN** der KI-Vorschlagsdienst im Kontext von Nutzer A eine neue Zutat erzeugt
- **THEN** hat die Zutat `status="draft"` und `created_by=A`

### Requirement: Migration bestehender Status
Eine Datenmigration MUST vor den CheckConstraints laufen und bestehende Werte überführen: `user_content` → `draft`, `approved` → `draft`. Die Migration SHALL keine Datensätze löschen.

#### Scenario: Altwert approved
- **WHEN** die Migration auf eine Zutat mit `status="approved"` trifft
- **THEN** hat sie danach `status="draft"` und ist nicht gelöscht

#### Scenario: Altwert user_content
- **WHEN** die Migration auf eine Zutat mit `status="user_content"` trifft
- **THEN** hat sie danach `status="draft"`

### Requirement: Verifizierung von Zutaten in freigegebenen Rezepten
Das System SHALL einen Management-Befehl `verify_ingredients_in_approved_recipes` bereitstellen. Betroffen sind System-Zutaten (`owner=None`) mit `status="draft"`, nicht gelöscht, die in mindestens einem Rezept mit `status="approved"` verwendet werden. Ohne `--apply` MUST der Befehl nur berichten: Anzahl und Lückenliste (fehlende kcal, fehlender Preis, fehlende Abteilung). Mit `--apply` SHALL er diese Zutaten einzeln per `save()` auf `verified` setzen, sodass je Zutat ein Audit-Log-Eintrag mit `changed_by=NULL` entsteht. Der Befehl MUST idempotent sein.

#### Scenario: Trockenlauf
- **WHEN** der Befehl ohne `--apply` läuft
- **THEN** gibt er Anzahl und Lückenliste aus und ändert keine Daten

#### Scenario: Anwenden
- **WHEN** der Befehl mit `--apply` läuft
- **THEN** haben alle betroffenen Zutaten `status="verified"` und je einen Audit-Log-Eintrag für `status`
- **AND** ein zweiter Lauf meldet 0 betroffene Zutaten

#### Scenario: Zutat eines Nutzers
- **WHEN** eine Entwurfs-Zutat einen Owner hat und in einem freigegebenen Rezept verwendet wird
- **THEN** wird sie NICHT verifiziert, sondern nur im Bericht aufgeführt

### Requirement: Kein öffentlicher Debug-Endpunkt
Die API MUST keinen Endpunkt `GET /api/supply/breakfast-catalog/debug/` anbieten.

#### Scenario: Aufruf des alten Debug-Pfads
- **WHEN** ein anonymer oder angemeldeter Nutzer `GET /api/supply/breakfast-catalog/debug/` aufruft
- **THEN** antwortet die API mit HTTP 404
