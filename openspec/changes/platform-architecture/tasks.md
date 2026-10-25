# Tasks

## 1. Backend: Modulgrenzen und gemeinsame Rechte

- [ ] 1.1 Backend: `import-linter` als Dev-Dependency aufnehmen und in `backend/pyproject.toml` die Schichtverträge aus D1 anlegen (Plattform, Shared Kernel, drei Produkte); bestehende Verstöße inklusive `shopping → event` als `ignore_imports` erfassen; verifizieren mit `uv run lint-imports` (grün)
- [ ] 1.2 Backend: `scripts/check_import_ratchet.py` schreiben, das veraltete `ignore_imports` meldet, und in `make lint` sowie Cloud Build einhängen; verifizieren, indem ein künstlicher neuer Import `core → recipe` den Lauf rot macht
- [ ] 1.3 Backend: Test in `core/tests/test_architecture_layers.py`, der prüft, dass jede Projekt-App aus `INSTALLED_APPS` genau einer Schicht zugeordnet ist; verifizieren mit `uv run pytest core/tests/test_architecture_layers.py`
- [ ] 1.4 Backend: User-Data-Registry in `profiles` einführen (Export, Löschung, „meine Inhalte“); Produkte registrieren sich in `AppConfig.ready()`; Importe aus `profiles/apps.py` und `profiles/api/profile.py` entfernen; verifizieren mit den bestehenden Privacy- und Kontolöschungs-Tests und einem neuen Test, dass die Löschung Rezepte, Aktionen und Packlisten erfasst
- [ ] 1.5 Backend: Food-Management-Commands aus `core/management/commands/` nach `supply/` bzw. `recipe/` verschieben, Cloud-Scheduler-Aufrufe in `terraform/main.tf` anpassen; `core/services/prompt_context.py` über eine Registry entkoppeln; verifizieren mit `uv run lint-imports`, wobei die Ratsche weniger Einträge zeigt
- [ ] 1.6 Backend: Stundenplaner-Models (`Planner`, `PlannerEntry`, `PlannerCollaborator`) mit `SeparateDatabaseAndState` und unverändertem `db_table` nach `session` verschieben, inklusive API, Schemas, Admin und Privacy-Service; verifizieren mit `uv run python manage.py migrate` auf einer Kopie mit Daten (gleiche Zeilenzahlen) und `uv run pytest planner session`
- [ ] 1.7 Backend: `profiles/services/public.py` mit `user_group_ids`, `is_group_member` und `is_group_admin` (inklusive Vererbung); direkte `GroupMembership`-Zugriffe in Produkten darauf umstellen; verifizieren mit Tests für direkte und vererbte Mitgliedschaft sowie für einen Austritt, der in Anmeldung und Essensplan sofort wirkt
- [ ] 1.8 Backend: `event/services/public.py` (`event_team_user_ids`, `meal_plan_ids_for_event`, Verknüpfungsdaten) und `planner/services/public.py`; `shopping/services/trip_access.py`, `planner → event` und `event → planner` darauf umstellen; verifizieren mit den bestehenden Trip-Access-Tests (unverändert grün) und `uv run lint-imports` ohne Ratsche-Einträge für diese Pfade
- [ ] 1.9 Backend: Test, der direkte `is_staff`-Vergleiche in `*/api/` und `*/services/` findet und nur die bestehenden über eine Ausnahmeliste zulässt; verifizieren, indem ein neuer direkter Vergleich den Test rot macht
- [ ] 1.10 Backend: `UserProfile.is_guest` mit Daten-Migration für bestehende Gast-Konten (D6); `GuestRegistrationService.create_or_get_user` verwendet nur noch `is_guest=True`-Konten wieder; verifizieren mit Tests „E-Mail eines Google-Nutzers → separates Gast-Konto“ und „wiederholte Gast-Anmeldung → dasselbe Gast-Konto“ sowie einem Dry-Run der Migration auf der Prod-Kopie mit Zählung
- [ ] 1.11 Doku: Schichten, Regel „nur `services/public.py` anderer Produkte“ und gemeinsame Rechte in `backend/AGENTS.md` dokumentieren; verifizieren durch Review des Abschnitts

## 2. Frontend: Workspace und geteilte Pakete

