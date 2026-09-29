# account-management Specification

## Purpose
TBD - created by archiving change social-login-open-access. Update Purpose after archive.
## Requirements
### Requirement: Benutzermenü

Beide Frontends SHALL im Header für Besucher einen Button „Anmelden“ zeigen, der den Anmeldedialog öffnet (Grund: allgemein). Für angemeldete Nutzer SHALL ein Avatar-Menü erscheinen mit: Anzeigename, KI-Kontingent-Balken, „Mein Profil“, „Meine Inhalte“, „Meine Gruppen“, „Konto & Anmeldung“ und „Abmelden“. Für Staff SHALL zusätzlich „Administration“ erscheinen. Food-spezifische Einträge SHALL nur in `frontend-food/` erscheinen.

#### Scenario: Besucher sieht den Anmelden-Button
- **WHEN** ein nicht angemeldeter Besucher eine Seite öffnet
- **THEN** zeigt der Header „Anmelden“ statt eines Avatars

#### Scenario: Staff sieht den Admin-Eintrag
- **WHEN** ein Staff-Nutzer das Avatar-Menü öffnet
- **THEN** enthält es den Eintrag „Administration“

### Requirement: Kontobereich „Konto & Anmeldung“

Der Profilbereich SHALL eine Seite „Konto & Anmeldung“ (`/profile/account`) bereitstellen mit:

- Liste der verknüpften Anbieter (`GET /api/auth/connections/` → `[{ id, provider, provider_name, email, connected_at, last_login }]`)
- „Weiteren Anbieter verbinden“ für jeden konfigurierten, noch nicht verknüpften Anbieter (Allauth-Connect-Flow mit Rücksprung auf `/profile/account`)
- „Trennen“ (`DELETE /api/auth/connections/{id}/`), nur wenn mindestens ein weiterer Anbieter verknüpft bleibt
- KI-Kontingent
- „Abmelden“
- Link zu Datenschutz (Datenübersicht, Export, Konto löschen)

Die Pydantic-Schemas `SocialConnectionOut` und die Zod-Schemas `socialConnectionSchema` SHALL synchron sein.

#### Scenario: Zweiten Anbieter verbinden
- **GIVEN** ein Nutzer ist nur mit Google verknüpft
- **WHEN** er „Mit Microsoft verbinden“ wählt und zustimmt
- **THEN** zeigt `/profile/account` Google und Microsoft

#### Scenario: Letzten Anbieter trennen wird verhindert
- **GIVEN** ein Nutzer hat nur Google verknüpft
- **WHEN** er `DELETE /api/auth/connections/{id}/` aufruft
- **THEN** antwortet das System mit HTTP 400, `code: "last_connection"` und `detail` „Du brauchst mindestens eine Anmeldemöglichkeit. Verbinde erst einen weiteren Anbieter.“
- **AND** im Frontend ist der Button „Trennen“ in diesem Fall deaktiviert, mit diesem Hinweis

#### Scenario: Anonymer Zugriff auf Verknüpfungen
- **WHEN** ein nicht angemeldeter Client `GET /api/auth/connections/` aufruft
- **THEN** antwortet das System mit HTTP 401 und `code: "auth_required"`

#### Scenario: Fremde Verknüpfung trennen
- **WHEN** ein Nutzer `DELETE /api/auth/connections/{id}/` mit der ID eines fremden Social-Accounts aufruft
- **THEN** antwortet das System mit HTTP 404

### Requirement: Onboarding nach dem ersten Login

Nach der ersten Anmeldung (`needs_onboarding: true`) SHALL das Frontend einen kurzen, überspringbaren Dialog zeigen: Vor- und Nachname (vorbelegt vom Anbieter), optionaler Pfadfindername, optional „Gruppe beitreten“ (Beitrittscode oder Suche) und eine Kurzinfo zu den nun verfügbaren Funktionen inklusive KI-Kontingent. Abschließen oder Überspringen SHALL `UserProfile.onboarded_at` setzen (`POST /api/profile/me/onboarding/`). Danach SHALL der Nutzer auf der ursprünglichen Seite bleiben und ein ggf. gesicherter Entwurf angeboten werden.

#### Scenario: Neuer Nutzer überspringt das Onboarding
- **GIVEN** ein Nutzer hat sich erstmals angemeldet
- **WHEN** er „Später“ wählt
- **THEN** wird `onboarded_at` gesetzt und der Dialog erscheint nicht erneut

#### Scenario: Onboarding mit Gruppenbeitritt
- **WHEN** ein neuer Nutzer im Onboarding einen gültigen Beitrittscode eingibt
- **THEN** wird er gemäß den bestehenden Gruppenregeln Mitglied oder stellt eine Beitrittsanfrage

### Requirement: Admin-Nutzerdetail mit Anmelde- und KI-Informationen

Die Admin-Nutzerdetailseite (Haupt-Frontend) und `GET /api/admin/users/{user_id}/` SHALL zusätzlich enthalten: verknüpfte Anbieter, letzten Login, KI-Verbrauch heute und in den letzten 30 Tagen (EUR) sowie das aktuelle Tageslimit. Die Admin-Nutzerliste SHALL nach Anbieter filterbar sein (`?provider=google`, paginiert mit `page` und `page_size`). Nur Staff SHALL Zugriff haben.

#### Scenario: Staff prüft den KI-Verbrauch eines Nutzers
- **WHEN** ein Staff-Nutzer die Detailseite eines Nutzers öffnet
- **THEN** sieht er „KI heute: 0,12 € von 0,30 €“ und die verknüpften Anbieter

#### Scenario: Nicht-Staff greift auf das Admin-Nutzerdetail zu
- **WHEN** ein angemeldeter Nicht-Staff `GET /api/admin/users/{user_id}/` aufruft
- **THEN** antwortet das System mit HTTP 403 und `code: "staff_required"`

### Requirement: Kompatibilität mit dem bestehenden Rechtesystem

Social Login SHALL ausschließlich die Identität festlegen. Rollen und Rechte SHALL unverändert aus `User.is_staff`/`is_superuser`, `GroupMembership` (member/admin), `ContentCollaborator` und der zentralen Food-Policy stammen. Verknüpfen oder Trennen von Anbietern SHALL keine Rechte ändern.

#### Scenario: Gruppenadmin meldet sich mit einem neuen Anbieter an
- **GIVEN** eine Gruppenadministratorin mit bestehendem Konto
- **WHEN** sie sich erstmals mit Apple (gleiche verifizierte E-Mail) anmeldet
- **THEN** behält sie ihre Gruppenrolle `admin` und alle Inhalte
