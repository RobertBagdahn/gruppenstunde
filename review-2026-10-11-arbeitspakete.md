# Review 2026-10-11 – Befunde & Arbeitspakete

Stand: `origin/main` = `fb3cd6bd`. Grundlage: 21 Subagent-Prüfungen (Spec-Review, Code-Checks, E2E-Suite,
Playwright-Exploration beider Frontends, Backend-Reproduktion). Einzelberichte: `/tmp/wave2/*/REPORT.md`,
`/tmp/pw-*/`, Subagent-Artefakte der Session.

## Gesamtbild

| Bereich | Ergebnis |
|---|---|
| Merge | Alle 14 lokalen Branches + `origin/RobertBagdahn/Quick-Wins` sind inhaltlich in `main` → löschen, nicht mergen |
| Backend | ruff, mypy, pytest (3662 ✓) grün; `makemigrations --check` sauber |
| Food-Frontend | tsc, lint, 957 Tests, Build grün |
| Haupt-Frontend | tsc, Tests, Build grün; **lint rot** (21 Fehler, 20 davon toter Food-Code) |
| E2E-Suite | 62 ✓ / 12 ✗ (1 App-Bug, 7 veraltet, 3 flaky, 1 Umgebung) |
| OpenSpec | 19 offene Changes, **keiner archivreif**; 4 scheitern an `openspec validate --strict` (keine Deltas) |
| Bestätigte Bugs | ~45, davon 12 P0/P1 (alle reproduziert) |

---

## Arbeitspakete

Legende Priorität: **P0** = Absturz/falsche Daten/Sicherheit, **P1** = Funktion kaputt, **P2** = UX/Qualität, **P3** = Kosmetik.
Größe: S ≤ ½ Tag, M ≤ 2 Tage, L > 2 Tage.

### WP-01 Backend-Abstürze & Routing — P0 · S
Alle reproduziert (Scratch-Tests in `/tmp/wave2/backend-verify/`).
- `GET /api/supply/equipment/` → 405: Router hängt an `/supply/` (`inspi/urls.py:114`) → `"/supply/equipment/"`. Folge: Ausrüstung im Rezept-Editor, Wizard und Admin verschwindet still.
- `GET /api/recipes/{id}/exchanges/` → 500: `ExchangeGroupMemberOut.portion_id: int` (`recipe/schemas/items.py:~298`) → `int | None`, Name via `get_recipe_item_ingredient`, Zod angleichen.
- `GET /api/content/admin/embeddings/` → 500: `bool(item.embedding)` auf numpy-Array (`content/api/admin.py:205`) → `is not None`.
- `GET /api/events/<slug>/parent/<kein-uuid>/` → 500 (`event/services/parent_access.py:53`) → 404.
- `GET /api/packing-lists/shared/<kein-uuid>/` → 422 mit englischem Pydantic-Text → 404 deutsch.
- **Abnahme:** Regressionstests je Endpoint; keine 5xx bei ungültigen Pfadparametern.

