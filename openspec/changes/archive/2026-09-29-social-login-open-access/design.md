## Context

**Heutiger Stand:**
- **Anmeldung:** eigene Ninja-Endpunkte in `backend/core/api.py` (`/api/auth/login|register|logout|me|csrf/`) mit E-Mail und Passwort. `django-allauth` 65 ist installiert, aber nur `allauth` und `allauth.account` sind aktiv, ohne `socialaccount` und ohne eingebundene Allauth-URLs.
- **Hosting:** zwei Frontends auf zwei Domains (`gruppenstunde.de` → `frontend/`, `essensplan.app` → `frontend-food/`). nginx proxyt nur `/api/` an das Cloud-Run-Backend und setzt dabei `Host` auf den Backend-Host. Django kennt die Ursprungsdomain also nicht.
- **Rechte:** zentrale Food-Policy `content/services/food_access.py`, `GroupMembership` (member/admin), `ContentCollaborator`, `User.is_staff`/`is_superuser`. Anmeldeprüfungen stecken in 13 duplizierten `_require_auth`/`require_auth`-Helfern, alle mit HTTP 403 und drei unterschiedlichen Texten. `GeminiAuthError` liefert ebenfalls 403.
- **KI:**
  - Alle Aufrufe laufen über `core/services/gemini.py` (`gemini_call`, `gemini_image_call`, `gemini_embed`).
  - Jede Interaktion wird mit Tokens und `cost_eur` in `content.AiInteraction` protokolliert.
  - Das „globale“ Limit steht im Default-Cache (LocMem, pro Prozess) bei bis zu 10 Instanzen und ist damit nicht global.
  - Es gibt kein Budget pro Nutzer.
  - Preise liegen in `GEMINI_PRICING` (Flash-Lite: 0,25 $ Eingabe / 1,50 $ Ausgabe pro 1 Mio. Tokens).
- **Frontend:**
  - `useCurrentUser` wertet 403 als „anonym“.
  - `UnauthGate` sperrt ganze Seiten (Essensplan-Assistent, Zutat anlegen, Einkaufslisten, Planner).
  - `frontend-food/src/lib/api.ts` hat bereits `ApiError` mit `status` und `code`, das Haupt-Frontend nicht.
- **Tests:** laufen mit SQLite (`inspi/settings/test.py`), E2E-Fixtures melden sich per Passwort an.

Entscheidungen des Product Owners:
- 3 bis 5 gängige Anbieter von Anfang an.
- Admin-Passwort als Notfallzugang bleibt.
- Dev-Login für lokal und E2E.
- Staff und Admin erhalten 3 € KI-Budget pro Tag.
- Anonym sind „Rezept erkennen“ und „Zutat erkennen“ verfügbar.
- Getrennte Anmeldung pro Domain ist gewollt.

## Goals / Non-Goals

**Goals:**
- Anmeldung nur per Social Login, praktisch ohne Reibung: ein Klick, lange Sessions, automatische Verknüpfung bestehender Konten.
- Besucher können alles Öffentliche lesen und alle Funktionen ausprobieren; nur Speichern verlangt eine Anmeldung, und Entwürfe bleiben dabei erhalten.
- Klare, deutsche, maschinenlesbare Fehler (401 vs. 403 vs. 429 mit `code`).
- Harte, instanzübergreifende KI-Kostengrenzen: anonym ≤ 0,05 € pro Stunde gesamt, Nutzer und Staff mit Tagesbudget.
- Keine Änderung am Rechtemodell: Social Login liefert nur die Identität.

**Non-Goals:**
- Single Sign-on zwischen `gruppenstunde.de` und `essensplan.app`.
- Gruppenbasierte KI-Budgets (nur vorbereitet über `resolve_ai_tier`).
- Bezahlte Kontingente oder Kontingent-Kauf.
- Rate-Limiting nicht-KI-basierter öffentlicher Lese-Endpunkte (eigene Änderung, falls nötig).
- Instagram-Login.

## Decisions

### D1: Klassisches `allauth.socialaccount` statt `allauth.headless`

