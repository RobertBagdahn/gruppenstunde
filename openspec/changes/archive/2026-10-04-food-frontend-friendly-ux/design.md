## Context

Das Food-Frontend (`frontend-food/`) nutzt Tailwind mit CSS-Token in `src/index.css`, TanStack Query, `sonner` für Toasts und ein globales `ErrorBoundary` in `main.tsx`. Bestandsaufnahme vom 2026-10-04 (Code und Prod essensplan.app):

- `--primary: 142 72% 28%` als Button-, Banner- und Verlaufsfarbe; `--warning: 32 95% 30%` (wirkt braun) an rund 140 Stellen, u. a. als Button-Fläche in `components/recipe/RecipeSidebar.tsx` und `RecipeMobileActionBar.tsx`.
- `ListPageHero` rendert einen Verlaufs-Banner; die Suche steckt in einer eigenen Karte.
- Skeletons nur in `ProfilePage`, `MyProfilePage`, `RecipeListPage`; 53 Dateien mit Spinnern; 46 ganzseitige Early-Returns im Ladezustand.
- `usePersistedListState` liefert `restored` erst nach `/api/auth/me/`; Listen-Queries sind mit `enabled: restored` daran gekoppelt. Kaltstart auf Prod: 15,7 s für `/auth/me/`.
- 379 `toast`-Aufrufe direkt aus `sonner`; Mutationen ohne Feedback in `GroupMemberPanel`, `OffensivePipeline`, `OffensiveWorkList`, `DuplicateGroupsPanel`, `RecipeCleanupPanel`, `PackageSuggestionsPanel`, `KitchenReminderSection`, `HintDetailModal`; `window.confirm` in `pages/admin/RuleTab.tsx` und `pages/recipes/RecipeFoldersPage.tsx`.
- `lib/api.ts` fängt `fetch`-`TypeError` und `ZodError` nicht ab.
- Nutri-Score: Farben zentral in `schemas/supply.ts`, aber rund 20 Dateien bauen Badges selbst; `pages/DataDistributionsPage.tsx` hat eigene Hexwerte (D `#F0861E`).
- 46 Tailwind-Standard-Schriftgrößen (`text-sm` usw.) ohne Wirkung, weil `tailwind.config.ts` die Skala ersetzt.

Keine Backend-, API- oder Schema-Änderungen. Keine Migrationen.

## Goals / Non-Goals

**Goals:**
- Helles, freundliches Erscheinungsbild ohne dunkle Flächen; Bereichsfarben als dezente Orientierung.
- Nutri-Score überall identisch und offiziell.
- Spürbar schnelleres, schrittweises Erscheinen von Inhalten; jederzeit erkennbar, dass geladen wird.
- Einheitliches Feedback bei jeder Änderung, verständliche deutsche Fehler.
- Weniger Informationen auf den ersten Blick, Details auf Wunsch.
- Regeln per Lint/Test absichern, damit sie bei neuen Seiten halten.

**Non-Goals:**
- Dark Mode.
- Infrastruktur-Maßnahmen gegen Kaltstart (Mindest-Instanz).
- Änderungen am Haupt-Frontend (`frontend/`) oder Backend.
- Neue fachliche Funktionen.

## Decisions

### 1. Token statt Komponenten-Farben
Neue Token in `src/index.css`: `--background` (≈ `#FCFBF8`), `--foreground` (≈ `#1F2937`), `--primary` (`#15803D`), `--primary-bright` (`#16A34A`), `--primary-soft` (`#F0FDF4`), `--area-{recipes,ingredients,planner,shopping}` und `--area-*-soft`, `--warning` (`#B45309`) mit `--warning-soft` (`#FFFBEB`), `--border` heller, Schatten `--shadow-card`. Registrierung in `tailwind.config.ts` (`primary.bright`, `primary.soft`, `area.recipes.DEFAULT/soft` …, `boxShadow.card/raised`). Die bestehende Vitest-Kontrastprüfung (`lib/contrast.test.ts`) wird um die neuen Paare erweitert.
*Alternative:* `#16A34A` als Button-Fläche – verworfen, weißer Text erreicht nur 3,3:1 (Nutzerentscheidung 2026-10-04).

### 2. Lint-Regeln für Durchsetzung
`eslint-rules/design-tokens.js` wird erweitert um: verbotene Standard-Schriftgrößen (`text-xs|sm|base|lg|xl|2xl…`), verbotene entfernte Gradient-Klassen, `bg-warning`/`bg-success`/`bg-info` als Vollfläche an `<button>`/`Button`. Ein Vitest (`src/__tests__/designRules.test.ts`) scannt `src/` auf: `nutri-*`-Klassen und Nutri-Hexwerte außerhalb `NutriScoreBadge.tsx`/`schemas/supply.ts`, `from 'sonner'` außerhalb `lib/notify.ts`/`main.tsx`, `window.confirm|confirm(|alert(|prompt(`.
*Alternative:* nur Code-Review – verworfen, die heutige Streuung zeigt, dass Regeln ohne Prüfung erodieren.

