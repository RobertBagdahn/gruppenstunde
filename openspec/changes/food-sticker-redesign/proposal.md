# Proposal

## Why

Das Food-Frontend (`frontend-food/`) hat heute den Look „Feldküche“: salbeigrüner Seitengrund, dunkles Kiefer-Kopfband auf jeder Seite, Material-Navigation mit fünf Bereichen. Für die jugendliche bis junge erwachsene Zielgruppe soll er heller, klarer und etwas verspielter werden, auf dem Handy mindestens so gut funktionieren wie am Desktop und im Suchindex besser dastehen. Die Entwürfe („Sticker“-Look, Hauptfarbe Petrol, Schrift Bricolage Grotesque) wurden auf einer Claude-Design-Leinwand erstellt und fachlich abgenommen; sie sollen jetzt verbindlich, getestet und vollständig umgesetzt werden, statt als Einzelanpassungen zu versickern.

## What Changes

- **Look**: Weißer Seitengrund, Petrol (`#0F6E7A`) als Hauptfarbe, Kategorie-Tönungen nur als Fläche für Rezepttypen, Sticker höchstens einmal pro Ansicht. Das Logo ist das Inspi-Maskottchen (Kopfzeile und Favicon). Das dunkle Kopfband (`HeroBand`, `PageHeader`, `TitleBand`, `bg-hero*`) entfällt vollständig. **BREAKING** (rein visuell, keine API).
- **Schrift**: Bricolage Grotesque (Überschriften, Kennzahlen) und Figtree (Text) werden selbst gehostet, keine Anfragen an Google mehr.
- **Navigation**: Vier Hauptpunkte Rezepte, Pläne, Einkauf, Zutaten. „Start“ ist das Logo; Material wird ein Reiter unter „Zutaten“; Profil und Admin liegen im Profilmenü. Mobil Leiste unten, am Desktop oben.
- **Seiten**: Alle Nutzerseiten (Start, Rezepte, Rezeptdetail, Kochmodus, Rezept erstellen/bearbeiten, Pläne, Planassistent, Plandetail, Einkaufslisten, Zutaten, Material, Profil, Login, Rechtliches) werden nach dem Styleguide umgebaut. Admin, Datenqualität und Statistiken bekommen nur Farben, Schrift, Radien und die neue Navigation.
- **Zustände**: Lade-, Leer- und Fehlerzustände folgen einheitlichen Mustern (siehe Zustände-Seite der Referenz).
- **Lesefelder**: Fortschritt und Kosten je Plan sowie die Zähler der Startseite als abgeleitete Lesefelder (keine Migration).
- **Maskottchen**: Logo, Favicon und Bild in Leer- und Fehlerzuständen, auf Rechtsseiten und der Tool-Landing; optimierte Dateien.
- **Tönungen**: sieben Rezepttypen (neu Rezeptteil und Getränk). **Vorschau**: nur ansehen, mit Produktionsdaten.
- **Eingabefelder** sind mobil 16 px groß; die Zoom-Sperre (`maximum-scale=1`) im Food-Frontend entfällt.
- **SEO-Markup**: je Seite eine H1, Brotkrumen, eindeutige Titel und Beschreibungen, strukturierte Daten (JSON-LD `Recipe`, `BreadcrumbList`), `noindex` für private Seiten, nummerierte Seiten als echte Links.
- **Qualität**: Erweiterte Design-Regeln und ESLint, Playwright-Screenshots der 10 Hauptseiten auf 390 und 1440 px, axe-Prüfung auf Barrierefreiheit und Messung der Tippflächen (≥ 44 px) als blockierende CI-Schritte.
- **Dokumentation**: `frontend-food/AGENTS.md`, `Design.md`, Styleguide-Seite und die Design-Specs beschreiben nur noch den neuen Stand.

Nicht Teil dieses Changes (eigene Changes): neue Funktionen aus den Entwürfen (Lagerliebling der Woche, „Überrasch mich“, „Wer holt was“, Offline-Einkaufsmodus, Kochmodus-Timer, kuratierte Plan-Vorlagen, Schrittdauern, „Nächste Schritte“), Server- oder Vorab-Rendering öffentlicher Seiten, Dark Mode, Änderungen am Haupt-Frontend (`frontend/`).

## Capabilities