Wir aktivieren `allauth.socialaccount` mit den Providern `google`, `apple`, `microsoft` und `facebook` und binden `allauth.urls` unter `/api/accounts/` ein. Der Login startet per Formular-POST (`SOCIALACCOUNT_LOGIN_ON_GET=False`) mit `next`. Nach dem Callback setzt Allauth die normale Django-Session und leitet auf `next` weiter. Eigene, schlanke Ninja-Endpunkte unter `/api/auth/` liefern Session, Anbieter und Verknüpfungen mit Pydantic/Zod-Verträgen und deutschen Fehlern.

- *Alternative headless:* Headless bietet eine fertige JSON-API, bringt aber einen zweiten API-Stil mit eigenen Fehlerformaten, eigene Zod-Schemas für Allauth-Antworten und mehr Oberfläche mit sich. Für reine Redirect-Flows ohne Passwort, MFA oder E-Mail-Formulare ist der klassische Weg kleiner und stabiler.
- *Alternative eigene OAuth-Implementierung:* Sie verworfen, weil sie sicherheitskritisch und wartungsintensiv ist.

Adapter in `backend/core/auth/adapters.py`:
- `NoPasswordAccountAdapter.is_open_for_signup()` → `False` für lokale Kontoanlage.
- `SocialAccountAdapter`:
  - `is_open_for_signup` → `True`.
  - `populate_user`: Namen übernehmen, `username` aus der E-Mail ableiten und eindeutig machen.
  - `pre_social_login`: nur bei verifizierter E-Mail automatisch verknüpfen, sonst Redirect `email_conflict`.
  - `on_authentication_error` → Redirect auf `/login?error=<code>&next=…`.
  - `get_login_redirect_url`: `next` über `url_has_allowed_host_and_scheme` prüfen.

Settings:
- `SOCIALACCOUNT_AUTO_SIGNUP=True`
- `SOCIALACCOUNT_EMAIL_AUTHENTICATION=True`
- `SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT=True`
- `SOCIALACCOUNT_EMAIL_REQUIRED=True`
- `SOCIALACCOUNT_STORE_TOKENS=False`, weil wir keine Provider-API nutzen und damit weniger personenbezogene Daten speichern.
- `ACCOUNT_EMAIL_VERIFICATION="none"`, weil die Anbieter-E-Mails verifiziert sind.

Allauth-Templates für Fehler und Zwischenschritte werden durch Redirects in die SPA ersetzt. Ein minimales Fallback-Template `socialaccount/authentication_error.html` leitet per Meta-Refresh weiter.

### D2: Provider-Konfiguration über Settings/Env statt `SocialApp`-Datenbankzeilen

`SOCIALACCOUNT_PROVIDERS[<provider>]["APPS"]` wird aus Umgebungsvariablen gebaut (`GOOGLE_OAUTH_CLIENT_ID/SECRET`, `APPLE_…` inklusive Key-ID, Team-ID und Private Key, `MICROSOFT_…` mit Tenant `common`, `FACEBOOK_…`). Ist für einen Provider nichts konfiguriert, taucht er nicht auf (`GET /api/auth/providers/` filtert). Das vermeidet `SITE_ID`-Kopplung und manuelle Admin-Pflege; die Secrets kommen aus dem Secret Manager (Terraform).

### D3: Ursprungsdomain über `X-Forwarded-Host`

`nginx.conf.template` ergänzt `proxy_set_header X-Forwarded-Host $host;`. `production.py` setzt `USE_X_FORWARDED_HOST=True` und erweitert `ALLOWED_HOSTS` um `essensplan.app` und `www.essensplan.app`. Damit baut Allauth die Callback-URLs `https://<domain>/api/accounts/<provider>/login/callback/`, und die Session gilt auf der richtigen Domain. In den Anbieter-Konsolen werden pro Domain und für `localhost:5173/5174` Redirect-URIs eingetragen.

### D4: Fehlervertrag und zentrale Rechte-Helfer

