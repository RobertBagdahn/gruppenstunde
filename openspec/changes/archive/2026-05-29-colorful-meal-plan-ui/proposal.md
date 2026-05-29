## Why

Die Essensplan-Detailseite (MealPlan) ist aktuell visuell monoton (grau/weiß) und zeigt zu wenig Kontext pro Mahlzeit. Nutzer können nicht auf einen Blick erkennen, ob eine Mahlzeit den Kalorienbedarf deckt, was sie kostet, oder ob Rezepte fehlen. Die Seite braucht ein farbiges, semantisches Redesign mit klaren Status-Signalen.

## What Changes

- **Farbcodierung nach Status**: Grün (alles ok / Add-Buttons), Gelb (Warnung), Rot (fehlt/kritisch) auf allen Tabs
- **Erweiterte Rezept-Infos im Tagesplan**: Kalorien, Preis und %-Abdeckung des Mahlzeitbedarfs pro Item
- **Meal-Type Farbakzente**: Jeder Mahlzeittyp (Frühstück, Mittagessen, etc.) bekommt eine eigene Akzentfarbe
- **Größere Schrift**: Lesbarkeit verbessern (text-sm → text-base an vielen Stellen)
- **"Fehlt"-State rot markiert**: Mahlzeiten ohne Rezept werden visuell hervorgehoben
- **Backend-Erweiterung**: `MealItemOut` und `MealOut` Schemas um `energy_kj` und `cost_eur` ergänzen
- **Zod-Schema-Erweiterung**: Frontend-Schemas synchron anpassen
- **Gleiche Farblogik auf allen Tabs**: Tabelle, Kosten, Einkaufsliste, Cockpit

## Capabilities

### New Capabilities
- `meal-plan-colorful-ui`: Farbiges, status-basiertes UI-Design für alle Tabs der Essensplan-Detailseite mit Kalorien-%-Anzeige und Preis pro Mahlzeit

### Modified Capabilities
- `meal-plan-frontend`: Erweiterte Darstellung der MealItems mit inline Nährwert- und Kostendaten
- `meal-plan`: Backend-Schema-Erweiterung um energy_kj und cost_eur auf MealItem/Meal-Ebene

## Impact

- **Backend**: `planner` App — `MealItemOut` und `MealOut` Pydantic-Schemas erweitern, Queryset-Annotation für Kalorien/Kosten
- **Frontend**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx`, `TableView.tsx`, `CostDashboard.tsx`, Cockpit-Komponenten
- **Schemas**: `backend/planner/schemas/` (Pydantic) + `frontend-food/src/schemas/mealPlan.ts` (Zod)
- **Keine Migration nötig**: Kalorien und Kosten werden berechnet (annotiert), nicht gespeichert
- **Material Icons**: Bereits eingebunden, zusätzliche Icons für Status-Anzeige nutzen
