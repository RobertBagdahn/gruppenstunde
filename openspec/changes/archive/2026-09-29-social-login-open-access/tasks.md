## 1. Backend: Grundlagen Fehlervertrag und Rechte-Helfer

- [x] 1.1 `backend/core/errors.py` anlegen: `ApiError(HttpError)` mit `status`, `code`, `detail`, `retry_after_seconds`, dazu einen Exception-Handler, registriert in `inspi/urls.py` (auch für `HttpError`, `Http404` und Ninja-`AuthenticationError`)
- [x] 1.2 Pydantic `ErrorOut { detail, code, retry_after_seconds? }` in `core/schemas.py`
- [x] 1.3 `backend/core/permissions.py`: `require_login(request, action=None)`, `optional_user(request)`, `require_staff(request)`, `deny(detail=None)`, `require_recent_login(request, minutes=15)` mit den deutschen Standardtexten aus `auth-error-contract`
- [x] 1.4 Tests für `core/permissions.py` und den Exception-Handler (401 `auth_required`, 403 `permission_denied`/`staff_required`, 401 `reauth_required`)
- [x] 1.5 Alle lokalen `_require_auth`/`require_auth` ersetzen: `shopping/api.py`, `planner/api/planner.py`, `planner/api/meal_plan.py`, `recipe/api/{steps,recipes,folders,items}.py`, `content/api/helpers.py`, `supply/api/helpers.py`, `packinglist/api.py`, `profiles/api/{profile,groups}.py`, `event/api/helpers.py`
- [x] 1.6 Direkte `HttpError(401|403, "…anmeld…"/"…authentif…")` und Staff-Prüfungen mit 403 auf `require_login`/`require_staff`/`deny` umstellen (per `rg` verifizieren, dass keine lokalen Auth-Helfer mehr existieren)
- [x] 1.7 Bestehende Backend-Tests anpassen, die für anonyme Zugriffe 403 erwarten (→ 401 `auth_required`)

## 2. Backend: Social Login mit Allauth

- [x] 2.1 `pyproject.toml`: `django-allauth[socialaccount]` und JWT-Abhängigkeiten für Apple; `uv lock`
- [x] 2.2 `INSTALLED_APPS` um `allauth.socialaccount` und die Provider `google`, `apple`, `microsoft`, `facebook` ergänzen; `SOCIALACCOUNT_*`- und `ACCOUNT_*`-Settings laut Design D1; `SESSION_COOKIE_AGE` (30 Tage) und `SESSION_SAVE_EVERY_REQUEST`
- [x] 2.3 `SOCIALACCOUNT_PROVIDERS[…]["APPS"]` aus Env bauen (Design D2), nicht konfigurierte Provider weglassen; `.env.example` ergänzen
- [x] 2.4 `backend/core/auth/adapters.py`: `NoPasswordAccountAdapter` und `SocialAccountAdapter` (`populate_user`, verifizierte E-Mail-Verknüpfung, `email_missing`/`email_conflict`/Abbruch → SPA-Redirect, sichere `next`-Prüfung); `UserProfile` beim Signup anlegen
- [x] 2.5 `inspi/urls.py`: `path("api/accounts/", include("allauth.urls"))`; lokale Passwort-Views von Allauth deaktivieren bzw. auf 404 bringen; minimales Fallback-Template für Auth-Fehler
- [x] 2.6 `core/api.py`: `/login/` und `/register/` entfernen; `/me/` → `SessionOut`; `UserOut` um `display_name`, `needs_onboarding` und `providers` erweitern; `/providers/`, `/connections/` (GET, DELETE mit `last_connection`-Schutz, 404 bei fremder ID) und `/logout/` (idempotent)
- [x] 2.7 Dev-Login `POST /api/auth/dev-login/` hinter `AUTH_DEV_LOGIN_ENABLED` (base `False`, local und test `True`); `production.py` wirft `ImproperlyConfigured`, wenn aktiv
- [x] 2.8 `production.py`: `USE_X_FORWARDED_HOST=True`, `ALLOWED_HOSTS` um `essensplan.app` und `www.essensplan.app` ergänzen
- [x] 2.9 Tests: Anbieterliste filtert nicht konfigurierte Provider; `/me/` anonym → 200; Passwort-Endpunkte → 404; Adapter-Verknüpfung nur bei verifizierter E-Mail; offener Redirect wird verhindert; Connections-Endpunkte; Dev-Login in Prod nicht verfügbar
- [x] 2.10 Migrationen ausführen (`uv run python manage.py migrate`) und die `socialaccount`-Tabellen prüfen

## 3. Backend: Konto-Löschung und Onboarding

