## Why

Das Food Frontend hat keine echte Startseite – `/` leitet direkt auf `/recipes` weiter. Nutzer haben keinen zentralen Überblick über alle verfügbaren Module, Statistiken und Features. Außerdem zeigt der Menüpunkt "Essensplan" auf die Landing Page statt direkt zur App, und der Norm-Portion-Simulator ist nur über die Meal-Plan-Landing erreichbar.

## What Changes

- **Neue Homepage** (`/`): Dashboard mit Modul-Counts (Rezepte, Zutaten, Essenspläne, Einkaufslisten), Feature-Karten mit Links zu allen Modulen, Insights/Fun-Facts aus der Datenbank
- **Neuer Backend-Endpunkt** (`GET /api/food/dashboard/`): Liefert aggregierte Statistiken und Insights für die Homepage
- **Navigation anpassen**: Menüpunkt "Essensplan" verlinkt direkt auf `/meal-plans/app` statt `/meal-plans`
- **Norm-Portion-Simulator Link**: Zusätzlicher Link im Essensplan-Bereich der Navigation/Homepage

## Capabilities

### New Capabilities
- `food-homepage`: Startseite für das Food Frontend mit Dashboard-Statistiken, Modul-Übersicht, Feature-Liste und Insights

### Modified Capabilities
- `food-frontend-app`: Navigation wird angepasst (Essensplan → `/meal-plans/app`, neuer "Start"-Menüpunkt zeigt auf Homepage statt Redirect)

## Impact

- **Backend**: Neue API in `planner` oder `recipe` App – `GET /api/food/dashboard/` mit aggregierten Counts aus `recipe`, `supply` (Ingredient), `planner` (MealPlan), `shopping` (ShoppingList)
- **Frontend (frontend-food)**: Neue Page `src/pages/HomePage.tsx`, neuer API-Hook, neues Zod-Schema, Router-Änderung in `App.tsx`, Nav-Änderung in `FoodLayout.tsx`
- **Pydantic-Schema**: Neues `FoodDashboardOut` Schema
- **Zod-Schema**: Neues `foodDashboard.ts` Schema (1:1 sync)
- **Migrations**: Keine nötig (nur Lese-Aggregationen auf bestehende Tabellen)
