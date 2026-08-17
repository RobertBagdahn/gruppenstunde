## 1. Portionen-Skalierung im InlineIngredientEditor

- [x] 1.1 In `InlineIngredientEditor.tsx`: Handler `handleServingsChange` implementieren, der bei Änderung der Portionszahl alle `editItems`-Mengen proportional skaliert (`newQty = oldQty * newServings / oldServings`), auf 2 Dezimalstellen rundet, und alle Items als `isDirty` markiert.
- [x] 1.2 Das bestehende Servings-Input (`editServings`) mit dem neuen Handler verbinden (statt nur `setEditServings`).

## 2. Visuelles Feedback

- [x] 2.1 Nach Skalierung ein kurzes CSS-Highlight (z.B. `transition` mit `bg-amber-100`) auf die Quantity-Inputs anzeigen (z.B. über einen `justScaled`-State der nach 1s zurückgesetzt wird).

## 3. UI-Verbesserung der Zutatenliste

- [x] 3.1 Unit-Label-Breite von `w-6` auf `w-14` oder `min-w-fit` erweitern, damit "Teelöffel", "Esslöffel", "Gramm" nicht abgeschnitten werden.
- [x] 3.2 Notiz-Feld kompakter gestalten: kleines Icon-Button das bei Klick expandiert, statt immer sichtbares Input-Feld.
- [x] 3.3 Allgemeine Spacing-Verbesserungen (padding, gap) für bessere Lesbarkeit auf Mobile.
