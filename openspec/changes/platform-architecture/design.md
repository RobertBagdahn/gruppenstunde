# Design: Plattform-Architektur

## Context

Motivation siehe `proposal.md`. Für das Design relevant ist der heutige Stand:

- **Backend:** ein Django-5.1-Projekt (`backend/inspi`) mit einer `NinjaAPI` in `backend/inspi/urls.py`. Alle Router sind ohne Produktpräfix eingehängt. Die Sessions sind Standard-DB-Sessions (`django.contrib.sessions`, kein `SESSION_COOKIE_DOMAIN`). `USE_X_FORWARDED_HOST = True`, damit OAuth-Callbacks auf der Besucher-Domain landen (`gruppenstunde.de` bzw. `essensplan.app`). `SESSION_COOKIE_AGE` ist 30 Tage mit `SESSION_SAVE_EVERY_REQUEST = True`, also gleitend.
- **Login heute** (`core/api.py`, `core/auth/`):
  - allauth mit Google, Apple, Microsoft und Facebook
  - Passwort-Login und -Registrierung in der Übergangszeit über `AUTH_PASSWORD_LOGIN_ENABLED` (Standard: an)
  - Dev-Login
  - `SOCIALACCOUNT_EMAIL_AUTHENTICATION = False`, damit allauth kein Passwort stillschweigend ungültig macht
  - `core.permissions.require_recent_login` prüft für sicherheitskritische Aktionen `user.last_login` (15 min).
- **E-Mail-Versand:** SMTP über ein Gmail-Konto (`DEFAULT_FROM_EMAIL`) mit Console-Backend lokal und locmem in Tests. Mails von Aktionen laufen über `event/services/mail.py` mit Gruppen-CI.
- **Rechte heute:**
  - zentrale Guards in `core/permissions.py`: `require_login`, `require_staff`, `deny`, `require_recent_login`
  - Staff = `is_staff` oder die Legacy-Rolle `profile.role`, mit 141 Fundstellen von `is_staff`/`is_superuser`
  - Gruppen mit `member`/`admin` und Vererbung von der Eltern- auf die Kindgruppe (`profiles`)
  - Produktrechte pro Ressource: `content.ContentCollaborator`, `MealPlanCollaborator`, `PlannerCollaborator`, Rollen in `shopping`, `content/services/food_access.py`, `shopping/services/access.py`, `shopping/services/trip_access.py` und `event/services/parent_access.py`
- **Gemessene Importe zwischen Apps** (ohne Tests und Migrationen):
  - `core → supply` 60, `core → recipe` 22, `core → content` 17. Das steckt fast komplett in `core/management/commands/*` (Food-Seeds, Importe) und `core/services/prompt_context.py`.
  - `profiles → blog, content, event, game, packinglist, planner, recipe, session, shopping, supply`. Das betrifft nur `profiles/apps.py` und `profiles/api/profile.py`, d. h. Datenexport, Löschung und „meine Inhalte“.
  - `supply ↔ recipe` hängen gegenseitig voneinander ab (157 bzw. 67 Importe).
  - `content → recipe, session, game, blog, event, planner`
  - `event → planner` 5
  - `planner → event` 5
  - `shopping → event`: neu durch die Einkaufstouren (`shopping/services/trip_access.py` importiert `Event` und `EventMealPlanRelation`)
- **Gemeinsame Basisklassen:** `Recipe`, `GroupSession`, `Game` und `Blog` erben von `content.Content`. `Material` erbt von `supply.Supply`. `content` und `supply` sind damit echte gemeinsame Basis für mehrere Produkte.
- **`planner` enthält zwei Produkte:**
  - Stundenplaner: `Planner`, `PlannerEntry`, `PlannerCollaborator`, also 3 kleine Models
  - Essensplan: `MealPlan`, `Meal`, `MealItem`, `MealItemOverride`, `MealPlanCollaborator`, `MealPlanTag`, `MealPlanGroupMember`, `BuffetTemplate*`, `RefMeal`
- **Verknüpfung Aktion ↔ Essensplan:** `event.models.EventMealPlanRelation`.
- **Frontends:**
  - `frontend/`: 183 TSX-Dateien, Routen für Content, `/events/*`, `/session-planner/*`, `/packing-lists/*`, `/profile/*`, `/groups/*` und `/admin/*`
  - `MyDashboardPage`, `HomePage` und `ProfilePage` mischen Aktionen, Stundenplaner und Inhalte.
  - `frontend-food/`: 439 TSX-Dateien, eigene Login-, Register- und Profilseiten
  - beide mit eigenem `package.json` und eigenem nginx-Image (`Dockerfile.frontend`, `Dockerfile.frontend-food`, gemeinsames `nginx.conf.template` mit `/api/`-Proxy)
