## Context

Der Frühstücksassistent (Breakfast Wizard) speichert strukturierte MealItems:
- **Brot/Basis**: `ingredient_id` + `quantity` (Gramm), abgeleitet aus BE-Verteilung
- **Belag**: `ingredient_id` + `quantity` (Gramm), abgeleitet aus Deckungs-Verteilung
- **Warme Gerichte**: `recipe_id` + `factor`
- **Extras**: `ingredient_id` + `quantity` (Gramm)
- **Getränke**: aktuell `display_name` + `quantity` (ml), zukünftig `recipe_id`

Die `RefMealEditorPage` wurde als generischer Rezept-Baukasten entwickelt — sie zeigt nur `display_name || "Rezept #" + recipe_id` an. Für Wizard-Items ohne `display_name` und ohne `recipe_id` (Brot, Belag, Extra-Zutaten) erscheint "Rezept #null".

### Aktuelle Problemarchitektur

```
MealItemOut                          RefMealEditorPage:291
┌────────────────────┐              ┌───────────────────────────┐
│ recipe_id=null     │              │ item.display_name ||      │
│ recipe_title=""    │─────────────▶│ "Rezept #{recipe_id}"     │
│ ingredient_id=42   │              │                           │
│ ingredient_name=   │              │ Brot: → "Rezept #null" ✗  │
│   "Vollkornbrot"   │              │ Belag: → "Rezept #null" ✗│
│ display_name=null  │              │ Getränk: → "Kaffee" ✓    │
│ ingredient_tags=[] │              └───────────────────────────┘
│ recipe_type=""     │
└────────────────────┘
```

## Goals / Non-Goals

**Goals:**
- `MealItemOut` liefert `ingredient_tags` und `recipe_type` für korrekte Gruppierung/Anzeige
- `RefMealEditorPage` zeigt ingredient-basierte Items mit `ingredient_name` (generisch für alle meal types)
- Für Breakfast: Read-only Vorschau mit gruppierten Kategorien (Brot/Belag/Warm/Extras/Getränke), getrennter Energie (Essen/Getränke), kein Rezept-Picker, kein Speichern-Button
- Ohne bestehendes Breakfast-RefMeal → Redirect zu `/wizard`
- `BreakfastWizardPage` lädt bestehendes RefMeal und befüllt alle 5 Schritte voraus
- Abbrechen-Button im Wizard kehrt zurück ohne zu speichern
- Neue Getränke-Rezepte als `recipe_type="drink"` mit Catalog-Endpoint
- Getränke werden als `recipe_id` gespeichert (mit Nutriscore, kcal aus Cache)

**Non-Goals:**
- Keine Änderung an Non-Breakfast-Mahlzeittypen (Lunch/Dinner/Snack) außer dem generischen `ingredient_name`-Fix
- Kein neues `category`-Feld im MealItem-Model — Kategorie wird über `ingredient_tags`/`recipe_type` inferiert
- Keine Änderung an der Wizard-Struktur (weiterhin 5 Schritte)
- Keine Änderung am Backend-MealItem-Model (nur Pydantic-Schema)
- Keine Daten-Migration für bestehende `display_name`-Getränke (werden beim nächsten Wizard-Save konvertiert)

## Decisions

### 1. MealItemOut um ingredient_tags und recipe_type erweitern

**Entscheidung:** `MealItemOut` erhält zwei neue Resolver-Felder:
- `ingredient_tags: list[str]` — Liste aller NutritionalTag-Slugs des Ingredients (z.B. `["frühstücks-basis"]`)
- `recipe_type: str` — `recipe.recipe_type` falls recipe_id gesetzt, sonst `""`

**Alternative:** Nur `ingredient_tags` + client-seitige Lookup über catalog. Verworfen, weil der Catalog kein `recipe_type`-Feld hat.

**Gruppierungslogik im Frontend (Priorität):**
1. `ingredient_tags` enthält `"frühstücks-basis"` → Brot
2. `ingredient_tags` enthält `"frühstücks-belag"` → Belag
3. `recipe_type === "drink"` → Getränke
4. `recipe_id` ist gesetzt → Warme Gerichte
5. `ingredient_id` ist gesetzt (ohne Tags) → Extras
6. `display_name` ist gesetzt → Getränke (Fallback für alte Daten)

