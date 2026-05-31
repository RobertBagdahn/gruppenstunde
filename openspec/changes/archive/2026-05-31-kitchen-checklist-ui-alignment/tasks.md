## 1. Checkbox-Style angleichen

- [x] 1.1 In `KitchenReminderSection.tsx`: HTML `<input type="checkbox">` durch Button-Style ersetzen (44x44px, `rounded-lg border-2`, emerald-bg wenn checked, Material Icon "check") — identisch zu `ShoppingListItemRow`
- [x] 1.2 Layout der Items auf `flex items-center gap-3 py-2` umstellen (wie ShoppingListItemRow)

## 2. "Bereits vorhanden"-Button

- [x] 2.1 Neues State-Set `available` (`Set<number>`) in der Komponente anlegen
- [x] 2.2 Rechts neben jedem Item einen "Bereits vorhanden"-Button rendern (Text-Button, `text-xs`)
- [x] 2.3 Beim Klick: Item-ID ins `available`-Set aufnehmen, visuelles Feedback (z.B. grüner Badge "✓ vorhanden", Item leicht ausgegraut)
- [x] 2.4 Toggle-Verhalten: erneuter Klick entfernt den Status wieder
