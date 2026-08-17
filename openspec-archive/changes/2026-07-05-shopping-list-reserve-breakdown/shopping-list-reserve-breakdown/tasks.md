## 1. Backend-Berechnung

- [x] 1.1 `backend/supply/services/shopping_service.py`: pro Item `net_quantity_g = total / reserve_factor`, `reserve_quantity_g = total − net` berechnen
- [x] 1.2 Shopping-Item-Pydantic-Schema um `net_quantity_g`, `reserve_quantity_g` erweitern
- [x] 1.3 Konsistente Rundung (Gesamt führend, Reserve = Gesamt − Netto)

## 2. Frontend

- [x] 2.1 `frontend-food/src/schemas/shoppingList.ts`: Zod um `net_quantity_g`, `reserve_quantity_g` synchronisieren
- [x] 2.2 `frontend-food/src/pages/planning/ShoppingView.tsx`: optionaler Toggle + Anzeige „inkl. Reserve X g"
- [x] 2.3 Default: Aufschlüsselung aus (nur Gesamtmenge)

## 3. Tests

- [x] 3.1 Backend: reserve_factor 1.1 → Netto/Reserve korrekt, Summe = Gesamt
- [x] 3.2 Backend: reserve_factor 1.0 → reserve_quantity_g = 0, Netto = Gesamt
- [x] 3.3 Backend: reserve_factor 1.15 → korrekte Aufteilung

## 4. Abschluss

- [x] 4.1 Pydantic/Zod-Sync prüfen
- [x] 4.2 Keine `print`/`console.log`; deutsche UI-Texte
