## 1. Chart-Darstellung

- [ ] 1.1 `frontend-food/src/components/charts/NutrientBalanceChart.tsx`: Nährstoffe mit `max = null` als Mindest-Schwelle darstellen (Wert ≥ min = erreicht), nicht als Soll-Säule auf dem Minimum
- [ ] 1.2 Sicherstellen, dass Obergrenzen-Nährstoffe (Zucker, Salz) unverändert mit Maximum dargestellt werden
- [ ] 1.3 `SollIstBar.tsx` und `NutritionView.tsx` prüfen (sollen bereits korrekt sein), ggf. angleichen

## 2. Datenhygiene Rules

- [ ] 2.1 Check/Command: keine `fibre_g`-Rule mit gesetztem `max_green`/`max_yellow` (idempotent bereinigen)
- [ ] 2.2 Re-Seed-Pfad (`seed_rules --clear`) dokumentieren/verifizieren

## 3. Tests

- [ ] 3.1 Frontend: Ballaststoff über Minimum → erreicht/positiv, nicht „zu viel"
- [ ] 3.2 Frontend: Obergrenzen-Nährstoff über Maximum → weiterhin „zu viel"
- [ ] 3.3 Backend: nach Bereinigung keine fibre_g-Rule mit Maximum

## 4. Abschluss

- [ ] 4.1 Keine `console.log`/`print`
- [ ] 4.2 Visuell auf Mobile prüfen