- **Widerspruch in den Specs:** `food-frontend-app` fordert eine gemeinsame Session, `social-login` fordert „Getrennte Sessions pro Domain“. Dieser Change löst den Widerspruch zugunsten von SSO auf.

## Goals / Non-Goals

**Goals:**
- Jede App ist einzeln verständlich, baubar und deploybar. Ein Entwickler, der am Anmeldesystem arbeitet, muss Food-Code weder lesen noch bauen.
- Login-Logik, Gruppen und Personen existieren genau einmal. Die Login-Seite wird pro App nur gestaltet, nicht neu gebaut.
- Ein Nutzer hat in allen Apps dieselbe Identität, dieselben Gruppen und dieselbe Staff-Rolle, egal wie er sich angemeldet hat.
- Es gibt kein Passwort mehr: Man meldet sich mit Google, Apple oder einem E-Mail-Link mit Code an.
- Die Grenzen werden maschinell geprüft, nicht nur dokumentiert.
- Die Umstellung läuft in Schritten, von denen jeder für sich deploybar ist.

**Non-Goals:**
- Kein Microservice-Split, keine zweite Datenbank, kein zweiter Backend-Service. Die Lastisolierung pro Produkt bleibt eine spätere Option, siehe Risiken.
- Kein OIDC-/OAuth-Provider für Drittanbieter.
- Keine neuen Produktrollen wie „Küche“. Das Rollenmodell `member`/`admin` bleibt; neue Rollen kommen in einem eigenen Change.
- Keine Verschiebung der Backend-App-Verzeichnisse in Unterordner. Die Schichten werden per Konfiguration zugeordnet, nicht per Ordnerstruktur.
- Kein Redesign der Produkt-Apps über App-Switcher und Benutzermenü hinaus.
- Keine Zwei-Faktor-Anmeldung, keine Passkeys. Beides ist später auf derselben Grundlage möglich.
- Kein Ablösen der Legacy-Rolle `profile.role`. `is_staff_user` bleibt die einzige Prüfung und wird nur nicht dupliziert.

## Decisions

### D1 – Modularer Monolith mit Schichten per import-linter

Die Schichten aus `backend-module-boundaries` werden in `backend/pyproject.toml` unter `[tool.importlinter]` als `layers`- und `independence`-Verträge definiert. Ein Test in `core/tests/` prüft zusätzlich, dass jede App in `INSTALLED_APPS` einer Schicht zugeordnet ist.

- **Ratsche:** Bestehende Verstöße kommen als `ignore_imports` in die Konfiguration. Ein kleines Skript `scripts/check_import_ratchet.py` meldet Einträge, die nicht mehr nötig sind.
- **Öffentliche Schnittstelle eines Produkts:** `<app>/services/public.py`, ausschließlich mit Funktionen und Dataclasses/Pydantic-DTOs, nie mit Model-Instanzen.
- **Plattform-Erweiterung ohne Rückwärtsimport:** Für Datenexport, Kontolöschung und „meine Inhalte“ definiert `profiles` eine Registry (`profiles.registry.register_user_data_provider`). Produkte registrieren sich in ihrer `AppConfig.ready()`. Damit verschwinden die Importe aus `profiles/apps.py` und `profiles/api/profile.py`.
- **Abbau der `core`-Verstöße:** Die Food-Management-Commands wandern nach `supply/management/commands/` bzw. `recipe/management/commands/`. `prompt_context.py` bekommt eine Registry nach demselben Muster.
- **`supply ↔ recipe`** ist der größte Brocken. `supply` ist Shared Kernel, `recipe` ist Produkt, also muss `supply` von `recipe` loskommen. Die Verstöße bleiben vorerst in der Ratsche. Sie werden bei Arbeiten am Food-Code schrittweise abgebaut, sind aber kein Blocker für diesen Change.

- **Verknüpfungen zwischen Produkten:**
  - `EventMealPlanRelation` gehört der Anmeldung (`event`). Der Essensplan liest sie über `event/services/public.py`.
  - Einkaufstouren gehören dem Essensplan (`shopping`). `trip_access.py` fragt Aktionsteam und Verknüpfung künftig über `event.services.public` ab (`event_team_user_ids(event_id)`, `meal_plan_ids_for_event(event_id)`) statt über `event.models`.
  - `planner → event` und `event → planner` laufen künftig ebenfalls nur über `services/public.py`.

*Alternative verworfen:* Apps physisch nach `backend/platform/`, `backend/products/<produkt>/` verschieben. Das ändert hunderte Importpfade und Migrationsabhängigkeiten, bringt aber keinen Nutzen gegenüber geprüften Verträgen.