- [ ] 2.1 Frontend: Root-`package.json` mit `workspaces: ["apps/*", "packages/*"]` anlegen; `git mv frontend-food apps/essensplan` und `git mv frontend apps/gruppenstunde` ohne inhaltliche Änderungen; verifizieren mit `npm install` im Root und `npm run build -w apps/essensplan -w apps/gruppenstunde`
- [ ] 2.2 Infra: Makefile-Targets (`essensplan`, `gruppenstunde`, `install`), ein parametrisiertes `Dockerfile.frontend` mit `ARG APP` und die Cloud-Build-Schritte anpassen; `Dockerfile.frontend-food` entfernen; verifizieren mit lokalem `podman build --build-arg APP=essensplan` und `make essensplan`
- [ ] 2.3 Infra: Cloud Build baut und deployt nur Apps, deren Pfad sich geändert hat; Änderungen an `packages/*` lösen alle Apps aus; verifizieren mit zwei Test-Commits (nur `apps/anmeldung` bzw. `packages/ui`) und den ausgelösten Build-Schritten
- [ ] 2.4 Frontend: `packages/ui` anlegen (Tokens, Tailwind-Preset, Basiskomponenten aus den beiden Apps zusammenführen, Sticker-Design des Essensplans als dessen App-Theme); beide Apps darauf umstellen; verifizieren mit `npm run build`, `npm run test` und den UI-Baselines beider Apps
- [ ] 2.5 Frontend: `packages/platform` anlegen (API-Client mit CSRF, `useMe`, Zod-Schemas `userSchema`, `groupSchema`, `membershipSchema`, `sessionSchema` mit `auth_method` und `expires_at`, `UserPicker`, Onboarding-Dialog); Duplikate in beiden Apps entfernen; verifizieren mit Unit-Tests der Schemas gegen Beispielantworten von `/api/auth/me/` und `/api/groups/`
- [ ] 2.6 Frontend: gemeinsame `eslint.config.base.js` mit Verbot von Imports zwischen Apps und von `packages/*` nach `apps/*`; verifizieren, indem ein Testimport `apps/gruppenstunde → apps/essensplan` `npm run lint` rot macht
- [ ] 2.7 Doku: `AGENTS.md`, `apps/*/AGENTS.md` und `openspec/config.yaml` auf die neue Struktur aktualisieren (Regel „Food-UI nur in `apps/essensplan/`“); verifizieren durch Review der Diffs

## 3. Backend: Plattform-SSO

- [ ] 3.1 Backend: Settings `PLATFORM_APPS` und `PLATFORM_SSO_HUB` aus der Umgebung; daraus `ALLOWED_HOSTS`, `CSRF_TRUSTED_ORIGINS` und die Allowlist für `client`, `next` und `return` ableiten; `GET /api/platform/apps/` mit Pydantic `AppLinkOut`; verifizieren mit einem API-Test (anonym 200, vier Apps)
- [ ] 3.2 Backend: Session-Felder `auth_method`, `auth_time`, `auth_expires_at` und `email_verified_at` bei jedem echten Login setzen; Middleware für `session_expired`; `require_recent_login` auf `auth_time` umstellen; `SessionOut` um `auth_method` und `expires_at` erweitern; verifizieren mit Tests für Ablauf, Reauth nach Google-Login und fehlendes `last_login`-Update
- [ ] 3.3 Backend: Models `SsoHandoffToken` (Hash, `client_origin`, `state`, `chain_id`, Auth-Felder aus 3.2, `expires_at`, `used_at`) und `UserSessionLink` mit Migration; Management-Command zum Aufräumen abgelaufener Tokens; verifizieren mit `uv run python manage.py makemigrations --check` und Model-Tests
- [ ] 3.4 Backend: `GET /api/auth/sso/start/` (setzt `sso_state`-Cookie und leitet zum Aussteller weiter; ist schon eine Session da, direkt auf `next`); verifizieren mit Tests für Produkt → Hub, Hub → Aussteller und vorhandene Session
- [ ] 3.5 Backend: `GET /api/auth/sso/authorize/` (unerlaubter `client` → 400; mit Session → Token + 302 zum Callback; ohne Session → `error=login_required`); verifizieren mit Tests für alle drei Fälle
- [ ] 3.6 Backend: `GET /api/auth/sso/callback/` (prüft `state`-Cookie, Token einmalig, Ablauf, Origin; Login ohne `last_login`-Update mit `cycle_key`, `chain_id` und übernommenen Auth-Feldern; Fehler je nach `prompt` auf `next?sso=none` oder `/login`); verifizieren mit Tests für Erfolg, fremden Link ohne Cookie (Login-CSRF), Doppel-Einlösung, falsche Domain, Ablauf und „E-Mail-Session endet auf beiden Domains gleichzeitig“
- [ ] 3.7 Backend: nach erfolgreichem Login (OAuth und später E-Mail) unsichtbar beim Hub hinterlegen (Weiterleitung über `sso/start` des Hubs, Fallback direkt auf `next`); `next` bleibt relativ; verifizieren mit einem Integrationstest Login auf Host A → Hub-Session vorhanden → Host B per `prompt=none` angemeldet
- [ ] 3.8 Backend: `POST /api/auth/logout/` beendet alle Sessions derselben `chain_id` inklusive Hub, andere Geräte bleiben angemeldet; Schalter `SSO_ENABLED`; verifizieren mit einem Test über drei Hosts und ein zweites Gerät
- [ ] 3.9 Backend: Test „Konto löschen nach App-Wechsel verlangt Reauth“ (Session per Handoff, `auth_time` zwei Stunden alt → 401 `reauth_required`); verifizieren mit `uv run pytest core/tests`
- [ ] 3.10 Infra: nginx loggt für `/api/auth/sso/` und `/login/email` keine Query-Strings; verifizieren am lokal gebauten Image mit einem Aufruf und Blick ins Access-Log

