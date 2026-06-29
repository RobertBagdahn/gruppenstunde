## Why

Der Kochplan und das Küchen-Dashboard sind aktuell als separate Seiten außerhalb des Tab-Systems der Essensplan-Detailseite realisiert. Das erfordert unnötige Navigation und Kontextwechsel. Nutzer müssen die Detailseite verlassen, um den Kochplan zu sehen. Durch Integration als Tab bleibt der Kontext erhalten und die Bedienung wird flüssiger.

## What Changes

- **NEU**: Tab "Kochplan" in `MealPlanDetailPage` nach dem Tab "Tabelle" eingefügt
- **INTEGRIERT**: Das Küchen-Dashboard (Timeline-Ansicht) wird direkt im Tab gerendert — kein externer Navigationsschritt mehr nötig
- **NEU**: Drucken-Button im Tab-Kopf (öffnet `CookingSchedulePrintPage` in neuem Tab)
- **ENTFERNT**: Route `/meal-plans/:id/cooking-schedule` — **BREAKING**
- **ENTFERNT**: Route `/meal-plans/:id/cooking-schedule/kitchen` — **BREAKING**
- **ENTFERNT**: ChefHat-"Kochplan"-Button im Header der Detailseite — **BREAKING**
- **ENTFERNT**: `CookingSchedulePage.tsx` (Tabellenansicht wird nicht in den Tab übernommen) — **BREAKING**
- **BEHALTEN**: Route `/meal-plans/:id/cooking-schedule/print` (unverändert)
- **BEHALTEN**: `CookingSchedulePrintPage.tsx` (unverändert)
- **EXTRAHIERT**: `CookingScheduleKitchenPage` wird zur Tab-Komponente `CookingScheduleTab` umgebaut (ohne BackButton, ohne eigenen Seiten-Header)

## Capabilities

### New Capabilities

Keine neuen Capabilities — reine UI-Restrukturierung.

### Modified Capabilities

Keine — API, Pydantic-Schemas, Zod-Schemas bleiben unverändert.

## Impact

**Frontend (frontend-food):**
- `frontend-food/src/App.tsx` — Routen entfernen: `/meal-plans/:id/cooking-schedule`, `/meal-plans/:id/cooking-schedule/kitchen`
- `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — Tab hinzufügen, ChefHat-Button entfernen, Tab-Content für Kochplan einbauen
- `frontend-food/src/pages/planning/CookingScheduleKitchenPage.tsx` — Umbau zu `CookingScheduleTab` (BackButton entfernen, Seiten-Header durch Tab-Header ersetzen, Print-Button einbauen)
- `frontend-food/src/pages/planning/CookingSchedulePage.tsx` — **LÖSCHEN** (wird nicht mehr gebraucht)

**Backend:**
- Keine Änderungen

**Sonstiges:**
- Keine Migrationen
- Keine neuen Abhängigkeiten
