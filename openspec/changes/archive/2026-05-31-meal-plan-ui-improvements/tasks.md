## 1. Faktor-Formatierung

- [x] 1.1 `FactorInput` Komponente: Initialwert und Reset mit `toFixed(1).replace('.', ',')` formatieren (`MealEventDetailPage.tsx` Zeile 515, 531)
- [x] 1.2 Read-only Faktor-Anzeige: `item.factor.toFixed(1).replace('.', ',')` verwenden (Zeile 898)

## 2. Soll/Ist-Energie im Slot-Header

- [x] 2.1 Darstellung im Meal-Header ändern: von `(35%) 7%` zu `Soll: 35% │ Ist: 7%` (Zeilen 808-814)

## 3. Erweiterte Tabellen-Zellen

- [x] 3.1 Pro Rezept in der Zelle den Faktor anzeigen (`× 1,0`)
- [x] 3.2 Pro Rezept Energie in kcal anzeigen
- [x] 3.3 Pro Rezept Kosten in € anzeigen
- [x] 3.4 `min-w` der Tabellenspalten ggf. erhöhen für zusätzliche Infos
