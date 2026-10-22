# Handover: Food-Frontend im Sticker-Look

Für alle, die diesen Change umsetzen, prüfen oder abnehmen. Beginne hier, lies dann `proposal.md`, `specs/`, `design.md`, `tasks.md`. Dieses Dokument sagt, **was entschieden ist, woran du dich hältst, wo etwas im Code liegt und woran man „fertig“ erkennt**.

## 1. Stand und Ziel

- **Ziel**: Das gesamte Food-Frontend (`frontend-food/`) bekommt den neuen Look („Sticker“): weißer Grund, Petrol als Hauptfarbe, Bricolage Grotesque + Figtree, ruhig-verspielt, mobil und am Desktop gleich gut, im Suchindex besser dastehen. Verbindlich, getestet, vollständig umgebaut.
- **Stand heute**: Entwürfe abgenommen (Leinwand), Specs, Design und Aufgabenliste geschrieben und strikt validiert (`openspec validate food-sticker-redesign --strict`). **Es wurde noch kein Projektcode geändert.** Start der Umsetzung: `/opsx:apply food-sticker-redesign`.
- **Zielgruppe der App**: Jugendliche bis junge Erwachsene, die Gruppenstunden, Fahrten und Lager essensplanen.

## 2. Entscheidungen (getroffen, nicht neu aufmachen)

| Thema | Entscheidung |
|---|---|
| Umfang | **Optik plus kleine Lesefelder.** Neue Funktionen aus den Entwürfen sind eigene Changes (Lagerliebling, „Überrasch mich“, „Wer holt was“, Offline-Einkaufsmodus, Kochmodus-Timer, kuratierte Vorlagen, Schrittdauern, „Nächste Schritte“). Ausnahme: abgeleitete Lesefelder (Fortschritt, Dashboard-Zähler), ohne Migration (Aufgabe 2b). Kosten je Person und Tag kommen je Karte aus dem bestehenden Kostenendpunkt. |
| Go-live | **Ein Release nach Vollabnahme** auf langlebigem Branch `feature/food-sticker`, Vorschau-Umgebung zur Abnahme. |
| SEO | **Markup jetzt** (Titel, Meta, eine H1, Brotkrumen, JSON-LD `Recipe`/`BreadcrumbList`, `noindex` für private Seiten, Links statt Handler, `robots.txt`). **Prerendering als eigener Change.** |
| Tests | **Regeln + Screenshots + Barrierefreiheit**: Lint, Design-Regel-Tests, Kontrast-Test, Playwright-Screenshots der 10 Hauptseiten auf 390/1440 px, axe, Tippflächen ≥ 44 px, Überlauf auf 320/390/1440 px; blockierend in der CI. Keine Lighthouse-Schwellen, keine Firefox/WebKit-Matrix. |
| Seitenumfang | Alle Nutzerseiten sauber nach Styleguide; **Admin, Datenqualität, Statistiken nur Token + neuer Seitenkopf + Navigation.** |
| Schriften | **Selbst gehostet** (kein Google-Aufruf mehr). |
| Navigation | **Mobil: Rezepte, Pläne, Einkauf, Zutaten.** Desktop: Rezepte, Essenspläne, Einkaufslisten, Zutaten. Material ist Reiter unter Zutaten (Route `/material` bleibt). Profil, Konto und Admin im Profilmenü. Das Logo führt zur Startseite. |
| Zoom | **Ursache beheben**: Eingaben mobil 16 px, `maximum-scale` im Food-Frontend entfernt. |
| Hauptfarbe | **Petrol** `#0F6E7A`. Verworfene Varianten: Grün, Tinte, Indigo, Beere, Moos, Tomate. |
| Schrift | **Bricolage Grotesque** (Überschriften, Kennzahlen), **Figtree** (Text). |
| Schriftskala | **Acht Stufen** (12, 14, 16, 18/20, 22/26, 32/44, 32/56, 32). Die Leinwand ist auf diese Stufen gerundet. |
| Kalt-Tönung | **Oliv** (`#EEF3E2` / Text `#3A5217`), damit sie sich von Petrol abhebt. |
| Nuancen | Basis bleibt: Schatten-Karten, rechteckige Bildflächen, 4er-Navigation. Verworfen: Linie statt Schatten, runde Teller, 5er-Navigation mit „+“, Tomate als Hauptfarbe. |
| Vorlagen (Leer-Zustand) | Nur vorhandene **Referenzpläne** als Vorlagen. Ohne Referenzpläne entfällt der Block. Keine neue Vorlagen-Funktion. |
| Tönungen | **Sieben Rezepttypen**: neu Rezeptteil (Sand `#F3EBDD`, Text `#5C4319`) und Getränk (Rosa `#FCE7F0`, Text `#9D2A62`). Mahlzeit-Köpfe bleiben neutral. |
| Animation | Wiederholte Bewegung **nur bei Ladeanzeigen** (Skelett, Ladebalken, Startbildschirm). Sticker, Karten und Schaltflächen bewegen sich nie in einer Schleife. |
| Logo und Favicon | **Inspi-Maskottchen** in Kopfzeile, Favicon, Startbildschirm, Leer- und Fehlerzuständen, auf Rechtsseiten und der Tool-Landing. Optimierte Dateien; das 2048-px-Original wird nicht ausgeliefert. |
| Fallback Rezeptkarte | **Rezepttyp-Fläche** mit Symbol, kein Maskottchen auf Rezeptkarten ohne Foto. |
| Vorschau | **Nur ansehen**, mit Produktionsdaten. Banner „Vorschau – nur ansehen“ und Build-Flag deaktivieren Aktionen in der Oberfläche (Aufgabe 1.4). |
| Alte Specs | Widersprechende Specs sind **aufs Layout umgestellt**: Essensplan-Liste, Essensplan-Farben, Karten der Essensplan-Liste, Rezeptdetail, RecipeThumbnail, Zutaten-Rezeptliste, Shared UI (RecipeCard-Fallback). |

