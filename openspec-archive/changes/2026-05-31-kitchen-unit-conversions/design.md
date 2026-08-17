## Context

Das Supply-System hat bereits MeasuringUnit, UnitConversion und Portion Models. 13 generische Umrechnungen sind geseeded (EL→ml, TL→g, Tasse→ml etc.). UnitConversion unterstützt bereits zutat-spezifische Faktoren (`ingredient` FK, nullable). Der Conversion-API-Endpunkt (`GET /api/unit-conversions/convert/`) existiert und bevorzugt zutat-spezifische Umrechnungen.

Was fehlt: Zutat-spezifische Dichten für gängige Zutaten, fehlende MeasuringUnits (Handvoll, Tropfen), und ein Frontend-Umschalter der Mengen in alternativen Einheiten anzeigt.

## Goals / Non-Goals

**Goals:**
- Fehlende Küchenmaßeinheiten als MeasuringUnits seeden
- Zutat-spezifische Umrechnungsfaktoren für ~30 gängige Zutaten seeden
- API-Endpunkt der alle verfügbaren Umrechnungen für eine Zutat zurückgibt
- Frontend-Komponente die pro Zutat im Rezept zwischen Einheiten umschalten kann

**Non-Goals:**
- Keine Umrechnung für nicht-konvertierbare Einheiten (Scheibe, Stück, Bund, Zehe)
- Keine Bearbeitung von UnitConversions durch normale Nutzer (nur Admin/Seed)
- Keine Persistierung der gewählten Einheit pro Nutzer
- Kein Umschalten der Einheiten beim Editieren — nur in der Ansicht

## Decisions

### 1. Neue MeasuringUnits als Data-Migration

Fehlende Einheiten (Handvoll, Tropfen) werden per Data-Migration angelegt, nicht über Admin-UI. So sind sie reproduzierbar und auf allen Umgebungen verfügbar.

**Alternative**: Fixture-Dateien → abgelehnt, weil bestehende Seed-Daten bereits als Migrations angelegt sind (Konsistenz).

### 2. Zutat-spezifische Dichten über bestehendes UnitConversion Model

Das UnitConversion Model hat bereits ein optionales `ingredient` FK. Zutat-spezifische Dichten (z.B. "1 Tasse Reis = 185g") werden als UnitConversion mit gesetztem `ingredient` geseeded.

**Alternative**: Neues Density-Model → abgelehnt, weil UnitConversion das bereits abdeckt.

### 3. Neuer API-Endpunkt: `GET /api/unit-conversions/available/`

Gibt alle möglichen Umrechnungen für eine Zutat+Quell-Einheit zurück. Response enthält pro Ziel-Einheit: Name, umgerechnete Menge, ob zutat-spezifisch.

```
GET /api/unit-conversions/available/?ingredient_id=42&from_unit_id=1&quantity=200

Response:
{
  "conversions": [
    { "to_unit_id": 3, "to_unit_name": "Tasse", "quantity": 1.08, "is_ingredient_specific": true },
    { "to_unit_id": 5, "to_unit_name": "EL", "quantity": 13.3, "is_ingredient_specific": false },
    { "to_unit_id": 2, "to_unit_name": "ml", "quantity": 240.0, "is_ingredient_specific": true }
  ]
}
```

**Alternative**: Alles im Frontend berechnen → abgelehnt, weil die Konvertierungslogik (spezifisch > generisch Fallback, Ketten-Konvertierung g→ml→Tasse) im Backend bleiben soll.

### 4. Frontend: Einheiten-Umschalter als Dropdown/Popover pro Zutat

Auf der RecipeDetailPage bekommt jede Zutat einen kleinen Umschalter-Button neben der Einheit. Klick öffnet ein Popover mit allen verfügbaren Umrechnungen. Auswahl ändert die Anzeige client-seitig (kein API-Call pro Klick — die verfügbaren Umrechnungen werden einmalig geladen).

**Betroffene Dateien:**
- `frontend-food/src/pages/recipes/RecipeDetailPage.tsx` — Integration des Umschalters
- `frontend-food/src/components/recipe/UnitSwitcher.tsx` — Neue Komponente
- `frontend-food/src/hooks/useUnitConversions.ts` — Neuer TanStack Query Hook
- `frontend-food/src/schemas/supply.ts` — Neues Zod-Schema

### 5. Konvertierbare vs. nicht-konvertierbare Einheiten

Nur Einheiten mit `unit` Typ `"g"` oder `"ml"` (MeasuringUnitType) sind konvertierbar. Einheiten ohne physikalische Basis (Scheibe, Stück, Bund) bieten keinen Umschalter an. Die API gibt für solche Einheiten einfach eine leere `conversions` Liste zurück.

## Risks / Trade-offs

- **[Ungenauigkeit]** Pauschale Dichte-Werte (z.B. 1 Tasse Zucker = 200g) variieren je nach Kristallgröße. → Mitigation: In der UI "(ca.)" anzeigen bei generischen Umrechnungen.
- **[Seed-Daten-Pflege]** ~30 Zutaten × ~5 Einheiten = ~150 UnitConversion Einträge. → Mitigation: Gut strukturierte Migration, später Admin-UI für Ergänzungen.
- **[Performance]** Ein API-Call pro Zutat für verfügbare Umrechnungen wäre zu viel. → Mitigation: Batch-Endpunkt der alle Umrechnungen für alle Zutaten eines Rezepts auf einmal liefert.

## Migration Plan

1. Data-Migration: Neue MeasuringUnits anlegen
2. Data-Migration: Zutat-spezifische UnitConversions seeden (abhängig von existierenden Ingredient-Einträgen)
3. API-Endpunkt deployen
4. Frontend-Komponente deployen

Rollback: Migrations rückgängig machen löscht nur Seed-Daten, keine Schema-Änderungen.
