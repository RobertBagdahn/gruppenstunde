## 1. Cockpit: Portionen statt Gramm

- [x] 1.1 `StepCockpit.tsx`: Basis-Zeilen — "Portion" zeigt `×{bePerPerson × sharePercent/100} Scheibe` statt `{grams}g`
- [x] 1.2 `StepCockpit.tsx`: Belag-Zeilen — "Portion" zeigt `×{bePerPerson × sharePercent/totalShare} Portion` statt `{grams}g`
- [x] 1.3 `StepCockpit.tsx`: Summenzeile "Brote gesamt" nach Basis-Zeilen
- [x] 1.4 `StepCockpit.tsx`: Summenzeile "Belag gesamt" nach Belag-Zeilen
- [x] 1.5 `StepCockpit.tsx`: Spalten-Header auf "Portion" geändert
- [x] 1.6 `StepCockpit.tsx`: Getränke-Zeilen auf Tassen/Schuss umgestellt

## 2. MealSlot: Kategorie-Gruppierung

- [x] 2.1 Tag-basierte Kategorisierung (breakfast-base → Brot, breakfast-topping → Belag, etc.)
- [x] 2.2 Items nach Kategorie gruppiert, nur für Frühstücks-Mahlzeiten
- [x] 2.3 Sub-Card-Komponente mit Kategorie-Header + Items als Liste
- [x] 2.4 Nicht-kategorisierte Items im Abschnitt "Weitere" als Einzelkarten
- [ ] 2.5 Kategorie-Summenzeile — (nicht implementiert, bei Bedarf nachrüstbar)

## 3. MealSlot: QuantityInput ohne Duplikat

- [x] 3.1 QuantityInput + Einheit + Gramm als Label (kein doppelter Wert)
- [x] 3.2 Recipe-Items behalten FactorInput

## 4. Abschluss

- [x] 4.1 `npm run typecheck` — keine TypeScript-Fehler
- [ ] 4.2 Visuelle Prüfung: Cockpit zeigt Portionen + Summenzeilen
- [ ] 4.3 Visuelle Prüfung: MealSlot zeigt Frühstück in Blöcken
