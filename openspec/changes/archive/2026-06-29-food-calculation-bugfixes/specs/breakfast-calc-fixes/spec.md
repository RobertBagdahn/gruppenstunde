# breakfast-calc-fixes Specification

## Purpose

Zwei Fixes für `breakfastCalc.ts`: (1) `rebalanceShares` produziert durch `Math.round` eine Summe ≠ 100 — Largest-Remainder-Algorithmus beheben das. (2) `extrasKcalPerPerson` gibt immer 0 zurück ohne Nutzerhinweis — UI-Hinweis ergänzen.

## Requirements

### Requirement: rebalanceShares produziert exakt 100% Summe

Das System SHALL sicherstellen, dass nach `rebalanceShares` die Summe aller `sharePercent`-Werte exakt 100 beträgt (wenn die Eingabe gültig ist).

#### Algorithmus

```
1. Anteile als Fließkommazahlen berechnen: proportions[i] = (item.sharePercent / unlockedTotal) * remaining
2. Gefloort auf ganze Zahlen: floor_vals[i] = Math.floor(proportions[i])
3. Restwert: remainder = remaining - sum(floor_vals)
4. Die `remainder` Items mit den größten Nachkommastellen erhalten je +1
5. Resultat = floor_vals (mit +1 für die Gewinner)
```

#### Szenario: 3 gleichwertige Items, remaining=100

- **GIVEN** 3 unlocked Items mit jeweils `sharePercent=33.33`
- **WHEN** `rebalanceShares` aufgerufen wird
- **THEN** ergibt sich [34, 33, 33] (oder [33, 34, 33] etc.) — Summe exakt 100

#### Szenario: Einfaches Rebalance

- **GIVEN** `changedIndex=0, newValue=60`, Items [60, 20, 20] (letzten zwei unlocked)
- **THEN** locked+changed = 60, remaining = 40 → unlocked: [20, 20] → [20, 20] → Summe 100 ✅

### Requirement: Extras-Kalorienhinweis in StepCockpit

Das System SHALL im Breakfast-Wizard Cockpit-Schritt einen sichtbaren Hinweis anzeigen, dass warme Gerichte und Gemüse NICHT in der Kalorienanzeige enthalten sind.

#### Szenario: Hinweis sichtbar wenn Extras vorhanden

- **GIVEN** der Nutzer hat im StepExtras mindestens ein warmes Gericht oder Gemüse hinzugefügt
- **WHEN** StepCockpit angezeigt wird
- **THEN** soll ein Info-Text erscheinen: "Warme Gerichte und Gemüse sind nicht eingerechnet."

#### Szenario: Hinweis auch ohne Extras

- **GIVEN** keine Extras vorhanden
- **WHEN** StepCockpit angezeigt wird
- **THEN** soll derselbe Hinweis erscheinen (immer — da `extrasKcalPerPerson` immer 0 ist)

## Implementation Notes

- Datei: `frontend-food/src/lib/breakfastCalc.ts`, Funktion `rebalanceShares`
- Datei: `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` — Hinweis-Text hinzufügen
- `extrasKcalPerPerson` selbst bleibt unverändert (Stub-Placeholder)
- Test-Datei: Unit-Tests für `rebalanceShares` in `breakfastCalc` (Vitest oder Jest, je nach Setup)