- `backend/core/errors.py`: `ApiError(HttpError)` mit `status`, `code`, `detail` und optional `retry_after_seconds`, dazu ein Handler, der in `inspi/urls.py` per `api.add_exception_handler` registriert wird. Er behandelt `ApiError`, übersetzt normale `HttpError` in `{detail, code: "error"}` und `AuthenticationError`/`Http404` konsistent.
- `backend/core/permissions.py`: `require_login(request, action: str | None = None) -> User`, `require_staff(request) -> User`, `deny(detail: str | None = None) -> NoReturn`, `require_recent_login(request, minutes=15)`. Alle 13 lokalen Helfer werden ersetzt, direkte `HttpError(403, "Anmeldung erforderlich")` ebenfalls.
- Die Gemini-Fehlerklassen erben von `ApiError` mit den Codes `ai_login_required`, `ai_quota_exceeded`, `ai_public_budget_exhausted`, `ai_visitor_limit`, `ai_rate_limited`, `ai_unavailable` und `ai_invalid_response`.
- Pydantic `ErrorOut` in `core/schemas.py`; Zod `apiErrorSchema` in `frontend/src/schemas/errors.ts` und `frontend-food/src/schemas/errors.ts`.

*Alternative:* Anonymen Zugriff weiter mit 403 beantworten und das Frontend über den Text unterscheiden lassen. Verworfen, weil das fragil und nicht maschinenlesbar ist.

### D5: KI-Budget in der Datenbank mit Reservierung

Neues Modul `backend/core/services/ai_budget.py`:

```text
gemini_call(user, feature, request_meta, ...)
  └─ budget.reserve(tier, user, anon_key, feature, est_cost)   # atomar
       with transaction.atomic():
         AiBudgetBucket.objects.select_for_update().get(key=<tier-scope>)
         used = Σ coalesce(cost_eur, reserved_cost_eur)
                über AiInteraction im Fenster (Reservierungen < 10 min)
         if used + est_cost > limit: raise ApiError(429, ...)
         AiInteraction.create(tier, anon_key, feature, reserved_cost_eur=est_cost)
  └─ Gemini-Aufruf
  └─ _update_interaction(cost_eur=Ist-Kosten)
```

- **Sperrschlüssel:** `anonymous` (ein Bucket für alle Besucher) bzw. `user:<id>`. Die Bucket-Zeile wird per `get_or_create` angelegt. `select_for_update` serialisiert auf PostgreSQL über alle Instanzen; in SQLite-Tests serialisiert die Datenbank ohnehin.
- **Schätzung:** `est_cost = (len(prompt_chars)/3 * in_price + max_output_tokens * out_price) * USD_TO_EUR`. Jeder Aufruf aus dem anonymen Pfad setzt ein festes `max_output_tokens`, damit die Schätzung eine Obergrenze ist.
- **Neue Felder auf `AiInteraction`:** `tier` (Choices, indiziert mit `created_at`), `feature` (CharField), `anon_key` (CharField 64, indiziert), `reserved_cost_eur` (Decimal).
- **Neues Model `AiBudgetBucket`:** `key` (unique), `updated_at`.
- **Fensterabfragen:**
  - anonym: `tier="anonymous", created_at >= now-60min`
  - Nutzer: `user=…, tier in (user, staff), created_at >= Tagesbeginn Europe/Berlin`
  - Die Indizes `(tier, created_at)` und `(user, created_at)` halten das günstig.
- **Tier-Auflösung:** `resolve_ai_tier(user)` → `system` wenn `bypass_limits`, `anonymous` wenn nicht angemeldet, `staff` wenn `is_staff or is_superuser`, sonst `user`. Die Limits kommen aus Settings.
- **Burst-Guard:** Der bisherige Cache-Zähler bleibt als Absicherung gegen Endlosschleifen pro Instanz; er ist nicht Teil der Kostenkontrolle.
- **Rechenbeispiel:** Eine anonyme Rezepterkennung mit ~6k Eingabe- und ≤ 2k Ausgabe-Tokens liegt bei ≈ 0,0045 $ ≈ 0,41 ct. Der Stundentopf von 5 ct reicht also für etwa 10 bis 12 KI-Erkennungen; Cache-Treffer und JSON-LD-Erkennungen sind kostenlos.

