## Context

Events im System verwenden `BookingOption` (in `backend/event/models/core.py`) um verschiedene Buchungsvarianten mit unterschiedlichen Preisen und Teilnehmer-Limits anzubieten. Aktuell werden BookingOptions rein manuell vom Organisator erstellt. Wenn ein Organisator Teilnehmer kostenlos registrieren will, muss er entweder keine BookingOption waehlen ("Keine Option") oder eine manuelle 0-EUR-Option anlegen. Es fehlt eine standardisierte, immer verfuegbare Gratis-Option, die nur Organisatoren nutzen koennen.

**Betroffene Dateien:**
- `backend/event/models/core.py` — BookingOption Model (Zeile 174-204)
- `backend/event/api/events.py` — BookingOption CRUD + Event-Erstellung (Zeile 119-349)
- `backend/event/api/participants.py` — Registrierung + Admin-Registrierung (Zeile 26-93)
- `backend/event/schemas/core.py` — Pydantic Schemas (BookingOptionOut, BookingOptionCreateIn)
- `frontend/src/schemas/event.ts` — Zod BookingOptionSchema (Zeile 54-63)
- `frontend/src/pages/EventsPage.tsx` — RegisterForm, BookingOptionCard (Zeile 634-848)
- `frontend/src/components/events/dashboard/SettingsTab.tsx` — BookingOptionsSection (Zeile 149-293)

## Goals / Non-Goals

**Goals:**
- Jedes Event bekommt automatisch eine System-BookingOption "Kostenlos (Organisator)" mit Preis 0 EUR
- Diese Option ist nur fuer Organisatoren/Admins sichtbar und auswaehlbar
- System-Optionen sind gegen Loeschen und Bearbeiten geschuetzt
- Bestehende Events erhalten die System-Option per Data-Migration
- Organisatoren koennen auch abgelaufene/volle regulaere Buchungsoptionen manuell zuweisen

**Non-Goals:**
- Kein generisches "System-Buchungsoptionen"-Framework (nur die eine kostenlose Option)
- Keine Aenderung an der Preis-/Zahlungslogik (0 EUR = is_paid bleibt True)
- Kein neuer Berechtigungslevel — bestehende `is_event_manager` Pruefung wird wiederverwendet
- Keine UI-Aenderung am Registrierungs-Flow fuer normale Teilnehmer (sie sehen die Option einfach nicht)

## Decisions

### 1. Neues `is_system` Feld auf BookingOption

**Entscheidung:** Ein `BooleanField(default=False)` auf `BookingOption` markiert die automatisch erstellte Option.

**Alternativen:**
- *Eigenes Model `SystemBookingOption`*: Zu komplex, wuerde alle FK-Beziehungen und Queries verdoppeln.
- *Konvention ueber Namen (z.B. `__system__` Prefix)*: Fragil, koennte von Nutzern nachgeahmt werden.

**Rationale:** Ein einfaches Boolean-Flag ist minimal-invasiv, laesst sich leicht in Queries filtern und schuetzt ueber Backend-Validierung.

### 2. Automatische Erstellung beim Event-Create

**Entscheidung:** In der Event-Erstellungs-API (`POST /api/events/`) und im `Event.save()` Signal/Override wird automatisch eine System-BookingOption angelegt, falls noch keine existiert.

**Alternativen:**
- *post_save Signal*: Funktioniert, aber Signal-Ketten sind schwer zu debuggen.
- *Nur in der API*: Wuerde die Django-Admin-Erstellung nicht abdecken.

**Rationale:** `post_save`-Signal auf Event, das prueft ob eine System-BookingOption existiert und sie ggf. anlegt. So wird sie bei jeder Art der Event-Erstellung angelegt (API, Admin, Management-Command).

### 3. API-Filterung statt Frontend-Filterung

**Entscheidung:** Die API filtert `is_system`-Optionen fuer nicht-privilegierte Nutzer heraus. Die Event-Detail-Response enthaelt `is_system` im Schema, aber die oeffentliche BookingOption-Liste filtert sie bei der Registrierung aus.

**Alternativen:**
- *Nur Frontend-Filterung*: Unsicher, System-Option waere in der API-Response sichtbar.

**Rationale:** Sicherheit gehoert ins Backend. Das Frontend nutzt `is_system` nur zur UI-Anpassung (Badge, Loeschen deaktiviert).

### 4. Organisator kann auch abgelaufene BookingOptions zuweisen

**Entscheidung:** Der Organisator-Registrierungs-Endpunkt (`POST /api/events/{slug}/admin-register/` und `PATCH /api/events/{slug}/participants/{id}/`) prueft `is_full` nicht fuer Organisatoren.

**Rationale:** Organisatoren muessen flexibel Teilnehmer zuweisen koennen, auch wenn eine Option eigentlich voll ist. Die `is_full`-Pruefung bleibt nur fuer Self-Service-Registrierung.

## Risks / Trade-offs

- **[Doppelte System-Option]** → Mitigation: Unique-Constraint auf `(event, is_system=True)` via `UniqueConstraint` mit `condition=Q(is_system=True)`. Zusaetzlich Guard in post_save.
- **[Bestehende Events ohne System-Option]** → Mitigation: Data-Migration erstellt System-Option fuer alle existierenden Events.
- **[is_system Flag manipulierbar via API]** → Mitigation: `is_system` wird in `BookingOptionCreateIn` und `BookingOptionUpdateIn` nicht exponiert. Nur das Backend setzt es.
- **[Name "Kostenlos (Organisator)" nicht aenderbar]** → Akzeptierter Trade-off. System-Optionen sind fix benannt, um Konsistenz zu wahren.

## Migration Plan

1. **Schema-Migration**: `is_system = BooleanField(default=False)` + `UniqueConstraint`
2. **Data-Migration**: Fuer jedes Event ohne `is_system=True` BookingOption eine anlegen
3. **Rollback**: Feld und Constraint entfernen, Data-Migration ist nicht reversibel aber harmlos (leere BookingOptions mit 0 EUR Preis)
4. **Deployment-Reihenfolge**: Backend zuerst deployen (neue API-Felder), dann Frontend (das die neuen Felder nutzt). Altes Frontend ignoriert `is_system` einfach.

## API-Aenderungen

| Endpunkt | Aenderung |
|----------|-----------|
| `GET /api/events/{slug}/` | `booking_options` enthaelt `is_system` Feld |
| `GET /api/events/{slug}/` (nicht-Manager) | System-Optionen aus `booking_options` gefiltert |
| `POST /api/events/` | Erstellt automatisch System-BookingOption |
| `POST /{slug}/booking-options/` | Lehnt `is_system=True` ab (400) |
| `PATCH /{slug}/booking-options/{id}/` | System-Optionen nicht editierbar (403) |
| `DELETE /{slug}/booking-options/{id}/` | System-Optionen nicht loeschbar (403) |
| `POST /{slug}/register/` | System-Optionen fuer Self-Service nicht waehlbar (400) |
| `POST /{slug}/admin-register/` | System-Optionen + volle Optionen waehlbar |
| `PATCH /{slug}/participants/{id}/` | Manager koennen auf System-Option wechseln |

## Open Questions

Keine offenen Fragen — die Anforderungen sind klar definiert.
