# open-access Specification

## Purpose
TBD - created by archiving change social-login-open-access. Update Purpose after archive.
## Requirements
### Requirement: Anonymer Lesezugriff auf alle öffentlichen Inhalte

Nicht angemeldete Besucher SHALL alle öffentlichen Inhalte und die davon abgeleiteten Ansichten lesen können, ohne HTTP 401 oder 403 zu erhalten. Sichtbarkeit SHALL ausschließlich über die bestehenden Policies bestimmt werden (`content.services.food_access`, Content-Status `approved`, `visibility="public"`). Ein Lese-Endpunkt SHALL für eine nicht sichtbare Ressource HTTP 404 liefern, nicht 401. Listen SHALL paginiert bleiben (`page=1`, `page_size=20`, erlaubt 10/20/50). Das umfasst mindestens:

- Gruppenstunden, Spiele, Blogs und Rezepte im Status `approved` (Liste, Detail, Suche)
- verifizierte System-Zutaten und öffentliche Nutzer-Zutaten (Liste, Detail, Suche, Statistik, Vorschläge über `GET /api/ingredients/suggest/`)
- Materialien (Liste und Detail)
- Essenspläne mit `visibility="public"` samt Kosten, Nährwerten, Plan-Check, Kochplan und PDF-Exporten
- Rezept-PDF-Export öffentlicher Rezepte
- öffentliche Nutzerprofile und öffentliche Packlisten per Freigabelink

#### Scenario: Anonymer Besucher öffnet einen öffentlichen Essensplan
- **GIVEN** ein Essensplan mit `visibility="public"`
- **WHEN** ein nicht angemeldeter Besucher `GET /api/meal-plans/{id}/` aufruft
- **THEN** antwortet das System mit HTTP 200, `can_edit: false` und `can_delete: false`

#### Scenario: Anonymer Besucher öffnet einen privaten Essensplan
- **WHEN** ein nicht angemeldeter Besucher `GET /api/meal-plans/{id}/` für einen privaten Plan aufruft
- **THEN** antwortet das System mit HTTP 404

#### Scenario: Anonymer Besucher lädt ein Rezept-PDF
- **WHEN** ein nicht angemeldeter Besucher `GET /api/recipes/by-slug/{slug}/export/pdf/` für ein öffentliches Rezept aufruft
- **THEN** antwortet das System mit HTTP 200 und einem PDF

#### Scenario: Anonyme Essenspläne-Liste zeigt nur öffentliche Pläne
- **WHEN** ein nicht angemeldeter Besucher `GET /api/meal-plans/?page=1&page_size=20` aufruft
- **THEN** enthält `items` nur Pläne mit `visibility="public"`
- **AND** die Antwort hat das Format `{ items, total, page, page_size, total_pages }`

#### Scenario: Angemeldeter Nutzer sieht zusätzlich eigene Inhalte
- **WHEN** eine angemeldete Nutzerin dieselbe Liste aufruft
- **THEN** enthält `items` zusätzlich ihre eigenen, geteilten und Gruppen-Pläne gemäß Policy

### Requirement: Schreibende Endpunkte verlangen Anmeldung

Jeder schreibende Endpunkt (POST, PUT, PATCH, DELETE), der Daten speichert, SHALL für nicht angemeldete Clients HTTP 401 mit `code: "auth_required"` liefern und SHALL keine Daten verändern. Ausgenommen sind die in `ai-budget` definierten Vorschau-Endpunkte ohne Schreibzugriff sowie Auth-Endpunkte.

