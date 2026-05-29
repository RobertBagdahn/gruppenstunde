## 1. smartRound() anpassen

- [x] 1.1 In `frontend-food/src/lib/unitConversion.ts`: `smartRound()` um feinere Stufen erweitern (< 1 → 0.1, 1–10 → 1)
- [x] 1.2 Sicherstellen dass Werte > 0 nie auf 0 gerundet werden (Minimum 0.1)

## 2. formatNumber() anpassen

- [x] 2.1 In `frontend-food/src/lib/unitConversion.ts`: `formatNumber()` muss Werte < 1 mit einer Nachkommastelle korrekt anzeigen (prüfen ob `toLocaleString` das bereits handelt)

## 3. Testen

- [ ] 3.1 Manuell prüfen: Rezept "Vanilleaufstrich" in Normalansicht — kleine Mengen (Butter 3,75g, Vanillezucker) müssen sinnvoll gerundet angezeigt werden
