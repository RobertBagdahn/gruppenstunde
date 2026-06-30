## Context

`MealPlan.reserve_factor` (FloatField, Default 1.1; `backend/planner/models/meal_plan.py:80`) skaliert alle Mengen (`scaling_factor = norm_portions × reserve_factor`, `:176-181`). Im Shopping-Service (`backend/supply/services/shopping_service.py`) fließt die Reserve damit in `total_quantity_g` ein, wird aber nicht getrennt ausgewiesen. Das Frontend (`ShoppingView.tsx`) zeigt nur die Gesamtmenge.

Die bestehende Spec `shopping-list-reserve-transparency` beschreibt die gewünschte Aufschlüsselung, nimmt jedoch ein Feld `reserve_percent` an, das es nicht gibt — das real existierende Feld ist `reserve_factor` (1.0 = keine Reserve, 1.1 = 10 %).

Constraints: Keine Rückwärtskompatibilität nötig. Pydantic↔Zod synchron. Reserve-Anzeige standardmäßig aus (bisheriges Verhalten als Default).

## Goals / Non-Goals

**Goals:**
- Pro Einkaufslisten-Item Nettomenge (ohne Reserve) und Reserve-Anteil berechnen und ausliefern.
- Optionale Anzeige der Aufschlüsselung im Frontend.
- Bestehende Spec auf `reserve_factor` korrigieren.

**Non-Goals:**
- Keine Umstellung von `reserve_factor` auf `reserve_percent` (Feld bleibt wie es ist).
- Keine Änderung der Reserve-Berechnung selbst (nur Ausweisung).

## Decisions

### D1: Netto/Reserve aus `reserve_factor` ableiten
Pro Item: `net = total / reserve_factor`, `reserve = total − net`. Bei `reserve_factor = 1.0` ist `reserve = 0`, `net = total`.

- **Warum**: nutzt vorhandene Berechnung, keine Doppelpflege.

### D2: Felder im Item-Schema
Shopping-Item-Schema erhält `net_quantity_g` und `reserve_quantity_g` (analog für Stück, wo zutreffend). Frontend zeigt sie optional an.

### D3: Anzeige optional, Default aus
Anzeige der Aufschlüsselung ist ein UI-Toggle; Standard ist die reine Gesamtmenge (bisheriges Verhalten), gemäß bestehender Spec.

### D4: Spec auf `reserve_factor` aktualisieren (MODIFIED)
Die Anforderung „Reserve-Prozentsatz pro Essensplan konfigurierbar" wird auf `reserve_factor` umformuliert (1.0 = keine Reserve, 1.1 = 10 %), Standard 1.1.

### Betroffene Dateien
- Backend: `backend/supply/services/shopping_service.py` (Netto/Reserve pro Item), Shopping-Item-Pydantic-Schema.
- Frontend: `frontend-food/src/pages/planning/ShoppingView.tsx`, ggf. `pages/shopping/ShoppingListDetailPage.tsx`, `frontend-food/src/schemas/shoppingList.ts`.

### API-Änderungen
- Shopping-Item-Response um `net_quantity_g`/`reserve_quantity_g` erweitert. Keine neuen Endpoints.

## Risks / Trade-offs

- **Rundungsdifferenzen** zwischen Netto + Reserve und Gesamt → konsistente Rundung; Gesamt bleibt führend, Reserve = Gesamt − Netto.
- **Stück-/Verpackungsmengen** → Aufschlüsselung primär auf Gramm-Basis; Stückangaben optional analog.

## Migration Plan

1. Backend: Netto/Reserve berechnen + Schema, Tests.
2. Frontend: optionale Anzeige + Toggle, Zod-Sync.
3. Spec-Delta MODIFIED auf `reserve_factor`.
4. Keine DB-Migration. Rollback code-seitig.

## Open Questions

- Soll der Anzeige-Toggle pro Nutzer/pro Plan gemerkt werden (URL-State/Local)? Annahme: einfacher UI-Toggle, kein Persistenzzwang.