### WP-02 Mengen- & Nährwert-Korrektheit — P0 · M
Specs: `direct-gram-calculation-integrity`, `switchable-quantity-units` (Phase 1), `fix-wizard-ingredient-review-and-quantities`.
- **Regression:** `recipe/services/nutrition_aggregation.py:135-160` rechnet MealItems mit Portion/Standardmaß als 0 g / 0 kcal (seit planner-Migration 0014) → `_resolve_ingredient_weight_g` nutzen. Betrifft Vorschläge, Ampel, `recipe/api/nutrition.py:91`.
- **Schritt-Zutaten falsch:** `recipe/schemas/steps.py:46-58` liefert Portionsanzahl mit Einheit der Messeinheit („0,35 g Sojagranulat“ statt 17,5 g); Direkt-Gramm-Items ohne Name. Anzeige in `RecipeStepsReadOnly.tsx`, `LivePreview.tsx`, `RecipeCookingMode.tsx`.
- **Fork verliert `ingredient_id`** (`recipe/api/recipes.py:~1343`); **Fork muss Zubereitungsschritte inkl. Schritt-Zutaten mitkopieren** (Entscheidung 5).
- **Einkaufsliste aus Rezept** ignoriert Direkt-Gramm-Zutaten → „Unbekannte Zutat, 0 g“ (`shopping/api.py:747-757`); erst auf aktive Items filtern.
- **Rang-Bug Zutaten-Review:** „2 EL“ passt auf Rang-2-Portion, wird aber auf Rang-1 („Flasche“) angewendet (`unit_gram_conversion.py:176-181`, `ingredient_review_service.py:193`).
- PDF: Portions-Items nicht über gemeinsamen Formatter (`planner/services/pdf_export.py:693-695`).
- **Abnahme:** Regressionstests aus `/tmp/wave2/backend-verify/` ins Repo übernehmen; Rezeptdetail zeigt in Schritten dieselben Mengen wie die Zutatentabelle.

### WP-03 Frühstücks-Assistent — P1 · M
Specs: `peter-food-feedback-fixes`, `unified-buffet-wizard`. Im Browser reproduziert.
- „Nur Müsli“ speichert Butter, Käse, Honig … aber **kein Müsli**: leere Listen werden in `StepStreichfett.tsx:27-45` / `StepBelag.tsx:38-41` als „nicht gesetzt“ behandelt; Basis (Cornflakes) hat 0 kcal → 0 g.
- Profile ignorieren fehlende kcal (`BreakfastWizardPage.tsx:184-190`): „Brot vegetarisch“ speichert kein Brot, dafür 172 g Honig/Person.
- 50/50-Default Fett/„Kein Fett“ nur über Fallback, Profile setzen 100 %.
- Frei gesuchte Extras verlieren Portion (`StepExtras.tsx:184-186`) und verschwinden beim Wiederöffnen, nächster Save löscht sie (`refMealToWizardState.ts:233`).
- Faktor warmes Gericht noch `type=number` + Clamp (`StepExtras.tsx:76-83`) → `DecimalInput`.
- Texte „≈ 60,2 mlen“, „Belag knappen“.
- **Abnahme:** Roundtrip-Test je Profil (Speichern → Öffnen → identisch); kein Profil speichert Komponenten, die es ausschließt.

### WP-04 Zutaten-Formulare — P1 · S
Spec: `ingredient-nutrition-validation`, `food-ui-polish-prod-test`.
- Bearbeiten blockiert Speichern bei Altlasten-Nährwerten, auch wenn nur Preis geändert wird (`IngredientEditPage.tsx:~262`). Echte Zutaten betroffen (z. B. `antipasti-zwiebeln`).
- `postJsonRaw`/`patchJsonRaw` (`frontend-food/src/api/supplies.ts:59-71`) werfen `Error` statt `ApiError` → **409-Duplikat-Link erscheint nie**, 422-Feldfehler landen nicht am Feld.
- Wizard-Neuanlage: `fat_sat_g` fehlt in Client-Prüfung; Backend prüft Wizard-Zutaten nicht (`recipe/api/recipes.py:794-826`); Mindestmenge 0,01 statt 0,1 (`RecipeIngredientReviewStep.tsx:71`).

### WP-05 Essensplan-Liste & Duplizieren — P1 · S
- Monatsgruppe doppelt („Oktober 2026“ 2×, React-Key-Warnung) – `MealEventListPage.tsx:192-202`, Backend-Sortierung `meal_plan.py:497-512`. Einziger echter App-Bug der E2E-Suite.
- „Als Vorlage verwenden“ schlägt mit Vorbelegung fehl (400 „Tagesanzahl muss übereinstimmen“): Frontend rechnet ms-Dauer, Backend Kalendertage (`MealEventListPage.tsx:211-228` vs. `meal_plan.py:801-806`).
- Kopieren aus anderem Plan sendet Planname als Notiz; doppeltes Kopieren → 422 ohne sichtbare Meldung; „Kopieren...“ → „Kopieren…“.
- Toter Code `MealPlanSection`/`MealPlanCompactCard`/`MealPlanHeroCard`.