## 3. Quellen der Wahrheit (Reihenfolge bei Widerspruch)

1. **Specs** in diesem Change (`specs/*/spec.md`): normativ.
2. **Styleguide** `reference/styleguide.html` (und später `/styleguide` im Code): Token, Größen, Radien, Komponenten, Formate.
3. **Entwürfe** `reference/*.html` mit Vorschau `reference/index.html` und `reference/screens/*.png`: Aufbau und Anmutung.
4. **Code-Beschriftungen und Daten**: Beschriftungen, Felder und Verhalten im Code bleiben maßgeblich. Entwurfstexte sind Beispiele (z. B. Entwurf „Kochmodus“ = Code „Kochen starten“; „Zum Essensplan hinzufügen“ = „Zum Essensplan“; „Rezept anlegen“ = „Neues Rezept“).

Die Leinwand liegt auf claude.ai (**privat**, nur nach Freigabe über das Share-Menü einsehbar): https://claude.ai/artifact/VytBqLHUyzCKx4MeAxqCTV (Seiten „10 Seiten · Sticker“, „Styleguide“, „Zustände“, „Nuancen“). Der Stand im Repo (`reference/`) ist die gerundete Fassung (Stand 2026-10-20) und braucht keinen Zugang. Die Leinwand auf claude.ai ist älter (Tomaten-Logo, 13/15 px) und nicht mehr maßgeblich.

## 4. Mapping: Entwurf → Route → Code

Alle Pfade unter `frontend-food/src/`. Details und Vorschaubilder: `reference/index.html`.

