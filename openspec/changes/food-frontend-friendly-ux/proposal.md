# Food-Frontend: freundliches Layout, schrittweises Laden, einheitliches Feedback

## Why

Das Food-Frontend wirkt auf Prod (essensplan.app, geprüft am 2026-10-04) schwer und eintönig: Jede Seite beginnt mit einem dunkelgrünen Verlaufs-Banner, Aktionen wie „Kochen starten“ sind dunkelbraun (`--warning: 32 95% 30%` wird als Button-Fläche benutzt), und fast jeder Block steckt in einer eigenen umrandeten Box. Gleichzeitig ist das Verhalten uneinheitlich:

- **Laden:** Nur 3 von rund 100 Seiten haben Skeletons, 46 Stellen ersetzen die ganze Seite durch Spinner oder „Laden...“, bis alles da ist. Rezept- und Zutatenliste warten zusätzlich auf `/api/auth/me/` (`enabled: restored`). Bei einem Kaltstart (gemessen 15,7 s) sieht der Nutzer lange nur graue Kästen ohne Erklärung.
- **Toasts:** 379 Aufrufe mit uneinheitlichen Texten („Zutat erstellt“ / „Zutat erstellt ✓“), 10 Komponenten ändern Daten ohne jede Rückmeldung, zwei Löschungen nutzen `window.confirm`.
- **Fehler:** Netzwerk- und Schema-Fehler erscheinen als „Failed to fetch“ oder roher Zod-Text, Leerzustand und Ladefehler sind oft nicht unterscheidbar, ein einziges globales ErrorBoundary.
- **Nutri-Score:** Die Spec `semantic-colors` verlangt noch Status-Farben (A → success, B → warning …), der Code nutzt bereits Originalfarben, aber in rund 20 Dateien nachgebaut; `DataDistributionsPage` hat eigene, abweichende Hex-Werte.
- **Informationsdichte:** Zutat-Detail zeigt alle Nährwerte, Scores (meist „—“), Physik, Lager, Portionen und Packungen gleichzeitig; Rezept-Zutatenzeilen zeigen sieben Kennzahlen je Zeile.

## What Changes

- **Farbschema „Frisch & offen“:** warmes Fast-Weiß als Hintergrund, weiße Karten mit feinem Schatten statt grauer Rahmen, weiches Anthrazit als Text. Primär-Buttons `#15803D` (AA, 5:1), `#16A34A` für Icons, Fortschritt und Akzente, Grün-Tönung `#F0FDF4` für Hover/Auswahl. Bereichsfarben (Rezepte Koralle, Zutaten Grün, Essensplan Himmelblau, Einkaufslisten Sonnengelb) nur als Tönung in Icon-Kachel und Navigations-Indikator. Warnungen als helle Bernsteinfläche mit Text `#B45309`; Statusfarben nie als Fläche normaler Aktionen.
- **Layout:** heller Seitenkopf mit großem Titel und Icon-Kachel statt Verlaufs-Banner, Suche ohne eigene Box, Filter-Sidebar ohne Rahmen, mehr Weißraum. **BREAKING** für die Klassen `gradient-hero`, `gradient-primary`, `gradient-sunset`, `gradient-fun`, `gradient-warm`, `gradient-rainbow` (entfallen).
- **Nutri-Score:** ausschließlich Originalfarben über eine einzige Komponente `NutriScoreBadge` (Größen klein, mittel, Skala); ein Test erzwingt, dass `nutri-*`-Klassen nur dort vorkommen.
- **Laden:** inhaltsförmige Skeletons überall, unabhängig ladende Abschnitte mit sanftem Einblenden, Listen starten ohne auf `/auth/me` zu warten, Hintergrund-Refetch zeigt alten Inhalt plus globalen Fortschrittsbalken, Hinweis bei langem Laden nach 3 s, Routen per `React.lazy`.
- **Toasts:** zentraler `notify`-Helfer mit festen Formulierungen, klare Regel wann Toast und wann nicht, „Rückgängig“ beim Löschen wo möglich, Promise-Toasts für lange Aktionen, Position oben Mitte, `window.confirm` entfällt, jede Mutation gibt Feedback.
- **Fehler:** deutsche Texte für Netzwerk- und Schema-Fehler, Formularfehler am Feld, Abschnitts-Fehler inline mit „Erneut versuchen“, ErrorBoundary pro Route und großem Abschnitt, Leerzustand und Fehler getrennt.
- **Einfach zuerst, Details auf Wunsch:** Zusammenfassung oben plus klappbare Abschnitte auf Zutat- und Rezept-Detail, reduzierte Zutatenzeilen mit Detail-Schalter, leere Werte ausblenden, wichtigste Listenfilter sichtbar, Rest unter „Weitere Filter“.
- **Aufräumen:** 46 wirkungslose `text-xs/sm/base/lg/xl`-Klassen werden auf die fünf Schriftgrößen-Token umgestellt.

## Capabilities

### New Capabilities
- `food-loading-states`: Skeletons, schrittweises Erscheinen, Hintergrund-Refetch, Langsam-Hinweis, keine Auth-Kaskade für öffentliche Listen, Route-Splitting.
- `food-feedback-toasts`: einheitliche Toast-Sprache, Toast-Regeln, Rückgängig, Promise-Toasts, Bestätigungsdialoge.
- `food-error-presentation`: Fehlerübersetzung, Feld-/Abschnitts-/Routen-Fehler, Trennung von Leer und Fehler.
- `food-progressive-disclosure`: Zusammenfassung plus klappbare Details auf Detailseiten, reduzierte Listenzeilen, Ausblenden leerer Werte, gestufte Filter.

### Modified Capabilities
- `food-design-system`: neue Leitfarben- und Flächenwerte, Bereichsfarben, Warnfarbe nur als Fläche/Text, Gradient-Klassen entfallen.
- `semantic-colors`: Nutri-Score nutzt die offiziellen Farben über `NutriScoreBadge` statt Status-Token.
- `food-list-page-layout`: heller Seitenkopf statt Hero-Banner, Suche ohne Container-Box, Filter-Sidebar ohne Rahmen mit „Weitere Filter“.

## Impact

- **Frontend (frontend-food):** `src/index.css`, `tailwind.config.ts`, `main.tsx` (Toaster, QueryClient), `App.tsx` (lazy Routen, ErrorBoundary je Route), `lib/api.ts` (Fehlerübersetzung), neue `lib/notify.ts`, neue Komponenten `components/ui/skeleton.tsx`, `components/shared/NutriScoreBadge.tsx`, `components/shared/SectionBoundary.tsx`, `components/shared/CollapsibleSection.tsx`, `components/shared/PageHeader.tsx`, `components/shared/GlobalFetchingBar.tsx`, `hooks/usePersistedListState.ts`, alle Seiten unter `pages/` (insb. `recipes/RecipeDetailPage.tsx`, `ingredients/IngredientDetailPage.tsx`, `planning/MealEventDetailPage.tsx`, `HomePage.tsx`, Listenseiten, Admin-Tabs) sowie die rund 20 Nutri-Score-Stellen.
- **Schemas:** keine Änderungen an Pydantic- oder Zod-Schemas; `NUTRI_SCORE_COLORS*` in `schemas/supply.ts` wird nur noch intern von `NutriScoreBadge` genutzt.
- **Backend / Migrationen:** keine.
- **Haupt-Frontend (`frontend/`):** nicht betroffen.
