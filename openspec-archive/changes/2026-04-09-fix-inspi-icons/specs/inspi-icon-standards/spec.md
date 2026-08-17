## ADDED Requirements

### Requirement: Inspi-Bilder MÜSSEN ohne Verzerrung dargestellt werden

Alle Inspi-Maskottchen-Bilder (`<img>`-Elemente mit Inspi-Quelldateien) MÜSSEN ihr natürliches Aspekt-Ratio beibehalten. Es DARF NICHT vorkommen, dass sowohl Breite als auch Höhe fest gesetzt werden ohne `object-contain` oder `object-cover`.

#### Scenario: Footer-Icon wird nicht verzerrt

- **WHEN** ein Nutzer eine beliebige Seite lädt und das Footer-Icon sichtbar wird
- **THEN** MUSS das `inspi_front_normal.webp`-Bild mit `w-14 h-auto` oder vergleichbarem Aspekt-Ratio-sicheren Styling dargestellt werden

#### Scenario: Header-Logo behält Aspekt-Ratio

- **WHEN** ein Nutzer eine beliebige Seite lädt
- **THEN** MUSS das Header-Logo (`inspi_thinking.webp`) mit `h-9 w-auto` dargestellt werden (bereits korrekt, keine Änderung nötig)

### Requirement: Inspi-Illustrationen in Cards MÜSSEN vollständig sichtbar sein

Card-Fallback-Bilder (wenn kein User-Upload vorhanden) MÜSSEN `object-contain` statt `object-cover` verwenden, damit die Inspi-Figur vollständig sichtbar ist und nicht abgeschnitten wird. Der Container MUSS einen dezenten Hintergrund haben, damit der leere Raum um die Figur nicht störend wirkt.

#### Scenario: RecipeCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine RecipeCard ohne User-Bild gerendert wird und `inspi_cook.png` als Fallback verwendet wird
- **THEN** MUSS das Bild mit `object-contain` in einem `aspect-square`-Container mit Padding (`p-4`) und Hintergrund (`bg-muted/30`) dargestellt werden

#### Scenario: BlogCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine BlogCard ohne User-Bild gerendert wird und `inspi_flying.png` als Fallback verwendet wird
- **THEN** MUSS das Bild mit `object-contain` in einem `aspect-square`-Container mit Padding und Hintergrund dargestellt werden

#### Scenario: ContentCard-Fallback zeigt vollständiges Inspi

- **WHEN** eine ContentCard ohne User-Bild gerendert wird
- **THEN** MUSS das Fallback-Inspi-Bild mit `object-contain` dargestellt werden

#### Scenario: TitleImageEditor-Fallback zeigt vollständiges Inspi

- **WHEN** ein Detail-Page-Hero kein User-Bild hat und das Fallback-Inspi angezeigt wird
- **THEN** MUSS das Bild mit `object-contain` und Padding in einem `aspect-square`-Container dargestellt werden

### Requirement: Keine Inspi-Bilder am linken oder rechten Rand

Dekorative Inspi-Bilder DÜRFEN NICHT mit negativer Positionierung (`-left-*`, `-right-*`) über den Container-Rand hinausragen. Dekorative Rand-Inspi-Bilder MÜSSEN entfernt werden.

#### Scenario: HomePage-Hero hat keine Rand-Dekorationen

- **WHEN** ein Nutzer die HomePage lädt
- **THEN** DÜRFEN KEINE Inspi-Bilder mit `absolute` Positionierung am linken oder rechten Rand der Hero-Sektion sichtbar sein

#### Scenario: HomePage-CTA hat keine Rand-Dekoration

- **WHEN** ein Nutzer zur CTA-Sektion der HomePage scrollt
- **THEN** DARF KEIN dekoratives Inspi-Bild am Rand der CTA-Sektion angezeigt werden

### Requirement: Einheitliche Hero-Maskottchen-Größen

Hero-Maskottchen-Bilder auf verschiedenen Seiten MÜSSEN einheitliche Größen-Patterns verwenden. Standard-Seiten (Impressum, Datenschutz, ToolLanding) verwenden `w-36 md:w-48 h-auto`. Hauptseiten (Home, About) verwenden `w-48 md:w-64 h-auto`.

#### Scenario: ImpressumPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die ImpressumPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

#### Scenario: DatenschutzPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die DatenschutzPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

#### Scenario: AboutPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer die AboutPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-48 md:w-64 h-auto` dargestellt werden

#### Scenario: ToolLandingPage-Hero hat konsistente Größe

- **WHEN** ein Nutzer eine ToolLandingPage lädt
- **THEN** MUSS das Hero-Maskottchen mit `w-36 md:w-48 h-auto` dargestellt werden

### Requirement: SearchPage-Icon MUSS aspekt-ratio-sicher sein

Das Inspi-Icon in der SearchPage-Hero-Sektion MUSS `w-auto` explizit setzen, um Verzerrung durch CSS-Resets zu verhindern.

#### Scenario: SearchPage-Hero-Icon ist nicht verzerrt

- **WHEN** ein Nutzer die SearchPage auf einem Desktop-Bildschirm lädt
- **THEN** MUSS das `Inspi_filter.png`-Bild (bzw. `inspi_filter.png` nach Umbenennung) mit `h-20 md:h-28 w-auto` dargestellt werden

### Requirement: Dateinamen MÜSSEN konsistent lowercase sein

Alle Inspi-Bilddateien im `frontend/public/images/`-Verzeichnis MÜSSEN mit dem Prefix `inspi_` (lowercase) beginnen. Keine Großbuchstaben in Dateinamen.

#### Scenario: Inspi_filter.png wird zu inspi_filter.png

- **WHEN** das Projekt gebaut oder deployed wird
- **THEN** MUSS die Datei `inspi_filter.png` (lowercase) existieren und alle Referenzen MÜSSEN auf den lowercase-Namen zeigen

### Requirement: Keine doppelten Einträge in der Inspi-Gallery

Die AboutPage-Inspi-Gallery DARF KEINE doppelten Bildquellen enthalten.

#### Scenario: Gallery hat einzigartige Einträge

- **WHEN** ein Nutzer die AboutPage lädt und zur Inspi-Gallery scrollt
- **THEN** MUSS jedes Bild in der Gallery genau einmal erscheinen (kein Duplikat von `inspi_front_kopfhoerer.webp`)
