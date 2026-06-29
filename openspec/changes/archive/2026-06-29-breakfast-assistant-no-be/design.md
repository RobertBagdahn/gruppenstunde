## Context

Der Frühstücksassistent verwendet aktuell ein client-seitiges BE/P-Konzept (Broteinheiten pro Person), um die Mengen für Brot und Belag zu berechnen. Die Gramm-Mengen werden aus `BE/P × sharePercent × Scheibengewicht` abgeleitet, als MealItems mit `quantity` in Gramm gespeichert und mit `factor=1.0` in den MealPlan übergeben.

**Wichtige Erkenntnis aus der Code-Analyse**: Das Backend skaliert Ingredient-Items **bereits korrekt** mit `effective_portions`:
- `resolve_ingredient_energy_kcal()`: `(energy_kcal/100) × weight_g × factor × effective_portions`
- Der scale-to-target-Endpunkt verwendet `MealOut.resolve_total_energy_kcal()` und skaliert damit auch Ingredient-Items.

Die Änderung betrifft daher **ausschließlich das Frontend** (`frontend-food/`). Keine Backend-Model-, Schema- oder API-Änderungen nötig.

## Goals / Non-Goals

**Goals:**
- BE/P aus dem gesamten Frühstücksassistenten entfernen (State, UI, Berechnung, Rekonstruktion)
- Gramm-Berechnung im Assistenten auf kcal-Ziel + kcal-Dichte umstellen
- Normalisieren-Button ruft scale-to-target-API auf statt BE/P zu skalieren
- Cockpit zeigt Standard-MealItem-Ansicht (Gramm, kcal, Faktor)
- RefMeal-Rekonstruktion ohne BE

**Non-Goals:**
- Backend-Änderungen (nicht nötig — Ingredient-Scaling funktioniert bereits)
- Änderung am RefMeal-/DirectMeal-Speichermechanismus
- Änderung am MealPlan-Scaling
- Überarbeitung des `_aggregate_meal_values`-Inkonsistenz (separates Thema)
- Reste-Transparenz (wandert ins MealPlan-Frontend, nicht Teil dieses Changes)

## Decisions

### 1. Gramm-Berechnung: kcal-Ziel statt BE/P

**Alt:** Gramm = `bePerPerson × sharePercent × sliceWeightG`
**Neu:** Gramm wird aus dem kcal-Ziel abgeleitet

Die neue Berechnung in `breakfastCalc.ts`:

```
sollKcal = NORM_PERSON_DAILY_KCAL × dayPartFactor   (z.B. 2335 × 0,25 = 584)
fixKcal  = kcal aus warmen Gerichten + Extras + Getränken
verteilKcal = sollKcal - fixKcal                     (kcal für Brot + Belag)

Brot-Anteil:  Brot-Kcal = verteilKcal × (brotAnteil / (brotAnteil + belagAnteil))
Belag-Anteil: Belag-Kcal = verteilKcal × (belagAnteil / (brotAnteil + belagAnteil))

Brot-Gramm = Brot-Kcal / (kcalPro100g / 100)
Belag-Gramm = Belag-Kcal / (kcalPro100g / 100)
```

Dabei ist `brotAnteil` = Summe der Brot-sharePercent und `belagAnteil` = Summe der Belag-sharePercent.

**Warum?** Das kcal-Ziel ist der einzige absolute Anker im System (`day_part_factor × NORM_PERSON_DAILY_KCAL`). Die Verteilung (sharePercent) definiert das Verhältnis. Gramm ergibt sich automatisch aus kcal-Dichte der Zutaten — kein manueller BE/P-Regler nötig.

### 2. Normalisieren: scale-to-target-API statt BE-Skalierung

**Alt:** `normalizeBePerPerson()` im Frontend skaliert BE/P auf das kcal-Soll.
**Neu:** Der Normalisieren-Button ruft `POST /api/meal-plans/{planId}/meals/{mealId}/scale-to-target/` auf.

