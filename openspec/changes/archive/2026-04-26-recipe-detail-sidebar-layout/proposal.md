## Why

Nach dem Cleanup (Change #1) und dem Improvement-Merge (Change #2) hat die Rezept-Detailseite eine klarere Struktur, aber auf Desktop (≥1024px) nutzt sie die Breite schlecht: Alles scrollt vertikal in einer einzelnen Spalte. Wichtige Aktionen wie „Einkaufsliste erstellen", „Portionen skalieren", „Nutri-Score" und „Gesamtkosten" verschwinden beim Scrollen.

Gleichzeitig fehlt auf Mobile eine persistent erreichbare **Primäraktions-Leiste**. Ein Nutzer, der in den Zutaten ist, muss zurück zum Header scrollen, um die Einkaufsliste zu starten.

Ziel: Dem Desktop eine echte rechte **Sticky-Sidebar** geben, die die Kern-Metadaten und -Aktionen dauerhaft sichtbar hält; dem Mobile eine **Sticky-Bottom-Bar** mit 2–3 Primäraktionen.

## What Changes

### Desktop-Layout (≥1024px)
- Seite wird zu einem 2-Spalten-Grid: Hauptinhalt links (Zutaten, Zubereitung, Gesundheit, Verbesserungen, Kommentare), Sidebar rechts (sticky)
- Sidebar-Inhalte (von oben nach unten):
  1. Hero-Metadata-Block: Titel, Rezepttyp-Badge, Autor-Link, Zubereitungszeit, Schwierigkeit
  2. Nutri-Score-Badge (A–E) — aus Change #1 Info-Box hierher verschoben
  3. Gesamtkosten-KPI (EUR) — aus Change #1 KPI-Box hierher verschoben
  4. PortionScaler (kompakte Variante)
  5. Primäraktionen: „Einkaufsliste erstellen", „Teilen", „Drucken" (Print-Mode kommt in Change #5)
- Sidebar-Breite: `320px` feste Breite, `position: sticky; top: 80px` (unterhalb AppHeader)
- Hauptinhalt bekommt `min-width: 0` und die restliche Breite

### Mobile-Layout (<1024px)
- Kein Sidebar, alles weiterhin einspaltig (aus Change #1)
- **Neu**: Sticky-Bottom-Bar mit zwei Primäraktionen: „Einkaufsliste" und „Portionen" (öffnet PortionScaler-BottomSheet)
- Bottom-Bar respektiert `safe-area-inset-bottom`, `height: 64px`
- Wenn Nutzer im Kommentar-Input schreibt (Focus in Textarea), Bottom-Bar verstecken

### Breakpoints und Resize
- Breakpoint: `lg` (1024px) via Tailwind
- Bei Resize von Desktop → Mobile: Sidebar-State wird gedropped, kein Carry-over
- Bei Resize von Mobile → Desktop: Bottom-Bar verschwindet, Sidebar erscheint

### Header Info-Box aus Change #1
- Auf Desktop wandert der Nutri-Score-Badge und die Gesamtkosten-KPI in die Sidebar
- Auf Mobile bleiben beide in der Header-Info-Box sichtbar (wie in Change #1 definiert)
- Das bedeutet: Die Komponente wird responsiv — `<RecipeHeaderInfo class="lg:hidden" />` + `<RecipeSidebar />` in der Grid-Spalte

### Hero-Bild
- Auf Desktop: Hero-Bild bleibt in der Hauptspalte (nicht in der Sidebar)
- Auf Mobile: Hero-Bild wie bisher oben über voller Breite

## Capabilities

### Modified Capabilities
- `recipe`: Neue Requirements für Desktop-Sidebar-Layout und Mobile-Sticky-Bottom-Bar. Die in Change #1 definierte „Rezept-Detailseite Header Info-Box" wird modifiziert (responsiv: auf Desktop leer, Inhalte in Sidebar).

## Impact

### Abhängigkeiten
- **Blockiert durch**: `recipe-detail-cleanup` (Change #1) und `recipe-improvement-merge` (Change #2). Beide müssen archiviert sein, bevor die Sidebar über aufgeräumter Struktur gebaut wird.

### Betroffene Frontend-Dateien
- `frontend/src/pages/recipes/RecipeDetailPage.tsx` — Grid-Layout mit 2 Spalten auf `lg:`, responsive Positionierung
- `frontend/src/components/recipe/RecipeSidebar.tsx` — **neu**, Sticky-Sidebar-Komponente
- `frontend/src/components/recipe/RecipeMobileActionBar.tsx` — **neu**, Sticky-Bottom-Bar für Mobile
- `frontend/src/components/recipe/RecipeHeaderInfo.tsx` — **neu**, extrahierte Header-Info-Box aus Change #1, mit `lg:hidden`
- `frontend/src/components/recipe/PortionScaler.tsx` — ggf. kompakte Variante (Prop `compact?: boolean`)

### Keine Backend-Änderungen
- Dieses Change ist rein Frontend; keine neuen Endpoints, keine Schemas, keine Migrations.

### Responsive Qualität
- Manuelles Testen auf 320px, 768px, 1024px, 1440px
- Sticky-Sidebar muss bei sehr langen Hauptinhalten nicht unten „hängen bleiben" (overflow-y im Griff)
