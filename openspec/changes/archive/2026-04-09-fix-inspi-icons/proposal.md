## Why

Die Inspi-Maskottchen-Bilder werden an verschiedenen Stellen im Frontend inkonsistent dargestellt. Einige Icons sind verzerrt (z.B. das Footer-Icon, das quadratisch erzwungen wird ohne Aspekt-Ratio-Schutz), andere werden durch `object-cover` in quadratischen Containern abgeschnitten statt vollständig angezeigt. Decorative Icons ragen am linken und rechten Rand über Container hinaus. Die Größen variieren unnötig zwischen vergleichbaren Kontexten.

## What Changes

- **Footer-Icon reparieren**: `inspi_front_normal.webp` im Footer hat `h-14 w-14` ohne `object-contain` — wird verzerrt wenn das Bild nicht quadratisch ist. Aspekt-Ratio-sicheres Styling anwenden.
- **Fallback-Bilder in Cards reparieren**: `RecipeCard`, `BlogCard`, `ContentCard` verwenden `object-cover` für Inspi-Illustrationen in `aspect-square`-Containern. Inspi-Illustrationen mit Transparenz werden abgeschnitten statt vollständig angezeigt. Auf `object-contain` mit passendem Hintergrund umstellen.
- **TitleImageEditor-Fallback reparieren**: Gleicher `object-cover`-Fehler bei Fallback-Bildern auf Detail-Seiten.
- **Dekorative Rand-Icons entfernen**: Die Inspi-Bilder in der HomePage-Hero-Sektion mit negativer Positionierung (`-left-6`, `-right-4`) und die CTA-Sektion-Dekoration entfernen oder sicher innerhalb des Containers positionieren.
- **Hero-Maskottchen-Größen vereinheitlichen**: Konsistente Größen für Hero-Maskottchen über alle Seiten (HomePage, AboutPage, ImpressumPage, DatenschutzPage, ToolLandingPage).
- **SearchPage-Icon absichern**: `w-auto` ergänzen, damit keine unerwartete Verzerrung auftreten kann.
- **Dateiname-Inkonsistenz beheben**: `Inspi_filter.png` → `inspi_filter.png` (einzige Datei mit Großbuchstabe).
- **Doppelten Gallery-Eintrag entfernen**: `inspi_front_kopfhoerer.webp` ist doppelt in der AboutPage-Gallery.

## Capabilities

### New Capabilities

- `inspi-icon-standards`: Einheitliche Darstellungsregeln für Inspi-Maskottchen-Bilder — definiert Styling-Patterns (Hero, Card-Fallback, Decorative, Footer) mit Aspekt-Ratio-Schutz, konsistenten Größen und Container-Regeln.

### Modified Capabilities

_Keine bestehenden Specs werden in ihren Requirements geändert._

## Impact

- **Betroffene React-Pages**: `HomePage`, `AboutPage`, `SearchPage`, `ImpressumPage`, `DatenschutzPage`
- **Betroffene React-Komponenten**: `Layout` (Header + Footer), `RecipeCard`, `BlogCard`, `ContentCard`, `TitleImageEditor`, `ToolLandingPage`
- **Betroffene Config**: `toolColors.ts` (keine Änderung nötig, nur Referenz)
- **Betroffene Assets**: `Inspi_filter.png` umbenennen → `inspi_filter.png`
- **Keine Backend-Änderungen**: Rein frontend-seitiger Fix
- **Keine Schema-Änderungen**: Weder Pydantic- noch Zod-Schemas betroffen
- **Keine Migrations**: Keine Datenbank-Änderungen nötig
