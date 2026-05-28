## Bug Fix: Refurbish content_type passthrough

Kein neues Capability — bestehende Anforderung war bereits korrekt spezifiziert, aber nicht korrekt implementiert im Frontend.

### Bestehende Anforderung (Backend erfüllt bereits)

- `POST /api/content/ai/refurbish/` akzeptiert `content_type` im Body
- Bei `content_type: "recipe"` werden `suggested_ingredients` mit DB-Matching zurückgegeben
- Frontend muss `content_type` bei Rezept-Erstellung mitgeben

### Fix

Frontend sendet `content_type: "recipe"` wenn der ContentStepper aus der CreateRecipePage aufgerufen wird.