### D2 – Stundenplaner aus `planner` herauslösen, nicht den Essensplan

Der Stundenplaner hat 3 Models, der Essensplan über 10 Models mit vielen Fremdschlüsseln aus `recipe`, `shopping`, `event` und `supply`. Deshalb ziehen `Planner`, `PlannerEntry` und `PlannerCollaborator` in die bestehende App `session` (Produkt Gruppenstunde) um. Das geschieht per `SeparateDatabaseAndState`: Die Tabellennamen bleiben über `Meta.db_table = "planner_planner"` usw. erhalten, es werden keine Daten kopiert. `planner` gehört danach vollständig zum Essensplan. Eine Umbenennung des App-Labels ist nicht Teil dieses Changes.

*Alternative verworfen:* den Essensplan in eine neue App `mealplan` verschieben. Das würde viel mehr Fremdschlüssel, Migrationen und Importe berühren.

### D3 – Login pro App, unsichtbarer Abgleich über eine zentrale Domain

**Grundprinzip:** Jede Domain hat ihre eigene Session und ihre eigene Login-Seite, und der OAuth-Callback läuft auf der eigenen Domain wie heute. Die Konto-Domain `konto.gruppenstunde.de` dient als *Hub*: Sie hält eine Session pro Browser, damit andere Domains eine bestehende Anmeldung finden. Der Nutzer sieht den Hub beim Login nie. Er besteht nur aus Weiterleitungen.

**Drei gleiche Endpunkte auf jeder Domain.** Jede App-Domain proxyt `/api/` ans Backend, das Backend erkennt die Domain an `X-Forwarded-Host`.

- `GET /api/auth/sso/start/?next=<pfad>&prompt=none|login`
  - wird auf der **empfangenden** Domain aufgerufen
  - erzeugt einen Zufallswert `state` und speichert ihn in einem kurzlebigen Cookie `sso_state` (HTTP-only, `SameSite=Lax`, 5 min)
  - leitet weiter auf `/api/auth/sso/authorize/` der **ausstellenden** Domain, mit `client=<eigene Origin>&state=…&prompt=…`
  - Für Produkt-Apps ist der Aussteller der Hub. Für den Hub selbst ist es die Domain, auf der gerade der Login stattfand.
- `GET /api/auth/sso/authorize/?client=<origin>&state=…&prompt=…`
  - wird auf der **ausstellenden** Domain aufgerufen
  - Ist `client` keine erlaubte Origin, endet der Ablauf mit 400.
  - **Mit Session:** erzeugt `SsoHandoffToken` (32 Byte zufällig, gespeichert als SHA-256; Felder `user`, `client_origin`, `state`, `chain_id`, `expires_at` +60 s, `used_at`), dann 302 auf `<client>/api/auth/sso/callback/?token=…&state=…`
  - **Ohne Session:** 302 auf `<client>/api/auth/sso/callback/?error=login_required&state=…`
- `GET /api/auth/sso/callback/?token|error&state`
  - wird wieder auf der **empfangenden** Domain aufgerufen
  - prüft: `state` gleich dem Cookie `sso_state`, Token unbenutzt und nicht abgelaufen, `client_origin` gleich der eigenen Origin, Token-`state` gleich `state`
  - bei Erfolg: `login()`, `cycle_key()`, `chain_id` übernehmen, Cookie löschen, 302 auf `next`
  - bei Fehler: mit `prompt=none` 302 auf `next?sso=none`, mit `prompt=login` 302 auf die eigene `/login?next=…`

**Ablauf 1: Login im Essensplan.**
1. Die Login-Seite aus `packages/platform` startet OAuth auf `essensplan.app`, wie heute.
2. Nach dem allauth-Callback setzt das Backend die Session für `essensplan.app` mit einer neuen `chain_id`.
3. Statt direkt auf `next` folgt eine Weiterleitung zu `konto…/api/auth/sso/start/?next=<essensplan-URL>&issuer=essensplan`.
4. Der Hub holt sich per authorize und callback die Anmeldung von `essensplan.app` und leitet zurück auf `next`.
5. Das sind drei unsichtbare Sprünge. Scheitert der Hub, landet der Nutzer trotzdem auf `next`, denn die Session im Essensplan steht schon.

**Ablauf 2: Wechsel nach Gruppenstunde.**
1. Der App-Switcher-Link zeigt auf `gruppenstunde.de/api/auth/sso/start/?next=/&prompt=none`, „Anmelden“ auf dieselbe URL mit `prompt=login`.
2. `gruppenstunde.de` fragt beim Hub an.
3. Hat der Hub eine Session, ist der Nutzer angemeldet. Hat er keine, sieht der Nutzer bei `prompt=none` die Seite anonym, bei `prompt=login` die Login-Seite von Gruppenstunde.
4. Geschützte Seiten nutzen `prompt=login`.