- [x] 3.1 `profiles/schemas/privacy.py`: `DeleteAccountRequestSchema` nur mit `confirmation`
- [x] 3.2 `core/api.py` `delete_account`: `require_recent_login(15)` statt Passwortprüfung
- [x] 3.3 `profiles/services/privacy.py`: `SocialAccount`, `SocialToken` und `EmailAddress` in der Anonymisierungstransaktion löschen; Datenübersicht und Export um verknüpfte Anbieter ergänzen
- [x] 3.4 `UserProfile.onboarded_at` plus Migration (Datenmigration: Bestandsprofile → `created_at`); `POST /api/profile/me/onboarding/` inklusive optionalem Gruppenbeitritt über die bestehende Gruppenlogik
- [x] 3.5 Tests: Löschung mit frischer bzw. alter Anmeldung (`reauth_required`), Social-Accounts entfernt, erneute Anmeldung legt ein neues Konto an, Onboarding setzt `onboarded_at`

## 4. Backend: KI-Budget

- [x] 4.1 `content/choices.py`: `AiTier` (anonymous, user, staff, system) und `AiFeature` (mindestens `recipe_recognize`, `ingredient_recognize`, plus die bestehenden Kontexte)
- [x] 4.2 `AiInteraction` + `tier`, `feature`, `anon_key`, `reserved_cost_eur`, Indizes; neue Models `AiBudgetBucket` und `AiResultCache`; Migration mit Datenmigration für `tier`
- [x] 4.3 Settings: `AI_BUDGET_ANONYMOUS_EUR_PER_HOUR=0.05`, `AI_ANONYMOUS_CALLS_PER_VISITOR_PER_HOUR=3`, `AI_BUDGET_USER_EUR_PER_DAY=0.30`, `AI_BUDGET_STAFF_EUR_PER_DAY=3.00`, `AI_ANONYMOUS_MAX_INPUT_CHARS=8000`
- [x] 4.4 `core/services/ai_budget.py`: `resolve_ai_tier`, `compute_anon_key` (HMAC, tägliche Rotation), `estimate_max_cost`, `reserve()` mit `select_for_update` auf `AiBudgetBucket`, Fensterberechnung (60 min rollierend bzw. Tag Europe/Berlin), Ablauf verwaister Reservierungen nach 10 min, `quota_for(request)`
- [x] 4.5 `core/services/gemini.py`: Parameter `feature` und `request`; anonyme Allowlist-Prüfung (`ai_login_required`); `reserve()` vor dem Aufruf; `cost_eur` nach dem Aufruf; `tier="system"` bei `bypass_limits`; Fehlerklassen auf `ApiError`-Codes umstellen; Burst-Guard behalten; `max_output_tokens` für anonyme Aufrufe setzen
- [x] 4.6 Alle `gemini_call`/`gemini_image_call`-Aufrufer mit passendem `feature` versehen (Liste per `rg "gemini_call\("`)
- [x] 4.7 `GET /api/ai/quota/` mit `AiQuotaOut` (Router in `inspi/urls.py` registrieren)
- [x] 4.8 Tests: Tier-Zuordnung, anonymer Topf, Fairness-Limit, Nutzer- und Staff-Tagesbudget, Reservierung verhindert Überziehen (sequenziell simuliert), keine Klar-IP gespeichert, System-Aufrufe zählen nicht, Kontingent-Endpunkt

## 5. Backend: Anonyme Erkennung im Vorschaumodus

- [x] 5.1 `recipe/services/url_import_service.py`: Parameter `persist: bool`; ohne `persist` keine Schreibzugriffe auf `Ingredient`, `Portion`, `IngredientAlias` und `MeasuringUnit`, `is_new`-Markierung, keine Enrichment-Aufrufe; JSON-LD-Pfad zuerst
- [x] 5.2 Schema `RecipeImportUrlResponseOut`: Zutaten um `is_new: bool` ergänzen (Pydantic und Zod in `frontend-food/src/schemas/`)
- [x] 5.3 `recipe/api/recipes.py` `smart-input`: `optional_user`, Eingabelimit (422 `input_too_long`), `persist=request.user.is_authenticated`, `feature=recipe_recognize`, Cache lesen und schreiben
- [x] 5.4 `supply/services/ingredient_ai_suggest_service.py`: `generate_ingredient_draft(name, user)` herauslösen; `ai_create` nutzt die Funktion weiter
- [x] 5.5 `supply/api/ingredients.py`: `POST /ai-preview/` (`IngredientDraftOut`, Pydantic und Zod) und `import-from-url` für Anonyme öffnen (`feature=ingredient_recognize`, `url_safety`, Cache)
- [x] 5.6 `AiResultCache`-Helfer (normalisierte Eingabe → SHA-256, 7 Tage TTL, nur Ergebnisse aus dem Vorschaumodus schreiben)
- [x] 5.7 Tests: anonyme Rezepterkennung ändert keine Zutaten-, Portionen-, Alias- oder Einheiten-Zeilen; Cache-Treffer ohne Gemini und ohne Budget; nicht erlaubte KI-Endpunkte → 401 `ai_login_required`; angemeldetes Verhalten unverändert