### WP-06 Einkaufslisten — P2 · S
Spec: `fix-shopping-list-and-plan-list-ux`.
- Übersicht: Löschdialog nie erreichbar (`setDeleteTargetId` wird nie aufgerufen) und ohne Listennamen (`ShoppingListPage.tsx`).
- Gelöschter Eintrag bleibt bis Reload sichtbar (nicht optimistisch).
- Rezept-generierte Einträge ohne Quelle sind löschbar (`ShoppingListItemRow.tsx:38` + `shopping/api.py:748-768`).
- WebSocket im Dev tot: kein `/ws`-Proxy in `frontend-food/vite.config.ts`, `daphne` fehlt in `INSTALLED_APPS`.
- Rohfehler „API error: 401 Unauthorized“ im UI; DELETE fremder Liste 403 statt 404.

### WP-07 PDF & Laufzeit-Ressourcen — P1 · S
Spec: `reliable-pdf-exports` (alle Tasks [x], aber nicht erfüllt).
- `pdf_rendering.py:15` `optimize_size` wird von WeasyPrint 63.1 ignoriert (Warnung reproduziert) → `optimize_images=True, jpeg_quality=82`; Test-Fake + `caplog`.
- Gunicorn weiterhin 2 Worker × 4 Threads (`Dockerfile.backend:6-7`); Concurrency 2 in `cloudbuild.yaml`/Terraform vs. 1 in `deploy.yml`.
- Messwerte: Essensplan-PDF 10 s / 192 KB, Kochplan 6 s → nach Fix erneut messen.

### WP-08 Release-Gate, CI & E2E — P0 · M
Spec: `food-release-hardening`.
- `.github/workflows/deploy.yml` deployt Prod bei Push auf `main` nur nach ruff – kein pytest, keine Food-Checks, kein E2E; andere Region (`europe-west1`) und Concurrency als Cloud Build/Terraform. → Eine Pipeline als Quelle der Wahrheit festlegen.
- Food-Lint im Gate nur 14 Dateien (`lint-release-check.sh`).
- Datenoffensive-Threads (3 + 6 DB-Verbindungen pro Request) fehlen im Verbindungsbudget.
- E2E: 7 veraltete Tests anpassen (`auth.spec.ts:18,69`, `recipe-search.spec.ts:109` inkl. 2 still geskippter, `food-core.live.spec.ts:72`, `food-shopping.live.spec.ts:98`, `food-layout.responsive.spec.ts:8`), 2 flaky Specs stabilisieren (`food-release-hardening.mocked.spec.ts:488`, `recipe-ingredient-editing.spec.ts`), Aufräumen der E2E-Daten (Rezept-Entwürfe, „E2E …“-Pläne).
- Fehlende Tests: Statistik-Parity (leer/1 Wert/Duplikate/Ausreißer), atomare Alternative 403/inaktive Portion, Buffet-Vorschau-500.

### WP-09 Sicherheit & Auth — P0 · M
- **Admin-UI für Anonyme/Nicht-Staff sichtbar** (`frontend/src/App.tsx:117-122`) → Route-Guard `is_staff` (API ist geschützt).
- **CSRF nicht erzwungen**: POST ohne Token mit fremdem Origin legt Einkaufsliste an; Login ohne Token. Spec `auth-session` fordert CSRF. (Entscheidung: Ninja `csrf=True` + Header in beiden Frontends.)
- `GET /api/shopping-lists/users/` und `owner_username` geben E-Mail-Adressen aller Nutzer preis.
- Haupt-Frontend ToolLandingPage zeigt „Kostenlos anmelden“ auch eingeloggt (`ToolLandingPage.tsx:324`).
- Spec-Delta für `auth-session` (Passwort-Login widerspricht Haupt-Spec).
- Testinfrastruktur: alle Seed-Nutzer (admin, robert, peter) sind Staff+Superuser → Seed-Nutzer ohne Staff ergänzen.