**Laufzeit und Anmeldezeitpunkt reisen mit:**
- Jede Session speichert `auth_method` (`email`, `google`, `apple`, `dev`, `admin`), `auth_time` (Zeitpunkt der echten Anmeldung) und bei `email` ein absolutes `auth_expires_at`.
- `SsoHandoffToken` übernimmt diese drei Werte, und `sso/callback` setzt sie unverändert auf der empfangenden Domain.
  - E-Mail-Sessions erhalten `request.session.set_expiry(<datetime>)`. Ein absoluter Zeitpunkt wird von `SESSION_SAVE_EVERY_REQUEST` nicht verlängert.
  - Google- und Apple-Sessions behalten die gleitenden 30 Tage.
- Eine Middleware beendet Sessions nach `auth_expires_at` mit 401 `session_expired`, auch wenn das Cookie noch existiert.
- Die Übernahme ruft `login()` ohne Aktualisierung von `last_login` auf. Die Signal-Verbindung zu `update_last_login` wird für diesen Pfad umgangen.
- `require_recent_login` prüft künftig `request.session["auth_time"]` statt `user.last_login`. So kann ein App-Wechsel keine Sicherheitsabfrage überspringen.

**Schutz vor Login-CSRF:** Weil nur die Domain ein Token einlösen kann, die den Ablauf mit ihrem eigenen `sso_state`-Cookie gestartet hat, kann ein Angreifer niemanden über einen fremden Link in sein eigenes Konto einloggen.

**Abmelden:** `POST /api/auth/logout/` löscht serverseitig alle Sessions mit derselben `chain_id`, auch die des Hubs. Dafür gibt es ein schlankes Model `UserSessionLink(session_key, user, chain_id, origin)`, weil DB-Sessions sich nicht nach Nutzer abfragen lassen. Weiterleitungen sind dafür nicht nötig, und andere Geräte haben eine andere `chain_id`.

**Konfiguration:** `PLATFORM_APPS` in den Settings, aus der Umgebung: `{ konto, gruppenstunde, anmeldung, essensplan } → base_url`, plus `PLATFORM_SSO_HUB = "konto"`. Daraus werden `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` und die Allowlist für `client`, `next` und `return` abgeleitet. `GET /api/platform/apps/` liefert die Liste aus.

**Warum der Hub auf `konto.gruppenstunde.de` liegt:** Safari und Chrome ordnen Speicher nach Site zu (eTLD+1). Wer `gruppenstunde.de` nutzt, interagiert damit auch mit der Site des Hubs. Dadurch sinkt das Risiko, dass der Schutz vor Bounce-Tracking den Hub als Tracker einstuft.

*Alternativen verworfen:*
- Sichtbarer zentraler Login auf der Konto-Domain: Das ist ein spürbarer Bruch für Eltern und Küchenteams und wirkt bei einer fremden Domain eher wie Phishing.
- Login pro App ganz ohne Abgleich: Das ist einfacher, aber bei jedem App-Wechsel muss man sich neu anmelden.
- Gemeinsames Cookie mit `SESSION_COOKIE_DOMAIN`: mit den Marken-Domains unmöglich.
- iframe/postMessage-Silent-Login: Third-Party-Cookies werden in Safari und Firefox blockiert.
- Automatische Prüfung bei jedem ersten Seitenaufruf: Sie stört Landingpages, Suchmaschinen-Crawler und Gast-Anmeldungen, und sie erhöht das Risiko, als Bounce-Tracker eingestuft zu werden.
- JWT: laut Projektregeln ausgeschlossen.
- OIDC mit django-oauth-toolkit: zu viel für ein Backend mit gemeinsamer DB. Der Flow mit start, authorize und callback samt `state` hat aber schon die Form von OIDC, ein späterer Umstieg bleibt also möglich.

### D4 – Frontend-Workspace mit Quellcode-Paketen

- **Workspace:** Das Root-`package.json` bekommt `workspaces: ["apps/*", "packages/*"]`.
- **Pakete ohne Build-Schritt:** `packages/ui` und `packages/platform` werden als TypeScript-Quellcode konsumiert (`"exports": { ".": "./src/index.ts" }`) und von Vite direkt transpiliert. Jede App nimmt `../../packages/*/src/**/*.{ts,tsx}` in ihr Tailwind-`content` auf.
- **Ausgangsbasis der Apps:**
  - `frontend-food/` wird per `git mv` zu `apps/essensplan/`.
  - `frontend/` wird per `git mv` zu `apps/gruppenstunde/`.
  - `apps/anmeldung` entsteht durch Kopieren der Event-Seiten, Hooks, Schemas und Komponenten aus `apps/gruppenstunde`, die dort danach gelöscht werden.
  - `apps/konto` wird neu aufgesetzt und übernimmt die Profil-, Gruppen-, Personen-, Datenschutz- und Admin-Nutzer-Seiten aus beiden Apps.