**Warum?** Der Endpunkt existiert bereits, skaliert beide Item-Typen (recipe + ingredient) korrekt und ist getestet. Der Assistent muss die Logik nicht duplizieren.

**Einschränkung:** scale-to-target braucht ein existierendes Meal (mit ID). Im RefMeal-Mode gibt es noch kein Meal — dort muss der Assistent entweder:
- (a) Zuerst ein RefMeal speichern, dann scale-to-target auf das verknüpfte Meal aufrufen
- (b) Die Normalisieren-Funktion für RefMeals client-seitig behalten (simplere Form)

**Entscheidung:** (b) — RefMeal-Mode behält eine client-seitige Normalisieren-Funktion, die aber ohne BE/P auskommt: sie skaliert das kcal-Ziel auf die Summe der Zutaten. DirectMeal-Mode ruft scale-to-target-API auf.

### 3. Cockpit: Standard-MealItem-Ansicht

**Alt:** Cockpit zeigte BE-basierte Portionen ("×2,64 Scheibe", "×0,84 Portion") mit Kategorie-Summenzeilen.
**Neu:** Cockpit zeigt pro Item: Gramm/P, kcal/P, Faktor — identisch zur Darstellung in anderen Meals.

**Warum:** Der Assistent speichert die gleichen MealItems wie jeder andere Meal-Editor. Das Cockpit sollte sie auch gleich darstellen. Keine Sonderlogik für Frühstück.

### 4. Rekonstruktion aus RefMeal: Kein BE

**Alt:** `refMealToWizardState.ts` berechnete BE/P aus `quantity / sliceWeightG`, dann `sum(be) / normPortions`.
**Neu:** Rekonstruktion berechnet aus den Gramm-Werten:
- `sharePercent` = `quantity / sum(quantity) × 100`
- Kein BE/P-Wert

**Warum:** BE/P war nur ein Zwischenschritt. Die Verhältnisse (sharePercent) sind das einzig relevante für den Wizard. 

### 5. WizardState entfernt `bePerPerson`

**Alt:** `WizardState.bePerPerson` (number, 1-10) steuerte alle Berechnungen.
**Neu:** `WizardState` hat kein `bePerPerson` mehr. Alle Berechnungen laufen über den `dayPartFactor` (vom MealPlan) und kcal-Dichte der Zutaten.

Der `dayPartFactor` wird aus dem MealPlan-Kontext geladen (über die aufrufende Route). Fallback: 0,25 (Standard-Frühstück).

### 6. Wegfall der BE-basierten Doppelchecks

Folgende Checks entfallen:
- **Belag-Deckung**: Warnung wenn Belag nicht 100% der Brot-BE deckt → entfällt, da es keine BE-Mehrheit mehr gibt
- **Sortenrisiko**: Warnung bei >2 Sorten → bleibt optional, aber ohne BE-Bezug

## Risiken / Trade-offs

| Risiko | Mitigation |
|--------|------------|
| **Kcal-Datenlücken**: Wenn eine Zutat keine `energyKcal100g` hat, kann Gramm nicht berechnet werden | Fallback auf Durchschnitts-kcal der Kategorie oder Default 250 kcal/100g. Zutat im UI markieren. |
| **DayPartFactor unbekannt**: RefMeal-Mode hat keinen direkten Zugriff auf day_part_factor | Factor aus dem aufrufenden Kontext mitgeben. Fallback auf 0,25. |
| **Scale-to-target im RefMeal-Mode**: Kein Meal vorhanden, API kann nicht aufgerufen werden | Client-seitige Normalisieren-Funktion für RefMeals (Decision 2). |
| **Cockpit-Darstellung verliert Kategorie-Kontext**: Ohne BE gibt's keine Brot/ Belag-Summenzeilen mehr | Kategorie-Summen bleiben erhalten, aber basierend auf Gramm/kcal statt BE. |
| **Rekonstruktion ungenau**: Aus Gramm allein lassen sich Verhältnisse nicht perfekt rekonstruieren | Wie bei allen Rezepten: Gramm in DB ist die Quelle der Wahrheit. Verhältnisse sind eine abgeleitete Sicht. |