## 6. Backend: Offene Lese-Endpunkte

- [x] 6.1 `content/services/food_access.py`: `visible_meal_plan_queryset(user)` und passender Object-Check (anonym → `visibility="public"`), Test auf Übereinstimmung von Check und Queryset
- [x] 6.2 `planner/api/meal_plan.py`: `list_meal_plans`, `get_meal_plan`, `cost_summary`, `nutrition_summary`, `plan_check`, `get_cooking_schedule`, `export_pdf`, `export_cooking_schedule_pdf` und `search_recipes` auf Policy-Sichtbarkeit umstellen (anonym → 404 für nicht öffentliche Pläne); Paginierung beibehalten
- [x] 6.3 `recipe/api/recipes.py` `export_recipe_pdf`, `supply/api/materials.py` (Detail), `supply/api/ingredients.py` `suggest_ingredients` für Anonyme öffnen, mit Policy-Sichtbarkeit
- [x] 6.4 Tests: anonyme Zugriffe auf öffentliche Ressourcen → 200 mit `can_edit=false`, auf private → 404; anonyme Schreibzugriffe → 401 ohne Datenänderung

## 7. Backend: Admin-Nutzerverwaltung

- [x] 7.1 `content/admin_api.py`: Nutzerdetail um Anbieter, `last_login`, KI-Verbrauch (heute, 30 Tage) und Tageslimit erweitern; Nutzerliste mit Filter `provider` (paginiert)
- [x] 7.2 Tests für Admin-Nutzerdetail und -liste inklusive 403 `staff_required`

## 8. Infrastruktur

- [x] 8.1 `nginx.conf.template`: `proxy_set_header X-Forwarded-Host $host;`
- [x] 8.2 `terraform/`: Secrets und Env für `GOOGLE_*`, `MICROSOFT_*`, `APPLE_*` und `FACEBOOK_*` im Backend-Service
- [x] 8.3 Doku in `README.md` bzw. `knowledge/`: OAuth-Clients anlegen, Redirect-URIs pro Domain und lokal, Dev-Login

## 9. Frontend (beide): Schemas, API und Fehlerbehandlung

- [x] 9.1 Zod `apiErrorSchema` (`schemas/errors.ts`), `sessionSchema`/`userSchema` (`schemas/auth.ts`), `authProviderSchema`, `socialConnectionSchema`, `aiQuotaSchema` (`schemas/ai.ts`), `deleteAccountRequestSchema` ohne Passwort, jeweils synchron zu den Pydantic-Schemas, in `frontend/` und `frontend-food/`
- [x] 9.2 Haupt-Frontend: `ApiError` und `parseApiResponse` in `src/lib/api.ts` (wie in frontend-food)
- [x] 9.3 `api/auth.ts` in beiden Frontends: `useCurrentUser` (`SessionOut`), `useAuthProviders`, `useLogout` (Caches leeren), `useConnections`/`useDisconnect`, `useDevLogin`; `useLogin` und `useRegister` entfernen
- [x] 9.4 `api/ai.ts`: `useAiQuota` (Invalidierung nach KI-Mutationen)
- [x] 9.5 Globaler `MutationCache`/`QueryCache`-`onError` im `QueryClient`: Verzweigung nach `code` (Anmeldedialog, Reauth, Toast, KI-Hinweise)
- [x] 9.6 Stellen finden und anpassen, die auf `403` bzw. `includes('403')` prüfen (`ErrorDisplay.tsx` u. a.)

## 10. Frontend (beide): Login-UI, Dialog und Entwürfe

