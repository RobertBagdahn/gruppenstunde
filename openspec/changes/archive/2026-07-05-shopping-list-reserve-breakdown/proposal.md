## Why

Die Einkaufsliste weist den Reserve-Anteil nicht separat aus: Die Reserve fließt nur als Multiplikator (`MealPlan.reserve_factor`, Default 1.1) in die Gesamtmenge ein und ist nirgends getrennt erkennbar. Der Stakeholder möchte sehen, wie viel der Gesamtmenge Reserve ist. Es existiert bereits eine Spec `shopping-list-reserve-transparency`, die dies beschreibt — sie ist jedoch (a) im Code nicht umgesetzt und (b) veraltet, weil sie ein Feld `reserve_percent` annimmt, während das Modell `reserve_factor` verwendet.

## What Changes

- **Reserve-Aufschlüsselung in der Einkaufsliste** — Jede Zeile kann optional Nettomenge (ohne Reserve) und Reserve-Anteil getrennt anzeigen (z.B. „1.300 g (inkl. Reserve 130 g)"). Implementiert auf Basis des bestehenden `reserve_factor`.
- **Spec-Abgleich auf `reserve_factor`** — Die bestehende Capability `shopping-list-reserve-transparency` wird auf das tatsächliche Modellfeld `reserve_factor` aktualisiert (statt des nie eingeführten `reserve_percent`).

## Capabilities

### New Capabilities
- (keine)

### Modified Capabilities
- `shopping-list-reserve-transparency`: Anforderungen auf das real existierende `reserve_factor`-Feld umstellen und die Reserve-Aufschlüsselung als umzusetzende Anforderung präzisieren.

## Impact

- **Backend-Apps**: `supply`/`shopping` (`services/shopping_service.py` — Netto-/Reserve-Anteil pro Item berechnen und im Item-Schema mitliefern).
- **Frontend-Pages**: `frontend-food` — `pages/planning/ShoppingView.tsx` (optionale Anzeige), ggf. `pages/shopping/ShoppingListDetailPage.tsx`.
- **Pydantic-Schemas**: Shopping-Item-Schema um `net_quantity_g`/`reserve_quantity_g` (oder analoge Felder) erweitern.
- **Zod-Schemas**: `frontend-food/src/schemas/shoppingList.ts` synchron.
- **Migration**: Keine (nutzt `reserve_factor`).
- **Tests**: Reserve-Aufschlüsselung berechnet korrekt; Reserve = 0 (Faktor 1.0) → Netto = Gesamt.