*Alternativen:*
- Redis/Memorystore als gemeinsamer Zähler: zusätzliche Infrastruktur und Kosten, und die Ist-Kosten liegen ohnehin in der Datenbank.
- Postgres-Advisory-Locks: funktionieren nicht mit den SQLite-Tests.
- Zählen von Aufrufen statt Euro: bildet das Kostenziel nicht genau ab.

### D6: Besucherschlüssel ohne Klar-IP

`anon_key = HMAC_SHA256(key=SHA256(SECRET_KEY + "ai-anon" + date_berlin), msg=client_ip + "|" + user_agent)`. Die Client-IP ist der erste Eintrag aus `X-Forwarded-For`, den nginx bzw. Cloud Run setzt. Der Schlüssel rotiert täglich, sodass keine Verfolgung über Tage möglich ist. Das Fairness-Limit zählt `AiInteraction` mit diesem `anon_key` in den letzten 60 Minuten.

### Umsetzungsnotizen (Abweichungen)

- Statt eines neuen Felds `feature` dient das vorhandene `AiInteraction.context` als Funktionskennung; die anonyme Allowlist ist `ANONYMOUS_AI_CONTEXTS` in `core/services/ai_budget.py`. So musste kein Aufrufer angepasst werden.
- Das Fairness-Limit pro Besucher zählt Euro (0,02 €/h), nicht Aufrufe, weil eine Rezepterkennung mehrere Gemini-Aufrufe auslöst.
- Der Besucherschlüssel wird von `core.middleware.AiRequestContextMiddleware` per `ContextVar` bereitgestellt, damit `gemini_call` keinen Request-Parameter braucht.
- Anonyme Portionsauflösung nutzt `_resolve_portion` in einem zurückgerollten Savepoint (gleiche Matching-Regeln, keine Schreibzugriffe).
- `suggest_ingredients` (Fuzzy-Suche) filtert jetzt über `visible_ingredient_queryset`, da es anonym offen ist.
- `search_recipes` im Essensplan-Editor bleibt anmeldepflichtig (nur beim Bearbeiten sinnvoll).
- `POST /api/profile/me/onboarding/` nimmt nur Namen entgegen; der Gruppenbeitritt im Onboarding nutzt die bestehenden Gruppen-Endpunkte.
- `require_staff` akzeptiert wie die bisherigen lokalen Helfer `is_staff` oder `profile.role in (staff, admin)`.
- Staff-E-Mail-Adressen werden per Datenmigration als verifiziert markiert, damit Allauths Passwort-Wipe bei der E-Mail-Verknüpfung den `/admin/`-Notfallzugang nicht löscht.

- Statt einer `LockedFeature`-Hülle gibt es den Hook `useAiAccess({ anonymousAllowed, description })` (beide Frontends): liefert `locked` (Schloss via `AiLockBadge`, Klick öffnet den Anmeldedialog), `disabled` + `hint` (Kontingent aufgebraucht) und `guard(action)`. KI-Hooks tragen `meta: AI_META`; der QueryClient aktualisiert danach `/api/ai/quota/`.
- Die optionale KI-Neusortierung der Essensplan-Vorschläge fällt bei Budget-/Login-Fehlern auf die regelbasierte Reihenfolge zurück, statt die Vorschläge scheitern zu lassen.

### D7: Anonyme Allowlist und Vorschaumodus

`gemini_call(..., feature=AiFeature.RECIPE_RECOGNIZE | INGREDIENT_RECOGNIZE | …)`. `ANONYMOUS_AI_FEATURES = {recipe_recognize, ingredient_recognize}`. Für anonyme Aufrufe mit anderem `feature` wirft `gemini_call` `ai_login_required`, noch bevor ein Budget reserviert wird. Die Endpunkte der Allowlist rufen statt `require_login` den Helfer `optional_user(request)` auf.

