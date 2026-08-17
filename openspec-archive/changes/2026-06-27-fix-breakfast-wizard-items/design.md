## Context

Der Frühstücks-Wizard speichert Zutaten-Items (Brot, Belag, Extras) ohne `measuring_unit_id`, weshalb das Backend die Gramm-Menge nicht in Energie/Kosten umrechnen kann. Zusätzlich zeigt die UI für Zutaten-Items nur den Faktor (immer 1,0) anstatt der tatsächlichen Portionsmenge, und Zutaten sind nicht verlinkt.

## Goals / Non-Goals

**Goals:**
- Zutaten-Items aus dem Frühstücks-Wizard haben `measuring_unit_id` → Energie/Kosten werden korrekt berechnet
- `MealItemOut` liefert `energy_kcal` auch für Zutaten-Items
- Zutaten-Namen in MealSlot sind klickbar und verlinken zur Zutaten-Detailseite
- Zutaten-Items zeigen Portionsmenge/Stückzahl statt Faktor

**Non-Goals:**
- Kein neues API-Format oder neuer Endpoint
- Kein Refactoring des Wizard-State oder der Datenstrukturen
- Keine Änderung an der Faktor-Logik für Rezept-Items
- Kein neues Feld im MealItem-Modell

## Decisions

### Decision 1: Measuring Unit ID für Wizard-Zutaten

Der Wizard berechnet alle Zutaten-Mengen in Gramm. Statt `measuring_unit_id: null` wird beim Erstellen der Items die ID der Einheit "G" (`g`) mitgesendet. Die ID wird nicht hardcoded, sondern aus dem Catalog (BreakfastCatalogResponse.units) oder per `get_object_or_404(MeasuringUnit, name__iexact="g")` aufgelöst.

**Alternativen**: 
- Hardcoded ID (verletzt DRY, bricht bei DB-Reset)
- Neues API-Feld `weight_g` (unnötig, da `measuring_unit_id=g` + quantity die Gramm-Menge bereits korrekt abbildet)

### Decision 2: `MealItemOut.energy_kcal` für Zutaten-Items

`MealItemOut.resolve_energy_kcal` wird erweitert, um auch für Zutaten-Items die Energie zu berechnen. Die gleiche Logik aus `MealOut.resolve_total_energy_kcal` wird in einem Shared-Helper ausgelagert, um Duplikation zu vermeiden.

**Alternativen**: 
- Inline-Logik direkt in `resolve_energy_kcal` (Duplikation mit `resolve_total_energy_kcal`)
- Cache-Feld auf MealItem (Overkill für eine einfache Berechnung)

### Decision 3: Portionsanzeige statt Faktor für Zutaten

Statt `FactorInput` (der `item.factor` anzeigt) wird für Zutaten-Items die tatsächliche Portionsmenge/Stückzahl aus `item.quantity` abgeleitet und als `× N` angezeigt (nicht editierbar über FactorInput). Der Faktor bleibt für Rezept-Items bestehen.

### Decision 4: Zutaten-Link

`MealSlot.tsx` erhält für Zutaten-Items einen `Link` zur Zutaten-Detailseite. Die URL folgt dem bestehenden Pattern: `/ingredients/{ingredient_id}` oder `/supply/ingredients/{ingredient_id}`. Das `ingredient_id`-Feld existiert bereits im Schema.

## Risks / Trade-offs

- [Risk] Grams measuring unit does not exist in DB → Mitigation: Fallback auf null falls keine "g"-Unit existiert; der Catalog liefert die Units vorab
- [Risk] Energieberechnung für Zutaten in MealItemOut dupliziert Logik → Mitigation: Shared Helper-Funktion in `planner/services/` oder direkt in Schemas
- [Risk] Portionsanzeige für Zutaten könnte bei verschiedenen Messeinheiten (Stück, ml, g) inkonsistent sein → Mitigation: Nur für `quantity`-basierte Items mit bekannten Einheiten
