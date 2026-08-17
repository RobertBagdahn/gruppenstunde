## Why

Rezepttitel werden in der Kachel- und Tabellenansicht auf eine Zeile abgeschnitten (`truncate`). Bei einer Kachelbreite von ~190px (5-Spalten-Grid) passen nur ~14 Zeichen pro Zeile – dadurch werden ~75 % aller Titel abgeschnitten. Nutzer erkennen Rezepte nicht auf den ersten Blick und müssen auf die Detailseite klicken, nur um den vollständigen Namen zu sehen.

## What Changes

- **RecipeCard**: `truncate` → `line-clamp-2` – Rezepttitel werden auf bis zu zwei Zeilen angezeigt (deckt ~87 % aller Titel vollständig ab), längere Titel enden mit "..."
- **RecipeTableRow**: `truncate` → `line-clamp-2` – gleiche Logik in der Tabellenansicht für konsistentes Verhalten
- **RecipeSearchCard**: bleibt unverändert (`truncate` ist im kompakten Such-Dropdown sinnvoll)

## Capabilities

### New Capabilities
- `recipe-title-display`: Rezepttitel in Kachel- und Tabellenansicht werden mehrzeilig (max. 2 Zeilen) dargestellt

### Modified Capabilities
<!-- No existing capability requirements changed -->

## Impact

- Betroffene Dateien: `RecipeCard.tsx`, `RecipeTableRow.tsx` (jeweils 1 CSS-Klasse)
- Keine API-, Schema- oder Backend-Änderungen
- Keine Migrationen nötig
- Reiner Frontend-Styling-Fix