**Rezept erkennen** (`POST /api/recipes/smart-input/`): `import_recipe_from_url(..., persist=request.user.is_authenticated)`. Mit `persist=False`:
- keine `Ingredient.objects.create`, `Portion.get_or_create`, `IngredientAlias.create` oder `MeasuringUnit.get_or_create`;
- nicht zuordenbare Zutaten erscheinen im Entwurf mit `is_new: true` und Rohdaten (Name, Menge, Einheit);
- Enrichment-Aufrufe (Nährwerte für neue Zutaten) entfallen, es bleiben nur Extraktion und Zuordnung.

Die Zuordnung nutzt die bestehende Kandidatenwahl, eingeschränkt auf für Anonyme lesbare Zutaten; das entspricht `food-access-policy` („Ingredient reference exceptions“).

**Zutat erkennen:**
- `POST /api/ingredients/import-from-url/` schreibt bereits nichts und wird für Anonyme geöffnet.
- Neu ist `POST /api/ingredients/ai-preview/` mit `{ name }` → `IngredientDraftOut`. Dafür wird die Generierungsstufe aus `ai_create_ingredient` als reine Funktion `generate_ingredient_draft(name, user)` herausgelöst; `ai_create` ruft sie auf und speichert anschließend.

**Ergebnis-Cache:** neues Model `content.AiResultCache` (`feature`, `input_hash` SHA-256 der normalisierten Eingabe, `payload` JSON, `expires_at`; unique auf `(feature, input_hash)`). Er wird für alle Stufen gelesen, aber nur mit Ergebnissen aus dem Vorschaumodus beschrieben, damit keine nutzerspezifischen IDs darin landen. Die Datenbank ist hier die richtige Ablage, weil der Cache instanzübergreifend wirken muss.

**Kostenloser Pfad zuerst:** Für Links versucht `smart-input` zuerst das bestehende JSON-LD-Parsing (`recipe/services/import_service.py`). Nur die Zutatenzuordnung und Links ohne strukturierte Daten brauchen Gemini.

**Eingabebegrenzung:** Text über 8.000 Zeichen → 422 `input_too_long`.

**SSRF:** Link-Abrufe für Anonyme laufen über `core/services/url_safety.py`, wie bereits bei angemeldeten Nutzern.

### D8: Frontend – Anmeldedialog, Entwürfe, zentrale Fehler

In beiden Frontends:
- **`store/loginPromptStore.ts`** (Zustand): `{ open, reason, draftKey, mode: 'login' | 'reauth' }`.
- **`components/auth/LoginDialog.tsx`:** Anbieter-Buttons aus `useAuthProviders()`. Jeder Button ist ein verstecktes `<form method="post" action="/api/accounts/<p>/login/">` mit `csrfmiddlewaretoken`, `next` = aktueller Pfad plus Suche plus `?restoreDraft=<key>` und `process=login|connect`. Dazu Vorteile-Liste, Datenschutz-Link und Dev-Login-Feld, wenn `dev_login`.
- **`hooks/useDraft.ts`:** `useDraft<T>(key, value, { restore })` speichert entprellt in `localStorage` (`draft:<key>` mit `savedAt`), stellt bei `restoreDraft=<key>` wieder her und löscht nach Erfolg bzw. nach 7 Tagen.
- **`hooks/useRequireLogin.ts`:** `guard(reason, draftKey, action)` führt `action` aus, wenn der Nutzer angemeldet ist; sonst sichert es den Entwurf und öffnet den Dialog.
- **`lib/api.ts`:** Das Haupt-Frontend übernimmt `ApiError` und `parseApiResponse` aus frontend-food. In beiden Frontends erhält der `QueryClient` einen globalen `MutationCache({ onError })`, der nach `code` verzweigt, wie in `auth-error-contract` beschrieben.
- **Auth-API:** `useCurrentUser()` liest `{ is_authenticated, user }`. `useLogout()` leert `['auth']` und entfernt nutzerspezifische Queries.
- **`UnauthGate`** wird zu `LoginEmptyState` für „Meine …“-Seiten. In Erstell-Workflows entfällt das Gate, stattdessen greift `guard` beim Speichern.
- **`/login`:** Anbieter-Auswahl mit Fehleranzeige aus `?error=`. `/register` leitet auf `/login` um.

