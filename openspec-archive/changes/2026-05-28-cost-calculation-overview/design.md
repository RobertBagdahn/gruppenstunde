## Context

Das Food-Frontend hat bereits:
- `CostDashboard.tsx` in `src/pages/planning/` — zeigt Kosten für einen einzelnen MealPlan
- API-Endpunkt `GET /api/planner/meal-plans/{id}/costs/` — liefert `MealPlanCostSummary`
- `GET /api/recipe/recipes/` — Rezeptliste mit `price_total` Feld
- Zutatendatenbank mit `price_per_kg` pro Ingredient

Es fehlt eine aggregierte Übersichtsseite, die alle Pläne und Rezepte mit ihren Kosten zusammenfasst.

## Goals / Non-Goals

**Goals:**
- Zentrale Kostenkalkulations-Übersichtsseite analog zum externen Rezeptkalkulator
- Rezeptkosten-Sektion: Alle Rezepte mit Preis, durchsuchbar
- Wochenplan-Kosten-Sektion: Alle MealPlans mit Kosten pro Tag / pro Person / pro Pers./Tag
- Frühstückskosten-Sektion: Separate Übersicht für Frühstücks-Mahlzeiten
- Hinweis-Banner mit Link zur Zutatendatenbank für Preisverwaltung

**Non-Goals:**
- Preis-Bearbeitung direkt auf dieser Seite (Verweis auf Zutatendatenbank)
- Budget-Planung oder Budget-Limits
- PDF-Export

## Decisions

| # | Entscheidung | Begründung |
|---|---|---|
| 1 | Frontend-only Aggregation | Rezeptliste und MealPlan-Kosten werden parallel geladen und im Frontend zusammengesetzt — kein neuer Backend-Endpunkt nötig |
| 2 | Bestehende APIs nutzen | `GET /api/recipe/recipes/?page_size=100` für Rezeptkosten, `GET /api/planner/meal-plans/` + je Plan `/costs/` für Plankosten |
| 3 | Neue Route `/cost-calculation` | Eigene Seite mit eigenem Navigations-Eintrag |
| 4 | Card-basiertes Layout | Wie im externen Tool: Rezeptkosten links, Wochenplan-Kosten rechts, Frühstückskosten unten |

## Technical Design

### Neue Komponenten

```
src/pages/tools/CostCalculationPage.tsx  — Hauptseite
src/components/costs/RecipeCostCard.tsx   — Rezeptkosten-Sektion
src/components/costs/MealPlanCostCard.tsx — Einzelner Plan-Kostenblock
src/components/costs/BreakfastCostCard.tsx — Frühstückskosten-Sektion
```

### Datenfluss

1. Page lädt parallel: Rezeptliste + MealPlan-Liste
2. Für jeden MealPlan wird `/costs/` nachgeladen (oder im List-Endpunkt bereits enthalten)
3. Frühstückskosten = Filter auf Meals mit `meal_type === "breakfast"`

### Navigation

Neuer Eintrag in der Sidebar unter "Tools": "Kostenkalkulation" mit Dollar-Icon.
