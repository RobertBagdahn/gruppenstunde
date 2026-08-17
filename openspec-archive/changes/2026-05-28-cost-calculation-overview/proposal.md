## Why

Das Food-Frontend hat bereits ein CostDashboard pro einzelnem MealPlan, aber es fehlt eine übergreifende Kostenkalkulations-Übersichtsseite. Der externe Rezeptkalkulator bietet eine solche Seite, die alle Rezeptkosten und alle Wochenplan-Kosten auf einen Blick zeigt (pro Tag, pro Person, pro Pers./Tag). Nutzer brauchen eine zentrale Anlaufstelle, um Kosten über alle Pläne und Rezepte hinweg zu vergleichen.

## What Changes

- Neue Seite `/cost-calculation` im Food-Frontend mit drei Abschnitten:
  - **Rezeptkosten**: Übersicht aller Rezepte mit ihren Gesamtkosten, durchsuchbar
  - **Wochenplan-Kosten**: Alle MealPlans mit Kosten pro Tag, pro Person, pro Pers./Tag
  - **Frühstückskosten**: Separate Sektion für Frühstücks-Mahlzeiten (oder leer-State)
- Hinweis-Banner "Preise verwalten" mit Link zur Zutatendatenbank
- Suchfeld und "Preise verwalten"-Button im Header
- Navigation: Neuer Menüpunkt "Kostenkalkulation" in der Sidebar/Navigation

## Capabilities

### New Capabilities
- `cost-overview-page`: Zentrale Kostenkalkulations-Übersichtsseite mit aggregierten Kosten über alle Rezepte und MealPlans

### Modified Capabilities

## Impact

- **Frontend (frontend-food/)**: Neue Page-Komponente, neuer Routing-Eintrag in App.tsx, Navigation-Update
- **Backend (planner App)**: Eventuell neuer API-Endpunkt für aggregierte Kosten aller MealPlans (oder Reuse des bestehenden List-Endpunkts mit Kosten-Feldern)
- **Schemas**: Möglicherweise neues Schema für die aggregierte Kostenübersicht (Pydantic + Zod)
- **Keine Migrationen nötig** — Kostendaten werden aus bestehenden Ingredient-Preisen berechnet
