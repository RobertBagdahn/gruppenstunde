## 1. Backend: Seed-Daten

- [x] 1.1 Data-Migration: Fehlende MeasuringUnits anlegen (Handvoll, Tropfen)
- [x] 1.2 Data-Migration: Zutat-spezifische UnitConversions seeden (~30 Zutaten mit Dichte-Werten für Tasse, EL, TL)

## 2. Backend: API-Endpunkt

- [x] 2.1 Pydantic-Schema für Available-Conversions Response erstellen (`AvailableConversionOut`, `AvailableConversionBatchOut`)
- [x] 2.2 API-Endpunkt `GET /api/unit-conversions/available/` implementieren (einzelne Zutat)
- [x] 2.3 API-Endpunkt `GET /api/unit-conversions/available/batch/` implementieren (mehrere Zutaten)
- [x] 2.4 Backend manuell testen: API mit existierenden Zutaten aufrufen

## 3. Frontend: Schemas & Hooks

- [x] 3.1 Zod-Schema für Available-Conversions Response erstellen (1:1 Match mit Pydantic)
- [x] 3.2 TanStack Query Hook `useAvailableConversions` erstellen (Batch-Endpunkt, pro Rezept)

## 4. Frontend: UnitSwitcher Komponente

- [x] 4.1 `UnitSwitcher` Komponente erstellen (Popover mit Einheiten-Liste, "(ca.)" Hinweis)
- [x] 4.2 `UnitSwitcher` in RecipeDetailPage integrieren (pro Zutat neben der Einheit)
- [x] 4.3 Mobile-Darstellung testen (320px Minimum)
