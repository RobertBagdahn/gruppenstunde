## 1. Frontend Fix

- [x] 1.1 In `frontend-food/src/lib/portionDisplay.ts` → `calculateNaturalPortions()`: Skip Portionen mit `weight_g <= 1` (add `if (portion.weight_g <= 1) continue;` nach Zeile 73)

## 2. Verifikation

- [ ] 2.1 Manuell testen: Rezept mit Zutat die nur Gramm-Fallback-Portion hat → keine "ca. X x"-Zeile
- [ ] 2.2 Manuell testen: Rezept mit Zutat die sinnvolle Portion hat (z.B. Stück=300g) → "ca. X x Stück" wird angezeigt
