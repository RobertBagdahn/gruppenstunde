# Design — recipe-detail-sidebar-layout

## Context

Change #1 hat die Detailseite aufgeräumt, Change #2 hat die Verbesserungsvorschläge konsolidiert. Damit ist das Feature-Set auf einer soliden Basis — aber das Layout bleibt einspaltig. Gerade auf Desktop wandert der Blick eines Users, der ein Rezept beurteilen möchte („ist das was für uns?"), ständig zwischen Zutaten, Nutri-Score und Preis hin und her. Eine persistent sichtbare Sidebar reduziert kognitive Last.

Auf Mobile hingegen gibt es keinen Platz für eine Sidebar. Hier ist das Problem anders: Die Aktion „Einkaufsliste erstellen" ist die Haupt-Jobs-To-Be-Done, aber sie ist nur im Header verfügbar und scrollt weg.

## Goals

- Desktop (≥1024px): Wichtige Metadaten und Primäraktionen persistent rechts sichtbar
- Mobile (<1024px): Primäraktionen persistent unten sichtbar
- Keine Regression: Alle Inhalte, die in Change #1/#2 definiert wurden, bleiben erreichbar
- Kein Zusatz-State-Management (keine neuen Stores)

## Non-Goals

- Drawer/Sheet-Pattern für Desktop-Sidebar (immer sichtbar, kein Toggle)
- Kundenanpassung der Sidebar-Inhalte (fix)
- Print-Mode-Integration — kommt in Change #5

## Decisions

### Decision 1: Breakpoint bei `lg` (1024px)

**Decision**: Sidebar erscheint ab `lg` (1024px, Tailwind-Default). Darunter einspaltig + Bottom-Bar.

**Alternatives considered**:
- `md` (768px) → Tablet-Portrait ist zu schmal für 320px Sidebar + sinnvollen Hauptinhalt
- `xl` (1280px) → Viele Laptops sind 1280×800; Sidebar würde selten erscheinen

### Decision 2: Sidebar-Breite 320px fest

**Decision**: `w-80` (320px), nicht `grid-cols-[1fr_auto]` mit flexibler Breite.

**Rationale**: Feste Breite = vorhersagbare Komponenten-Layouts (Nutri-Badge, KPI-Box). Hauptinhalt bekommt flexibel den Rest via `flex-1 min-w-0`.

### Decision 3: Sticky via `position: sticky; top: 80px`

**Decision**: Tailwind `sticky top-20`. 80px entspricht der AppHeader-Höhe inkl. Padding.

**Alternatives considered**:
- `fixed` → fällt aus dem Flow, Layout bricht
- Scroll-synchronisierte JS-Animation → unnötig komplex für sticky

**Risk**: Wenn AppHeader-Höhe sich ändert, muss `top-20` angepasst werden. Mitigiert durch CSS-Custom-Property `--app-header-height`, wenn später globalisiert.

### Decision 4: Sidebar-Overflow

**Decision**: Sidebar bekommt `max-h-[calc(100vh-5rem)]` und `overflow-y-auto`. Wenn Inhalt länger als Viewport, scrollt sie intern.

**Rationale**: Verhindert dass Sidebar bei kleinen Laptop-Höhen abgeschnitten wird.

### Decision 5: Mobile Bottom-Bar statt Header-Action-Menu

**Decision**: Sticky-Bottom-Bar mit 2 Primäraktionen: „Einkaufsliste" und „Portionen". Alles Weitere (Teilen, Drucken) bleibt in einem bestehenden Overflow-Menu im AppHeader bzw. in der Detailseite selbst.

**Rationale**: Fitts' Law — Bottom-Bar ist mit Daumen erreichbar. „Einkaufsliste" ist die Haupt-JTBD. „Portionen" ist die häufigste zweite Aktion (Skalieren vor Einkauf).

### Decision 6: Bottom-Bar verstecken bei Textarea-Focus

**Decision**: Wenn `document.activeElement` eine `<textarea>` ist (Kommentar-Input), Bottom-Bar auf `translate-y-full` + `transition-transform`.

**Rationale**: Mobile-Keyboard schiebt Viewport hoch, Bottom-Bar würde Text überdecken. Lösung über `focus`/`blur` Listener am Container.

**Alternative**: Visual-Viewport-API zum Detect des Keyboards. Komplexer, iOS-Safari-Quirks. Verworfen.

### Decision 7: Nutri-Score und KPI wandern auf Desktop in die Sidebar

**Decision**: `RecipeHeaderInfo` (aus Change #1) bekommt Tailwind-Klasse `lg:hidden`. Die Sidebar rendert dieselben Daten.

**Alternatives considered**:
- Zwei separate Komponenten-Varianten → Code-Duplikat
- Conditional via `useBreakpoint` Hook → Hydration-Mismatch-Risiko

`lg:hidden` + Sidebar ist SSR-safe und simpel.

## Risks / Trade-offs

- **Doppeltes Rendering der Nutri-Score-Badge**: Einmal in `RecipeHeaderInfo` (mit `lg:hidden`), einmal in `RecipeSidebar` (nur ab `lg:block`). Marginaler DOM-Overhead, akzeptabel.
- **Sticky-Sidebar und lange Kommentare**: Wenn Hauptinhalt sehr lang ist, bleibt die Sidebar oben sticky, während der User scrollt. Das ist gewollt. Falls Sidebar selbst zu lang für Viewport: interner Scroll via `overflow-y-auto`.
- **Zusätzlicher Footprint auf Mobile durch Bottom-Bar**: 64px Höhe „frisst" Viewport. Kompensiert durch `pb-20` am Hauptinhalt-Container, damit letztes Content-Element nicht verdeckt wird.
- **Interaktion mit existierenden Banners (z.B. Normportions-Simulator)**: Banner sollten inline im Hauptinhalt bleiben, nicht in Sidebar, weil kontextbezogen.