### 2. Breakfast-Mode in RefMealEditorPage

**Entscheidung:** `RefMealEditorPage` prüft `mealType === "breakfast"` und rendert eine völlig andere Ansicht:

```
/meal-plans/:id/ref-meals/breakfast
│
├── [kein RefMeal] ──▶ <Navigate to="/wizard" />
│
└── [RefMeal existiert]
    ┌──────────────────────────────────────────────┐
    │ Header: "Referenz-Frühstück"                 │
    │ [Frühstücksassistent öffnen]                 │
    ├──────────────────────────────────────────────┤
    │ ┌── Brot ──────────────────────────────┐    │
    │ │  Vollkorn     · 2.5 BE · 140g · 320k │    │
    │ │  Brötchen     · 2.5 BE · 140g · 280k │    │
    │ └───────────────────────────────────────┘    │
    │ ┌── Belag ─────────────────────────────┐    │
    │ │  Butter       · 15g       · 110 kcal │    │
    │ │  Käse         · 25g       ·  95 kcal │    │
    │ └───────────────────────────────────────┘    │
    │ ┌── Warme Gerichte ────────────────────┐    │
    │ │  Rührei       · ×1.0     · 150 kcal  │    │
    │ └───────────────────────────────────────┘    │
    │ ┌── Extras ────────────────────────────┐    │
    │ │  Gurke        · 30g       ·   5 kcal  │    │
    │ └───────────────────────────────────────┘    │
    │ ┌── Getränke ──────────────────────────┐    │
    │ │  Kaffee       · 150ml     ·  20 kcal  │    │
    │ │  Milch        · 50ml      ·  35 kcal  │    │
    │ └───────────────────────────────────────┘    │
    │                                              │
    │ Energie: Essen 730 kcal | Getränke 55 kcal   │
    │ 🔗 3/7 Frühstück verknüpft                   │
    │ [Für alle übernehmen] [Alle verknüpfen]      │
    └──────────────────────────────────────────────┘
```

**Energie-Berechnung:** Summiert `energy_kcal` pro Kategorie-Gruppe und zeigt sie zweizeilig: `Essen` (Brot+Belag+Warm+Extras) und `Getränke` (Drinks).

### 3. Wizard Load: RefMeal → WizardState

**Entscheidung:** Neue `useRefMealToWizardState(catalog, refMeal)` Hook-Funktion, die bestehende MealItems in WizardState mappt:

- **Brot/Basis**: Items mit `ingredient_tags` enthält "frühstücks-basis" → `bePerPerson` zurückrechnen (quantity / sliceWeightG) + `basis[i].sharePercent` = jeweiliger Anteil an Gesamt-BE
- **Belag**: Items mit "frühstücks-belag" → `toppings[i].sharePercent` aus Gramm-Verhältnis, `globalIntensity` aus totaler Belag-Menge
- **Warme Gerichte**: Items mit `recipe_id` und `recipe_type !== "drink"` → `warmDishRecipeIds` + `warmDishFactors`
- **Getränke**: Items mit `recipe_id` und `recipe_type === "drink"` → in `drinks` mappen (coffeePercent/cocoaPercent/teaPercent aus ml-Verhältnis, mlPerPerson summieren)
- **Extras**: Items mit `ingredient_id` ohne Tags → `extraIngredients`

Nicht mappbare Items → Toast-Warnung + überspringen.

**Berechnungsdetails:**
- `bePerPerson = totalBasisGrams / normPortions / avgSliceWeight`
- `basis[i].sharePercent = ingredientGrams / totalBasisGrams * 100`
- `basis[i].sliceWeightG = ingredientGrams / (bePerPerson * basisSharePercent / 100)`
- Gleiche Logik für Toppings, intensity aus totalBelagGrams / normPortions
- Getränke-Items: mlPerPerson normieren, coffee/cocoa/tea Anteile aus ml-Verhältnis

### 4. Getränke als Recipes speichern

