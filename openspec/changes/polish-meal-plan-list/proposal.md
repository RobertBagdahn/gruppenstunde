## Why

Die Essenspläne-Listenseite sieht visuell unfertig aus: zu viel Whitespace, flache Cards ohne visuelle Struktur, kein zusammenhängendes Design. Die Seite braucht mehr Borders, kompakteres Layout und ein poliertes Erscheinungsbild.

## What Changes

- Cards visuell aufwerten: mehr Padding-Struktur, stärkere Borders, Akzentfarben
- Kompakteres Layout mit weniger vertikalem Whitespace
- Summary-Header mit Gesamtstatistik (Anzahl Pläne, Mahlzeiten, Portionen)
- Delete-Button in ein Dropdown-Menü (⋮) verschieben
- 2-Spalten-Grid auf Desktop für bessere Raumnutzung
- Create-Dialog als shadcn Dialog statt inline-Form

## Capabilities

### New Capabilities

_Keine neuen Capabilities — rein visuelles Refactoring._

### Modified Capabilities

_Keine Spec-Level-Änderungen._

## Impact

- **Frontend**: `pages/planning/MealEventListPage.tsx` komplett überarbeiten
- **Keine API-Änderungen**: Rein Frontend, keine Schema- oder Backend-Änderungen
- **Keine Migrations**: Kein Datenmodell betroffen