*Alternative:* Entwürfe serverseitig anonym speichern. Verworfen, weil „ohne Anmeldung nichts speichern“ explizit gewünscht ist und es Missbrauchs- und Datenschutzfragen aufwirft.

### D9: Dev-Login

`POST /api/auth/dev-login/` wird nur registriert, wenn `settings.AUTH_DEV_LOGIN_ENABLED` aktiv ist: in `local.py` `True`, in `test.py` `True`, in `base.py` `False`. `production.py` wirft `ImproperlyConfigured`, falls es aktiv ist. Legt den Nutzer bei Bedarf an (nur lokal) und nutzt `login(request, user, backend="django.contrib.auth.backends.ModelBackend")`. Die E2E-Fixtures (`e2e/fixtures/food.ts`, `e2e/tests/auth.spec.ts`, `authenticated.spec.ts`) wechseln darauf.

### D10: Sessions und Admin

- `SESSION_COOKIE_AGE = 30 Tage`, `SESSION_SAVE_EVERY_REQUEST = True`.
- `AUTHENTICATION_BACKENDS` behält `ModelBackend` für `/admin/` (Notfallzugang) und `allauth…AuthenticationBackend`.
- Frische Anmeldung für die Konto-Löschung: Allauth setzt bei jedem Social Login `user.last_login`; `require_recent_login` prüft `now - last_login <= 15 min`.

### D11: Offene Lese-Endpunkte

In folgenden Endpunkten wird `_require_auth` durch Policy-basierte Sichtbarkeit ersetzt (anonym → nur öffentlich, sonst 404):
- `planner/api/meal_plan.py`: `list_meal_plans`, `get_meal_plan`, `cost_summary`, `nutrition_summary`, `plan_check`, `get_cooking_schedule`, `export_pdf`, `export_cooking_schedule_pdf` und `search_recipes` (nur öffentliche Rezepte).
- `recipe/api/recipes.py`: `export_recipe_pdf`.
- `supply/api/materials.py`: `get_material`, `get_material_by_slug`.
- `supply/api/ingredients.py`: `suggest_ingredients`.

`recently_used_recipes`, `list_group_members`, `my-*`-Endpunkte und Admin-Endpunkte bleiben anmeldepflichtig, weil sie persönlich sind.

Für Essenspläne kommt in `food_access` ein Helfer `visible_meal_plan_queryset(user)` hinzu, der anonym `visibility="public"` liefert. Er folgt dem Muster „Object check und Queryset stimmen überein“.

### Betroffene Dateien (Überblick)

- **Backend:**
  - `pyproject.toml` (`django-allauth[socialaccount]`)
  - `inspi/settings/{base,local,test,production}.py`, `inspi/urls.py`
  - `core/api.py`, neu: `core/errors.py`, `core/permissions.py`, `core/auth/adapters.py`, `core/services/ai_budget.py`, `core/api_ai.py` (Kontingent)
  - `core/services/gemini.py`, `core/schemas.py`
  - `content/models/ai_interaction.py`, neu: `content/models/ai_budget.py` (`AiBudgetBucket`, `AiResultCache`), `content/choices.py` (`AiTier`, `AiFeature`)
  - `content/admin_api.py` (Nutzerdetail und -liste)
  - `profiles/models/profile.py` (`onboarded_at`), `profiles/api/profile.py` (Onboarding), `profiles/services/privacy.py`, `profiles/schemas/privacy.py`
  - `recipe/api/recipes.py`, `recipe/services/url_import_service.py`
  - `supply/api/ingredients.py`, `supply/services/ingredient_ai_suggest_service.py`, `supply/api/materials.py`
  - `planner/api/meal_plan.py`, `content/services/food_access.py`
  - alle Dateien mit lokalen `_require_auth`-Helfern (siehe Tasks)