- [x] 10.1 `store/loginPromptStore.ts` (Zustand) und `components/auth/LoginDialog.tsx` (Anbieter-Formular-POST mit CSRF und `next`, Vorteile, Datenschutz-Link, Dev-Login-Feld, Reauth-Modus, ab 320 px, Tastatur und Fokus)
- [x] 10.2 `components/auth/ProviderButton.tsx` mit Anbieter-Icons und deutschen Beschriftungen („Mit Google anmelden“ …)
- [x] 10.3 `/login` als Anbieter-Auswahl mit Fehlermeldungen aus `?error=`; `/register` → Redirect `/login`; Registrierungsseiten und Formulare entfernen
- [x] 10.4 `hooks/useDraft.ts` (localStorage, 7 Tage, Wiederherstellung per `restoreDraft`) und `hooks/useRequireLogin.ts`
- [x] 10.5 Benutzermenü im Header (`frontend/src/components/Layout.tsx`, `frontend-food/src/components/layout/FoodLayout.tsx`): Anmelden-Button bzw. Avatar-Menü mit Kontingent-Balken, Profil, Inhalten, Gruppen, „Konto & Anmeldung“, Administration (Staff) und Abmelden
- [x] 10.6 `components/auth/OnboardingDialog.tsx` bei `needs_onboarding` (Namen, Pfadfindername, Gruppen-Beitrittscode, „Später“)
- [x] 10.7 `UnauthGate` → `LoginEmptyState` für „Meine …“-Seiten (erklärender Text und Anmelden-Button)
- [x] 10.8 `components/auth/LockedFeature` (Schloss, Tooltip, Klick → Dialog) für anmeldepflichtige Aktionen und KI-Buttons außerhalb der Allowlist

## 11. Frontend: Ausprobieren ohne Speichern

- [x] 11.1 frontend-food `CreateRecipePage`/`EditRecipePage`: Gate entfernen, `useDraft('recipe:new')`, Speichern über `useRequireLogin`, Wiederherstellungsfrage nach dem Login
- [x] 11.2 frontend-food „Rezept erkennen“ anonym nutzbar: `is_new`-Zutaten anzeigen („wird beim Speichern angelegt“), 429-Hinweise mit Anmelde-CTA
- [x] 11.3 frontend-food `CreateIngredientPage`: Gate entfernen, „Zutat erkennen“ (Name über `/ai-preview/`, Link über `/import-from-url/`) anonym, Entwurf sichern, Speichern mit Login
- [x] 11.4 frontend-food `MealPlanWizardPage`: Assistent anonym durchlaufbar, Anlegen mit Login und Entwurfswiederherstellung
- [x] 11.5 frontend-food `ShoppingListPage`, `MyRecipesPage` und weitere „Meine …“-Seiten: `LoginEmptyState`; öffentliche Essenspläne anonym lesbar (Detail, Kosten, Nährwerte, PDF)
- [x] 11.6 Haupt-Frontend: `PackingListWizardPage`, `PlannerPage`, Erstellen von Gruppenstunden, Spielen und Blogs anonym nutzbar, Speichern mit Login und Entwurf
- [x] 11.7 KI-Kontingent-Anzeige und deaktivierte KI-Buttons bei aufgebrauchtem Kontingent (Euro nur für Staff)

## 12. Frontend: Konto und Datenschutz

- [x] 12.1 `/profile/account` in beiden Frontends: verknüpfte Anbieter, verbinden (`process=connect`), trennen (deaktiviert beim letzten Anbieter), Kontingent, Abmelden, Datenschutz-Links
- [x] 12.2 `PrivacyPage` bzw. Löschdialog: Passwortfeld entfernen, Reauth-Flow bei `reauth_required`, Rücksprung in den Dialog
- [x] 12.3 Haupt-Frontend `AdminUserDetailPage` und Admin-Nutzerliste: Anbieter, letzter Login, KI-Verbrauch, Provider-Filter über URL-State
- [x] 12.4 frontend-food `usePermissions`/`MyProfilePage` auf das neue Session-Schema umstellen

## 13. Tests und Abnahme

- [x] 13.1 Backend-Tests komplett: `uv run pytest` (bzw. `uv run python manage.py test`) grün
- [x] 13.2 Frontend: `npm run typecheck`, `npm run lint` und Vitest in `frontend/` und `frontend-food/` grün; Tests für `useDraft`, `LoginDialog` und die globale Fehlerverzweigung
- [x] 13.3 E2E-Fixtures auf Dev-Login umstellen (`e2e/fixtures/food.ts`, `e2e/tests/auth.spec.ts`, `e2e/tests/authenticated.spec.ts`); neue E2E-Fälle: anonym Rezept ausfüllen → Speichern öffnet Dialog → Dev-Login → Entwurf wiederhergestellt und gespeichert; anonymer Essensplan öffentlich lesbar; Logout
- [ ] 13.4 Manuelle Abnahme lokal mit echtem Google-Client auf `localhost:5173` und `localhost:5174` (Login, Verknüpfung eines Bestandskontos, Abbruch-Fehlerseite, Logout)
- [x] 13.5 `openspec validate social-login-open-access` und Abgleich Pydantic ↔ Zod für alle geänderten Schemas