#### Scenario: Anonymer Besucher speichert ein Rezept
- **WHEN** ein nicht angemeldeter Client `POST /api/recipes/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `{ detail: "Bitte melde dich an, um das zu speichern.", code: "auth_required" }`
- **AND** es wird kein Rezept angelegt

### Requirement: Ausprobieren ohne Speichern

Erstell- und Bearbeitungsoberflächen SHALL für nicht angemeldete Besucher nutzbar sein, statt durch ein seitenweites Gate blockiert zu werden. Das gilt mindestens für: Rezept anlegen (inklusive „Rezept erkennen“), Zutat anlegen (inklusive „Zutat erkennen“), Essensplan-Assistent, Einkaufsliste anlegen, Packlisten-Assistent und Gruppenstunde, Spiel oder Blog anlegen. Die Speichern-Aktion SHALL sichtbar und aktiv sein und für Besucher den Anmeldedialog öffnen. Seiten, die nur persönliche Daten zeigen („Meine Rezepte“, „Meine Einkaufslisten“, „Meine Essenspläne“), SHALL für Besucher einen erklärenden Leerzustand mit Anmelde-Button zeigen.

#### Scenario: Besucher füllt das Rezeptformular aus
- **GIVEN** ein nicht angemeldeter Besucher auf `/recipes/new` (frontend-food)
- **WHEN** er Titel, Zutaten und Schritte eingibt
- **THEN** funktionieren alle Eingaben, Zutatensuche und Nährwertvorschau wie für angemeldete Nutzer
- **AND** der Button „Speichern“ ist sichtbar

#### Scenario: Besucher klickt auf Speichern
- **WHEN** der Besucher „Speichern“ klickt
- **THEN** öffnet sich der Anmeldedialog mit dem Hinweis „Melde dich an, um dein Rezept zu speichern. Deine Eingaben bleiben erhalten.“
- **AND** es wird kein API-Schreibaufruf abgesetzt

#### Scenario: „Meine Rezepte“ als Besucher
- **WHEN** ein Besucher `/recipes/my-recipes` öffnet
- **THEN** sieht er eine Erklärung, was er nach der Anmeldung hier findet, und einen Button „Anmelden“

### Requirement: Entwurfssicherung über den Login hinweg

Bevor der Anmeldedialog auf einen OAuth-Anbieter weiterleitet, SHALL das Frontend den aktuellen Formularzustand unter einem stabilen Schlüssel (z. B. `draft:recipe:new`) im `localStorage` speichern. Nach dem Rücksprung SHALL die Seite den Entwurf wiederherstellen und die Frage „Willkommen zurück! Soll dein Entwurf jetzt gespeichert werden?“ mit den Aktionen „Jetzt speichern“ und „Weiter bearbeiten“ anzeigen. Entwürfe SHALL nach erfolgreichem Speichern oder nach 7 Tagen gelöscht werden. Entwürfe SHALL keine Dateien oder Bilder enthalten; ein Bild SHALL nach dem Login erneut gewählt werden, mit einem entsprechenden Hinweis.

#### Scenario: Entwurf übersteht den Login
- **GIVEN** ein Besucher hat ein Rezept ausgefüllt und „Speichern“ geklickt
- **WHEN** er sich mit Google anmeldet und auf `/recipes/new` zurückkehrt
- **THEN** ist das Formular mit seinen Eingaben gefüllt
- **AND** die Frage „Soll dein Entwurf jetzt gespeichert werden?“ erscheint

#### Scenario: Entwurf wird nach dem Speichern entfernt
- **WHEN** der wiederhergestellte Entwurf erfolgreich gespeichert wurde
- **THEN** wird der zugehörige `localStorage`-Eintrag gelöscht

### Requirement: Anmeldedialog

Beide Frontends SHALL einen wiederverwendbaren Anmeldedialog bereitstellen. Er enthält: einen kontextbezogenen Grund (z. B. „…um deinen Essensplan zu speichern“), die Buttons der konfigurierten Anbieter, eine kurze Liste der Vorteile („Speichern“, „Mit deiner Gruppe teilen“, „KI-Assistent“) und einen Link zu Datenschutz. Der Dialog SHALL ab 320 px Breite nutzbar sein und per Tastatur bedienbar (Fokusfalle, Escape schließt).

#### Scenario: Dialog auf dem Smartphone
- **WHEN** der Dialog auf einem 320 px breiten Bildschirm geöffnet wird
- **THEN** sind alle Anbieter-Buttons ohne horizontales Scrollen vollständig sichtbar

### Requirement: Erklärende Hinweise für anmeldepflichtige Funktionen

Anmeldepflichtige Funktionen (z. B. Teilen, Kommentieren, Favoriten, KI-Funktionen außerhalb der anonymen Allowlist) SHALL für Besucher sichtbar bleiben und mit einem Schloss-Symbol sowie einem Tooltip bzw. einer Kurzbeschreibung erklären, was sie tun und dass sie nach kostenloser Anmeldung verfügbar sind. Ein Klick SHALL den Anmeldedialog öffnen.

#### Scenario: Besucher klickt auf „Mit KI ergänzen“
- **WHEN** ein Besucher auf einer Rezeptseite „Mit KI ergänzen“ klickt
- **THEN** öffnet sich der Anmeldedialog mit „Der KI-Assistent ergänzt fehlende Zutaten und Nährwerte. Nach der kostenlosen Anmeldung steht er dir zur Verfügung.“