| # | Seite | Route | Dateien |
|---|---|---|---|
| 01 | Startseite | `/` | `pages/HomePage.tsx` |
| 02 | Rezeptübersicht | `/recipes` | `pages/recipes/RecipeListPage.tsx`, `components/recipe/RecipeCard.tsx`, `RecipeFilterSidebar.tsx`, `components/shared/Pagination.tsx` |
| 03 | Rezeptdetail | `/recipes/:slug` | `pages/recipes/RecipeDetailPage.tsx` (1463 Zeilen, in vier Teile geschnitten, Tasks 6.3 bis 6.5), `RecipeMobileActionBar.tsx`, `RecipeIngredientsTable.tsx`, `RecipeKeyFigures.tsx` |
| 04 | Kochmodus | Ansicht in `/recipes/:slug` | `pages/recipes/RecipeCookingMode.tsx` |
| 05 | Rezept erstellen | `/recipes/new`, `/recipes/:slug/edit` | `pages/recipes/CreateRecipePage.tsx`, `EditRecipePage.tsx`, `components/recipe/RecipeWizard.tsx`, `WizardStep*.tsx` |
| 06 | Meine Essenspläne | `/meal-plans/app` | `pages/planning/MealEventListPage.tsx` |
| 07 | Neuer Essensplan | `/meal-plans/new` | `pages/planning/wizard/MealPlanWizardPage.tsx`, `StepBasicSettings.tsx`, `StepStrategy.tsx` |
| 08 | Essensplan | `/meal-plans/:id/*` | `pages/planning/MealEventDetailPage.tsx`, `DayPlanView.tsx`, `MealSlot.tsx`, `TableView.tsx` |
| 09 | Einkaufsliste | `/shopping-lists/:id` | `pages/shopping/ShoppingListDetailPage.tsx`, `components/shopping/*` |
| 10 | Zutat-Detail | `/ingredients/:slug` | `pages/ingredients/IngredientDetailPage.tsx`, `pages/ingredients/detail/*` |
| – | Gerüst | alle | `components/layout/FoodLayout.tsx`, `BrandMark.tsx`, `Footer.tsx`; `components/shared/HeroBand.tsx`/`PageHeader.tsx`/`TitleBand.tsx` (werden ersetzt) |
| – | Tokens | alle | `index.css`, `tailwind.config.ts`, `index.html`, `eslint-rules/design-tokens.js`, `src/__tests__/designRules.test.ts` |
| – | Tests | – | `e2e/` im Repo-Stamm (`playwright.config.ts`, `tests/*.ui.spec.ts`, `fixtures/ui-mocks.ts`, `food-release-check.sh`), CI: `.github/workflows/deploy.yml` Job `food-checks` |

### 4a Vollständige Routenliste (Prüfung auf Lücken)

Vollständig gegen `frontend-food/src/App.tsx` geprüft. Jede Route hat eine Aufgabe; Die Lücken, die vorher fehlten, stehen unter der Tabelle.

| Route | Seite (Datei) | Aufgabe |
|---|---|---|
| `/login`, `/register` | `LoginPage`, `RegisterPage`, `LoginDialog`, `OnboardingDialog` | 8.6 |
| `/` | `HomePage` | 6.1 |
| `/recipes` | `RecipeListPage` | 6.2 |
| `/recipes/my-recipes`, `/recipes/folders` | `MyRecipesPage`, `RecipeFoldersPage` | 8.2 |
| `/recipes/new`, `/recipes/:slug/edit` | `CreateRecipePage`, `EditRecipePage` (Assistent) | 6.7 |
| `/recipes/:slug` | `RecipeDetailPage`, Kochmodus (`RecipeCookingMode`) | 6.3 bis 6.6 |
| `/ingredients` | `IngredientListPage` | 8.1 |
| `/ingredients/new`, `/ingredients/:slug/edit` | `CreateIngredientPage`, `IngredientEditPage` | 8.1 |
| `/ingredients/:slug` | `IngredientDetailPage` | 6.12 |
| `/ingredients/statistics/:tab?` | `IngredientStatisticsPage` | 8.1 |
| `/material`, `/material/:slug`, `/material-list` | `MaterialListPage`, `MaterialDetailPage`, `MaterialChecklistPage` | 4.4, 8.1 |
| `/meal-plans` | `MealEventLandingPage` (Planung-Startseite) | 8.5 |
| `/meal-plans/app` | `MealEventListPage` | 6.8 |
| `/meal-plans/new` | `MealPlanWizardPage` | 6.9 |
| `/meal-plans/:id/*` | `MealEventDetailPage` (Planen, Einkaufen, Kochen) | 6.10 |
| `/meal-plans/:id/ref-meals/:mealType` | `RefMealEditorPage` | 8.3 |
| `/meal-plans/:id/…breakfast/wizard`, `/meal-plans/:id/meals/:mealId/breakfast-wizard`, `/meal-plans/:id/ref-meals/breakfast/wizard` | `BreakfastWizardPage` | 8.3 |
| `/meal-events/*` | Weiterleitung auf `/meal-plans` | keine Seite |
| `/shopping-lists` | `ShoppingListPage` | 8.4 |
| `/shopping-lists/join/:token` | `ShoppingListJoinPage` | 8.4 |
| `/shopping-lists/:id` | `ShoppingListDetailPage` | 6.11 |
| `/tools/norm-portion-simulator` | `NormPortionSimulatorPage` | 8.5 |
| `/profile` | `MyProfilePage` | 8.5 |
| `/profile/account` | `AccountPage` | 8.5 |
| `/profile/name/:slug` | `ProfilePage` (öffentlich) | 8.8 |
| `/privacy`, `/imprint` | `DatenschutzPage`, `ImpressumPage` | 8.5 |
| `/styleguide` | `StyleguidePage` | 5.6 |
| `/admin`, `/admin/:section`, `/admin/tag/:id` | `AdminPage`, `TagDetailPage` | 9.1 |
| `/admin/data-quality`, `/admin/data-quality/:section`, `/data-quality/distributions` | `DataQualityPage`, `DataDistributionsPage` | 9.1 |
| `*` | `NotFoundPage` (mit `NotFoundState`) | 8.5, 5.4 |
| global (jede Seite) | `AuthOverlays`, `GlobalFetchingBar`, `Toaster`, `ErrorBoundary`, `RouteBoundary` | 8.6, 8.7 |