### WP-10 Haupt-Frontend Funktionsfehler — P1 · M
- Rezepte aus Startseite/Suche des Haupt-Frontends **entfernen** (`HomePage.tsx:276`, `SearchPage.tsx:85`, Such-API `result_types` ohne `recipe`) – Links führen ins Leere und verstoßen gegen Food-Trennung.
- `/search?q=` wird beim Laden gelöscht (`SearchPage.tsx:~226`); Tag-Filter (`tags`, `tag_slugs`) wirkungslos.
- `/profile/name/:id` lädt für Anonyme endlos (`MeineDatenPage.tsx:23`).
- Keine 404-Catch-all-Route (`App.tsx`).
- `/admin/idea-of-the-week` nutzt entfernten Endpoint → auf `/api/content/featured/` umstellen oder entfernen.
- Toten Food-Code `frontend/src/components/breakfast/*` + `schemas/breakfast.ts` löschen; `input.tsx:5`, `costsLabel.test.ts:38` → **Lint grün**.
- Events: Beträge „0.00 €“ (`StatsView.tsx:129-155`), Bezahlt-Quote 100 % bei 0 Teilnehmenden, Icon-Tabs ohne deutsches `aria-label`.

### WP-11 Texte, Umlaute, Sprache — P2 · S
- ~40 Stellen ohne Umlaute (WhatsApp-Komponenten, `MessagingTab.tsx`, `CreateHubPage.tsx`, Listen-Seiten, `ToolLandingPage.tsx`, `Pagination.tsx`/`sheet.tsx` in beiden Frontends …) – Liste im Code-Check-Bericht.
- Englisch/Denglisch: „Share-Link“, „Items abhaken“ (`PackingListDetailPage.tsx`), Footer „Made with love…“, „Features“, „Custom Fields“, „Events“ vs. „Aktionen“, Grammatik „Was ist der Aktionen?“.
- Optional: CI-Check gegen ASCII-Umschreibungen in `.tsx`.

### WP-12 Buffet-Restarbeiten — P2 · M
Specs: `buffet-free-selection`, `unified-buffet-wizard`.
- Ranking: `breakfast` nicht vor `cold_meal` (`buffet_catalog.py:344`).
- Vorschau-Fehler ohne HTTP-Status (`BuffetBuilder.tsx:627-633`); roher englischer `Mahlzeitentyp`.
- Unsichtbar gewordenes Item → ganzer Buffet-Zustand 404, Retry endlos (`planner/api/buffet.py:171`).
- Erhalten/Ersetzen-Entscheidung wird nicht wiederhergestellt; Navigation nicht geteilt.
- Fehlende Tests (Summe≠100→422, Alt-Items ohne Shares, `replace`, Limit, Draft-Sichtbarkeit, Filter, „Nichts gefunden“).
- **UI-Test steht aus:** Buffet-Templates für Snack/Getränke sind lokal nicht geseedet → `seed_buffet_templates` ausführen, dann End-to-End prüfen.

