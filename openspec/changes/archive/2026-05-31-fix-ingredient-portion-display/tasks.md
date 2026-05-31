## 1. Fix highPrioPortion Filter

- [x] 1.1 In `frontend-food/src/components/supply/IngredientList.tsx` Zeile 83: Filter von `(p.weight_g ?? 0) > 0` auf `(p.weight_g ?? 0) > 1` ändern
- [x] 1.2 Verifizieren: Rezept mit Zutat ohne sinnvolle Portionen (nur "g" mit weight_g=1) zeigt keine "≈"-Subzeile mehr
- [x] 1.3 Verifizieren: Rezept mit Zutat mit sinnvoller Portion (z.B. "Stück" = 180g) zeigt weiterhin "≈ 2,5 Stück"
