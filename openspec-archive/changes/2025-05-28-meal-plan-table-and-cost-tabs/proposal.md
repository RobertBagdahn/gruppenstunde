## Why

Stakeholder (Peter) benötigt in der MealPlan-Detailansicht eine kompakte Tabellenübersicht (Tage × Mahlzeiten-Grid) und ein Kosten-Dashboard mit Preisen pro Tag, pro Person und gesamt. Die Daten (Mahlzeiten, Preise pro Zutat, Nährwerte) existieren bereits im Backend — es fehlen die aggregierte Kostenberechnung und die tabellarische Frontend-Darstellung.

## What Changes

- **Neuer Tab "Tabelle"** in der MealPlan-Detailseite: Grid-Ansicht mit Tagen als Spalten und Mahlzeittypen (Frühstück, Mittag, Abend, Snack) als Zeilen. Pro Zelle: Rezeptname, Personenzahl, Notiz.
- **Neuer Tab "Kosten"** in der MealPlan-Detailseite: Dashboard mit Gesamtkosten, Kosten pro Person, Kosten pro Tag, Kosten pro Tag pro Person. Optional Balkendiagramm.
- **Neuer Backend-Endpoint** für aggregierte Kostenberechnung eines MealPlans (pro Tag, pro Mahlzeit, gesamt, pro Person).
- **Erweiterung Pydantic/Zod-Schemas** um Cost-Summary-Typen.

## Capabilities

### New Capabilities

- `meal-plan-table-view`: Tabellarische Grid-Übersicht (Tage × Mahlzeittypen) als zusätzlicher Tab in der MealPlan-Detailseite
- `meal-plan-cost-dashboard`: Kosten-Dashboard mit aggregierten Preisberechnungen pro Tag, pro Person und gesamt

### Modified Capabilities

- `meal-plan-frontend`: Neuer Tab im bestehenden Tab-System der Detail-Seite

## Impact

- **Backend**: `planner` App — neuer API-Endpoint für Cost-Aggregation (`/api/planner/meal-plans/{id}/costs/`)
- **Frontend**: `frontend-food/src/pages/planning/MealPlanDetailPage.tsx` — zwei neue Tabs + Komponenten
- **Schemas**: Neue Pydantic-Schemas (`MealPlanCostSummary`, `DayCostSummary`) und korrespondierende Zod-Schemas
- **Keine Migrationen nötig** — Preisdaten existieren bereits auf `Ingredient.price_per_kg` und `Recipe.cached_price_total`