- **Grenzen prüfen:** Die ESLint-Regel `no-restricted-imports` bzw. `import/no-restricted-paths` aus einer gemeinsamen `eslint.config.base.js` verbietet Imports von `apps/<a>` nach `apps/<b>` und aus `packages/*` in `apps/*`.
- **Docker:** Ein parametrisiertes `Dockerfile.frontend` mit `ARG APP` ersetzt `Dockerfile.frontend` und `Dockerfile.frontend-food`. `nginx.conf.template` bleibt gemeinsam. Neu ist ein Redirect-Block für `/events/*` im Image von Gruppenstunde (301 auf die Anmelde-Domain).
- **Zod-Schemas:** `userSchema`, `groupSchema`, `membershipSchema` und `sessionSchema` liegen in `packages/platform/src/schemas/`, synchron zu `core.schemas.UserOut`, `profiles.schemas.GroupOut` und `MembershipOut`. Neu ist `appLinkSchema`, synchron zu `AppLinkOut`. Die SSO-Endpunkte sind reine Weiterleitungen ohne JSON.

*Alternativen verworfen:*
- Turborepo/Nx: npm workspaces und Make reichen für vier Apps.
- Gebaute Pakete mit eigenem Release: zu viel Aufwand ohne externen Konsumenten.
- Module Federation bzw. eine Shell-App, die andere Apps einbettet: Das widerspricht dem Ziel unabhängiger Apps.

### D5 – Mehrere NinjaAPI-Instanzen für Präfixe und getrennte OpenAPI

In `backend/inspi/urls.py` gibt es künftig eine `NinjaAPI` pro Präfix (`platform_api`, `content_api`, `events_api`, `food_api`, `gruppenstunde_api`), jeweils mit eigenem `urls_namespace` und eigener `/docs`. `register_error_handlers` wird auf jede Instanz angewendet. Die Pfade werden pro Produkt in dem Schritt umgestellt, in dem auch dessen Frontend umzieht. Die Hooks in der jeweiligen App werden im selben PR angepasst; eine Rückwärtskompatibilität ist nicht nötig.

### D6 – Gast-Anmeldungen bei bestätigter E-Mail übernehmen

Gast-Anmeldungen legen heute ein Gast-Konto mit unbrauchbarem Passwort an (`event/services/guest_registration.py`). Sie verwenden ein bestehendes Konto wieder, wenn es kein nutzbares Passwort hat. Das trifft aber auch auf jedes Google- und Apple-Konto zu und künftig auf jedes E-Mail-Konto. Eine anonyme Gast-Anmeldung könnte so an einem echten Konto landen.

- **Voraussetzung:** Es kommt ein ausdrückliches Feld `UserProfile.is_guest` hinzu. Die Daten-Migration setzt es für bestehende Konten, die ausschließlich durch Gast-Anmeldungen entstanden sind: kein `SocialAccount`, kein nutzbares Passwort, nie per Login angemeldet (`last_login` leer), Benutzername gleich E-Mail oder `guest+…`. `create_or_get_user` verwendet nur noch Konten mit `is_guest=True` wieder.
 Weil künftig jede Anmeldung die E-Mail-Adresse beweist (per E-Mail-Link oder bei Google/Apple mit `email_verified`), entfällt der eigene Bestätigungslink aus dem ersten Entwurf:

- Die Session speichert `email_verified_at` aus der aktuellen Anmeldung.
- `GET /api/events/guest-claims/` (angemeldet) liefert `{ count }`, aber nur, wenn `email_verified_at` gesetzt ist, sonst `{ count: 0 }`.
- `POST /api/events/guest-claims/` hängt Anmeldungen und Personen aller Gast-Konten mit dieser E-Mail an den Nutzer um und deaktiviert die Gast-Konten, in einer Transaktion.
- **E-Mail-Login ohne echtes Konto:** Gibt es zur Adresse nur ein Gast-Konto, wird dieses selbst zum vollwertigen Konto. `is_guest` wird auf `False` gesetzt. Bei mehreren Gast-Konten wird das älteste zum Konto, die anderen werden wie oben übernommen.
- Pydantic `GuestClaimOut` ↔ Zod `guestClaimSchema`. Es gibt kein neues Model.

### D7 – App-Wechsel und Deep-Links

