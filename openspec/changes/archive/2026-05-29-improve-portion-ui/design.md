## Context

Die Zutaten-Detailseite im Food Frontend (`frontend-food/src/pages/supplies/IngredientDetailPage.tsx`) zeigt Portionen einer Zutat an. Aktuell:
- Anzeige: `(quantity g, ~weight_g g Gewicht)` – kryptisch für Nutzer
- Kein UI zum Ändern der Sortierreihenfolge (`rank`)
- Das `rank`-Feld existiert bereits im Backend-Model und im `PortionUpdateIn`-Schema

Betroffene Dateien:
- `frontend-food/src/pages/supplies/IngredientDetailPage.tsx` – `PortionCard` Komponente
- `frontend-food/src/schemas/supply.ts` – Zod-Schema (bereits `rank` enthalten)
- Backend: Keine Änderungen nötig – `rank` ist bereits im Update-Endpunkt akzeptiert

## Goals / Non-Goals

**Goals:**
- Portionen-Anzeige verständlich machen (berechnetes Gewicht klar zeigen)
- Ranking per ▲/▼ Buttons editierbar machen (Mobile-optimiert)
- Quantity-Feld im Edit-Modus besser labeln

**Non-Goals:**
- Drag & Drop Sortierung (zu komplex für Mobile)
- Änderung der Backend-API oder Datenbank
- Neugestaltung der gesamten Zutaten-Detailseite

## Decisions

### 1. ▲/▼ Buttons statt Drag & Drop
**Rationale:** Mobile-First. Drag & Drop ist auf Touch-Geräten fehleranfällig. Einfache Buttons sind zugänglich und klar.

**Umsetzung:** Zwei Icon-Buttons (`arrow_upward`/`arrow_downward`) links neben dem Portionsnamen. Klick ruft `updatePortion` mit neuem `rank`-Wert auf. Swap-Logik: Tausche `rank` mit dem Nachbarn.

### 2. Anzeige vereinfachen auf `≈ {weight_g}g`
**Rationale:** Nutzer interessiert das Ergebnis (Gewicht), nicht die Rohdaten. `weight_g` wird vom Backend berechnet (Signal) und ist die relevante Info.

**Umsetzung:** Ersetze `({quantity}g, ~{weight_g}g Gewicht)` durch `≈ {weight_g}g`. Bei Basis-Portion "g" nichts anzeigen.

### 3. Optimistic Updates für Ranking
**Rationale:** Ranking-Änderungen sollen sich sofort anfühlen. Bei Fehler wird zurückgerollt via Query-Invalidierung.

## Risks / Trade-offs

- **[Concurrent edits]** → Kein Problem, da nur ein Admin gleichzeitig Portionen verwaltet
- **[Rank-Lücken]** → Akzeptabel. Nur relative Reihenfolge zählt, nicht absolute Werte