### 3. Gemeinsame Bausteine
- `components/ui/skeleton.tsx`: `Skeleton` (Basis) plus `SkeletonText`, `SkeletonCard`, `SkeletonCardGrid`, `SkeletonTableRows`, `SkeletonDetailHeader`, `SkeletonForm`, `PageSkeleton`.
- `components/shared/LoadingSection.tsx`: Hilfskomponente `QuerySection` mit Props `query`, `skeleton`, `empty`, `errorTitle`, `children(data)`; rendert Skeleton → Fehler inline (mit „Erneut versuchen“) → Leerzustand → Inhalt mit Fade-in (`animate-in fade-in duration-200 motion-reduce:animate-none`). Damit wird „unabhängige Abschnitte“ ohne Wiederholung umgesetzt.
- `components/shared/SlowLoadingHint.tsx`: zeigt den Hinweistext nach 3 s; wird von `PageSkeleton` und `QuerySection` beim ersten Laden genutzt.
- `components/shared/GlobalFetchingBar.tsx`: nutzt `useIsFetching()` und `useIsMutating()`, 2 px Balken `bg-primary-bright` oben fixiert, erscheint erst nach 150 ms (kein Blitzen).
- `components/shared/PageHeader.tsx`: ersetzt `ListPageHero` (Props `title`, `description`, `icon`, `area`, `count`, `countLabel`, `actions`); alle Nutzer von `ListPageHero` und der Verlaufs-Köpfe auf Detail-/Tool-Seiten werden umgestellt, `ListPageHero` wird gelöscht.
- `components/shared/CollapsibleSection.tsx`: Kopfzeile mit Titel, Kurzinfo (`summary`), Chevron; Zustand per `storageKey` in `localStorage` (try/catch), Inhalt erst beim Öffnen gemountet, sodass zugehörige Queries erst dann laden (`enabled: open`) – außer der Abschnitt ist standardmäßig offen.
- `components/shared/NutriScoreBadge.tsx`: Props `value` (Buchstabe oder Klasse 1–5 oder `null`), `size: 'sm' | 'md' | 'scale'`; nutzt `NUTRI_SCORE_COLORS_BY_LETTER`; `aria-label="Nutri-Score B"`. Diagramme beziehen Füllfarben über eine exportierte Funktion `nutriScoreFill(letter)` aus derselben Datei.
- `components/shared/SectionBoundary.tsx` und `RouteBoundary` (Variante von `ErrorBoundary` mit `resetKeys` = Pfad).
- `components/shared/MissingValuesHint.tsx` für „N Werte fehlen – ergänzen“.

### 4. Toast-Helfer
`lib/notify.ts` kapselt `sonner`:
```ts
notify.saved(entity: string)       // "Zutat gespeichert"
notify.created(entity: string)     // "Zutat angelegt"
notify.deleted(entity: string, undo?: () => void)  // mit Aktion "Rückgängig", 6 s
notify.removed(entity: string, undo?: () => void)
notify.done(message: string)       // freier Erfolgstext für Sonderfälle
notify.failed(entity: string, verb: string, error: unknown) // "Zutat konnte nicht gespeichert werden" + getApiErrorMessage
notify.info(message: string)
notify.promise<T>(p: Promise<T>, { loading, success, error })
```
Typen statt freier Strings für häufige Entitäten (`'Rezept' | 'Zutat' | 'Essensplan' | …`) erhöhen die Einheitlichkeit; Grammatik (Genus spielt bei Partizipien keine Rolle) bleibt einfach. Toaster in `main.tsx`: `position="top-center"`, `richColors`, `closeButton`, `duration: 4000`, `offset` mit Safe-Area.
*Alternative:* Toasts zentral in `MutationCache.onSuccess`/`onError` – verworfen: Aufrufer-Callbacks aus `mutate(vars, { onError })` sind im Cache nicht sichtbar, ein Fallback würde doppelte Toasts erzeugen. Stattdessen wurden alle `mutate`-Aufrufe ohne `onError` per Skript gefunden und mit Feedback ergänzt.

### 5. Undo-Strategie
Das Backend hat keine Restore-Endpunkte, und Backend-Änderungen sind kein Teil dieses Changes. „Rückgängig“ bleibt daher bei den vorhandenen, rein clientseitigen Mustern (Mahlzeit-Eintrag aus dem Cache-Snapshot neu anlegen, Einkaufslisten-Eintrag neu anlegen, Zeile der Zutatenprüfung zurücksetzen) und nutzt einheitlich `UNDO_DURATION_MS`. Alle anderen Löschungen behalten `ConfirmDialog`; `window.confirm` entfällt. Ein verzögertes Löschen (`useUndoableDelete`) wurde verworfen, weil es ohne Restore-Endpunkt beim Schließen des Tabs Daten verlieren oder doppelt löschen kann.

