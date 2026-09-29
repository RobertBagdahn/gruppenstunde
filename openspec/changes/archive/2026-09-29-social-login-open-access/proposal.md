## Why

Inspi soll für Besucher offen, verständlich und stabil sein: Alles Öffentliche lesen, alle Funktionen ausprobieren, und erst beim Speichern anmelden – mit einem Klick über einen gängigen Social-Login-Anbieter statt über ein eigenes Passwortsystem. Heute blockieren Seiten-Gates ganze Workflows für anonyme Besucher, einige reine Lese-Endpunkte verlangen Login, „nicht angemeldet“ und „keine Berechtigung“ liefern beide HTTP 403 mit drei verschiedenen Texten, und KI-Kosten sind weder pro Nutzer begrenzt noch instanzübergreifend gedeckelt (das Cache-Limit gilt pro Cloud-Run-Instanz).

## What Changes

- **BREAKING** Anmeldung ausschließlich per Social Login über `django-allauth` (`allauth.socialaccount`): Google, Apple, Microsoft und Facebook. Instagram wird nicht angeboten (Meta hat die Consumer-Login-API eingestellt). Bestehende Konten werden über die verifizierte E-Mail automatisch verknüpft.
- **BREAKING** Die API-Endpunkte `POST /api/auth/login/` und `POST /api/auth/register/` sowie die Seiten `/login` (Passwortformular) und `/register` beider Frontends entfallen. `/login` wird zur Anbieter-Auswahl. Django-Admin (`/admin/`) behält den Passwort-Login als Notfallzugang für Superuser.
- Nur in Entwicklung und Tests: `POST /api/auth/dev-login/` für lokale Entwicklung und E2E-Tests, in Produktion technisch ausgeschlossen.
- **BREAKING** `GET /api/auth/me/` antwortet immer mit HTTP 200 und `{ is_authenticated, user }`, statt anonym HTTP 403 zu liefern.
- Neue Endpunkte: `GET /api/auth/providers/`, `GET/DELETE /api/auth/connections/`, `GET /api/ai/quota/`.
- **BREAKING** Einheitliche Fehlerverträge: HTTP 401 `auth_required` für fehlende Anmeldung, HTTP 403 `permission_denied` für fehlende Rechte, HTTP 429 für KI-Budgets. Alle Fehlerantworten tragen `detail` (Deutsch) und `code`. Ein zentraler Helfer ersetzt 13 duplizierte `_require_auth`-Funktionen.
- Offener Lesezugriff: Alle öffentlichen Inhalte und Ansichten sind anonym lesbar, auch öffentliche Essenspläne mit Kosten, Nährwerten, Kochplan und PDF, Rezept-PDF, Material-Detail und Zutaten-Vorschläge. Die zentrale Food-Rechteprüfung (`food_access`) bleibt maßgeblich.
- „Ausprobieren ohne Speichern“: Erstell-Formulare und Assistenten sind anonym nutzbar. Speichern öffnet einen Anmeldedialog, der Entwurf wird lokal gesichert und nach dem OAuth-Rücksprung wiederhergestellt.
- KI-Budgets nach Stufen, gemessen in Euro auf Basis von `AiInteraction.cost_eur` in der Datenbank (instanzübergreifend):
  - Anonym: gemeinsamer Topf ≤ 0,05 € pro rollierender Stunde für alle Besucher zusammen, zusätzlich ein Fairness-Limit pro Besucher über einen gehashten, täglich rotierenden Schlüssel (keine Klar-IPs).
  - Angemeldete Nutzer: Tagesbudget (Standard 0,30 €, konfigurierbar).
  - Staff und Admin: 3,00 € pro Tag.
- Anonyme KI nur für „Rezept erkennen“ (Link oder Text → Rezeptentwurf) und „Zutat erkennen“ (Link oder Name → Zutatenentwurf), jeweils im Vorschaumodus ohne Datenbankschreibzugriffe, mit kostenlosem Pfad zuerst (strukturierte Daten), Antwort-Cache und begrenzten Tokens. Alle anderen KI-Funktionen sind sichtbar, aber mit Erklärung „nach Anmeldung verfügbar“ markiert.
- Nutzerverwaltung:
  - Kontobereich im Profil: verknüpfte Anbieter, weiteren Anbieter verbinden oder trennen, Abmelden, KI-Kontingent.
  - Onboarding nach dem ersten Login: Namen vom Anbieter übernehmen, Pfadfindername optional.
  - Admin-Nutzerdetail: Anbieter, letzter Login, KI-Verbrauch.
- **BREAKING** Konto löschen ohne Passwort: Bestätigungstext plus frische Anmeldung (innerhalb von 15 Minuten), sonst Aufforderung zur erneuten Anmeldung beim Anbieter. Verknüpfte Social-Accounts werden bei der Anonymisierung entfernt.
- Proxy- und Host-Korrektur: nginx reicht `X-Forwarded-Host` durch, Django nutzt ihn. So stimmen die OAuth-Callback-URLs auf `gruppenstunde.de` und `essensplan.app`. Auf beiden Domains meldet man sich getrennt an.

