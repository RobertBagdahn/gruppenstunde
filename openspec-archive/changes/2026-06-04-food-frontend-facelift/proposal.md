## Why

Das Food Frontend (`frontend-food/`) wirkt visuell unfertig: das Farbschema basiert auf vielen Gradients und blassen Hellgrau-Tönen (`gray-50` auf `gray-100`), wodurch Tabellen und Listen schwer lesbar sind und klare Linien fehlen. Für die Zielgruppe (Jugendliche und junge Erwachsene) braucht es ein modernes, aufgeräumtes Layout im Stil von Notion/Linear: bunt und einladend, aber mit lesbaren, klar abgegrenzten Flächen. Wir definieren das visuelle Fundament neu und rollen es konsistent über das gesamte Food Frontend aus.

## What Changes

- **BREAKING (visuell):** Komplett neu definiertes Farb-Token-System auf **grün-basierter** Leitfarbe statt des bisherigen Blau (`#0f6c8f`) + Gelb-Akzents. Alle CSS-Variablen in `index.css` und `tailwind.config.ts` werden neu gesetzt.
- **Neue Typografie:** Moderne Display-Schrift für Überschriften + klare Body-Schrift (ersetzt reines `Source Sans 3`).
- **Kontrast-System:** Verbindliche Token für Borders, Trennlinien und Flächenkontraste, um „Hellgrau in Hellgrau" zu eliminieren.
- **Card-basierte Tabellen-Zeilen:** TableView, CostDashboard und Listen-Seiten stellen Datenzeilen als eigenständige Cards mit klaren Abständen/Schatten dar (mobil-optimiert).
- **Icon-Regel:** Klare Konvention, wann **Lucide** und wann **Material Symbols** verwendet wird (beide bleiben, aber abgegrenzt).
- **Lebende Styleguide-Page:** Neue `/styleguide`-Route als Showcase aller Tokens, Farben, Komponenten und Tabellen-Patterns.
- **Phasierter Rollout:** Erst Fundament (Tokens/Theme/Typo/Komponenten/Styleguide), dann seitenweise Umstellung des gesamten Food Frontends.
- Nur **Light Mode** (Dark Mode später).
- Reduktion/Bereinigung der vielen ad-hoc Gradients und Schatten zu einem konsistenten, sparsamen Set.

## Capabilities

### New Capabilities
- `food-design-system`: Das visuelle Fundament des Food Frontends — Farb-Token (grün-basiert, Light Mode), Typografie-Scale, Kontrast-/Border-Token, Schatten- und Radius-System, Icon-Nutzungsregeln (Lucide vs. Material Symbols), Card-basierte Tabellen-Patterns und eine lebende Styleguide-Page.

### Modified Capabilities
- `food-list-page-layout`: Listen-Seiten verwenden das neue Card-Zeilen-Pattern und die neuen Kontrast-/Border-Token statt blasser Hellgrau-Flächen.
- `meal-plan-colorful-ui`: Das bunte Meal-Plan-UI wird auf das neue grün-basierte Token-System und die reduzierte Gradient-/Schatten-Palette ausgerichtet.

## Impact

- **Frontend:** Ausschließlich `frontend-food/`. Kein Code im Haupt-`frontend/` (strikte Trennung laut AGENTS.md).
  - `frontend-food/src/index.css` (CSS-Variablen, Utilities, Gradients)
  - `frontend-food/tailwind.config.ts` (Farben, Schatten, Fonts, Radius)
  - `frontend-food/index.html` (Font-Einbindung)
  - Shared-Komponenten unter `src/components/shared/` (z.B. `ListPageHero`, `Pagination`, `EmptyState`, `ListPageSearchBar`) und neue Tabellen-/Styleguide-Komponenten
  - Seiten unter `src/pages/**` (HomePage, RecipeListPage, IngredientListPage, planning/TableView, planning/CostDashboard, shopping/*, recipes/* usw.)
  - Neue Route `/styleguide` in `src/App.tsx`
- **Backend:** Keine Änderungen. Keine API-, Pydantic- oder Migrations-Anpassungen.
- **Zod-Schemas:** Keine Änderungen (rein visuelles/Frontend-Refactor).
- **Dependencies:** Mögliche neue Web-Font (z.B. via `@fontsource` oder Google Fonts in `index.html`). Keine Backend-Dependencies.
- **Migrationen:** Keine.
