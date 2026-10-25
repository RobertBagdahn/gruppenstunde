# Proposal: Plattform-Architektur mit Konto-App und drei Produkt-Apps

## Why

Inspi besteht fachlich aus drei Produkten für verschiedene Zielgruppen: **Gruppenstunde** (Ideen, Spiele, Stundenplaner, Packlisten für Gruppenleitende), **Anmeldung** (Aktionen, Gast-Anmeldung und Elternzugang für Organisierende, Eltern und Teilnehmende) und **Essensplan** (Rezepte, Essenspläne, Einkauf für Küchenteams). Heute steckt Anmeldung zusammen mit Gruppenstunde, Konto, Gruppen und Admin in `frontend/`. Login und Profil gibt es doppelt in `frontend/` und `frontend-food/`, und zwischen `gruppenstunde.de` und `essensplan.app` muss man sich getrennt anmelden. Im Backend importieren sich alle Apps kreuz und quer, z. B. `core → supply` 60-mal und `profiles → fast alle Apps`. Jede neue Funktion macht das System dadurch verworrener. Bevor das Anmeldesystem weiter ausgebaut wird, braucht die Plattform klare Grenzen.

## What Changes

- **Zentrale Konto-App** unter `konto.gruppenstunde.de`: Konto & Anmeldung, Profil, Gruppen (anlegen, Mitglieder, Rollen, Corporate Identity), Personen/Kinder, Datenschutz und Plattform-Admin (Nutzer). Die Produkt-Apps enthalten dafür keine eigenen Seiten mehr, sondern verlinken dorthin („Konto verwalten“). **BREAKING** für `/profile/*` in `frontend/` und `frontend-food/`.
- **Login in jeder App, unsichtbar abgeglichen**: Jede App behält eine eigene Login-Seite im eigenen Design auf ihrer eigenen Domain. Gebaut ist sie nur einmal, in `packages/platform`. Nach dem Login wird die Anmeldung unsichtbar auf der zentralen Domain `konto.gruppenstunde.de` hinterlegt. Andere Apps übernehmen sie von dort per Weiterleitung mit Einmal-Token, ohne erneute Anbieterauswahl. Es gibt kein JWT und kein Third-Party-Cookie. Die Sessions bleiben pro Domain getrennt, werden aber verbunden.
- **Passwortlose Anmeldung**:
  - Angemeldet wird mit Google, Apple oder einem **E-Mail-Link mit sechsstelligem Code**. Eigene Konten entstehen nur über die E-Mail-Adresse, ohne Passwort.
  - Eine E-Mail-Anmeldung gilt fest 4 Stunden auf allen Domains, Google und Apple wie bisher 30 Tage.
  - **BREAKING**: Passwort-Login und -Registrierung sowie Microsoft und Facebook entfallen. Bestehende Konten erreicht man per E-Mail-Link mit derselben Adresse.
- **Gemeinsame Rechte**:
  - Identität, Staff-Rolle und Gruppenmitgliedschaften (inklusive Vererbung) gelten in allen Apps gleich und werden an einer Stelle geprüft.
  - Produktrechte wie Mitbearbeitende bleiben im Produkt, beziehen sich aber nur auf Plattform-Nutzer und -Gruppen.
  - Rechte, die zwei Produkte betreffen (z. B. Einkaufstouren einer Aktion), fragt ein Produkt beim anderen ab und baut sie nicht nach.
