## Context

Der Frühstücks-Wizard (Schritt 5 Cockpit) und der MealSlot im MealPlan zeigen Brot/Belag-Einzelposten in Gramm. Der Cockpit hat keine Summenzeilen. Der MealSlot listet alle Wizard-Items als einzelne Karten untereinander — bei 7 Broten + 3 Käsen + Getränken wird der Frühstücks-Block sehr lang und unübersichtlich.

Seit dem letzten Change (`breakfast-wizard-mealplan-transfer`) speichern Wizard-Items `quantity` als Portionsmenge pro Person (z.B. 0.56 Scheiben), doch die Anzeige nutzt das noch nicht optimal.

## Goals / Non-Goals

**Goals:**
- Cockpit-Tabelle: "Menge/P"-Spalte zeigt Portionen (Scheiben/Portionen/Tassen/Schuss) statt Gramm
- Cockpit: Summenzeilen pro Kategorie (Brote gesamt, Belag gesamt)
- Cockpit: Kein BE-Begriff mehr in der Anzeige
- MealSlot: Frühstücks-Items nach Kategorie gruppieren (Brot/Belag/Warme Gerichte/Extras/Getränke)
- MealSlot: QuantityInput nur einmal pro Item, kein doppelter Wert
- MealSlot: Summenzeilen pro Kategorie (optional, wenn gewünscht)

**Non-Goals:**
- Keine Backend-Änderungen
- Keine Änderung an der Speicherlogik (quantity, factor bleiben)
- Keine Änderung an nicht-Frühstücks-Mahlzeiten (Mittag/Abendbrot/Snack)
- Keine Änderung an der RefMeal- oder TableView

## Decisions

### 1. Kategorisierung über ingredient_tags

**Entscheidung:** Die Gruppierung im MealSlot erfolgt über das `item.ingredient_tags`-Feld, das bereits im API-Response enthalten ist.

**Mapping:**
| ingredient_tags enthält | Kategorie | Anzeigename |
|---|---|---|
| `"breakfast-base"` | `bread` | Brot |
| `"breakfast-topping"` | `topping` | Belag |
| `"breakfast-warm-meal"` | `warm_meal` | Warme Gerichte |
| `"breakfast-drink"` | `drink` | Getränke |
| Weder noch, aber `recipe_id` | `recipe` | (Einzeleintrag) |
| Weder noch, `ingredient_id` | `extra` | Extras |

**Rationale:** Kein neues Backend-Feld nötig. Die Tags sind bereits im System und werden von MealItemOut ausgeliefert.

### 2. Cockpit: Portionen statt Gramm

**Entscheidung:** Im Cockpit wird die Spalte "Menge/P" von Gramm auf Portionen umgestellt.

**Berechnung:**
```
Brot-Portionen = bePerPerson × sharePercent / 100
Belag-Portionen = bePerPerson × sharePercent / totalToppingShare  
Getränke = mlPerPerson / 200 (Tassen)
Milch = totalMilkMl / 30 (Schuss)
```

**Summenzeilen:** Nach jeder Kategorie-Gruppe wird eine Summenzeile mit der totalen Portionsanzahl eingefügt. Die Gesamt-Summenzeile zeigt weiterhin kcal.

### 3. MealSlot: QuantityInput ohne Duplikat

**Entscheidung:** Für ingredient-Items wird der QuantityInput INNERHALB der Portionsanzeige dargestellt, sodass der Wert nur einmal erscheint:

```
Aktuell:  ×0,56 Scheibe (28g)  [×0,56]      ← Wert 2×
Neu:      [×0,56] Scheibe (28g)              ← Wert 1× im Input
```

Der Input zeigt den Wert, rechts daneben stehen Einheit und Gramm als Label.

### 4. MealSlot: Gruppen-Rendering

**Entscheidung:** Der bestehende Rendering-Block (regularItems + variantGroups) wird durch eine Kategorie-basierte Gruppierung ersetzt — ABER NUR für Frühstücks-Mahlzeiten.

**Erkennung:** `meal.meal_type === 'breakfast'` → verwende Gruppierung. Sonst → bestehendes Rendering.

**Layout pro Kategorie:**
```
┌──────────────────────────────────────────────┐
│ Brot                                          │
│  Bauernbrot    [×0,56] Scheibe (28g)   12 kcal│
│  Brötchen      [×0,56] Scheibe (28g)   15 kcal│
│  Brote gesamt: 1,12 Scheiben              27 kcal│
├──────────────────────────────────────────────┤
│ Belag                                         │
│  Edamer       [×0,21] Portion (5g)     6 kcal│
│  Frischkäse   [×0,30] Portion (8g)     8 kcal│
│  Belag gesamt: 0,51 Portionen            14 kcal│
└──────────────────────────────────────────────┘
```

Jede Kategorie ist eine Sub-Card mit leichtem Rand, abgerundeten Ecken und einem Kategorie-Header.

**Alternative:** Kategorien als `div` mit border-l-4 und Farbakzent (wie Meal-Typen). Verworfen weil zu bunt. Einheitliche Sub-Cards sind ruhiger.

## Risks / Trade-offs

**[Risk] Nicht-Frühstücks-Items im Frühstücks-Slot:** Wenn ein Nutzer manuell ein Rezept (z.B. Spaghetti) in den Frühstücks-Slot legt, hat es keine breakfast-Tags → landet in "Extras" oder "Sonstiges".  
→ **Mitigation:** Items ohne breakfast-Tag werden in einem separaten Abschnitt "Weitere" unterhalb der Kategorien als Einzelkarten gerendert (wie bisher).

**[Risk] Gemischte Kategorie-Zuordnung:** Ein Item könnte sowohl `breakfast-base` als auch `breakfast-topping` haben.  
→ **Mitigation:** `breakfast-base` hat Vorrang vor `topping`, `topping` vor `warm_meal`. Erste Übereinstimmung gewinnt.

**[Risk] Keine Backend-Änderung nötig:** Die Tags sind im Response, aber der Frontend-Code muss die Logik zum Kategorisieren enthalten — kein Problem, reiner Frontend-Change.