## 4. E-Mail-Login

- [ ] 4.1 Backend: Model `EmailLoginRequest` (D8) mit Migration und Aufräum-Command im bestehenden Scheduler-Job; verifizieren mit `makemigrations --check` und Model-Tests (neuer Request entwertet alte)
- [ ] 4.2 Backend: `POST /api/auth/email-login/` (immer 202, Browser-Bindungs-Cookie, Rate-Limit 5/Adresse und 20/IP-Hash pro Stunde → 429 `rate_limited`, 422 bei ungültiger Adresse) mit Pydantic `EmailLoginRequestIn`; verifizieren mit Tests für bekannte und unbekannte Adresse (identische Antwort), Rate-Limit und ungültige Adresse
- [ ] 4.3 Backend: `POST /api/auth/email-login/confirm/` (Token) und `POST /api/auth/email-login/verify-code/` (Code nur mit Bindungs-Cookie, maximal 5 Versuche); Konto anlegen oder Gast-Konto umwandeln; Session mit `auth_method=email` und 4 h absolut; verifizieren mit Tests für Link, Code, fremden Browser, Fehlversuche, Ablauf nach 15 min, GET ohne Wirkung und „aktiv genutzt, trotzdem nach 4 h abgelaufen“
- [ ] 4.4 Backend: Mail-Template (Text und HTML) mit App-Name, Logo und Farbe aus `PLATFORM_APPS`, Link auf die anfragende Domain, Code im Betreff; Varianten „Anmelden“ und „Konto anlegen“; verifizieren mit Snapshot-Tests der gerenderten Mails für zwei Apps
- [ ] 4.5 Backend: Social-Login auf Google und Apple reduzieren; automatische Verknüpfung nur bei bestätigter Anbieter-E-Mail (`SOCIALACCOUNT_EMAIL_AUTHENTICATION`, `…_AUTO_CONNECT`); `GET /api/auth/providers/` liefert `email_login` statt `password_login`; Schalter `EMAIL_LOGIN_ENABLED`; verifizieren mit Tests „E-Mail-Konto meldet sich mit Google an → dasselbe Konto“ und „unbestätigte E-Mail → `email_conflict`“
- [ ] 4.6 Frontend: `EmailLoginForm` (E-Mail → Code-Eingabe mit `autocomplete="one-time-code"`, Erneut-senden nach 60 s, Spam-Hinweis) und `EmailLoginConfirmPage` in `packages/platform`; Zod-Schemas synchron zu 4.2 und 4.3; Hinweis „Mit Google oder Apple bleibst du länger angemeldet“; verifizieren mit Komponenten-Tests bei 320 px und einem Playwright-Test mit Mail aus dem Console-Backend für Link und Code
- [ ] 4.7 Frontend: zentrale Behandlung von 401 `session_expired` in `packages/platform` (Login-Seite mit Meldung, Rücksprung, Entwurfsangebot); verifizieren mit einem Unit-Test des API-Clients und einem E2E-Test mit künstlich abgelaufener Session
- [ ] 4.8 Infra: transaktionalen Mailversand mit SPF/DKIM/DMARC für die Absender-Domains einrichten (Terraform/DNS) und `EMAIL_BACKEND` umstellen; Alarm bei steigender Bounce-Rate; verifizieren mit einer Testmail an ein Gmail- und ein Outlook-Postfach (Header „dkim=pass“)

