## Context

Die Rezept-Detailseite (`frontend-food/src/pages/recipes/RecipeDetailPage.tsx`, 1822 Zeilen) zeigt Zutaten aktuell unterhalb von Nutritional Tags. Die Portionen-Logik ist fehlerhaft: Der PortionScaler in der Sidebar übergibt absolute Portionszahlen, die dann durch `recipe.servings` (z.B. 18) geteilt werden — das ergibt bei "2 Portionen" einen Multiplier von 0.11 statt 2. Zusätzlich existiert ein redundanter PortionScaler inline in der IngredientList.

## Goals / Non-Goals

**Goals:**
- Zutaten sind die erste Sektion nach dem Hero-Bereich
- Portionen-Skalierung funktioniert korrekt mit einem einfachen Multiplier (1 = Norm-Portion)
- Nur ein Scaler existiert (Sidebar auf Desktop, Bottom Sheet auf Mobile)
- Zutatenliste ist visuell größer und besser lesbar

**Non-Goals:**
- Keine Änderung am Backend/API
- Keine Änderung am Edit-Modus (InlineIngredientEditor)
- Keine Änderung an der Einkaufslisten-Logik
- Keine Änderung am Cooking-Mode

## Decisions

### 1. Multiplier-Semantik vereinfachen

**Entscheidung**: `servingsMultiplier` bedeutet direkt "Anzahl Portionen". Default = 1. Die Mengen in `recipe_items` werden durch `recipe.servings` geteilt und dann mit dem Multiplier multipliziert.

**Rationale**: Aktuell ist die Berechnung `quantity * servingsMultiplier` wobei der Multiplier über `s / recipe.servings` berechnet wird. Das ist unnötig komplex. Stattdessen: `quantity / recipe.servings * portionCount`.

**Alternative**: Den Multiplier als Bruch behalten → abgelehnt, weil es zu Verwirrung führt und der Sidebar-Scaler "Portionen" anzeigt.

### 2. PortionScaler nur in Sidebar/Bottom Sheet

**Entscheidung**: `IngredientList` bekommt den Scaler entfernt. Die Props `onServingsChange` wird entfernt. Die Komponente zeigt nur noch die Zutaten an.

**Rationale**: Vermeidet Duplikation und macht klar, wo die Steuerung liegt.

### 3. Schriftgröße von text-sm auf text-base

**Entscheidung**: Die Zutatenliste verwendet `text-base` statt `text-sm` für bessere Lesbarkeit auf Mobile.

**Betroffene Dateien:**
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — Sektions-Reihenfolge, Header-Text, Multiplier-Logik
- `frontend-food/src/components/supply/IngredientList.tsx` — PortionScaler entfernen, Schrift vergrößern
- `frontend-food/src/components/recipe/RecipeSidebar.tsx` — onServingsChange-Logik fixen
- `frontend/src/components/supply/IngredientList.tsx` — gleiche Änderungen
- `frontend/src/components/recipe/RecipeSidebar.tsx` — gleiche Änderungen

**API-Änderungen:** Keine
**Migrations:** Keine

## Risks / Trade-offs

- [Mengen-Berechnung Rundungsfehler bei Division durch servings] → Mitigation: `scaleQuantity` rundet bereits intelligent
- [PortionScaler-State in Sidebar ist intern, synced nicht mit URL] → Akzeptiert, ist bestehendes Verhalten
- [Zwei frontend-Verzeichnisse mit Duplikaten] → Beide müssen angepasst werden

## Open Questions

- Soll der Portionen-Wert in der URL persistiert werden (`?portions=4`)? → Erstmal nicht, kann später ergänzt werden.
