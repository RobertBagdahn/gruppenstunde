## Context

Das Food Frontend (`frontend-food/`) ist eine eigenständige React-18/Vite-SPA mit Tailwind 3 und shadcn/ui (Radix). Das aktuelle visuelle System ist gewachsen und besteht aus:

- HSL-CSS-Variablen in `src/index.css` (Primary `198 78% 42%` Blau, Accent `43 96% 56%` Gelb, `--radius: 1rem`).
- Vielen ad-hoc Utilities in `index.css`: `.gradient-primary/hero/warm/fun/sunset/rainbow`, `.glass`, `.bg-dots-pattern`, sowie verspielte Animationen (`float-bounce`, `wiggle`, `pulse-glow`).
- Theme-Erweiterungen in `tailwind.config.ts`: Fonts (`Source Sans 3`), benannte Schatten (`soft`, `glow`, `fun`, `warm-glow`, `colorful`), `inspi`-Farbpalette, Keyframes.
- Fonts werden in `index.html` via Google Fonts geladen (`Source Sans 3` + `Material Symbols Outlined`). Lucide ist als React-Komponenten verfügbar.

Hauptproblem: Tabellen/Listen (z.B. `src/pages/planning/TableView.tsx`, `CostDashboard.tsx`, diverse `*ListPage.tsx`) nutzen blasse Hellgrau-Flächen ohne klare Linien — schlecht lesbar. Das Gesamtbild wirkt durch viele Gradients/Schatten unruhig statt „modern-clean".

Constraints (aus AGENTS.md):
- Ausschließlich Tailwind-Klassen, kein Inline-CSS/CSS-Modules. `cn()` für bedingte Klassen.
- Mobile-First (320px). Echte Umlaute. UI-Texte deutsch.
- Strikte Trennung: nur `frontend-food/`, kein Food-Code im Haupt-`frontend/`.
- Keine Rückwärtskompatibilität nötig.

## Goals / Non-Goals

**Goals:**
- Neues, zentral definiertes Design-Token-System (grün-basiert, Light Mode) als **Single Source of Truth** in `index.css` + `tailwind.config.ts`.
- Modern-clean Look (Notion/Linear): ruhige Flächen, klare Trennlinien, sparsame Schatten, großzügige Typo.
- „Hellgrau-in-Hellgrau" eliminieren durch verbindliche Kontrast-/Border-Token.
- Card-basierte Tabellen-Zeilen als wiederverwendbares Pattern.
- Moderne Typografie: Display-Schrift für Headings + klare Body-Schrift.
- Klare Icon-Regel (Lucide vs. Material Symbols).
- Lebende `/styleguide`-Page als Referenz und Regressions-Anker.
- Konsistenter, phasierter Rollout über das gesamte Food Frontend.

**Non-Goals:**
- Kein Dark Mode (später).
- Keine Backend-, API-, Pydantic-, Zod- oder DB-Änderungen.
- Keine funktionalen/Logik-Änderungen an Features (rein visuell/Markup-Refactor).
- Keine neue Komponenten-Bibliothek (shadcn/Radix bleibt Basis).
- Kein Umbau der Routing-/Datenflüsse.

## Decisions

### 1. Token-First statt komponenten-lokaler Styles
Alle Farben/Schatten/Radien/Typo werden als CSS-Variablen + Tailwind-Theme-Token definiert; Komponenten referenzieren **nur** Token-basierte Utilities (`bg-card`, `border-border`, `text-foreground`, `shadow-sm`).
- **Warum:** Globales Lösen des Kontrast-Problems; spätere Theme-Änderungen an einer Stelle.
- **Alternative (verworfen):** Pro-Komponente Hardcoded-Farben (z.B. `emerald-500`) — führt zu genau der heutigen Inkonsistenz.

### 2. Grün-basierte Palette, neu definiert
`--primary` wird auf einen kräftigen, frischen Grünton gesetzt (Light Mode). Sekundär-/Akzent- und `--chart-*`-Token werden auf eine harmonische, aufgeräumte Palette neu gesetzt. Die alte `inspi`-Farbpalette und der blaue `theme-color`-Meta in `index.html` werden angepasst.
- **Warum:** Passt zu Essen/Natur/Pfadfinder, jugendlich-frisch, vom Nutzer gewählt.
- **Alternative (verworfen):** Bestehendes Blau aufpolieren — Nutzer wünscht komplette Neudefinition.

### 3. Kontrast-/Border-System
Verbindliche Token: `--border` (deutlich sichtbar, nicht `gray-100`), eine `--card`/`--background`-Trennung mit echtem Kontrast, definierte `--muted`-Stufe nur für sekundären Text. Regel: niemals graue Fläche auf graue Fläche ohne Border/Schatten.
- **Warum:** Direkt das vom Nutzer benannte Lesbarkeitsproblem.

### 4. Card-basierte Tabellen-Zeilen
Neue Shared-Komponente (z.B. `src/components/shared/CardTable` / `DataCardRow`) rendert Datenzeilen als eigenständige Cards mit klarer Border, sparsamem Schatten und definierten Abständen. Bestehende Tabellen (`TableView`, `CostDashboard`, Listen) werden darauf migriert.
- **Warum:** Mobil-optimiert, modern, vom Nutzer gewählt.
- **Alternative (verworfen):** Zebra-Tabelle — verworfen zugunsten Card-Zeilen.