## 5. Frontend: Konto-App und gemeinsamer Login

- [ ] 5.1 Frontend: gemeinsame Login-Seite in `packages/platform` (Google, Apple, E-Mail-Formular aus 4.6, Fehlermeldungen; Logo und Farbe per Prop), zusammengeführt aus beiden Apps; verifizieren mit Komponenten-Tests für Anbieterliste und Fehlercodes
- [ ] 5.2 Frontend: Login in `apps/essensplan` und `apps/gruppenstunde` auf die gemeinsame Seite umstellen; „Anmelden“ und geschützte Seiten laufen über `sso/start?prompt=login`; verifizieren mit einem Playwright-Test: Login in Gruppenstunde → Essensplan „Anmelden“ → ohne Login-Seite angemeldet
- [ ] 5.3 Frontend: `apps/konto` aufsetzen (Vite, Port 5175, Layout, Routing, gemeinsame Login-Seite); verifizieren mit `make konto` und Startseite anonym/angemeldet
- [ ] 5.4 Frontend: Seiten für Konto & Anmeldung (Trennen des letzten Anbieters erlaubt, Behandlung von `last_connection` entfernt), Profil, Datenschutz, Gruppen (Liste, Detail, Corporate Identity) und Personen übernehmen, inklusive Rücksprung-Link per `return`; verifizieren mit Komponenten-Tests und einem Playwright-Test „Gruppe aus dem Essensplan bearbeiten → zurück“
- [ ] 5.5 Backend + Frontend: E-Mail-Adresse ändern (`POST /api/account/email-change/` mit Reauth, Bestätigungslink an die neue und Hinweis an die alte Adresse, Pydantic `EmailChangeIn` ↔ Zod `emailChangeSchema`); verifizieren mit API-Tests für Erfolg, vergebene Adresse, Reauth und anonym sowie einem Komponenten-Test
- [ ] 5.6 Frontend: Admin-Nutzerliste und Nutzerdetail nach `apps/konto` übernehmen; Staff-Rolle dort vergeben; verifizieren mit einem Test für die 403-Seite bei Nicht-Admin und „Staff vergeben → Food-Admin ohne Neuanmeldung erreichbar“
- [ ] 5.7 Frontend: Profil- und Kontoseiten aus `apps/essensplan` und `apps/gruppenstunde` entfernen und durch Redirects zur Konto-App mit `return` ersetzen; verifizieren, dass `/profile` und `/profile/account` in beiden Apps weiterleiten (E2E)
- [ ] 5.8 Infra: Cloud-Run-Service `inspi-frontend-konto`, Domain-Mapping `konto.gruppenstunde.de` und `PLATFORM_APPS` in Terraform; verifizieren mit `tofu plan` (nur additive Änderungen)

## 6. Frontend: Anmelde-App

- [ ] 6.1 Frontend: `apps/anmeldung` aufsetzen (Port 5176) und alle Event-Seiten, Hooks, Schemas und Komponenten aus `apps/gruppenstunde` dorthin verschieben; Event-Teile aus `MyDashboardPage`, `HomePage` und `ProfilePage` durch Links in die Anmelde-App ersetzen; verifizieren mit `npm run build -w apps/anmeldung` und dem Fehlen von `/events`-Routen und Event-Hooks in `apps/gruppenstunde`
- [ ] 6.2 Frontend: eigene Navigation („Meine Aktionen“, „Meine Anmeldungen“, „Neue Aktion“, Link „Personen verwalten“ in die Konto-App) ohne Fremdprodukte; verifizieren mit einem Komponenten-Test der Navigation
- [ ] 6.3 Frontend: Gast-Anmeldung und Elternzugang ohne Login und ohne SSO-Weiterleitung; gemeinsame Login-Seite mit Logo der Anmelde-App für organisierende Funktionen; verifizieren mit einem Playwright-Test als anonymer Elternteil und einem als angemeldeter Organisator aus Gruppenstunde
- [ ] 6.4 Infra: 301-Redirects `/events/*` in nginx von Gruppenstunde auf die Anmelde-Domain mit Pfad und Query; verifizieren mit `curl -I` gegen das lokal gebaute Image
- [ ] 6.5 Infra: Cloud-Run-Service `inspi-frontend-events` und Domain-Mapping (Domain als Variable) in Terraform; verifizieren mit `tofu plan`

## 7. Gast-Anmeldungen übernehmen