- **Frontend (Haupt):**
  - `src/api/auth.ts`, `src/schemas/{auth,errors,ai}.ts`, `src/lib/api.ts`
  - `src/pages/LoginPage.tsx`, `RegisterPage.tsx` (entfernen bzw. umleiten)
  - `src/components/Layout.tsx`, neu: `src/components/auth/*`, `src/store/loginPromptStore.ts`, `src/hooks/{useDraft,useRequireLogin}.ts`
  - `src/pages/profile/PrivacyPage.tsx`, neu: `src/pages/profile/AccountPage.tsx`
  - `src/pages/AdminUserDetailPage.tsx`, `src/pages/PackingListWizardPage.tsx`, `src/pages/PlannerPage.tsx`, `src/App.tsx`
- **Frontend (Food):**
  - dieselben Bausteine unter `frontend-food/src/…`
  - `components/layout/FoodLayout.tsx`, `hooks/usePermissions.ts`
  - `pages/recipes/CreateRecipePage.tsx`, `pages/ingredients/CreateIngredientPage.tsx`, `pages/planning/wizard/MealPlanWizardPage.tsx`, `pages/shopping/ShoppingListPage.tsx`, `pages/recipes/MyRecipesPage.tsx`, `pages/profile/MyProfilePage.tsx`
- **Infrastruktur:** `nginx.conf.template`, `terraform/` (Secrets und Env für die OAuth-Clients), `.env.example`
- **E2E:** `e2e/fixtures/food.ts`, `e2e/tests/auth.spec.ts`, `e2e/tests/authenticated.spec.ts`

### API-Änderungen

| Methode | Pfad | Request | Response | Hinweis |
|---|---|---|---|---|
| GET | `/api/auth/me/` | – | `SessionOut { is_authenticated, user: UserOut \| null }` | immer 200 |
| GET | `/api/auth/providers/` | – | `{ providers: AuthProviderOut[], dev_login: bool }` | anonym |
| POST | `/api/auth/logout/` | – | `MessageOut` | |
| POST | `/api/auth/dev-login/` | `{ email }` | `UserOut` | nur wenn aktiviert |
| GET | `/api/auth/connections/` | – | `SocialConnectionOut[]` | 401 anonym |
| DELETE | `/api/auth/connections/{id}/` | – | 204 | 400 `last_connection` |
| POST | `/api/auth/privacy/delete-account/` | `{ confirmation }` | `MessageOut` | 401 `reauth_required` |
| POST | `/api/profile/me/onboarding/` | `{ first_name?, last_name?, scout_name?, join_code? }` | `ProfileOut` | |
| GET | `/api/ai/quota/` | – | `AiQuotaOut` | anonym erlaubt |
| POST | `/api/ingredients/ai-preview/` | `{ name }` | `IngredientDraftOut` | anonym erlaubt |
| POST | `/api/recipes/smart-input/` | unverändert | unverändert, Zutaten mit `is_new` | anonym im Vorschaumodus |
| POST | `/api/ingredients/import-from-url/` | unverändert | unverändert | anonym erlaubt |
| – | `/api/accounts/…` | Allauth | Redirects | OAuth-Start und Callback |
| ENTFÄLLT | `/api/auth/login/`, `/api/auth/register/` | | | |

### Datenbank-Migrationen

- `socialaccount` (Allauth-Migrationen: `SocialApp`, `SocialAccount`, `SocialToken`)
- `content`:
  - `AiInteraction` + `tier` (Default `user`; Datenmigration: `user IS NULL` → `system`, Nutzer mit `is_staff` → `staff`)
  - `AiInteraction` + `feature`, `anon_key`, `reserved_cost_eur`
  - Indizes `(tier, created_at)`, `(anon_key, created_at)`
  - neue Models `AiBudgetBucket`, `AiResultCache`
- `profiles`: `UserProfile.onboarded_at` (nullable; Datenmigration: bestehende Profile → `created_at`, damit Bestandsnutzer kein Onboarding sehen)

## Risks / Trade-offs