## Datenfluss (Neu)

```
USER WÄHLT VERTEILUNG (nur %-Slider)
  → State.sharePercent (Basis, Belag)
  → Kcal wird aus kcal-Dichte + % + dayPartFactor berechnet
  → Gramm wird aus kcal + kcal-Dichte abgeleitet
  → Kein BE/P-Regler

NORMALISIEREN (DirectMeal-Mode)
  → POST /api/meal-plans/{id}/meals/{mealId}/scale-to-target/
  → Backend skaliert alle Item-Faktoren (recipe + ingredient)

NORMALISIEREN (RefMeal-Mode)
  → Client-seitig: skaliert Zutaten-Mengen proportional zum kcal-Ziel
  → Ergebnis: neue quantity-Werte im WizardState

SPEICHERN (beide Modes)
  → Basis: quantity = Gramm/P (berechnet aus kcal), measuring_unit = Gramm, factor = 1.0
  → Belag: quantity = Gramm/P (berechnet aus kcal), measuring_unit = Gramm, factor = 1.0
  → Getränke, warme Gerichte, Extras: unverändert
  → Kein BE/P mehr in der Berechnung

LADEN AUS REFMEAL
  → Gramm-Werte aus DB
  → sharePercent = quantity / sum(quantity) × 100
  → Kein BE/P
```

## Betroffene Dateien

### frontend-food/

| Datei | Änderung |
|-------|----------|
| `src/schemas/breakfast.ts` | `WizardStateSchema`: `bePerPerson` entfernen. Default-State ohne `bePerPerson`. |
| `src/lib/breakfastCalc.ts` | Neu schreiben: BE-basierte Funktionen entfernen, kcal-basierte Berechnung einbauen. `beToGrams()`, `basisKcalPerPerson()`, `toppingKcalPerPerson()`, `toppingGramsPerPerson()`, `normalizeBePerPerson()` → kcal-basierte Alternativen. |
| `src/pages/planning/breakfast/useWizardState.ts` | `setBePerPerson` entfernen. `replaceState` ohne `bePerPerson`. |
| `src/pages/planning/breakfast/StepBasis.tsx` | BE-Regler entfernen. Nur %-Slider + kcal/Gramm-Anzeige pro Brot-Sorte. |
| `src/pages/planning/breakfast/StepBelag.tsx` | BE-Bezüge entfernen ("g/BE" → "g"). Belag-Deckung-Check entfernen. |
| `src/pages/planning/breakfast/StepCockpit.tsx` | Normalisieren: DirectMeal → scale-to-target API, RefMeal → client-seitig. Cockpit-Tabelle: Standard MealItem-Ansicht. |
| `src/pages/planning/breakfast/BreakfastWizardPage.tsx` | `buildItems()`: Gramm aus kcal-Berechnung, kein BE/P mehr. |
| `src/lib/refMealToWizardState.ts` | Rekonstruktion ohne BE/P: nur sharePercent aus Gramm. |
| `frontend-food/AGENTS.md` | BE-Konvention entfernen. |

### backend/

Keine Änderungen nötig.

## Open Questions

1. Wie teilen wir dem Assistenten den `dayPartFactor` mit, wenn er im RefMeal-Mode startet (kein Meal vorhanden)? Aktuell gibt's keine API, die das liefert.
2. Soll der Normalisieren-Button im Cockpit bleiben, wenn das Meal leere oder synchrone Items hat (scale-to-target schlägt dann fehl)?
3. Was passiert mit dem leftovers/packaging-API-Call im Cockpit, der aktuell BE/P verwendet?