- **Gast-Konten ausdrücklich markieren**: Heute erkennt das System Gäste an „kein Passwort“. Das trifft auch auf Google-, Apple- und künftig alle E-Mail-Konten zu. Ein Feld `is_guest` verhindert, dass anonyme Gast-Anmeldungen an echten Konten landen.
- **Anmeldung als eigene App** auf eigener Domain (Name noch offen). `/events/*` wandert aus `frontend/` dorthin. Gast-Anmeldung und Elternzugang bleiben ohne Konto möglich. Ein Konto lässt sich später verknüpfen.
- **App-Switcher** in allen vier Apps: einheitlicher Kopfbereich mit Wechsel zwischen den Apps und Deep-Links zwischen verknüpften Objekten, z. B. „Essensplan zu dieser Aktion“. Fremde Seiten werden nicht eingebettet.
- **Frontend-Monorepo mit npm workspaces**: `apps/konto`, `apps/gruppenstunde`, `apps/anmeldung`, `apps/essensplan` sowie die zwei kleinen Pakete `packages/ui` und `packages/platform`. `frontend/` und `frontend-food/` gehen darin auf. **BREAKING** für Pfade, Makefile, Dockerfiles und CI.
- **Backend bleibt ein Django-Ninja-Projekt mit einer DB und einem Cloud-Run-Service** (modularer Monolith), bekommt aber durchgesetzte Modulgrenzen:
  - Plattform-Kern: `core`, `profiles`
  - Shared Kernel: `content`, `supply`
  - Produkte: Gruppenstunde (`session`, `blog`, `game`, `packinglist`, Stundenplaner), Anmeldung (`event`) und Essensplan (`recipe`, `shopping`, Essensplan/Buffet)
  - `planner` wird nach Stundenplaner und Essensplan aufgeteilt.
  - Die API bekommt Präfixe pro Produkt.
  - Abhängigkeitsregeln prüft `import-linter` in CI, mit einer Ratsche für bestehende Verstöße.

## Capabilities

### New Capabilities
- `platform-sso`: Login in jeder App auf ihrer Domain, unsichtbarer Abgleich über die zentrale Domain, Übergabe per Einmal-Token, Schutz vor fremden Übergabe-Links und Abmelden auf allen Domains.
- `account-app`: Die Konto-App als einziger Ort für Konto, Profil, Gruppen, Personen, Datenschutz und Plattform-Admin.
- `events-frontend-app`: Das Anmeldesystem als eigenständige App mit eigener Domain, Navigation und Gast-Zugang.
- `app-switcher`: Wechsel zwischen den Apps und Deep-Links zwischen verknüpften Objekten verschiedener Produkte.
- `frontend-workspace`: Aufbau der Frontends als Workspace mit getrennten Apps und kleinen geteilten Paketen.
- `backend-module-boundaries`: Modulschichten, erlaubte Abhängigkeiten, Verknüpfungen zwischen Produkten und API-Präfixe pro Produkt im gemeinsamen Backend.
- `email-login`: Anmeldung und Kontoanlage per E-Mail-Link und Code, ohne Passwort, mit fester Laufzeit von 4 Stunden.
- `platform-permissions`: Plattformweit geteilte Identität, Staff-Rolle und Gruppenrechte sowie die Regeln für Produktrechte.

### Modified Capabilities
- `social-login`:
  - „Getrennte Sessions pro Domain“ gilt weiter, die Sessions werden aber über den Plattform-Abgleich verbunden.
  - „Ausschließlich Social Login“ wird ersetzt durch „Anmeldung per Google, Apple oder E-Mail-Link“: ohne Passwort, Microsoft und Facebook.
  - „Automatische Kontoanlage und -verknüpfung“ wird ersetzt durch eine Verknüpfung über die vom Anbieter bestätigte E-Mail.
- `food-frontend-app`: Die App liegt unter `apps/essensplan`. Die Login-Seite kommt aus dem gemeinsamen Paket, eigene Profil- und Kontoseiten entfallen, und die Session wird über den Plattform-Abgleich verbunden statt „shares auth session“.
- `account-management`: Der Kontobereich zieht in die Konto-App. Der letzte Anbieter darf getrennt werden, weil der E-Mail-Link immer bleibt. Neu ist das Ändern der E-Mail-Adresse mit Bestätigung.
- `infrastructure`: Die Ziel-Architektur bekommt zusätzliche Frontend-Services für Konto und Anmeldung mit eigenen Domains.

## Impact