- **[Nutzer mit Nicht-Google-Adresse verlieren den Zugang]** Wer sich bisher mit `@web.de` angemeldet hat, hat evtl. kein passendes Anbieterkonto. → Microsoft-Konten sind mit jeder E-Mail-Adresse anlegbar. Staff kann über den Django-Admin die E-Mail eines Kontos anpassen. Vor dem Deployment wird eine Hinweis-Mail an Bestandsnutzer verschickt.
- **[Übernahme über nicht verifizierte Anbieter-E-Mail]** → Automatische Verknüpfung nur bei `verified_email`/`email_verified`. Allauth prüft das pro Provider; Facebook liefert keine Verifikation und verknüpft deshalb nie automatisch.
- **[Apple-Kosten und Komplexität]** Apple braucht einen Developer-Account (99 $/Jahr) und einen JWT-Client-Secret aus einem Private Key. → Apple ist optional; ohne Konfiguration wird der Button ausgeblendet.
- **[Facebook-App-Review]** Die Freigabe von `email` kann eine App-Prüfung durch Meta erfordern. → Start mit Google und Microsoft; Facebook und Apple werden per Env zugeschaltet, sobald freigegeben.
- **[Kostenschätzung liegt unter den Ist-Kosten]** → `max_output_tokens` ist hart gesetzt und die Eingabe über die Zeichenzahl konservativ geschätzt (Faktor 1/3). Abweichungen sind auf einen Aufruf begrenzt. Ein Monitoring-Query im KI-Kosten-Dashboard zeigt die anonymen Kosten pro Stunde.
- **[Sperr-Contention auf dem anonymen Bucket]** → Die Sperre gilt nur für Prüfung plus Insert (Millisekunden), nicht für den Gemini-Aufruf.
- **[Bot missbraucht anonyme Erkennung]** → Stundentopf, Fairness-Limit pro `anon_key`, Eingabelimit und Cache begrenzen den Schaden auf ≤ 5 ct pro Stunde. Bei Bedarf kann später eine Turnstile/Captcha-Prüfung ergänzt werden.
- **[OAuth-Rücksprung verliert SPA-Zustand]** → Entwurfssicherung in `localStorage` vor dem Redirect; Bilder werden nicht gesichert, mit Hinweis.
- **[Getrennte Sessions pro Domain verwirren]** → Der Dialog erklärt kurz „Auf essensplan.app meldest du dich separat an – mit einem Klick.“ Ein bekanntes Konto wird automatisch erkannt.
- **[Breite Umstellung von 401/403 bricht Frontend-Stellen, die auf 403 prüfen]** → Die Tasks enthalten eine Suche nach `status === 403`, `res.status === 403` und `includes('403')` in beiden Frontends sowie Anpassungen der Backend-Tests.

## Migration Plan

1. OAuth-Clients bei Google und Microsoft anlegen (später Apple und Facebook), Redirect-URIs für `https://gruppenstunde.de`, `https://essensplan.app`, die `www`-Varianten und `http://localhost:5173/5174` eintragen, Secrets im Secret Manager anlegen, Terraform-Env ergänzen.
2. Backend mit Migrationen deployen. Die neuen Endpunkte sind bereit, die alten Passwort-Endpunkte entfallen im selben Release.
3. Frontends deployen: nginx mit `X-Forwarded-Host`, neue Login-UI.
4. Smoke-Test auf beiden Domains: Login mit Google und Microsoft, Verknüpfung eines Bestandskontos, Logout, anonyme Rezepterkennung, `GET /api/ai/quota/`.
5. **Rollback:** Das vorherige Image ausrollen. Passwort-Hashes bleiben in der Datenbank, die alten Endpunkte funktionieren damit wieder. Neue Spalten sind nullable bzw. haben Defaults; `socialaccount`-Tabellen stören nicht.

## Open Questions

- Tagesbudget für normale Nutzer: angenommen sind **0,30 €** (≈ 70 Rezepterkennungen). Bitte bestätigen oder anpassen; es ist per Setting änderbar.
- Welche zwei Anbieter sind zum Start Pflicht, falls Apple oder Facebook nicht rechtzeitig freigegeben werden? Vorschlag: Google und Microsoft.
- Sollen Gruppen-Admins später ein höheres Kontingent erhalten? Das ist über `resolve_ai_tier` vorbereitet, aber nicht Teil dieser Änderung.
