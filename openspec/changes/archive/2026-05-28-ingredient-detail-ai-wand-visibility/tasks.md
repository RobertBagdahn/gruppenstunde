## 1. Frontend: Zauberstab-Button sichtbar machen

- [x] 1.1 In `IngredientDetailPage.tsx` prüfen, wie der Auth-User abgefragt wird (is_staff/is_superuser) und wie Edit/Delete-Buttons conditional gerendert werden
- [x] 1.2 Den Zauberstab-Button (`auto_fix_high`) neben Edit/Delete einfügen, conditional auf `is_staff || is_superuser`
- [x] 1.3 Sicherstellen, dass der Button das `AiSuggestDialog`-Modal korrekt öffnet (State + Mutation bereits vorhanden)
- [ ] 1.4 Manuell testen: Button erscheint nur für Staff-User, Modal öffnet und zeigt Vorschläge
