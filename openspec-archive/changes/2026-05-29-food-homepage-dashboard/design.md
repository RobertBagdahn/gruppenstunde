## Context

Das Food Frontend (`frontend-food/`) hat aktuell keine dedizierte Homepage. Die Route `/` leitet per `<Navigate to="/recipes">` weiter. Die mobile Bottom-Nav hat einen "Start"-Button der auf `/` zeigt (→ Redirect). Es fehlt ein zentraler Einstiegspunkt, der alle Module vorstellt und Live-Statistiken zeigt.

Bestehende Infrastruktur:
- `ToolLandingPage` Komponente für Marketing-Pages (wird von MealPlan genutzt)
- `toolColors.ts` definiert Modul-Konfigurationen (icon, gradient, basePath)
- TanStack Query für Server-State
- Backend hat bereits alle relevanten Models: `Recipe`, `Ingredient`, `MealPlan`, `ShoppingList`

## Goals / Non-Goals

**Goals:**
- Zentrale Homepage mit Überblick über alle Food-Module
- Live-Statistiken (Counts) aus der Datenbank
- Insights/Fun-Facts (z.B. beliebtestes Rezept, ∅ Zutaten pro Rezept)
- Direkte Links zu allen Modulen inkl. Norm-Portion-Simulator
- Navigation: "Essensplan" → direkt `/meal-plans/app`
- Mobile-First, ansprechend und informativ

**Non-Goals:**
- Personalisierte Dashboard-Daten pro User (kommt später)
- Keine Auth-Pflicht für die Homepage (öffentlich zugänglich)
- Keine Echtzeit-Updates (staleTime reicht)

## Decisions

### 1. Neuer Backend-Endpunkt statt Frontend-Aggregation

**Entscheidung**: Ein dedizierter `GET /api/food/dashboard/` Endpunkt liefert alle Daten.

**Alternativen**:
- Multiple Requests (je ein Count-Request pro Modul) → Mehr Roundtrips, langsamer
- Frontend-seitiges Zählen aus paginierten Listen → Ungenau, extra Requests

**Rationale**: Ein Request, schnelle Response (<100ms), Backend kann DB-Aggregationen effizient durchführen.

### 2. Endpunkt in `recipe` App platzieren

**Entscheidung**: Der Dashboard-Endpunkt kommt in `backend/recipe/api/` da er primär Food-bezogene Daten aggregiert und die Recipe-App bereits den Ninja-Router für `/api/` registriert hat.

**Alternativen**:
- Neue `dashboard` App → Overkill für einen Endpunkt
- In `planner` App → Planner ist für MealPlans, nicht für übergreifende Stats

### 3. Homepage als eigene Page-Komponente

**Entscheidung**: Neue `src/pages/HomePage.tsx` mit eigenem Design (kein Reuse von `ToolLandingPage`).

**Rationale**: `ToolLandingPage` ist für einzelne Tools mit Hero+Features+FAQ. Die Homepage ist ein Dashboard/Hub mit anderem Layout (Stat-Cards, Modul-Grid, Insights).

### 4. Navigation direkt auf App-Seiten

**Entscheidung**: "Essensplan" im Menü zeigt auf `/meal-plans/app`. Die Landing Page `/meal-plans` bleibt erreichbar aber nicht mehr prominent verlinkt.

## API-Design

```
GET /api/food/dashboard/

Response (kein Auth nötig):
{
  "recipe_count": 127,
  "ingredient_count": 483,
  "meal_plan_count": 12,
  "shopping_list_count": 5,
  "insights": {
    "most_planned_recipe": { "title": "Stockbrot", "slug": "stockbrot", "plan_count": 23 } | null,
    "avg_ingredients_per_recipe": 4.2,
    "newest_recipe": { "title": "Nudelsalat", "slug": "nudelsalat" } | null,
    "total_meal_days_planned": 87
  }
}
```

## Betroffene Dateien

**Backend:**
- `backend/recipe/api/dashboard.py` (neu) – Endpunkt
- `backend/recipe/schemas/dashboard.py` (neu) – Pydantic Schema `FoodDashboardOut`
- `backend/recipe/api/__init__.py` – Router-Registration

**Frontend (frontend-food):**
- `src/pages/HomePage.tsx` (neu) – Homepage-Komponente
- `src/api/dashboard.ts` (neu) – TanStack Query Hook
- `src/schemas/dashboard.ts` (neu) – Zod Schema
- `src/App.tsx` – Route `/` → `HomePage` statt Navigate
- `src/components/layout/FoodLayout.tsx` – Nav-Links anpassen

**Migrations:** Keine (nur SELECT COUNT + Aggregationen)

## Risks / Trade-offs

- **[Performance]** Dashboard-Query mit mehreren COUNT-Subqueries → Mitigation: Queries sind trivial auf indizierte Tabellen, <50ms erwartet. Bei Bedarf caching mit `staleTime: 5min` im Frontend.
- **[Maintenance]** Neues Schema sync halten → Mitigation: Einfaches flaches Schema, ändert sich selten.
- **[Landing Page wird weniger sichtbar]** → Mitigation: Landing Page bleibt unter `/meal-plans` erreichbar, wird von Homepage aus verlinkt für neue User.