### New Capabilities
- `food-page-shell`: Seitengerüst des Food-Frontends: Kopfzeile, Hauptnavigation (Desktop oben, mobil unten), Footer, Seitenkopf, Seitencontainer, Aktionsleiste und Brotkrumen.
- `food-ui-quality-gates`: Automatisierte, blockierende Qualitätsgrenzen für die Oberfläche: Design-Regel-Tests, Lint, Screenshot-Referenzen, Barrierefreiheits- und Tippflächen-Prüfung.
- `food-seo-markup`: Suchmaschinenrelevantes Markup der öffentlichen Seiten: Titel, Meta, Überschriftenstruktur, Brotkrumen, strukturierte Daten, Indexierbarkeit.
- `food-page-states`: Zustände Laden, Leer, Fehler; Offline ist nicht Teil des Changes.
- `food-plan-summary-fields`: Lesefelder für Fortschritt und Dashboard-Zähler; Kosten je Person und Tag je Karte aus dem bestehenden Kostenendpunkt.

### Modified Capabilities
- `food-design-system`: Tokens, Leitfarbe, Kontrast, Schriften (selbst gehostet), Größen- und Radien-Skala, Schatten, Sticker-Regeln, Styleguide und ESLint-Durchsetzung auf den neuen Look umgestellt.
- `food-list-page-layout`: Heller Seitenkopf ohne Band, Filterleiste, Karten und Seitenzahlen im neuen Stil.
- `food-frontend-app`: Navigation auf vier Hauptpunkte, Material unter Zutaten, Profilmenü.
- `food-homepage`: Startseite als Einstieg mit Hauptaktionen, Bereichskacheln, Anleitung und Beliebtem aus vorhandenen Daten.
- `mobile-viewport`: Das Food-Frontend sperrt das Zoomen nicht mehr; Eingabefelder sind mobil 16 px groß.
- `recipe-add-to-meal-plan`: Aktion „Zum Essensplan“ im Seitenkopf statt im entfallenden Kopfband.
- `shopping-list-sharing`: Einkaufsmodus-Schalter im Seitenkopf statt im entfallenden Kopfband.
- `meal-plan-list-dashboard`, `meal-plan-colorful-ui`, `ui-polish`, `recipe-detail-reorganized`: durch das Layout ersetzt (REMOVED und ADDED).
- `recipe-thumbnail`, `ingredient-database`, `shared-ui-components`: Fallback nach Rezepttyp statt `inspi_cook.png`.

## Impact

- **React-Pages** (`frontend-food/src/pages/`): alle 39 Dateien, die `HeroBand`, `PageHeader` oder `TitleBand` verwenden, plus `recipes/RecipeCookingMode.tsx`, `planning/breakfast/*`, `planning/wizard/*`, Seiten ohne Band (Login, Register, NotFound).
- **Komponenten**: `components/layout/` (FoodLayout, BrandMark, Footer), `components/shared/` (HeroBand, PageHeader, TitleBand, Pagination, EmptyState, Skeleton-Varianten), `components/ui/` (button, input, select, badge, card, tabs, dialog, sheet), `components/recipe/` (RecipeCard, RecipeThumbnail, RecipeMobileActionBar), `components/meal/`, `components/shopping/`.
- **Konfiguration**: `src/index.css` (Tokens), `tailwind.config.ts`, `index.html` (Boot-Bildschirm, Viewport, Schriften), `eslint-rules/design-tokens.js`, `src/__tests__/designRules.test.ts`, `playwright.config.ts`, `.github/workflows/deploy.yml` (Job `food-checks`).
- **Dokumentation**: `frontend-food/AGENTS.md`, `frontend-food/Design.md`, Spec-Dateien unter `openspec/specs/`.
- **Pydantic-/Zod-Schemas**: nur die neuen Lesefelder (Plan-Liste, Dashboard), synchron. **Backend**: abgeleitete Lesefelder in `planner` und `recipe`, keine Migration, keine Schreibwege.
- **Abhängigkeiten**: `@axe-core/playwright` (nur dev), selbst gehostete Schriftdateien (`@fontsource-variable/bricolage-grotesque`, `@fontsource-variable/figtree` oder eigene WOFF2 im Repo).
- **Referenz**: Claude-Design-Leinwand (Seiten „10 Seiten · Sticker“, „Styleguide“, „Zustände“, „Nuancen“) und deren HTML-Stand unter `reference/` in diesem Change.