### 5. Typografie
Neue Display-Schrift für Überschriften (z.B. `Plus Jakarta Sans` oder `Geist`) + klare Body-Schrift; Einbindung primär via `index.html` (Konsistenz mit bestehender Font-Strategie), alternativ `@fontsource`. Tailwind `fontFamily` (`sans`, neu `display`) + Typo-Scale in der Config.
- **Warum:** „Neue moderne Schrift" gewählt; klarer Heading/Body-Kontrast unterstützt den clean Look.
- **Trade-off:** Externe Font-Requests → `preconnect` bereits vorhanden; `display=swap` nutzen.

### 6. Icon-Regel (Lucide + Material Symbols)
Verbindliche Konvention:
- **Lucide** = primäre UI-/Aktions-Icons (Buttons, Navigation, Status, Inline) — Standardfall.
- **Material Symbols** = nur für ausgewählte größere/illustrative oder bereits etablierte Stellen (z.B. Tool-/Feature-Symbole), gefüllt erlaubt.
- Regel + Beispiele werden in der Styleguide-Page und `frontend-food/AGENTS.md` dokumentiert.
- **Warum:** Nutzer will beide behalten, aber mit klarer Trennung.

### 7. Reduktion der Gradients/Animationen
Gradient- und Schatten-Set wird auf ein kleines, kuratiertes Set reduziert; verspielte Animationen (`float-bounce`, `wiggle`, `pulse-glow`) werden sparsam/optional. Print-Styles bleiben unangetastet.
- **Warum:** „Modern-clean" verträgt sich nicht mit Rainbow/Confetti überall.

### 8. Styleguide-Page als lebendes Showcase
Neue Route `/styleguide` in `src/App.tsx` mit Sektionen: Farben/Token, Typo-Scale, Buttons/Badges, Cards, Card-Table, Icon-Regel, Empty/Loading-States.
- **Warum:** Referenz beim Rollout, verhindert Drift, schnelle visuelle Abnahme.

### 9. Phasierter Rollout in einem Change
`tasks.md` ist in Phasen gegliedert: (A) Fundament → (B) Shared-Komponenten + Styleguide → (C) Seitengruppen (Home, Rezepte, Zutaten, Planung/Tabellen, Shopping, Admin). Jede Phase ist eigenständig auslieferbar.
- **Warum:** Geringes Risiko, jederzeit deploybar, Learnings fließen ins Fundament zurück.

## Betroffene Dateien (Pfade)

- `frontend-food/src/index.css` — Token, Utilities, Gradient-/Animations-Reduktion.
- `frontend-food/tailwind.config.ts` — Farben, `fontFamily` (`sans`/`display`), Schatten, Radius, Keyframes.
- `frontend-food/index.html` — Font-Einbindung, `theme-color`-Meta.
- `frontend-food/src/components/shared/*` — neue `CardTable`/`DataCardRow`; Anpassung `ListPageHero`, `ListPageSearchBar`, `Pagination`, `EmptyState`.
- `frontend-food/src/components/ui/*` (shadcn) — ggf. Varianten-Feinschliff (Button/Badge/Card).
- `frontend-food/src/App.tsx` — neue `/styleguide`-Route.
- `frontend-food/src/pages/StyleguidePage.tsx` — neu.
- `frontend-food/src/pages/**` — seitenweise Migration (Home, recipes/*, ingredients/*, planning/TableView+CostDashboard, shopping/*, admin/*, tools/*).
- `frontend-food/AGENTS.md` — Design-Konventionen dokumentieren (Living Document).

**Backend/API/Migrationen:** Keine.

## Risks / Trade-offs

- [Großflächiger visueller Diff über viele Seiten] → Phasierter Rollout in `tasks.md`; Styleguide-Page als Abnahme-Anker; pro Phase committen/deployen.
- [Token-Umstellung bricht hardcodierte Farben (`emerald-500`, `blue-500` etc.) in Bestandskomponenten] → Audit-Task: hardcodierte Farb-Utilities suchen und auf Token mappen.
- [Neue Web-Font erhöht Ladezeit/Layout-Shift] → `preconnect` + `display=swap`; Font-Subset/Gewichte begrenzen.
- [Print-Styles referenzieren feste Klassen (`bg-emerald-500`, `text-muted-foreground`)] → Print-Block in `index.css` bewusst nicht ändern bzw. nach Token-Umstellung verifizieren.
- [Material-Symbols/Lucide-Mischung wirkt inkonsistent] → verbindliche Regel in Styleguide + `AGENTS.md`, Audit bei Migration.
- [Reduktion verspielter Animationen könnte als „weniger jugendlich" wahrgenommen werden] → Akzente gezielt über Farbe/Illustration statt Bewegung; in Styleguide abstimmbar.

## Migration Plan

1. Fundament (Token, Typo, Config, `index.html`) umstellen — App lädt mit neuem Theme.
2. Shared-Komponenten + `CardTable` + Styleguide-Page bauen; visuell abnehmen.
3. Seitengruppen phasenweise migrieren; hardcodierte Farben entfernen.
4. `frontend-food/AGENTS.md` aktualisieren.
- **Rollback:** Rein Frontend; Revert des Changes/Phasen-Commits stellt altes Theme wieder her. Keine Daten-/Schema-Risiken.

## Open Questions

- Konkrete Display-Font (z.B. Plus Jakarta Sans vs. Geist) — final in Phase A / via Styleguide entscheiden.
- Genauer Primär-Grünton (Hue/Sat/Lightness) — in Styleguide visuell kalibrieren.
- Sollen `recharts`-Diagrammfarben (`--chart-*`) Teil derselben Palette sein? (Annahme: ja.)
