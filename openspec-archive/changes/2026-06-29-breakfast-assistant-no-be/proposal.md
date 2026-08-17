## Why

Der Frühstücksassistent hat mit dem BE/P-Konzept (Broteinheiten pro Person) eine Sonderlogik, die ihn von der restlichen MealPlan-Architektur entkoppelt. Das BE/P ist eine zusätzliche Abstraktion, die weder im Backend persistiert wird noch mit dem generischen Scaling-Mechanismus (effective_portions) harmoniert. Gleichzeitig skalieren Ingredient-Items im Backend aktuell gar nicht mit effective_portions — nur Recipe-Items tun das. Das führt dazu, dass der Assistent absolute Gramm-Mengen speichern muss, die dann im MealPlan nicht korrekt auf N Personen hochgerechnet werden.

Ziel: Den Frühstücksassistenten auf die gleiche Architektur wie alle anderen Meal-Editoren bringen — Verhältnisse und kcal-Ziel statt BE/P, generisches Ingredient-Scaling im Backend.

## What Changes

- **BREAKING**: BE/P (Broteinheiten pro Person) wird komplett aus dem Frühstücksassistenten entfernt — UI, Logik, State, Berechnung
- **BREAKING**: Die Gramm-Berechnung im Assistenten verwendet nicht mehr `BE/P × sharePercent × Scheibengewicht`, sondern leitet Gramm aus dem kcal-Ziel (`day_part_factor × NORM_PERSON_DAILY_KCAL`) und der kcal-Dichte der Zutaten ab
- **NEU**: Backend-Mechanismus: Ingredient-Items werden immer als "pro Person" behandelt und mit `effective_portions` skaliert (analog zu Recipe-Items mit `servings=1`)
- **BREAKING**: Cockpit zeigt MealItem-Standardansicht (Gramm, kcal, Faktor) statt BE-basierter Portion-Darstellung
- **BREAKING**: Normalisieren im Cockpit wird zum Aufruf des generischen scale-to-target-Endpunkts (skaliert alle Items, nicht nur BE)
- **UNVERÄNDERT**: RefMeal und DirectMeal bleiben beide nutzbar
- **UNVERÄNDERT**: 4 Steps (Basis, Belag, Extras, Getränke) + Cockpit
- **UNVERÄNDERT**: Speicherformat (MealItems mit ingredient_id/recipe_id, quantity, factor, measuring_unit_id)

## Capabilities

### Modified Capabilities

- `breakfast-wizard`: Entfernung des BE-Konzepts, Umstellung der Gramm-Berechnung auf kcal-Ziel + kcal-Dichte, Entfernung BE-bezogener Doppelchecks (Belag-Deckung), Normalisieren delegiert an scale-to-target
- `breakfast-cockpit-portions`: Cockpit zeigt keine BE-basierten Portionen mehr, sondern standard MealItem-Ansicht (kcal, Gramm, Faktor pro Person). Reste-Transparenz entfällt hier (wandert ins MealPlan-Frontend). Spec wird komplett obsolet.
- `meal-plan-effective-portions`: Erweiterung auf Ingredient-Items — effective_portions scaling gilt auch für ingredient-basierte MealItems (nicht nur recipe-basierte)
- `meal-scale-to-target`: Erweiterung — scale-to-target skaliert auch Ingredient-Items (nicht nur Recipe-Items mit factor)

### Removed Capabilities

- `breakfast-cockpit-portions`: Wird komplett entfernt (Anforderungen in breakfast-wizard integriert oder obsolet)

## Impact

- **Backend (Django)**: MealItem-Energie/Kosten-Berechnung muss Ingredient-Items mit effective_portions skalieren. `MealOut.total_energy_kcal` für ingredient-basierte Items anpassen. scale-to-target-Endpunkt erweitern.
- **Frontend (frontend-food)**: `WizardState` entfernt `bePerPerson`. `breakfastCalc.ts` neu schreiben (kcal-basiert statt BE-basiert). `StepBasis.tsx` entfernt BE-Regler. `StepBelag.tsx` entfernt BE-Bezüge. `StepCockpit.tsx` auf Standard-MealItem-Ansicht umstellen. `refMealToWizardState.ts` ohne BE-Rekonstruktion.
- **Pydantic/Zod-Schemas**: `WizardStateSchema` (Zod) entfernt `bePerPerson`. Backend-Pydantic unverändert (BE war nie im Backend).
- **Keine DB-Migration nötig**: BE war ein reines Frontend-Konzept, nie in der DB.