- **Hilfsfunktion:** `packages/platform` stellt `appUrl(appId, path)` bereit, basierend auf `GET /api/platform/apps/` (gecacht mit `staleTime: Infinity`).
- **Silent-SSO:** Switcher-Links zu einer anderen App zeigen immer auf deren `sso/start?prompt=none`, „Anmelden“ auf `sso/start?prompt=login`. Ist dort schon eine Session vorhanden, leitet `sso/start` sofort auf `next` weiter.
- **Deep-Link-Daten:** Kommen von der API der Ausgangs-App. Beispiel: `EventDetailOut.meal_plan_link: { id, title, date_from, date_to } | null`, geliefert von der öffentlichen Schnittstelle des Essensplans inklusive Rechteprüfung. Fehlt das Leserecht, liefert die API `{ id: null, title: null }` mit `linked: true`.

### D8 – E-Mail-Login mit Link und Code

- **Model `EmailLoginRequest`** in `core`:
  - `email` (normalisiert, kleingeschrieben), `origin` (anfragende App), `next_path`
  - `token_hash` und `code_hash` (SHA-256 mit Server-Pepper)
  - `browser_binding_hash`, `attempts`, `expires_at` (+15 min), `used_at`, `ip_hash`, `created_at`
  - Ein neuer Request setzt offene Requests derselben Adresse auf `used_at`.
- **Anfordern:** `POST /api/auth/email-login/` → 202. Das Backend setzt ein HTTP-only-Cookie `email_login_binding`, das nur der anfragende Browser hat, und speichert dessen Hash. Unbekannte Adressen bekommen die Mail-Variante „Konto anlegen“, die Antwort bleibt identisch.
- **Link:** `https://<origin>/login/email?token=…` öffnet eine Seite aus `packages/platform` mit „Jetzt anmelden“. Erst `POST /api/auth/email-login/confirm/` löst ein. Vorabrufe durch Safe-Links-Scanner bleiben so wirkungslos. Der Link ist nicht an den Browser gebunden, weil der Besitz des Postfachs der Beweis ist.
- **Code:** `POST /api/auth/email-login/verify-code/` mit `{ code }` gilt nur zusammen mit dem `email_login_binding`-Cookie. Fünf Fehlversuche verbrauchen den Request. Ein gestohlener Code ist dadurch auf einem fremden Gerät wertlos.
- **Nach Erfolg:**
  - Konto suchen oder anlegen, Gast-Konto ggf. umwandeln (D6)
  - `login()` mit `auth_method=email`, `auth_time=now`, `auth_expires_at=now+4h`, `email_verified_at=now`
  - dann wie nach dem OAuth-Login die unsichtbare Hinterlegung beim Hub (D3)
- **Rate-Limit:** 5 Requests pro Adresse und Stunde sowie 20 pro `ip_hash` (/24 bzw. /48, gehasht mit Pepper) und Stunde, Antwort 429 `rate_limited`. Abgelaufene Requests räumt ein Management-Command nach 24 h ab, das in den bestehenden Cloud-Scheduler-Job kommt.
- **Mail:**
  - Ein gemeinsames Template mit App-Name, Logo und Farbe aus `PLATFORM_APPS`.
  - Absender „Essensplan“, „Gruppenstunde“ usw., über einen transaktionalen Mailversand mit SPF/DKIM statt Gmail-SMTP, weil der Login jetzt an der Zustellung hängt.
  - Text- und HTML-Variante, Betreff „Dein Anmeldecode: 123 456“.
- **Abgrenzung zu allauth:** allauth bringt „Login by code“ mit, aber ohne Branding pro Domain, ohne Bindung an den Browser beim Code und ohne absolute Laufzeit. Ein eigener schlanker Flow in `core/auth/email_login.py` ist übersichtlicher als allauth so weit anzupassen.
- **Frontend:** In `packages/platform` liegen `EmailLoginForm` (E-Mail → Code-Eingabe mit `inputmode="numeric"` und `autocomplete="one-time-code"`) und `EmailLoginConfirmPage`. Zod-Schemas `emailLoginRequestSchema`, `emailLoginConfirmSchema` und `emailLoginCodeSchema` sind synchron zu den Pydantic-Schemas `EmailLoginRequestIn`, `EmailLoginConfirmIn`, `EmailLoginCodeIn` und `SessionOut`. `SessionOut` bekommt die Felder `auth_method` und `expires_at`.

### D9 – Gemeinsame Rechte

