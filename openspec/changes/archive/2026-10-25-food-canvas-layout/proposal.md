# Proposal

## Why

Die sechs Claude-Design-Entwürfe der Food-Oberfläche (Startseite, Rezepte, Rezeptdetail, Essenspläne, Einkaufsliste, Zutaten) sollen als Layout-Vorlage gelten. Ein Abgleich mit der heutigen App zeigt: Die Struktur (Kopfbereich, Bereichskacheln, Kennzahlen-Kacheln, Steckbrief, Fortschritt, Aktionsleiste) ist bereits umgesetzt, weil `food-sticker-redesign` sie bereits übernommen hat. Eine echte Abweichung bleibt: Die Rezepttyp-Chips der Rezeptübersicht bauen ihre eigene Chip-Zeile und weichen von der Regel aus `food-category-colour-usage` ab (kein Farbpunkt je Rezepttyp, aktiver Chip ohne Petrol-Markierung). Die übrigen sichtbaren Unterschiede der Entwürfe sind entweder Funktionen ohne Datenquelle in der App oder Farben, die die Designregeln verbieten. Sie werden nicht übernommen, sondern in `design.md` begründet.

## What Changes

- **Rezepttyp-Chips** auf der Rezeptübersicht folgen der Chip-Regel: weißer Grund, feiner Rand, ein Farbpunkt in der Tönung des Rezepttyps, aktiver Chip mit Petrol-Rand und Petrol-Schrift ohne gefüllte Fläche. Höhe 44 px auf dem Handy.
- **Keine neuen Design-Token.** Alle Farben der Entwürfe lassen sich auf vorhandene Token abbilden (siehe `design.md`). Die Entwürfe liefern keine Farbe, die nur über ein neues Token darstellbar wäre.
- **Keine Schatten-Änderung.** Farbige Schatten aus den Entwürfen entfallen; es gelten `shadow-card`, `shadow-soft` und `shadow-raised`.
- **Keine Backend-, API- oder Schema-Änderung.** Keine Zod- oder Pydantic-Datei wird angefasst.
- **Nicht umgesetzt**: Zählerangaben je Rezepttyp, Tagesübersicht auf der Startseite, Plan-Kennzahlenzeile und Tages-Balken, Budgetkarte der Einkaufsliste, Tabellenansicht der Zutaten, Zutaten-Detail als Seitenspalte. Begründung und Liste in `design.md`.

## Capabilities

### New Capabilities
- `food-canvas-layout`: Verbindliche Abgleichregeln zwischen den Claude-Design-Entwürfen und der Food-Oberfläche: welche Entwurfselemente übernommen werden, welche Farb- und Schattenregeln gelten, und welche Elemente nicht umgesetzt werden.

### Modified Capabilities
- Keine Spezifikation wird geändert; `food-category-colour-usage` gilt unverändert und wird hier nur umgesetzt.

## Impact

- `frontend-food/src/pages/recipes/RecipeListPage.tsx`: Klassen und Farbpunkt der Rezepttyp-Chips.
- `frontend-food/src/pages/recipes/RecipeListPage.*.test.tsx`: Test für die Chip-Markierung.
- Playwright-Baseline `rezeptuebersicht` (390 und 1440 px) wird neu erzeugt. Andere Baselines bleiben unverändert und werden durch die Neuerzeugung nur bestätigt.
- Keine Migration, keine API-Änderung, kein Deploy.
