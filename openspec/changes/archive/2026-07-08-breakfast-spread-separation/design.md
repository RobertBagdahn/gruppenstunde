## Context

Butter und Margarine sind aktuell als `breakfast-topping`-Zutaten modelliert und teilen sich den Share%-Pool mit Nutella, Käse, Salami etc. Der Frühstücksassistent hat 5 Schritte: Basis → Belag → Extras → Getränke → Cockpit. Der Kcal-Fluss verteilt `distributableKcal` proportional auf Brot- und Belag-Gruppe.

Fachlich ist Streichfett jedoch kein "Belag" — es ist eine Basisschicht, die vor dem Belag aufs Brot kommt. Der neue Schritt "Streichfett" wird zwischen Basis und Belag eingefügt, und Streichfett-Kcal wird vor dem Belag aus dem Budget abgezogen.

## Goals / Non-Goals

**Goals:**
- Neuer Wizard-Schritt "Streichfett" mit Share%-Veteilung für Butter, Margarine, Kein Fett
- Erweiterbar via Tag `breakfast-fat` (neue Zutaten erscheinen automatisch)
- Kcal-Fluss: distributableKcal → Brot → Streichfett → Belag (Rest)
- Eigene Cockpit-Sektion + Leftover-Kalkulation + Preisanzeige
- Migration: Butter von `breakfast-topping` nach `breakfast-fat`
- Neue Seed-Zutat Margarine

**Non-Goals:**
- Intensity-Wahl für Streichfett (bleibt bei 8g/Person fix)
- Per-Scheibe-Modell (Streichfett wird als feste Gramm/Person berechnet)
- Vegan/Vegetarisch-Flags
- Keine Änderung an warmen Gerichten (deren Butter bleibt über RecipeItems)

## Decisions

### 1. Wizard-Schritt-Reihenfolge: 6 Schritte

Schritt 1: Basis (Brot) — unverändert
Schritt 2: Streichfett — NEU
Schritt 3: Belag — ohne Butter
Schritt 4: Extras — unverändert
Schritt 5: Getränke — unverändert
Schritt 6: Cockpit — erweiterte Sektion

Der neue Schritt liegt zwischen Basis und Belag, weil Streichfett logisch aufs Brot kommt, bevor der Belag folgt.

### 2. Kcal-Fluss: Streichfett vor Belag

Aktuell:
```
distributable = dayKcal - fixKcal
breadKcal + toppingKcal = distributable × (share / totalShare)
```

Neu:
```
distributable = dayKcal - fixKcal
butterKcal = fatCoverage × FAT_GRAMS_PER_PERSON × (kcalDensity / 100)
remainingForBelag = distributable - breadKcal - butterKcal
```

Dabei ist `breadKcal` fix aus `gramsPerPerson × kcalDensity`, und `butterKcal` fix aus der Coverage-Verteilung. `remainingForBelag` wird dann per share% auf die Beläge verteilt.

Warum `breadKcal` fix? Weil der Brot-Regler direkt Gramm/Person setzt (aktuell gramsPerPerson). Das Brot-Budget ist kein share%-Wettbewerb mehr mit dem Belag.

### 3. Content-Tag `breakfast-fat`

Neuer Tag mit slug `breakfast-fat`. Zutaten mit diesem Tag erscheinen:
- Im Katalog-Endpoint unter `fat_ingredients` (neues Feld in `BreakfastCatalogOut`)
- Automatisch im neuen Streichfett-Schritt als Slider

Butter verliert den `breakfast-topping`-Tag nicht zwangsläufig — für die Migration reicht es, den `breakfast-fat`-Tag hinzuzufügen (additiv). Die Tag-Filterung im Belag-Schritt bleibt unverändert (nur `breakfast-topping`).

### 4. WizardState: fatSelections

```typescript
interface FatSelection {
  ingredientId: number;
  name: string;
  sharePercent: number;  // 0-100, rebalanced
  locked: boolean;
  energyKcal100g: number | null;
  pricePerKg: number | null;
  portions: BreakfastPortion[];
}

// Im WizardState:
fatSelections: FatSelection[];
fatGramsPerPerson: number;  // = 8 (fixed)
```

"Kein Fett" wird als virtuelle FatSelection mit ingredientId=0, name="Kein Fett", energyKcal100g=0, pricePerKg=0 modelliert.

### 5. Default-Zustand

50% Margarine, 50% Kein Fett, 0% Butter. Die ersten beiden breakfast-fat-Zutaten im Katalog bestimmen die Reihenfolge; virtuelle "Kein Fett"-Selection wird immer ans Ende angehängt.

### 6. BuildItems: Speicherung

Streichfette werden als MealItems gespeichert, quantity = Gramm pro Person, measuring_unit = g. Der Tag `breakfast-fat` wird automatisch über `ingredient_tags` (resolve aus Ingredient-Tags) an das MealItem gehängt. Warm-Gerichte-Butter (RecipeItems) bleibt separat — kein Konflikt.

## Risks / Trade-offs

- **Risiko: Doppelte Butter in Einkaufsliste** — Wenn Rührei (mit Butter) UND Streichfett ausgewählt wird, erscheint Butter zweimal in der Einkaufsliste (einmal als Rezept-Zutat, einmal als Streichfett). → Das ist gewollt, weil es unterschiedliche Verwendungen sind (Kochen vs. Brot). Der Einkäufer kauft entsprechend mehr Butter.

- **Risiko: Keine breakfast-fat-Zutaten im Katalog** — Der Schritt wird mit Hinweis "Keine Streichfette verfügbar" angezeigt, aber nicht übersprungen (Konsistenz der Schritt-Reihenfolge).

- **Risiko: Bestehende RefMeals mit Butter als breakfast-topping** — Die RefMeal→Wizard-Konvertierung muss beide Tags prüfen (`breakfast-topping` UND `breakfast-fat`), um Butter korrekt als Streichfett zu erkennen, nicht als Belag.

- **Trade-off: 8g fix pro Person** — Keine Intensity-Wahl. Einfach, aber weniger flexibel für Gruppen mit sehr unterschiedlichem Butterkonsum.