- **Gruppenrechte:** `profiles/services/public.py` ist die einzige Quelle. Die Funktionen sind `user_group_ids(user, include_inherited=True)`, `is_group_member(user, group_id)` und `is_group_admin(user, group_id)`. Bestehende direkte Zugriffe auf `GroupMembership` in Produkten werden darauf umgestellt; die Ratsche aus D1 zeigt, wo.
- **Staff:** `core.permissions.is_staff_user` und `require_staff` bleiben die einzige Prüfung. Ein Test sucht direkte `is_staff`-Vergleiche in `*/api/` und `*/services/` und lässt nur die bestehenden über eine Ausnahmeliste zu, nach demselben Ratschenprinzip wie D1.
- **Produktrechte:** Collaborator-Tabellen und Access-Services bleiben in ihren Produkten. Sie bekommen nur Fremdschlüssel auf `User` und `Group`.
- **Personensuche:** `GET /api/users/search/` bleibt ein Plattform-Endpunkt. Das Auswahlfeld `UserPicker` zieht nach `packages/platform`.

## Risks / Trade-offs

- **[Ein gemeinsamer Backend-Service]:** Eine Lastspitze in einem Produkt trifft alle Apps, siehe Einkaufs-Vorfall vom 16.10. → Gegenmaßnahme: Die Präfixe aus D5 ermöglichen es, dasselbe Image später ohne Codeänderung als zweiten Cloud-Run-Service zu deployen und per nginx-Pfadregel nur `/api/food/` dorthin zu leiten. Bis dahin gelten die Kapazitätsmaßnahmen aus `stable-backend-capacity`.
- **[Bounce-Tracking-Schutz in Safari und Chrome]:** Er kann die Daten des Hubs bei Nutzern löschen, die nie mit `gruppenstunde.de` interagieren, z. B. bei reinen Essensplan-Nutzern. → Gegenmaßnahme: Der Abgleich läuft nur nach einem Klick (App-Switcher, „Anmelden“, geschützte Seite), nie automatisch. Fällt der Hub weg, bleibt die Session der jeweiligen App bestehen, und der Wechsel kostet nur einen Login-Klick. Die App fällt also auf das heutige Verhalten zurück, nicht auf einen Fehler.
- **[Redirect-Schleifen]** zwischen App und Hub. → Gegenmaßnahme: Jeder Ablauf ist an genau einen `state` gebunden. `sso/callback` leitet bei jedem Fehler auf `next` oder `/login` weiter und nie zurück zum Hub.
- **[Token-Leck über Referrer oder Logs]** → Gegenmaßnahme: Das Token ist 60 s gültig, nur einmal einlösbar und ohne passenden `state`-Cookie wertlos. `sso/callback` antwortet sofort mit 302 und `Referrer-Policy: no-referrer`. nginx loggt keine Query-Strings für `/api/auth/sso/`.
- **[Großer Umzug von `frontend/`]** mit vielen gleichzeitigen Konflikten mit laufenden Branches. → Gegenmaßnahme: Jeder Schritt ist ein eigener PR. `git mv` zuerst und ohne inhaltliche Änderungen, damit die Historie erhalten bleibt.
- **[Ratsche wird zur Dauerausnahme]** → Gegenmaßnahme: Die Anzahl der Einträge erscheint in jedem CI-Lauf. Neue Einträge sind verboten.
- **[OAuth-Anbieter-Konfiguration]** Jede App-Domain braucht eigene Redirect-URIs bei Google und Apple, neu also für Konto- und Anmelde-Domain. Apple verlangt zusätzlich eine Domain-Verifizierung. Microsoft und Facebook entfallen. → Gegenmaßnahme: Das kommt als eigener Punkt in die Prod-Checkliste, und bestehende Domains bleiben unverändert.
- **[Zustellung der Anmeldemails]:** Landen Mails im Spam oder verspätet, kann man sich nicht anmelden. → Gegenmaßnahme: transaktionaler Mailversand mit SPF/DKIM/DMARC pro Absender-Domain, ein Hinweis „Keine Mail bekommen? Spam-Ordner prüfen oder neu senden (in 60 s)“ und Google/Apple als Alternative. Ein Alarm bei steigender Bounce-Rate kommt zu den bestehenden Terraform-Alarmen.
- **[Gestohlenes Postfach = gestohlenes Konto]:** Das gilt bei jedem passwortlosen Login. → Gegenmaßnahme: Das ist akzeptiert und war mit Passwort-Reset per Mail genauso. Sensible Aktionen verlangen eine frische Anmeldung, und Änderungen der E-Mail-Adresse werden an die alte Adresse gemeldet.
- **[Automatische Verknüpfung über bestätigte Anbieter-E-Mail]:** Wer das Google-Konto zu einer Adresse besitzt, kommt in das Inspi-Konto dieser Adresse. → Gegenmaßnahme: Das gilt nur, wenn der Anbieter `email_verified` liefert. Wer die Adresse besitzt, könnte sich ohnehin per E-Mail-Link anmelden, ein neues Risiko entsteht also nicht.
- **[Vier Stunden für E-Mail-Logins]** sind kurz für lange Planungssitzungen. → Gegenmaßnahme: Ablauf mit klarer Meldung, gesicherte Entwürfe und der Hinweis „Mit Google oder Apple bleibst du länger angemeldet“ auf der Login-Seite.
- **[Login-Latenz]** Nach dem OAuth-Login kommen drei zusätzliche Weiterleitungen (etwa 0,2–0,5 s). → Gegenmaßnahme: Akzeptiert. Die Sprünge sind reine 302-Antworten ohne Seitenaufbau.

