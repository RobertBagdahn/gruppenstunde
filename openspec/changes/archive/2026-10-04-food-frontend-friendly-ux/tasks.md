Backend, Pydantic- und Zod-Schemas sowie Migrationen sind nicht betroffen (reiner Frontend-Change in `frontend-food/`).

## 1. Design-Token und Regeln

- [x] 1.1 `src/index.css`: neue Werte für `--background`, `--foreground`, `--card`, `--border`, `--primary` (#15803D), `--primary-bright`, `--primary-soft`, `--ring`, `--warning`/`-soft`/`-border`/`-foreground`, hellere `-soft`-Flächen aller Status-Token, `--area-*` und `--area-*-soft`, `--shadow-card`/`--shadow-raised`; Nutri-D auf `#EE8100` angleichen
- [x] 1.2 `src/index.css`: Klassen `gradient-hero`, `gradient-primary`, `gradient-sunset`, `gradient-fun`, `gradient-warm`, `gradient-rainbow`, `shell-*` und `panel-muted` entfernen bzw. auf Token umstellen; `gradient-soft` für die Startseite anlegen
- [x] 1.3 `tailwind.config.ts`: `primary.bright`, `primary.soft`, `area.*`, `boxShadow.card/raised`, Keyframes für Fade-in registrieren
- [x] 1.4 `lib/contrast.test.ts` um die neuen Token-Paare erweitern (weiß auf primary, primary auf primary-soft, warning auf warning-soft)
- [x] 1.5 `eslint-rules/design-tokens.js` + Test: Standard-Schriftgrößen, entfernte Gradient-Klassen und Status-Vollflächen an Buttons verbieten
- [x] 1.6 `src/__tests__/designRules.test.ts`: Scan auf `nutri-*`/Nutri-Hexwerte außerhalb `NutriScoreBadge`/`schemas/supply.ts`, `sonner`-Importe außerhalb `lib/notify.ts`/`main.tsx`, `confirm(`/`alert(`/`prompt(`
- [x] 1.7 `Design.md` und `AGENTS.md` im Food-Frontend um die neuen Regeln (Farben, Toasts, Laden, Fehler, Disclosure) ergänzen

## 2. Gemeinsame Bausteine

- [x] 2.1 `components/ui/skeleton.tsx` mit `Skeleton`, `SkeletonText`, `SkeletonCard`, `SkeletonCardGrid`, `SkeletonTableRows`, `SkeletonDetailHeader`, `SkeletonForm`, `PageSkeleton` + Tests
- [x] 2.2 `components/shared/SlowLoadingHint.tsx` (3-s-Hinweis) + Test mit Fake-Timern
- [x] 2.3 `components/shared/QuerySection.tsx` (Skeleton → Fehler inline → Leer → Inhalt mit Fade-in, reduced-motion) + Tests
- [x] 2.4 `components/shared/GlobalFetchingBar.tsx` (useIsFetching/useIsMutating, 150 ms Verzögerung) in das Layout einbauen
- [x] 2.5 `components/shared/PageHeader.tsx` mit Bereichsfarbe, Count-Badge inkl. Skeleton, Aktionen-Slot + Test
- [x] 2.6 `components/shared/CollapsibleSection.tsx` mit persistiertem Zustand (try/catch) und Lazy-Mount + Test
- [x] 2.7 `components/shared/NutriScoreBadge.tsx` (`sm`, `md`, `scale`, `aria-label`) und `nutriScoreFill()` + Tests
- [x] 2.8 `components/shared/SectionBoundary.tsx` und `RouteBoundary` + Test für isolierten Absturz
- [x] 2.9 `components/shared/MissingValuesHint.tsx` (mit/ohne Bearbeitungsrecht)
- [x] 2.10 `components/shared/MoreFilters.tsx` (klappbar, Zähler aktiver Filter) und Mobil-Sheet „Filter (N)“

## 3. Toasts und Fehler

- [x] 3.1 `lib/notify.ts` (`saved`, `created`, `deleted`, `removed`, `done`, `failed`, `info`, `promise`, Undo-Aktion 6 s) + Tests
- [x] 3.2 `main.tsx`: Toaster `top-center` mit Safe-Area-Offset und `GlobalFetchingBar` (kein Cache-Fallback-Toast, siehe design.md)
- [x] 3.3 `lib/api.ts`: Netzwerk- und Zod-Fehler in deutsche `ApiError` übersetzen (`code: 'network' | 'schema'`), Schema-Fehler loggen + Tests
- [x] 3.4 `components/ErrorDisplay.tsx`: Erkennung über `ApiError.code`/`status` statt String-Suche + Test
- [x] 3.5 Helfer zum Zuordnen von `ApiError.fields` zu react-hook-form-Feldern (`lib/formErrors.ts`) + Test
- [x] 3.6 Undo-Dauer vereinheitlichen (`UNDO_DURATION_MS`) für die vorhandenen clientseitigen Undo-Muster (verzögertes Löschen verworfen, siehe design.md)
- [x] 3.7 Alle `toast.*`-Aufrufe (≈ 379) auf `notify` umstellen und Texte vereinheitlichen
- [x] 3.8 Feedback für Mutationen ohne Rückmeldung ergänzen: `GroupMemberPanel`, `OffensivePipeline`, `OffensiveWorkList`, `DuplicateGroupsPanel`, `RecipeCleanupPanel`, `PackageSuggestionsPanel`, `KitchenReminderSection`, `HintDetailModal`
- [x] 3.9 Mikro-Aktionen ohne Erfolgs-Toast prüfen (Abhaken, Sortieren, Mengen/Faktor) – optimistisch mit Rollback
- [x] 3.10 Undo statt Nachfrage bei Mahlzeit-Einträgen, Einkaufslisten-Einträgen und Zeilen der Zutatenprüfung; sonst `ConfirmDialog`
- [x] 3.11 `window.confirm` in `pages/admin/RuleTab.tsx` und `pages/recipes/RecipeFoldersPage.tsx` durch `ConfirmDialog` ersetzen
- [x] 3.12 Lange Aktionen ohne eigene Fortschrittsanzeige auf `notify.promise` umstellen (Stammdaten mit KI ergänzen); KI-Bild/URL-Import/Vorschläge zeigen Fortschritt im Dialog

## 4. Laden und Routing

- [x] 4.1 `hooks/usePersistedListState.ts`: `restored` sofort bei URL-Parametern bzw. ohne Speicher; Restore nur bei leerer URL + Tests (anonym, angemeldet)
- [x] 4.2 Paginierte Listen-Hooks mit `placeholderData: keepPreviousData`; abgeblendete Darstellung während `isPlaceholderData`
- [x] 4.3 `App.tsx`: alle Seiten per `React.lazy`, `Suspense` mit `PageSkeleton` im Layout, `RouteBoundary` je Route, Prefetch bei Hover/Fokus auf Navigationslinks
- [x] 4.4 Ganzseitige Lade-Early-Returns (46 Stellen) durch Skeletons bzw. `QuerySection` ersetzen; Ladetexte („Laden...“, „Lade …“, „Wird geladen …“) entfernen

## 5. Layout und Farben auf Seiten

- [x] 5.1 `PageHeader` statt `ListPageHero`/Verlaufsköpfen auf `RecipeListPage`, `MyRecipesPage`, `IngredientListPage`, `MealEventListPage`, `ShoppingListPage`, `ImpressumPage`, `DatenschutzPage`; `ListPageHero` löschen
- [x] 5.2 Suchleiste ohne Box (`ListPageSearchBar`), Filter-Sidebar ohne Rahmen, `MoreFilters` mit höchstens drei sichtbaren Gruppen auf Rezept- und Zutatenliste
- [x] 5.3 `HomePage`: heller Begrüßungsbereich (`gradient-soft`), Modulkacheln mit Bereichsfarben, Kennzahlen mit Skeleton je Kachel
- [x] 5.4 Navigation: aktiver Bereich mit Bereichsfarben-Indikator statt grüner Fläche
- [x] 5.5 „Kochen starten“ (`RecipeSidebar`, `RecipeMobileActionBar`) auf Primär, „Einkaufsliste“ auf Primär-Tönung; alle `bg-warning`/`bg-success`/`bg-info`-Vollflächen an Aktionen ersetzen
- [x] 5.6 Karten auf `shadow-card` umstellen, verschachtelte umrandete Boxen auflösen (Listen, Detailseiten, Planer)
- [x] 5.7 Alle Nutri-Score-Darstellungen (≈ 20 Dateien, inkl. `RecipeCard`, `IngredientCard`, `RecipeMetaCard`, `HealthTab`, `RecipeNutriScoreDistribution`, `IngredientDetailSearchDialog`, `NutriLandscapeTab`, `DataDistributionsPage`, Planer-Komponenten) auf `NutriScoreBadge` bzw. `nutriScoreFill` umstellen
- [x] 5.8 46 Tailwind-Standard-Schriftgrößen auf die fünf Token umstellen
- [x] 5.9 `StyleguidePage` mit neuen Token, Bereichsfarben, Skeletons, Toast-Beispielen und `NutriScoreBadge` aktualisieren

## 6. Einfach zuerst, Details auf Wunsch

- [x] 6.1 `IngredientDetailPage` in Abschnitts-Komponenten unter `pages/ingredients/detail/` zerlegen; `IngredientSummary` oben, übrige Abschnitte als `CollapsibleSection` mit Kurzinfo, je mit eigener Query/`QuerySection`
- [x] 6.2 `RecipeDetailPage`: `RecipeSummary` oben; Zutaten und Zubereitung offen; Gesundheit, Nährwerte, Analyse, Regeln, Verbesserungen klappbar und in `SectionBoundary`
- [x] 6.3 Rezept-Zutatenzeilen: Standard nur Menge, Name, Nutri-Score; Schalter „Details“ (persistiert) und Tap je Zeile
- [x] 6.4 Leere Werte in Nährwerten, Scores, Physik und Lager ausblenden und `MissingValuesHint` anzeigen
- [x] 6.5 `MealEventDetailPage`: Kopf zuerst, Tabs/Abschnitte (Kochplan, Einkauf, Kosten, Vorschläge) mit eigenen Skeletons und `SectionBoundary`
- [x] 6.6 Listenkarten auf höchstens drei Kennzahlen reduzieren

## 7. Prüfung

- [x] 7.1 `npm run lint`, `npx tsc --noEmit` und `npm run test` in `frontend-food/` grün; Lint-Regeln aus 1.5 auf `error`
- [x] 7.2 Playwright-Smoke-Tests (`e2e/`) anpassen und ausführen (Preisfreigabe- und PDF-Popup-Test schlugen bereits vor dem Change fehl)
- [x] 7.3 Browser-Prüfung lokal bei 320 px, 375 px und Desktop: Startseite, Rezeptliste, Rezept-Detail, Zutatenliste, Zutat-Detail, Essensplan, Einkaufsliste, Admin; Ladeverhalten mit gedrosseltem Netz; Offline-Fehler; Toasts oben Mitte
- [x] 7.4 Suche nach Restbeständen: `gradient-hero|gradient-primary|ListPageHero|window.confirm|Laden\.\.\.|text-sm\b` ohne Treffer