**Vorher nicht erfasst und jetzt ergänzt**: Login- und Onboarding-Dialoge, das öffentliche Profil `/profile/name/:slug`, die globalen Bausteine (Ladebalken, Toaster, Fehlergrenzen) und der Titel der Planung-Startseite (`/meal-plans`).


## 5. Regeln für die Umsetzung

**Immer**
- UI-Texte Deutsch mit echten Umlauten; Code, Kommentare, Commit-Messages Englisch (Conventional Commits).
- Nur Tailwind-Klassen mit Token (`bg-card`, `text-foreground`, `bg-category-warm-soft`, …); keine Palettenfarben, keine freien Hex-/Pixelwerte, kein Inline-CSS, `cn()` für Bedingtes. Lint erzwingt das.
- Nur Lucide-Icons über `Icon`; 16/20/24/48 px, Strichstärke 2.
- Mobil zuerst ab 320 px; URL-State für Filter, Suche, Seiten; keine `any`, kein `console.log`.
- Rezeptbilder nur über `RecipeThumbnail` (Fallback nach Rezeptart), Nutri-Score nur über `NutriScoreBadge`.
- Bestehende **Test-IDs und `aria`-Labels bleiben** (z. B. `recipe-detail-actions`, `recipe-mobile-action-bar`); bestehende Tests anpassen statt löschen.
- Berechtigungen nur aus `can_edit`/`can_delete` der API.
- Pro Ansicht höchstens **eine Hauptaktion** (Petrol-Fläche) und **ein Sticker** (`Sticker`-Komponente erzwingt das); schräg stehen nur Sticker und das Logo.
- Status immer mit Fläche + Rand + Icon (`StatusNotice`), nie nur Farbe; Kategorie-Tönungen nie als Status.
- Tippflächen mobil ≥ 44 × 44 px, Eingaben ≥ 16 px.

**Nie**
- Backend außer den Lesefeldern aus Aufgabe 2b anfassen, Migrationen anlegen oder das Haupt-Frontend (`frontend/`) ändern.
- Neue Funktionen bauen, auch wenn der Entwurf sie zeigt (Liste in Abschnitt 2).
- Google-Fonts oder andere Fremdserver für Schriften laden.
- `HeroBand`/`bg-hero*`/`area-*` in neuem Code verwenden (nur Übergangs-Aliase bis Welle 11).
- Die Entwurfs-Hexwerte kopieren, wo `design.md` D1 abweicht (Feldrand `#858C87`, Tomate `#DA3A1E`).

## 6. Bekannte Abweichungen und Auslegungspunkte

