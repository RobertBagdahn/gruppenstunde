## Context

Das Inspi-Maskottchen ist das zentrale Branding-Element der Plattform. Es erscheint in 40+ Varianten als Hero-Bild, Card-Fallback, dekoratives Element und Logo. Aktuell werden die Bilder mit inkonsistenten Styling-Patterns eingebunden — manche mit fester Breite, manche mit fester Höhe, teilweise ohne Aspekt-Ratio-Schutz. Das führt zu Verzerrungen, Abschneidungen und visuell uneinheitlicher Darstellung.

### Betroffene Dateien

- `frontend/src/components/Layout.tsx` — Header-Logo und Footer-Icon
- `frontend/src/pages/HomePage.tsx` — Hero-Maskottchen, Kategorien, Module, Schritte, Dekoration
- `frontend/src/pages/SearchPage.tsx` — Hero-Icon, Empty-State
- `frontend/src/pages/AboutPage.tsx` — Hero-Maskottchen, Gallery
- `frontend/src/pages/ImpressumPage.tsx` — Hero-Maskottchen
- `frontend/src/pages/DatenschutzPage.tsx` — Hero-Maskottchen
- `frontend/src/components/content/TitleImageEditor.tsx` — Fallback-Bild
- `frontend/src/components/recipe/RecipeCard.tsx` — Fallback-Bild
- `frontend/src/components/content/BlogCard.tsx` — Fallback-Bild
- `frontend/src/components/content/ContentCard.tsx` — Fallback-Bild
- `frontend/src/components/ToolLandingPage.tsx` — Hero-Maskottchen
- `frontend/public/images/Inspi_filter.png` — Umbenennung

### Keine API- oder Datenbank-Änderungen

Dieses Change ist rein frontend-seitig. Keine API-Endpunkte, Pydantic-Schemas, Zod-Schemas oder Datenbank-Migrationen betroffen.

## Goals / Non-Goals

**Goals:**

- Alle Inspi-Bilder werden ohne Verzerrung oder ungewolltes Cropping dargestellt
- Einheitliche Größen-Patterns für gleiche Kontexte (Hero, Card-Fallback, Decorative)
- Keine Inspi-Bilder ragen am linken/rechten Rand über den sichtbaren Bereich hinaus
- Dateiname-Konsistenz (alles lowercase)
- Doppelte Gallery-Einträge entfernen

**Non-Goals:**

- Keine Optimierung der Bildformate (PNG → WebP-Konvertierung ist separates Thema)
- Kein Redesign der Seiten-Layouts oder Inspi-Positionierung
- Keine neuen Inspi-Varianten erstellen
- Keine Änderung der About-Page-Gallery-Funktionalität
- Kein Entfernen ungenutzter Bilder aus dem Repository

## Decisions

### 1. Aspekt-Ratio-Schutz über `object-contain` statt `object-cover` für Illustrationen

**Entscheidung**: Inspi-Illustrationen verwenden `object-contain`, nicht `object-cover`.

**Begründung**: Inspi-Bilder sind Character-Illustrationen mit transparentem Hintergrund, keine Fotos. `object-cover` schneidet Teile ab, was bei einer Figur (Kopf, Beine) schlecht aussieht. `object-contain` zeigt die gesamte Figur. Für Cards wird ein dezenter Hintergrund (`bg-muted/30`) ergänzt, damit der leere Raum nicht störend wirkt.

**Alternative verworfen**: `object-cover` beibehalten und die Bilder passend zuschneiden — zu aufwändig bei 40+ Varianten und nicht zukunftssicher.

### 2. Einheitliches Hero-Maskottchen-Pattern: width-basiert mit `w-auto` / `h-auto`

**Entscheidung**: Alle Hero-Maskottchen verwenden ein width-basiertes Pattern mit responsiven Breakpoints: `w-36 md:w-48` (Standard-Pages) bzw. `w-48 md:w-72` (Hauptseiten). Immer mit `h-auto` für Aspekt-Ratio-Schutz.

**Begründung**: Width-basiertes Sizing ist vorhersagbarer im Responsive-Layout als Height-basiertes Sizing. Die Breite bestimmt den horizontalen Raum, die Höhe ergibt sich aus dem Aspekt-Ratio.

### 3. Dekorative Rand-Icons: Entfernen statt Repositionieren

**Entscheidung**: Die dekorativen Inspi-Bilder mit negativer Positionierung (`-left-6`, `-right-4`) auf der HomePage werden entfernt.

**Begründung**: Der User hat explizit "Keine Inspis links und rechts am Rand" gewünscht. Die Bilder sind rein dekorativ (`opacity-25`/`opacity-30`), auf Mobile bereits ausgeblendet (`hidden lg:block`), und überlappen bei bestimmten Viewports den Content. Das CTA-Dekorationsbild wird ebenfalls entfernt.

### 4. Footer-Icon: Feste Breite mit `h-auto` statt quadratisch erzwungen

**Entscheidung**: Footer-Icon ändert sich von `h-14 w-14` zu `w-14 h-auto` mit `object-contain`.

**Begründung**: Das erzwungene Quadrat verzerrt das Bild wenn es nicht exakt 1:1 ist. `w-14 h-auto` respektiert das natürliche Seitenverhältnis.

### 5. Datei-Umbenennung mit git mv

**Entscheidung**: `Inspi_filter.png` → `inspi_filter.png` via `git mv` für saubere Git-History.

**Begründung**: Einzige Datei mit Großbuchstabe. Auf case-sensitiven Systemen (Linux-Server, Cloud Run) könnte die Inkonsistenz zu 404s führen.

## Risks / Trade-offs

- **[Visueller Unterschied bei Cards]** → `object-contain` zeigt kleinere Inspi-Figuren in Card-Containern als `object-cover`. Mitigiert durch `p-4` Padding und dezenten Hintergrund, damit die Karten nicht leer wirken.
- **[Dateiname-Case auf macOS]** → macOS-Dateisystem ist case-insensitive. `git mv Inspi_filter.png inspi_filter.png` könnte als "no change" behandelt werden. Mitigation: Zwei-Schritt-Rename über Temp-Name (`git mv Inspi_filter.png temp.png && git mv temp.png inspi_filter.png`).
- **[Cached References]** → Browser-Cache könnte alte Dateinamen halten. Irrelevant da die URL `/images/inspi_filter.png` vorher nicht existierte (war `Inspi_filter.png`).