- [ ] 7.1 Backend: `GET /api/events/guest-claims/` (Anzahl nur bei `email_verified_at`) und `POST /api/events/guest-claims/` (Anmeldungen und Personen umhängen, Gast-Konten deaktivieren, in einer Transaktion) mit Pydantic `GuestClaimOut`; verifizieren mit Tests für Erfolg, keine bestätigte E-Mail (Anzahl 0), anonym (401) und mehrere Gast-Konten
- [ ] 7.2 Frontend: Angebot „Wir haben N frühere Anmeldungen gefunden. Übernehmen?“ mit „Nicht jetzt“ in `apps/anmeldung`, Zod `guestClaimSchema` synchron zu 7.1; verifizieren mit einem Komponenten-Test und einem E2E-Test (Gast-Anmeldung → E-Mail-Login → Übernahme)

## 8. App-Switcher und Deep-Links

- [ ] 8.1 Frontend: App-Switcher, Benutzermenü und `appUrl()` in `packages/platform`; Switcher-Links über `sso/start?prompt=none` der Ziel-App; in allen vier Apps einbinden; verifizieren mit einem Komponenten-Test bei 320 px und einem Playwright-Test Gruppenstunde → Essensplan ohne erneute Anbieterauswahl
- [ ] 8.2 Backend: `meal_plan_link` in den Event-Schemas, umgekehrt `event_link` in den Essensplan-Schemas, über die öffentlichen Schnittstellen aus 1.8 inklusive Rechteprüfung; Verknüpfung beim Löschen einer Seite entfernen, ohne das andere Objekt zu löschen; verifizieren mit API-Tests mit und ohne Leserecht und für das Löschen einer Aktion
- [ ] 8.3 Frontend: Deep-Links „Im Essensplan öffnen“ in `apps/anmeldung` und „Zur Aktion“ in `apps/essensplan`, mit Zod-Schemas synchron zu 8.2; verifizieren mit Komponenten-Tests für beide Fälle

## 9. API-Präfixe pro Produkt

- [ ] 9.1 Backend: mehrere `NinjaAPI`-Instanzen mit Präfixen (`/api/auth`, `/api/platform`, `/api/account`, `/api/content`, `/api/supply`, `/api/gruppenstunde`, `/api/events`, `/api/food`), jeweils mit Error-Handlern und eigener Doku; verifizieren mit einem Test, dass jede OpenAPI-Doku nur ihr Präfix enthält, und dass anonym `GET /api/food/meal-plans/` 401 liefert
- [ ] 9.2 Frontend: API-Pfade in allen Apps auf die neuen Präfixe umstellen; verifizieren mit `npm run test` und E2E-Smoke-Tests aller vier Apps

## 10. Integration und Rollout

- [ ] 10.1 Integration: E2E-Durchlauf lokal mit allen vier Apps: E-Mail-Login im Essensplan per Code → per Switcher Gruppenstunde → Anmeldung → Konto, jeweils ohne Login-Seite → nach simulierten 4 h überall abgelaufen; Google-Login in Gruppenstunde → Abmelden überall; fremder Übergabe-Link wird abgelehnt; verifizieren mit grüner Playwright-Suite
- [ ] 10.2 Rollout: OAuth-Redirect-URIs für Google und Apple (mit Apple-Domain-Verifizierung) auf Konto- und Anmelde-Domain eintragen; Prod-Schritte als Dry-Run vorbereiten und erst nach OK ausführen; verifizieren mit Login über Google, Apple und E-Mail auf jeder Domain in Prod
- [ ] 10.3 Rollout: Info-Mail an bestehende Passwort-, Microsoft- und Facebook-Nutzer (Dry-Run mit Empfängerzahl vorab, Versand nur nach OK); danach `AUTH_PASSWORD_LOGIN_ENABLED`, die Passwort-Endpunkte und die Microsoft- und Facebook-Konfiguration entfernen; verifizieren mit `POST /api/auth/login/` → 404 in Prod und einem E-Mail-Login mit einem früheren Passwort-Konto
- [ ] 10.4 Rollout: nach stabilem Betrieb die Schalter `SSO_ENABLED` und `EMAIL_LOGIN_ENABLED` ausbauen; verifizieren, dass der Wechsel zwischen allen vier Apps in Safari und Chrome ohne erneute Anbieterauswahl funktioniert

## Workflow follow-up

- Change nach Umsetzung mit `/opsx:verify` prüfen und danach archivieren.
- Domain-Name der Anmelde-App vor 6.5 festlegen; Anbieter für den Mailversand vor 4.8 festlegen.
