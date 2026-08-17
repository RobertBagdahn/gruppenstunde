## Context

Der MealPlan-Detail-Tab "Tagesplan" rendert Rezepte als flache `<div>`-Rows ohne visuelle Trennung zum Meal-Header, Stats und Notizen. Die Rezepte teilen denselben Hintergrund wie der gesamte MealSlot und sind nur durch `pl-7` eingerückt. Das erschwert die visuelle Scanbarkeit.

Betroffene Datei: `frontend-food/src/pages/planning/MealSlot.tsx`

Keine Backend-, Schema- oder CSS-Variablen-Änderungen nötig — reine JSX/Tailwind-Änderung.

## Goals / Non-Goals

**Goals:**
- Jedes Rezept und jede Zutat im MealSlot in einer farblich getönten Box darstellen
- VariantGroups als gesamte Gruppe in einer Box darstellen
- Farbgebung abhängig vom Meal-Type (Frühstück=orange, Mittagessen=cyan, Abendessen=indigo, Snack=amber)
- Der Empty-State (Such-CTA) bleibt unverändert ohne Box
- Mobile-first: funktioniert ab 320px Viewport-Breite

**Non-Goals:**
- Keine Änderung an Backend, API, Pydantic/Zod-Schemas
- Keine neuen Komponenten — nur Modifikation von MealSlot.tsx
- Keine Änderung an DayPlanView, MealEventDetailPage oder anderen Dateien
- Keine Änderung des Meal-Headers, Stats oder Empty-States

## Decisions

### Design: Hintergrundfarbe statt weißer Cards
**Entscheidung**: Jede Recipe/Ingredient-Card bekommt `mealColors.bg` (z.B. `bg-orange-50`) als Hintergrund + `mealColors.border/30` als Border.
**Alternative**: Weiße Cards (`bg-card border`) wären neutraler, aber die Nutzerin hat explizit nach farbigen Boxen gefragt, damit Rezepte sofort ins Auge springen.

### VariantGroups: Eine Box für die gesamte Gruppe
**Entscheidung**: Der Recipe-Header und alle Variant-Kinder teilen sich eine Box. Die Variant-Kinder werden mit `ml-6` eingerückt.
**Alternative**: Jede Variante einzeln in einer Box — wäre visuell lauter und suggeriert fälschlich unabhängige Items.

### Zutaten (Ingredients) in gleichen Boxen
**Entscheidung**: Items ohne `recipe_id` aber mit `ingredient_id` bekommen denselben Card-Stil. Der existierende "Zutat"-Badge unterscheidet sie optisch von Rezepten.

### DOM-Struktur

**Regular Items (aktuell → neu):**
```
<!-- ALT: flache Row -->
div.flex.items-start.gap-2.pl-7.py-1-5.group

<!-- NEU: Card-Wrapper -->
div.pl-7.py-1
  div.rounded-lg.p-3.group.mealColors.bg.border.mealColors.border/30
    div.flex.items-start.gap-3  ← innen (gap angehoben von 2 auf 3)
      img, content, delete button (unverändert)
```

**Variant Groups (aktuell → neu):**
```
<!-- ALT: flacher Container -->
div.pl-7.py-1-5
  recipe header
  div.space-y-1
    div.pl-12.py-0-5 (children)

<!-- NEU: Card-Wrapper -->
div.pl-7.py-1
  div.rounded-lg.p-3.mealColors.bg.border.mealColors.border/30
    recipe header (unverändert)
    div.space-y-1
      div.ml-6.py-0-5 (children, pl-12 → ml-6)
```

### Farbwerte (unverändert aus MEAL_TYPE_COLORS)
| Meal-Type | Text | Hintergrund | Border |
|-----------|------|-------------|--------|
| breakfast | text-orange-600 | bg-orange-50 | border-orange-300 |
| lunch | text-cyan-600 | bg-cyan-50 | border-cyan-300 |
| dinner | text-indigo-600 | bg-indigo-50 | border-indigo-300 |
| snack | text-amber-600 | bg-amber-50 | border-amber-300 |

## Risks / Trade-offs

- **Höherer vertikaler Platzbedarf**: Jede Card hat `p-3` Padding statt `py-1.5`. Bei 6+ Rezepten pro Mahlzeit wird der Slot deutlich länger. → Akzeptabel, da verbesserte Lesbarkeit priorisiert wird.
- **Farbtreue bei Themes**: `bg-orange-50` etc. sind feste Tailwind-Farben, keine CSS-Variablen. Bei einem Dark-Theme müssten später alle MEAL_TYPE_COLORS angepasst werden. → Aktuell kein Dark-Theme geplant.
- **Zu viel Farbe bei vielen Rezepten**: Eine Mahlzeit mit 8 Rezepten könnte visuell "laut" wirken. → Die bg-50 Farben sind sehr hell (>95% weiß), dadurch subtil genug.