**Entscheidung:** Neuer Endpoint `GET /api/supply/breakfast-catalog/drinks/` gibt Liste von Rezepten mit `recipe_type="drink"` zurück. Response-Schema:

```json
{
  "drinks": [
    { "id": 42, "title": "Kaffee", "recipe_type": "drink", "cached_energy_kcal": 2 },
    { "id": 43, "title": "Kakao", "recipe_type": "drink", "cached_energy_kcal": 50 },
    { "id": 44, "title": "Tee", "recipe_type": "drink", "cached_energy_kcal": 1 },
    { "id": 45, "title": "Milch", "recipe_type": "drink", "cached_energy_kcal": 65 }
  ]
}
```

Im Wizard beim Speichern: Drink-Name (aus Slider) → Matching per Title (einfacher String-Compare) → recipe_id setzen statt display_name.

**Seeding:** Management-Command oder manuelle Migration: 4 Rezepte mit `recipe_type="drink"`, minimalen Nährwerten, `portions=1`.

### 5. Abbrechen-Button im Wizard

**Entscheidung:** Der ← Pfeil im Header und ein "Abbrechen"-Button (nur im Edit-Mode) navigieren zu `/meal-plans/${planId}/ref-meals/breakfast` ohne zu speichern. Der Wizard-State wird verworfen.

### 6. Speichern nur im Wizard

**Entscheidung:** Im Breakfast-Vorschau-Modus gibt es keinen "Speichern"-Button. Alle Änderungen laufen exklusiv über den Wizard. Sync und Link-Buttons bleiben.

## Risks / Trade-offs

- **[Risiko] Mapping-Genauigkeit**: Die Rückrechnung von MealItems in WizardState ist approximativ (z.B. `bePerPerson` und `sliceWeightG` können durch Rundung minimal abweichen). → **Mitigation**: Die berechneten Werte sind Startwerte; Nutzer kann im Wizard nachjustieren.
- **[Risiko] Getränke-Rezepte ohne Portionslogik**: Getränke haben keine RecipeItems im klassischen Sinn (keine Portion/Zutat-Struktur). → **Mitigation**: `portions=1` setzen, `cached_energy_total_kcal` auf kcal pro 100ml basieren. Die Menge wird über `quantity` (ml) + `factor` gesteuert.
- **[Risiko] Alte display_name-Items**: Bestehende RefMeals mit `display_name`-Getränken zeigen in der Vorschau "Getränke" ohne kcal. → **Mitigation**: Toast beim Laden, Konvertierung beim nächsten Wizard-Save.
- **[Risiko] recipe_type nicht in MealItemOut**: Aktuell fehlt `recipe_type` im MealItemOut-Schema. Frontend kann Getränke-Rezepte nicht von warmen Gerichten unterscheiden. → **Mitigation**: `recipe_type` in MealItemOut aufnehmen (Resolver aus obj.recipe).

## Betroffene Dateien

| Datei | Änderung |
|-------|----------|
| `backend/planner/schemas/meal_plan.py` | `MealItemOut`: + `ingredient_tags`, + `recipe_type` |
| `backend/supply/api/breakfast_catalog.py` | Neuer `GET /drinks/` Endpoint |
| `backend/supply/schemas/breakfast.py` | `DrinkRecipeSchema` für drinks-Response |
| `backend/planner/management/commands/` | Seed: 4 Getränke-Rezepte anlegen |
| `frontend-food/src/schemas/mealPlan.ts` | `MealItemSchema`: + `ingredient_tags`, + `recipe_type` |
| `frontend-food/src/schemas/breakfast.ts` | `DrinkRecipeSchema` + Zod-Typen |
| `frontend-food/src/api/breakfast.ts` | `useDrinkRecipes()` Hook |
| `frontend-food/src/api/refMeals.ts` | Keine Änderung |
| `frontend-food/src/pages/planning/RefMealEditorPage.tsx` | Breakfast-Mode, generischer Display-Fix |
| `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` | Load-Logik, Abbrechen, recipe_id drinks |
| `frontend-food/src/pages/planning/breakfast/useWizardState.ts` | `initFromRefMeal()`-ähnliche Logik |
