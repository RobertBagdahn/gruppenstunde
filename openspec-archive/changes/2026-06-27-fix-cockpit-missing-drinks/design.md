## Context

Der Frühstücks-Wizard (`BreakfastWizardPage`) erfasst in 5 Schritten die Konfiguration eines Frühstücks: Basis (Brot), Belag, Extras (warme Gerichte + Gemüse), Getränke und ein Abschluss-Cockpit. Der Wizard-State (`useWizardState`) hält alle Daten client-seitig. Beim Speichern werden die Daten als `MealItem`-Records via `/api/meal-plans/{id}/ref-meals/` persistiert.

Aktuell zeigt das Cockpit (Schritt 5) nur Basis- und Belag-Zeilen in der Transparenz-Tabelle. Getränke, warme Gerichte und Extras sind nicht sichtbar. Die kcal-Berechnung (`totalKcal`) summiert ebenfalls nur `basisKcal + toppingKcal`. Zudem wird beim erneuten Öffnen des Wizards nur `day_part_factor` aus dem existierenden RefMeal übernommen — Getränke-Items aus `refMeal.items` verfallen auf Default-Werte.

**Betroffene Dateien:**
- `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` — Tabelle + kcal-Berechnung
- `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` — State-Initialisierung
- `frontend-food/src/lib/breakfastCalc.ts` — neue Getränke-kcal-Helper
- `frontend-food/src/pages/planning/breakfast/useWizardState.ts` — ggf. `setDrinks`-Signatur prüfen

**Constraints:**
- Keine Backend-Änderungen nötig — RefMeal speichert und liefert Getränke-Items bereits korrekt
- Wizard-State-Typen (`WizardState`, `DrinkState`) aus `@/schemas/breakfast` bleiben unverändert
- Mobile-First-Layout (320px) muss erhalten bleiben

## Goals / Non-Goals

**Goals:**
- Cockpit-Zusammenfassung zeigt ALLE Komponentengruppen (Basis, Belag, warme Gerichte, Extras, Getränke) mit Menge, kcal und Anteil
- Energieberechnung im Cockpit summiert alle Komponenten (nicht nur Basis+Belag)
- Normalisieren skaliert Getränke mit
- Beim Wiederöffnen des Wizards werden Getränke aus `refMeal.items` in den State geladen

**Non-Goals:**
- Keine Änderung am RefMeal-Editor (`RefMealEditorPage`) — Getränke werden dort bereits als display_name-Items angezeigt
- Keine Erweiterung des Katalogs um Getränke-Zutaten — Getränke bleiben display-name-only Items
- Kein Backend-Code betroffen

## Decisions

### Decision 1: Cockpit-Tabelle um Getränke und Extras erweitern

**Ansatz:** In `StepCockpit` werden nach den bestehenden Basis/Topping-Zeilen zwei neue Abschnitte eingefügt:
- **Warme Gerichte + Extras**: Iteration über `warmDishRecipeIds` + `extraIngredients`
- **Getränke**: Iteration über `state.drinks` mit ml-Angaben

Jede Zeile zeigt `(Menge × sharePercent/100)`, kcal (für Extras aus dem Ingredient, für Getränke grobe Schätzung) und Anteil an Gesamt-kcal.

**Alternativen:**
- Getränke in eigene Tabelle auslagern → unnötig fragmentiert, eine Tabelle ist übersichtlicher
- Getränke-kcal präzise aus Ingredient-Daten berechnen → nicht möglich, da Getränke keine Ingredient-FKs haben (sind display-only Items ohne Nährwerte). Stattdessen: grobe kcal über Konstante schätzen oder kcal-Spalte für Getränke auf "—" setzen

**Entscheidung:** Getränke-kcal grob schätzen: Kaffee ~2 kcal/100ml, Kakao ~80 kcal/100ml, Tee ~0 kcal/100ml, Milch ~65 kcal/100ml. Als `breakfastCalc.ts`-Helper exportieren. Ist kein exakter Wert, aber für Energie-Balken ausreichend.

### Decision 2: Energieberechnung um Getränke + Extras erweitern

**Ansatz:** Neue Funktion `totalKcal()` in `StepCockpit`, die alle vier Komponentengruppen addiert:
```
basisKcal + toppingKcal + extrasKcal + drinksKcal
```

`extrasKcal` berechnet sich aus `extraIngredients`-Gramm + Energie-Dichte der Zutat (wenn bekannt) sowie warmen Gerichten (Rezept-kcal).
`drinksKcal` nutzt die neuen Schätz-Helper aus `breakfastCalc.ts`.

### Decision 3: Normalisieren um Getränke erweitern

**Ansatz:** `handleNormalize()` skaliert zusätzlich zu `setBePerPerson` auch `drinks.mlPerPerson` mit dem Soll/Ist-Faktor. Die Funktion wird erweitert:
```
const ratio = target / totalKcal;   // totalKcal enthält jetzt ALLE Komponenten
setBePerPerson(newBe);
setDrinks({ mlPerPerson: Math.round(state.drinks.mlPerPerson * ratio) });
```

### Decision 4: Wizard-State aus RefMeal-Items restaurieren

**Ansatz:** In `BreakfastWizardPage` wird nach dem Abruf von `refMeals` geprüft, ob ein existierendes RefMeal für Frühstück vorhanden ist. Falls ja, werden die items durchiteriert und `display_name`-Matches (Kaffee, Kakao, Tee, Milch) in den initialen Wizard-State überführt.

Konkret: Ein `useEffect`, der beim ersten Laden die Drink-Items aus `existingRefMeal.items` ausliest und via `wiz.setDrinks()` in den State schreibt. Die Rekonstruktion erfolgt nur, wenn `existingRefMeal` vorhanden ist und der State noch nicht initialisiert wurde.

```
// Rekonstruktion der Getränke aus RefMeal-Items:
let coffeeMl = 0, cocoaMl = 0, teaMl = 0, totalMilkMl = 0;
for (const item of existingRefMeal.items) {
  switch (item.display_name) {
    case 'Kaffee': coffeeMl = item.quantity || 0; break;
    case 'Kakao':  cocoaMl = item.quantity || 0; break;
    case 'Tee':    teaMl = item.quantity || 0; break;
    case 'Milch':  totalMilkMl = item.quantity || 0; break;
  }
}
const totalDrinkMl = coffeeMl + cocoaMl + teaMl;
// Rekonstruiere Prozente aus ml-Werten
// Milch wird 50/50 auf Kaffee/Kakao verteilt (da Wizard kein separates Milch-Feld hat)
```

**Caveat:** Die Milch wird beim Speichern als `coffeeMilkMlPerPerson + cocoaMilkMlPerPerson` zusammengefasst. Beim Zurückladen kann sie nur 50/50 auf Kaffee/Kakao verteilt werden — eine Annäherung, aber der häufigste Fall bei Default-Werten (50ml + 150ml → 200ml total).

## Risks / Trade-offs

- **Getränke-kcal sind Schätzwerte**: Da Getränke keine Ingredient-FKs haben, sind die kcal-Werte approximiert. → Für den Energie-Balken ausreichend, Abweichung < 20 kcal → akzeptabel
- **Milch-Rekonstruktion ist approximiert**: 50/50-Aufteilung beim Zurückladen → akzeptabel, da die genaue Aufteilung im Wizard-Step 4 nachjustiert werden kann
- **Kein Risiko für Datensynchronität**: Alles client-seitig, keine Backend-Migration nötig
