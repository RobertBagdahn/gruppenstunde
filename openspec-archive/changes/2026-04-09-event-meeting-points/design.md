## Context

Events (`Event` Model) haben aktuell ein `event_location` FK-Feld auf `EventLocation` -- das ist der Veranstaltungsort selbst. Es gibt aber kein Konzept für **Treffpunkte** (wo sich Teilnehmer vor der Veranstaltung treffen) oder **Abholpunkte** (wo Teilnehmer am Ende abgeholt werden).

`EventLocation` hat keine Sichtbarkeitsbeschränkung -- alle Locations sind für alle User sichtbar. Es hat ein `created_by` FK-Feld, aber kein Gruppen-Ownership.

Pfadfinder-Gruppenleiter verwenden oft wiederkehrende Treffpunkte (z.B. "Parkplatz am Gemeindehaus", "Bushaltestelle Marktplatz") die sie pro Veranstaltung auswählen möchten.

**Betroffene Dateien:**
- `backend/event/models/core.py` -- Neues `MeetingPoint` Model, `Event`-Erweiterung
- `backend/event/schemas/core.py` -- Neue Pydantic Schemas, erweiterte Event-Schemas
- `backend/event/api/meeting_points.py` -- Neuer CRUD-Router
- `backend/event/api/events.py` -- Event-Endpoints erweitern
- `backend/inspi/urls.py` -- Router registrieren
- `frontend/src/schemas/event.ts` -- Zod Schemas
- `frontend/src/api/events.ts` -- TanStack Query Hooks
- `frontend/src/pages/NewEventPage.tsx` -- Event-Erstellung
- `frontend/src/components/events/dashboard/SettingsTab.tsx` -- Event-Settings

## Goals / Non-Goals

**Goals:**
- Wiederverwendbare Adress-Einträge (MeetingPoints) für Treff- und Abholpunkte
- Sichtbarkeit auf eigene MeetingPoints + MeetingPoints der eigenen Gruppen beschränkt
- MeetingPoints pro Event als `meeting_point` (Start/Treffpunkt) und `pickup_point` (Ende/Abholpunkt) zuweisbar
- Inline-Erstellung neuer MeetingPoints beim Event-Setup
- Teilnehmer sehen Treff-/Abholpunkt-Adressen in der Event-Detailansicht

**Non-Goals:**
- Karten-Integration oder Geocoding
- Öffentliche MeetingPoint-Suche oder -Katalog
- MeetingPoints für andere Zwecke als Events (z.B. Gruppenstunden)
- Routing oder Wegbeschreibungen
- MeetingPoint-Sharing zwischen Usern (nur innerhalb Gruppen)

## Decisions

### 1. Eigenes Model `MeetingPoint` statt Erweiterung von `EventLocation`

**Entscheidung:** Neues `MeetingPoint` Model in der `event` App.

**Alternativen:**
- *`EventLocation` erweitern mit Visibility-Feldern*: Würde bestehendes Verhalten breaken (Locations sind aktuell alle öffentlich). Semantisch sind Locations (Veranstaltungsorte) und MeetingPoints (Treff-/Abholpunkte) unterschiedliche Konzepte.
- *Generisches `Address` Model*: Over-Engineering für den aktuellen Use Case.

**Begründung:** Klare Trennung der Konzepte. `EventLocation` = wo die Veranstaltung stattfindet (öffentlich). `MeetingPoint` = wo man sich trifft/abgeholt wird (privat, pro User/Gruppe).

### 2. Ownership: User ODER Gruppe (nicht beides)

**Entscheidung:** `MeetingPoint` hat `created_by` (User FK, required) und `group` (UserGroup FK, optional). Wenn `group` gesetzt ist, ist der Punkt für alle Gruppenmitglieder sichtbar. Sonst nur für den Ersteller.

**Begründung:** Einfachstes Modell, das beide Use Cases abdeckt. Kein M2M nötig.

### 3. Zwei separate FK-Felder auf Event

**Entscheidung:** `Event` bekommt `meeting_point` FK und `pickup_point` FK, beide nullable und optional.

**Alternativen:**
- *M2M mit Rolle (start/end)*: Unnötige Komplexität für genau zwei Punkte.
- *JSON-Feld*: Verliert Referentielle Integrität und Wiederverwendbarkeit.

**Begründung:** Einfach, klar, und die FK-Beziehung erlaubt einfache Wiederverwendung.

### 4. API unter `/api/meeting-points/`

**Entscheidung:** Eigener Router mit Pagination, gefiltert nach sichtbaren MeetingPoints.

**API-Endpoints:**
| Methode | Pfad | Request | Response |
|---------|------|---------|----------|
| GET | `/api/meeting-points/` | `?page=1&page_size=20` | `PaginatedMeetingPointOut` |
| POST | `/api/meeting-points/` | `MeetingPointCreateIn` | `MeetingPointOut` |
| GET | `/api/meeting-points/{id}/` | - | `MeetingPointOut` |
| PATCH | `/api/meeting-points/{id}/` | `MeetingPointUpdateIn` | `MeetingPointOut` |
| DELETE | `/api/meeting-points/{id}/` | - | `{success, message}` |

**Event-API Erweiterungen:**
- `EventCreateIn`: + `meeting_point_id: int | None`, `pickup_point_id: int | None`
- `EventUpdateIn`: + `meeting_point_id: int | None`, `pickup_point_id: int | None`
- `EventDetailOut`: + `meeting_point: MeetingPointOut | None`, `pickup_point: MeetingPointOut | None`
- `EventListOut`: + `meeting_point: MeetingPointOut | None`, `pickup_point: MeetingPointOut | None`

**Datenbank-Migration:**
- Neue Tabelle `event_meetingpoint` (name, street, zip_code, city, description, created_by FK, group FK, timestamps)
- Neue Felder auf `event_event`: `meeting_point_id` FK (nullable), `pickup_point_id` FK (nullable)
- Eine Migration-Datei

## Risks / Trade-offs

- **[Verwaiste MeetingPoints]** → MeetingPoints werden nicht automatisch gelöscht wenn sie von keinem Event mehr referenziert werden. Akzeptabel, da sie wiederverwendbar sein sollen. `on_delete=SET_NULL` auf den Event-FKs verhindert Kaskaden-Löschung.
- **[Gruppen-Sichtbarkeit Performance]** → Query für "meine MeetingPoints + MeetingPoints meiner Gruppen" erfordert Gruppen-Membership-Lookup. Bei wenigen Gruppen pro User (typisch <5 bei Pfadfindern) ist das kein Problem. → Einfacher Q-Filter reicht, kein Caching nötig.
- **[MeetingPoint kann gelöscht werden während Events darauf verweisen]** → `on_delete=SET_NULL` stellt sicher, dass Events nicht kaputt gehen. UI zeigt dann keinen Treffpunkt mehr an.