### WP-13 OpenSpec-Hygiene & Archivierung — P1 · S–M
- Archiv-Blocker: MODIFIED-Köpfe passen nicht (`unified-buffet-wizard/specs/breakfast-spread`, `buffet-free-selection/specs/buffet-data-cleanup`) – fällt erst beim Archivieren auf.
- Widersprüche auflösen: Buffet-Vorauswahl/Frühstück (F7), Alkohol-Regel fehlt im neuen Katalog-Delta, 403 vs. 401 anonym, „Einheit ohne Menge speichern“ (peter-fixes vs. switchable-units), „Portion **und** Maßeinheit speichern“, Notiz im PDF.
- Fehlende Deltas: `reliable-pdf-exports` (Vollformat statt Delta), `auth-session`, `peter-food-feedback-fixes` (Gramm-Anzeige/Mengen-Dialoge, doppelte Unit-Edit-/Notiz-Requirements).
- Häkchen korrigieren, die nicht stimmen (u. a. release-hardening 2.2, data-offensive 2.3, wizard-preview 2.1, unified-buffet 1.3/2.3/3.5/3.6).
- Triage bereinigen: `food-audit-feedback-triage` 2.1/2.2/4.1 durch `meal-item-note` erledigt, Peters Fall nur in einem Change führen.
- Manuelle Abnahmen nachholen, dann archivieren in Reihenfolge: `fix-wizard-preview-units`, `food-ui-polish-prod-test`, `fix-shopping-list-and-plan-list-ux` → nach WP-02/03/04/07 die übrigen; `buffet-free-selection` vor `unified-buffet-wizard`.

### WP-14 Offene Features (eigene Changes) — L
- `meal-plan-input-guardrails`: bestätigt unbegrenzt (`reserve_factor=-100`, `activity_factor=1e9`, `day_part_factors` negativ, `MealPlanDuplicateIn.norm_portions=-5e9`). Braucht design + specs + tasks.
- `shopping-list-source-freshness`: **Snapshot mit Hinweis** (Entscheidung 6) – Quellplan-Stand an der Liste speichern, Hinweis + „Neue Liste erstellen“; kein Auto-Sync.
- `switchable-quantity-units` Phasen 2–4 (RecipeItem, Buffet, Einkaufsliste) – vorher Gramm-Modell mit `direct-gram` vereinheitlichen.
- `food-data-offensive` 4.3–4.5: `data_offensive_package.json` fehlt im Repo → Prod-Transfer nicht ausführbar.
- `password-login-transition`: Rollout + Prod-Smoke.
- `peter-food-feedback-exploration`: P-04/P-05/P-11/P-12 mit Peter klären.

### WP-15 Repo- & Daten-Hygiene — P3 · S
- Branches löschen (14 lokal, `origin/RobertBagdahn/Quick-Wins`, `origin/RobertBagdahn/bug-fixen`, `origin/rescue/food-release-hardening`), 3 detached Worktrees unter `~/code/gruppenstunde/.claude/worktrees/` entfernen, lokalen `main` fast-forwarden.
- Toter Code: `backend/recipe/schemas/_typescript_reference.py`; Zod-Drift (`RefMealItemInSchema.factor` positiv, Längen für Planname/Titel, `recipe_type` Enum).
- Test-Warnungen: doppelter Key `grams` in `MealItemAmountEditor.test.tsx`, fehlender Key in `StepCard.tsx:18`.
- Lokale Medien fehlen (`/tmp/inspi-media/content`) → E2E-Konsolenfehler.

---

## Entscheidungen (Stand 2026-10-11)
1. **CSRF: nicht umsetzen** ✅ (SameSite=Lax reicht; aus WP-09 gestrichen)
2. **Rezepte im Haupt-Frontend: entfernen** ✅ (WP-10)
3. **Einheitenwechsel ohne Menge** – Empfehlung: Wechsel rechnet bei gleichem Gewicht um (55 g → 0,55 Stück à 100 g), speichert sofort mit Undo; Nährwerte bleiben gleich. Specs `peter-food-feedback-fixes` und `switchable-quantity-units` entsprechend angleichen. ✅ beschlossen, in Umsetzung
4. **Deploy-Pipeline** – Empfehlung: GitHub Actions (`deploy.yml`) als einzige Prod-Pipeline, weil sie tatsächlich deployt. Gates aus `cloudbuild-pr.yaml` als Job vor dem Deploy übernehmen, `cloudbuild.yaml` + Terraform-Trigger entfernen, Concurrency/Env-Werte aus einer Quelle. ✅ beschlossen, in Umsetzung
5. **Fork kopiert Zubereitungsschritte: ja** ✅ (WP-02, inkl. Schritt-Zutaten-Zuordnung)
6. **Einkaufsliste: Snapshot mit Hinweis** ✅ – Liste bleibt unverändert; zeigt „Essensplan wurde seit Erstellung geändert“ (Plan-`updated_at` > Listen-Erstellzeit) mit Aktion „Neue Liste erstellen“ (WP-14 → eigener Change `shopping-list-source-freshness`).