- **Backend-Apps:**
  - `core`: Auth-Endpunkte, neue Abgleich-Endpunkte (`sso/start`, `sso/authorize`, `sso/callback`), E-Mail-Login (`email-login`, `confirm`, `verify-code`), Allowlist der App-Origins, `require_recent_login` auf den echten Anmeldezeitpunkt, Entfernen der Passwort-Endpunkte
  - `profiles`: Gruppen, Personen, Datenschutz, öffentliche Rechte-Schnittstelle (`services/public.py`), `UserProfile.is_guest`, Ändern der E-Mail-Adresse
  - `planner`: Aufteilung in Stundenplaner und Essensplan, mit Daten- und Model-Migration
  - `event`: Gast-Anmeldung nur mit `is_guest`, Gast-Übernahme, öffentliche Schnittstelle für Aktionsteam und Verknüpfungen
  - `shopping`: Einkaufstouren fragen Rechte über `event.services.public` ab
  - `recipe`, `supply`, `content`, `session`, `packinglist`: Router-Präfixe, Entflechtung der Imports
  - `inspi/urls.py`, `inspi/settings/*`: CSRF/CORS-Origins und Session-Einstellungen
- **Neue Pydantic- und Zod-Schemas:**
  - `AppLinkOut` / `appLinkSchema` für App-Switcher und Deep-Links
  - `EmailLoginRequestIn` / `emailLoginRequestSchema`
  - `EmailLoginConfirmIn` / `emailLoginConfirmSchema`
  - `EmailLoginCodeIn` / `emailLoginCodeSchema`
  - `EmailChangeIn` / `emailChangeSchema`
  - `GuestClaimOut` / `guestClaimSchema`
  - `SessionOut` / `sessionSchema` bekommen `auth_method` und `expires_at`.
  - `AuthProvidersOut` bekommt `email_login` und verliert `password_login`. Die Abgleich-Endpunkte sind reine Weiterleitungen und brauchen kein Zod-Schema. Die Zod-Schemas für `User`, `Group` und `Membership` ziehen nach `packages/platform` um und gelten dann für alle Apps.
- **Migrationen:**
  - neue Models für Einmal-Token (kurzlebig, als Hash gespeichert) und für die Verbindung der Sessions eines Browsers
  - `planner`-Aufteilung, d. h. Models zwischen Apps verschieben, ohne Datenverlust
  - `EmailLoginRequest` mit Hashes für Token, Code, Browser-Bindung und IP
  - `UserProfile.is_guest` mit Daten-Migration für bestehende Gast-Konten
  - keine Migration für Passwort-, Microsoft- und Facebook-Konten nötig, weil sie per E-Mail-Link erreichbar bleiben
- **React-Seiten:**
  - `LoginPage` und `RegisterPage` werden zu einer gemeinsamen Login-Seite in `packages/platform` zusammengeführt, die jede App mit eigenem Logo einbindet.
  - Aus `frontend/` und `frontend-food/` wandern `ProfilePage`, `AccountPage`, `GruppenPage`, `GroupDetailPage`, `GroupCorporateIdentityPage`, `PersonsPage`, `PrivacyPage` und `AdminUserDetailPage` nach `apps/konto`.
  - `Events*`, `EventDashboardPage`, `NewEventPage`, `GuestRegistrationPage`, `ParentPage` und `QRCodePage` wandern nach `apps/anmeldung`.
- **Infrastruktur:** zwei neue Cloud-Run-Frontend-Services, neue Domains mit Zertifikaten, OAuth-Redirect-URIs für Google und Apple zusätzlich auf Konto- und Anmelde-Domain, transaktionaler Mailversand mit SPF/DKIM, Anpassungen an Cloud Build, Dockerfiles und Makefile.
- **Dokumentation:** `AGENTS.md` (Regel „Food-UI nur in `frontend-food/`“), `frontend/AGENTS.md`, `frontend-food/AGENTS.md` und `openspec/config.yaml` (Architekturbeschreibung).