- **Kontrast**: Entwurf hatte Feldränder `#D3D9D5` (1,43:1) und Tomate `#E2462A` (4,08:1); beides verfehlt WCAG AA und wurde auf der Leinwand und im Design korrigiert. Nutri-Score E (weiß auf `#E63E11`, 4,15:1) bleibt amtlich; axe-Ausnahme mit Begründung im Seitenregister.
- **Schriftbreite**: Bricolage ist breiter als der ursprüngliche Entwurfsfont; Titel können früher umbrechen. `text-wrap: balance` nutzen, auf 390/320 px prüfen.
- **Wochenraster (Desktop-Plan)**: Der Entwurf zeigt Tage als Spalten. Wenn `DayPlanView`/`TableView` das Gleiche leisten, bekommen sie den neuen Stil; kein zweiter Planmodus. Im Zweifel mit Produktverantwortlichen klären (Task 6.10).
- **Startseite**: „Weiter planen“ und „Beliebt“ nutzen nur vorhandene Listen-Endpunkte; fehlen Daten, verschwinden die Blöcke. Wenn auch das zu viel „Funktion“ ist, die beiden Blöcke streichen (Spec `food-homepage` entsprechend kürzen).
- **Sticker-Beschriftungen** der Entwürfe („Lagerliebling“, „Lagerfeuer“, „Ohne Kochen“, „Ein Topf“) sind Beispiele. Echte Sticker kommen nur aus vorhandenen Feldern („Neu“, „noch N Tage“, Entwurf-Status).
- **Offline-Zustand** auf der Zustände-Seite ist Zukunft und wird nicht gebaut (Task 7.2).
- **Kochmodus-Timer**, **Vorlagen auf der Leer-Seite** und **„Überrasch mich“** sind nicht Teil dieses Changes.
- **Kalt-Tönung** ist jetzt Oliv; Meal-Typ „Abendessen“ und Rezepttyp „Nachtisch“ teilen sich bewusst die Violett-Tönung.

### Zusätzliche Hinweise (bestätigt)

- **Logo**: Der Entwurf zeigt eine Tomaten-Kachel. Du hast das Maskottchen gewählt; das Motiv ist `favicon.png` (bestätigt).
- **Lesefelder**: Das Backend ändert sich minimal. Die Plan-Liste liefert heute keinen Fortschritt, der Entwurf zeigt ihn.
- **Schrittdauern und „Nächste Schritte“** stehen im Entwurf, haben aber keine Daten. Eigener Change (bestätigt).
- **Sticker-Quellen** (bestätigt, aus vorhandenen Feldern): „Beliebt“ für die ersten zehn der Sortierung „Meistgesehen“; „Neu“ für Rezepte bis 14 Tage alt; „Ohne Kochen“ bei `preparation_method` `none` oder `raw`; sonst das Zubereitungsart-Label (Backen, Braten, Grillen). Der Entwurf-Sticker „Lagerliebling“ wird „Beliebt“, „Lagerfeuer“ wird „Grillen“. Kochen erzeugt keinen Sticker.
- **Mobile Abläufe** ohne Kopfzeile zeigen kein Logo, wie im Entwurf.
- **Rezept-Fallback**: Rezeptkarten ohne Foto zeigen die Rezepttyp-Fläche, das Maskottchen steht nicht auf Karten.
- **Vorschau-Risiko** (bestätigt): Das Build-Flag sperrt Aktionen nur in der Oberfläche, die API bleibt offen. Das Restrisiko ist akzeptiert.
- **Material-Regeln** (`shared-ui-components`): Die Material-Symbol-Anforderungen beschreiben das Haupt-Frontend (`frontend/`). Sie bleiben in diesem Change unverändert; das Umstellen des Haupt-Frontends auf Lucide ist ein eigener Change.

## 7. Wie du arbeitest

