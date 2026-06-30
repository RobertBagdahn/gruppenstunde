## 1. Backend-Berechnung

- [ ] 1.1 `backend/supply/services/shopping_service.py`: pro Item `net_quantity_g = total / reserve_factor`, `reserve_quantity_g = total − net` berechnen
- [ ] 1.2 Shopping-Item-Pydantic-Schema um `net_quantity_g`, `reserve_quantity_g` erweitern
- [ ] 1.3 Konsistente Rundung (Gesamt führend, Reserve = Gesamt − Netto)

## 2. Frontend

- [ ] 2.1 `frontend-food/src/schemas/shoppingList.ts`: Zod um `net_quantity_g`, `reserve_quantity_g` synchronisieren
- [ ] 2.2 `frontend-food/src/pages/planning/ShoppingView.tsx`: optionaler Toggle + Anzeige „inkl. Reserve X g"
- [ ] 2.3 Default: Aufschlüsselung aus (nur Gesamtmenge)

## 3. Tests

- [ ] 3.1 Backend: reserve_factor 1.1 → Netto/Reserve korrekt, Summe = Gesamt
- [ ] 3.2 Backend: reserve_factor 1.0 → reserve_quantity_g = 0, Netto = Gesamt
- [ ] 3.3 Backend: reserve_factor 1.15 → korrekte Aufteilung

## 4. Abschluss

- [ ] 4.1 Pydantic/Zod-Sync prüfen
- [ ] 4.2 Keine `print`/`console.log`; deutsche UI-Texte