## Capabilities

### New Capabilities
- `social-login`: Nur Social Login (Google, Apple, Microsoft, Facebook), Anbieterliste, Login-/Logout-Flow mit sicherem `next`-Rücksprung, Kontoverknüpfung per E-Mail, Fehlerbehandlung beim Rücksprung, Dev-Login nur außerhalb der Produktion, Admin-Passwort-Notfallzugang, getrennte Sessions pro Domain.
- `open-access`: Anonymer Lesezugriff auf alle öffentlichen Inhalte und Ansichten, „Ausprobieren ohne Speichern“, Anmeldedialog mit Entwurfssicherung und Wiederherstellung, erklärende Hinweise für anmeldepflichtige Funktionen.
- `auth-error-contract`: Einheitliche Fehlercodes und Statuscodes (401/403/429) mit deutschen Meldungen, zentraler Backend-Helfer und zentrale Frontend-Behandlung.
- `ai-budget`: KI-Stufen (anonym, Nutzer, Staff), Euro-Budgets mit Reservierung und Abrechnung, anonymer Stundentopf und Fairness-Limit, Tagesbudgets, Kontingent-Endpunkt, anonyme Allowlist mit Vorschaumodus und Cache.
- `account-management`: Kontobereich (Anbieter verbinden/trennen, Abmelden, KI-Kontingent), Onboarding nach dem ersten Login, Benutzermenü, Admin-Nutzerdetail mit Anbietern und KI-Verbrauch.

### Modified Capabilities
- `auth-session`: Session-Authentifizierung entsteht nur noch über Social Login bzw. Dev-Login statt über E-Mail und Passwort. `/me/` antwortet anonym mit HTTP 200.
- `gemini-rate-limit`: „Authentifizierung für alle Gemini-Aufrufe“ wird durch stufenbasierte Budgets ersetzt (anonyme Allowlist erlaubt). Das Cache-Limit wird zur Burst-Absicherung pro Instanz herabgestuft.
- `privacy`: Konto-Löschung ohne Passwort (Bestätigungstext plus frische Anmeldung), Anonymisierung entfernt verknüpfte Social-Accounts, Frontend-Dialog ohne Passwortfeld.

## Impact

- **Backend-Apps:**
  - `core`: Auth-API, neues `core/permissions.py`, Fehler-Handler, Gemini-Budget
  - `content`: `AiInteraction`-Felder, neues `AiBudgetBucket`, Helfer
  - `profiles`: Konto-Löschung, Onboarding-Felder
  - `recipe`, `supply`, `planner`, `shopping`, `packinglist`, `event`: Austausch von `_require_auth`, offene Lese-Endpunkte, Vorschaumodus
  - `inspi/settings`, `inspi/urls.py`
- **Abhängigkeiten:** `django-allauth[socialaccount]` (bereits `>=65,<66`), Provider Google, Apple, Microsoft, Facebook. OAuth-Client-Secrets kommen über Secret Manager bzw. Terraform.
- **Pydantic-Schemas:** `UserOut` → `SessionOut`/`UserOut` (zusätzlich `providers`, `needs_onboarding`), neu `AuthProviderOut`, `SocialConnectionOut`, `AiQuotaOut`, `ErrorOut` (`detail`, `code`, `retry_after_seconds`), `DeleteAccountRequestSchema` ohne `password`, Recognize-Vorschau-Schemas für Rezept und Zutat.
- **Zod-Schemas:** `frontend/src/schemas/auth.ts`, `frontend-food/src/schemas/auth.ts`, neu `schemas/ai.ts` (Kontingent), `schemas/errors.ts`, Privacy-Schema in beiden Frontends.
- **Migrationen:**
  - `socialaccount`-Tabellen (Allauth)
  - `content.AiInteraction`: `tier`, `reserved_cost_eur`, `anon_key`, `feature`
  - neues Model `content.AiBudgetBucket`
  - neues Model `content.AiResultCache` (instanzübergreifender Antwort-Cache für die Vorschau)
  - `profiles.UserProfile.onboarded_at`
- **Frontends:**
  - Login-Seite und Anmeldedialog, Benutzermenü, Kontobereich im Profil
  - Entfernen seitenweiter `UnauthGate`s in Erstell-Workflows, Entwurfs-Hook, zentrale Behandlung von 401/429
  - Food-spezifische Seiten nur in `frontend-food/`
- **Infrastruktur:** `nginx.conf.template` (`X-Forwarded-Host`), `USE_X_FORWARDED_HOST`, Terraform-Secrets für die OAuth-Clients, Redirect-URIs pro Domain in den Anbieter-Konsolen.
- **E2E:** Fixtures wechseln auf den Dev-Login.