## Noch nicht geprüft (Testlücken)
- Buffet-Builder im Browser (Templates nicht geseedet).
- Haupt-Frontend: Detailseiten Session/Blog/Game mit echten Inhalten, Gruppen, Session-Planer, My-Dashboard (lokal keine Daten / Zeitbudget).
- Rezept-Wizard: Dezimaleingabe, Stale-Steps-Hinweis, Vorschau-Einheiten, 320 px.
- Re-Auth-Dialog bei 401 im Food-Frontend; Nicht-Owner-Ansicht (alle Seed-Nutzer sind Staff).
- Reserve-Anzeige der Einkaufsliste mit echten Packungsgrößen (nur Unit-Tests).

## Umsetzungsstand (2026-10-11)

Integriert in `RobertBagdahn/Main-prüfen` (nicht gepusht), Backend + Food komplett grün:

| Branch | Inhalt | Status |
|---|---|---|
| `review/wp01-backend-crashes` | WP-01 komplett (+ PATCH shared checks 404) | ✅ |
| `review/wp02-quantity-integrity` | WP-02 komplett (Fork kopiert Schritte) | ✅ |
| `review/wp08-ci-pipeline` | GitHub Actions einzige Pipeline mit Gates, Cloud Build entfernt, 1 Worker/1 Thread/Concurrency 1/max 2 Instanzen, WeasyPrint-Fix (WP-07) | ✅ |
| `review/wp08-e2e-tests` | 7 veraltete + 2 flaky Specs, Draft-Cleanup | ✅ |
| `review/wp09-auth-guard` | Admin-Guard, Landing-Login-Link, E-Mail-Privacy (neuer Change `user-search-privacy`), Seed-Doku, auth-session-Delta | ✅ |
| `review/unit-switch` | Einheitenwechsel bei konstantem Gewicht + Undo, Migration `planner.0015` (3 Nachkommastellen) | ✅ |

Neu gefundene / verbleibende Punkte:
- App-Bug: `PortionFormDialog` (`IngredientDetailPage.tsx:354-366`) setzt Eingaben bei Re-Render zurück (initialValues-Objekt-Literal ~Z. 916) → E2E `food-core.live.spec.ts:53` flaky.
- Rezept-PDF-Schrittliste (`recipe/services/step_helpers.py`) nutzt noch alte Einheitenlogik.
- Schritt-Chips zeigen g statt ml bei Flüssigkeiten.
- E-Mail-Fallback noch in `planner/schemas/meal_plan.py` (Collaborator `username`) und `planner/schemas/planner.py`.
- **Kapazität (Entscheidung offen):** Prod max. 2 gleichzeitige Requests (2 Instanzen × Concurrency 1).
- Cloud-Build-Trigger `GruppenstundeDeployMain` ggf. manuell in der Console löschen.

## Empfohlene Reihenfolge (ursprünglich)
1. **Sprint A (P0):** WP-01, WP-02, WP-09 (Admin-Guard sofort, CSRF nach Entscheidung), WP-08 (Gate)
2. **Sprint B (P1):** WP-03, WP-04, WP-05, WP-07, WP-10
3. **Sprint C:** WP-13 (Archivierung), WP-06, WP-12, WP-11, WP-15
4. **Danach:** WP-14 als eigene OpenSpec-Changes

WP-01, WP-02, WP-04, WP-05, WP-07 sind unabhängig und können parallel in getrennten Worktrees laufen;
WP-03 und WP-12 berühren beide den Buffet-/Frühstücks-Code → nacheinander.
