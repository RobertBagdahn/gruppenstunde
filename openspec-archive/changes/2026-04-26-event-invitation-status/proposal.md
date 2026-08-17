## Why

Events zeigen im Frontend aktuell zwei User-Zustände pro Event-Card: "Angemeldet" (grünes Badge) und "Anmeldung offen" (violettes Badge, wenn `phase=registration`). Ein dritter, wichtiger Zustand fehlt: **"Anmeldung steht aus"** — also "Du bist persönlich eingeladen, hast aber noch nicht reagiert."

Dieser Zustand ist für User hochrelevant: er signalisiert eine offene Handlungsaufforderung ("Antworte auf deine Einladung"), unterscheidet sich aber klar von einem beliebigen öffentlichen Event mit offener Anmeldung. Aktuell wird diese Unterscheidung nur indirekt über eine separate Sektion "Eingeladene Events" gemacht — auf der einzelnen Event-Card ist nicht erkennbar, ob ich eingeladen bin oder nicht.

## What Changes

- **Backend**: `GET /api/events/` ergänzt pro Event zusätzlich zum existierenden `is_registered`-Feld ein neues `is_invited`-Feld (True, wenn der User über `invited_users` oder `invited_groups` eingeladen ist)
- **Pydantic-Schema** `EventListOut` um `is_invited: bool` erweitern
- **Zod-Schema** (`frontend/src/schemas/event.ts`) entsprechend synchronisieren
- **Frontend**: `EventCard` bekommt dritten Badge-Zustand "Anmeldung steht aus" (z.B. amber, Icon `pending_actions`) — sichtbar wenn `is_invited=True AND is_registered=False AND phase in ['pre_registration', 'registration']`
- **Badge-Priorität**: Angemeldet > Anmeldung steht aus > Anmeldung offen (öffentlich, nicht eingeladen)
- Für anonyme User bleibt alles beim Alten (beide Felder False)

## Capabilities

### New Capabilities
(keine)

### Modified Capabilities
- `event-management`: Event-List-Response enthält neues `is_invited`-Feld; Event-Card-Darstellung bekommt dritten Status

## Impact

- **Backend**: `backend/event/api/events.py` — `list_events` setzt `is_invited` analog zu bestehender `is_registered`-Logik (Lookup in `invited_users` + `invited_groups`-M2M-Sets)
- **Pydantic**: `backend/event/schemas/events.py` (oder wo `EventListOut` liegt) — neues Feld
- **Zod**: `frontend/src/schemas/event.ts` — neues Feld im Event-List-Schema
- **Frontend**: `frontend/src/pages/EventsPage.tsx` — `EventCard`-Komponente (Zeilen 91-104 laut Exploration) erweitern
- **Tests**: Backend-Unit-Test für die neuen Kombinationen (eingeladen direkt, eingeladen via Gruppe, nicht eingeladen)
- **Keine Migrations** — `is_invited` ist ein abgeleitetes Response-Feld, kein DB-Feld
- **Keine Breaking Changes** — rein additives Feld