### 6. Fehlerübersetzung in `lib/api.ts`
`apiFetch` umschließt `fetch` mit `try/catch`: `TypeError`/`AbortError` (außer gewollte Abbrüche) → `ApiError(0, …, { detail: 'Keine Verbindung …' , code: 'network' })`. `parseApiResponse` fängt `ZodError` → `ApiError(response.status, …, { detail: 'Die Antwort des Servers …', code: 'schema' })` und meldet den Zod-Pfad an das bestehende Fehler-Logging. `ErrorDisplay` erkennt `code === 'network'` statt String-Suche.

### 7. Listen ohne Auth-Kaskade
`usePersistedListState` gibt `restored` sofort `true` zurück, wenn die URL bereits Listen-Parameter enthält oder für nicht angemeldete Nutzer kein Speicher existiert; sonst wird der Speicher erst nach `/auth/me` gelesen und per `writeUrl` übernommen, was eine zweite Anfrage auslöst. Paginierte Listen-Hooks (`useRecipes`, `useIngredients`, Essensplan-Liste, Einkaufslisten) erhalten `placeholderData: keepPreviousData`; die Karten werden während `isPlaceholderData` mit `opacity-60` gerendert.

### 8. Route-Splitting
Alle Seiten in `App.tsx` werden per `lazy(() => import(...))` geladen; `Suspense` sitzt innerhalb des Layouts um `<Outlet/>`, Fallback `PageSkeleton`. `RouteBoundary` umschließt den `Suspense`.

### 9. Progressive Disclosure
- `pages/ingredients/IngredientDetailPage.tsx` (2380 Zeilen) wird beim Umbau in Abschnitts-Komponenten unter `pages/ingredients/detail/` zerlegt (`IngredientSummary`, `NutritionSection`, `ScoresSection`, `PhysicsStorageSection`, `PortionsSection`, `PackagesSection`, `UsedInSection`), jeweils in `CollapsibleSection`.
- `pages/recipes/RecipeDetailPage.tsx`: `RecipeSummary` (aus `RecipeSidebar`/`RecipeMetaCard` abgeleitet) oben; Zutaten und Zubereitung offen; Gesundheit, Nährwerte, Analyse, Regeln, Verbesserungen als klappbare Abschnitte.
- Zutatenzeilen: Schalter „Details“ (persistiert) steuert die Metazeile in der Zutatenliste; Tap auf Zeile toggelt einzeln.
- Filter: `RecipeListPage` und `IngredientListPage` bekommen `FilterGroup`-Reihenfolge und `MoreFilters` (Collapsible mit Zähler), aktive Chips über `ActiveFiltersHint`.

### 10. Umsetzungsreihenfolge
Fundament (Token, Lint, Bausteine, notify, api) zuerst, dann Seitenumbau nach Bereichen. Lint- und Test-Regeln werden nach dem Umbau auf `error` gestellt, damit der Umbau schrittweise grün bleibt.

## Risks / Trade-offs

- [Großer Umbau über ~100 Seiten erzeugt Regressionen] → Fundament mit Tests zuerst, danach je Bereich `npm run test`, `npm run lint`, `tsc` und die vorhandenen Playwright-Smoke-Tests (`e2e/`); visuelle Prüfung der Hauptseiten im Browser.
- [Verzögertes Löschen geht verloren, wenn der Tab geschlossen wird] → `beforeunload`/`pagehide` führt ausstehende Löschungen per `fetch(..., { keepalive: true })` aus.
- [Eingeklappte Abschnitte verstecken wichtige Warnungen] → Warnungen (Allergene, Datenqualität) bleiben in der Zusammenfassung sichtbar; Abschnittsköpfe zeigen Kurzinfos.
- [Lazy Routen verursachen Ladezeit beim ersten Seitenwechsel] → Vorladen der Hauptbereiche bei Hover/Fokus auf Navigationslinks.
- [Hellere Flächen verringern Abgrenzung] → Schatten-Token plus Kontrast-Test; Prüfung bei 320 px.
- [Mehr Requests durch unabhängige Abschnitte] → Abschnitte nutzen vorhandene Endpunkte; eingeklappte Abschnitte laden erst beim Öffnen.

## Migration Plan

Reines Frontend-Deployment über den bestehenden Deploy-Weg. Rollback durch erneutes Deployment des vorherigen Builds. Gespeicherte Abschnittszustände im `localStorage` sind optional und brauchen keine Migration.

## Open Questions

- Keine; Farbwahl (`#15803D`), Toast-Position, klappbare Abschnitte und Umfang wurden am 2026-10-04 mit dem Nutzer entschieden.
