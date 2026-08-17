## 1. Type-Erweiterung

- [x] 1.1 `EditableItem`-Interface in `InlineIngredientEditor.tsx` um `weight_g: number`-Feld ergänzen
- [x] 1.2 `normalizeItems`-Helper: `displayQty` als `weight_g` im Rückgabe-Objekt speichern

## 2. Sortierung

- [x] 2.1 `useState`-Initializer in `InlineIngredientEditor`: `editItems` nach `normalizeItems` mit `.sort((a, b) => b.weight_g - a.weight_g)` sortieren

## 3. Verifikation

- [ ] 3.1 Manuell testen: `/recipes/obstsalat-kopie` öffnen, auf "Bearbeiten" klicken, prüfen dass Reihenfolge identisch zum View-Mode ist
- [ ] 3.2 Manuell testen: Ein anderes Rezept testen, um sicherzustellen dass keine Regression auftritt
- [x] 1.3 `handleAddIngredient`: `weight_g: 0` in neuen Items ergänzen (Typabgleich mit erweitertem EditableItem)