1. `git switch feature/food-sticker` (Task 1.1), Vorschau-Umgebung bereit (1.2).
2. Reihenfolge laut `tasks.md`: **Testbasis (2) → Token/Schrift/Regeln (3) → Gerüst (4) → Komponenten (5) → zehn Seiten (6) → Zustände (7) → übrige Seiten (8) → Admin (9) → SEO (10) → Aufräumen (11) → Abnahme/Release (12)**. Nach jeder Welle ist alles grün und lauffähig (Übergangs-Aliase, Design D13).
3. Kleine PRs in den Integrationszweig, nicht nach `main`. `main` regelmäßig einmischen (Konfliktzonen: `shopping-*`, Mengen, `openspec/specs`).
4. **Definition of Done je Seite**: nach Referenz gebaut; betroffene Unit- und E2E-Tests angepasst und grün; Seite im Register `e2e/tests/ui-pages.ts` aktiv; Screenshot-Referenzen (390/1440) erzeugt **im Container** (`e2e/update-ui-baselines.sh`); axe ohne serious/critical; Tippflächen und Überlauf grün; genau eine H1; Titel/Beschreibung gesetzt; `npm run lint`, `npx tsc --noEmit`, `npm test` grün.
5. Referenzbilder nie auf dem eigenen Rechner (macOS) erzeugen, sondern nur im Container oder per CI; sonst entstehen unterschiedliche Pixel.
6. Release nur nach dem Produktions-Rollout-Plan: Trockenlauf zuerst, Anwenden nur mit ausdrücklicher Freigabe, Deployments ausschließlich über `main`.

Nützliche Befehle (aus `frontend-food/`, Python-Befehle immer mit `uv run`, hier nicht nötig):

```bash
npm run lint && npx tsc --noEmit && npm test && npm run build
```

```bash
sh ../e2e/food-release-check.sh
```

```bash
openspec validate food-sticker-redesign --strict
```

## 8. Abnahme-Checkliste (Stakeholder, auf der Vorschau)

Je Seite auf **Handy (390 px)** und **Desktop (1440 px)** prüfen und gegen `reference/screens/` halten:

- [ ] 01 Startseite · [ ] 02 Rezeptübersicht (Filter, Chips, Seitenzahlen) · [ ] 03 Rezeptdetail (Zutaten skalieren, Aktionsleiste) · [ ] 04 Kochmodus · [ ] 05 Rezept erstellen (alle Schritte) · [ ] 06 Pläne · [ ] 07 Neuer Plan · [ ] 08 Plan (Fehlt-Hinweis, Kennzahlen) · [ ] 09 Einkaufsliste (Einkaufsmodus) · [ ] 10 Zutat-Detail
- [ ] Zustände: Laden, Leer, Fehler (Abschnitt und 404)
- [ ] Navigation: vier Punkte, aktiver Punkt, Material unter Zutaten, Profilmenü, Logo
- [ ] Schrift: Überschriften Bricolage, keine Umbruch-Ausreißer bei langen Titeln
- [ ] Farben: Hauptaktion Petrol, nie mehr als eine pro Ansicht; höchstens ein Sticker pro Ansicht
- [ ] Zoomen per Pinch funktioniert; Tippen auf Eingaben zoomt nicht (iPhone)
- [ ] Druck: Rezept und Einkaufsliste druckbar
- [ ] Nichts funktional Neues, nichts Altes verschwunden (Stichprobe: Rezept ansehen, in Plan legen, Einkaufsliste öffnen, Zutat anlegen)
- [ ] Vorschau: Banner „Vorschau – nur ansehen“ sichtbar, Speichern und Löschen deaktiviert
- [ ] Logo und Favicon: Maskottchen, Tomate nur als Akzent
- [ ] Essenspläne: Reiter Anstehend und Vergangen, Fortschritt mit Text, Vorlagen nur aus Referenzplänen
- [ ] Schrift: keine Größe außerhalb der acht Stufen
- [ ] Rezepttypen: sieben Tönungen, Rezeptteil in Sand, Getränk in Rosa
- [ ] Animation: nur Ladeanzeigen bewegen sich wiederholt

## 9. Risiken im Blick behalten

Siehe `design.md` (Abschnitt „Risks / Trade-offs“). Die wichtigsten: Schriftbreite und Umbrüche, Größenänderung durch Token (Radius, Eingaben 16 px) in dichten Admin-Formularen, Screenshot-Reproduzierbarkeit, Konflikte mit parallelen Changes (`switchable-quantity-units`, `shopping-list-load-resilience`), begrenzte SEO-Wirkung ohne Prerendering.

## 10. Nach dem Release

`/opsx:archive food-sticker-redesign`; Folge-Changes anlegen: SEO-Prerendering, Offline-Einkaufsmodus, Kochmodus-Timer, Lagerliebling/Entdecken, Plan-Vorlagen. Danach `Design.md` um Erfahrungen ergänzen.
