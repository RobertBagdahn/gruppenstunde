## Why

Die Rezept-Vorschau im Erstellungs-Wizard (Schritt 3 "Vorschau & Speichern") zeigt das Rezept in einem minimalistischen Card-Layout mit Chips und Badges. Die eigentliche Rezept-Detailseite hat dagegen ein strukturiertes Layout mit Sektionen, Zutaten-Liste und KPI-Grid. Nutzer bekommen beim Erstellen keinen realistischen Eindruck davon, wie ihr Rezept später aussehen wird.

## What Changes

- Vorschau-Layout im ContentStepper (Schritt 3) für Rezepte umbauen: weg von der kompakten Card, hin zu einem sektionsbasierten Layout ähnlich der Detailseite
- Zutaten als vertikale Liste statt grüne Chips darstellen
- KPIs in einem 2×2 Grid statt horizontaler Pill-Reihe anzeigen
- Klare Sektionsüberschriften (Zutaten, Zubereitung, Tags) einführen
- Keine komplexen Berechnungen (Nährwerte, Nutri-Score, Preise) — nur vorhandene Daten layouten

## Capabilities

### New Capabilities

- `recipe-preview-layout`: Neues sektionsbasiertes Vorschau-Layout für Rezepte im Erstellungs-Wizard, das der Detailseite ähnelt

### Modified Capabilities

_(keine — rein Frontend-UI-Änderung ohne Spec-Level-Verhaltensänderung)_

## Impact

- **Frontend (food)**: `frontend-food/src/components/content/ContentStepper.tsx` (generische Preview-Sektion), `frontend-food/src/pages/recipes/CreateRecipePage.tsx` (`renderPreviewExtras`)
- **Keine API-Änderungen**: Rein visuelles Refactoring
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen
- **Keine Migrations**: Kein Model-Change