## Migration Plan

Jeder Schritt ist einzeln deploybar. Prod-Schritte laufen gebündelt am Ende als Dry-Run und werden erst nach OK ausgeführt.

1. **Backend-Grenzen:**
   - import-linter mit Ratsche einführen
   - User-Data-Registry in `profiles`
   - Food-Commands aus `core` verschieben
   - Stundenplaner nach `session` (State-only-Migration)
2. **Workspace:**
   - Root-Workspace anlegen
   - `git mv` der beiden Frontends nach `apps/`
   - `packages/ui` und `packages/platform` herauslösen
   - gemeinsames Dockerfile, Makefile und Cloud Build anpassen
3. **SSO im Backend:**
   - Models `SsoHandoffToken` und `UserSessionLink` mit Migration
   - Endpunkte `sso/start`, `sso/authorize`, `sso/callback`
   - Abmelden über die ganze Kette
   - `PLATFORM_APPS`
   - `auth_method`, `auth_time` und `auth_expires_at` in jeder Session, dazu `require_recent_login` auf `auth_time` umstellen
   - Hinter dem Schalter `SSO_ENABLED`; solange er aus ist, verhalten sich Login und Logout wie heute
3a. **E-Mail-Login:**
   - `EmailLoginRequest`, Endpunkte, Mail-Template, Rate-Limit
   - transaktionaler Mailversand mit SPF/DKIM
   - Formular auf den bestehenden Login-Seiten
   - Hinter dem Schalter `EMAIL_LOGIN_ENABLED`
3b. **Passwörter und alte Anbieter abschalten**, erst wenn der E-Mail-Login in Prod läuft:
   - Bestehende Passwort-, Microsoft- und Facebook-Nutzer bekommen einmalig eine Info-Mail: „Ab jetzt meldest du dich per E-Mail-Link oder Google/Apple an.“
   - Danach `AUTH_PASSWORD_LOGIN_ENABLED` und die Endpunkte entfernen sowie Microsoft und Facebook aus der Konfiguration nehmen.
   - Automatische Verknüpfung für bestätigte E-Mails aktivieren.
4. **Konto-App:**
   - Seiten aus beiden Apps übernehmen
   - Cloud-Run-Service und Domain `konto.gruppenstunde.de`
   - OAuth-Redirect-URIs für die Konto-Domain eintragen
   - gemeinsame Login-Seite aus `packages/platform` in allen Apps einbinden
   - `SSO_ENABLED` aktivieren
   - Produkt-Apps leiten `/profile/*` weiter
5. **Anmelde-App:**
   - Event-Seiten herauslösen
   - Domain einrichten
   - 301-Redirects in Gruppenstunde
   - Gast-Übernahme (D6)
   - gemischte Seiten entflechten (`MyDashboardPage`, `HomePage`, `ProfilePage`)
6. **App-Switcher und Deep-Links** in allen Apps.
7. **API-Präfixe** pro Produkt umstellen, sinnvollerweise zusammen mit Schritt 4 bzw. 5 für das jeweilige Produkt.
8. **Aufräumen:**
   - Specs, `AGENTS.md` und `openspec/config.yaml` aktualisieren

**Rollback:** Bis Schritt 4 ist alles intern und per Revert umkehrbar. `EMAIL_LOGIN_ENABLED=false` blendet den E-Mail-Login aus. Schritt 3b ist erst umkehrbar, wenn die Passwort-Endpunkte noch im Code sind, deshalb werden sie erst nach zwei stabilen Wochen gelöscht. Ab Schritt 4 schaltet `SSO_ENABLED=false` nur den Abgleich ab. Der Login pro App funktioniert weiter, weil er nie von der Konto-Domain abhing.

## Open Questions

- Anbieter für den transaktionalen Mailversand (z. B. Brevo, Postmark, Amazon SES). Das ändert nur die Konfiguration, nicht den Flow.

- Name der Domain für die Anmelde-App. Bis zur Entscheidung ist sie ein Platzhalter in `PLATFORM_APPS` und in Terraform.
- Ob `planner` später in `mealplan` umbenannt wird. Das ist reine Kosmetik und gehört in einen eigenen Change.
