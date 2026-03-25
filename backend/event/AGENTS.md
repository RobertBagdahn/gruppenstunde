# AI Agent Configuration – Event Module

> Dieses AGENTS.md beschreibt das **Event-Modul** innerhalb des gruppenstunde Backends. Für projektweite Konventionen siehe `../../AGENTS.md`, für Backend-Konventionen siehe `../AGENTS.md`.

## Zweck

Vereinfachtes Event-/Anmeldesystem (inspiriert von `inspi/anmelde_tool`). Kein Scout-Organisations-Management, kein Freigabeprozess. Rechteverwaltung nur über `responsible_persons` (M2M → User) auf dem Event.

## Kernprozesse

### Event erstellen (Stepper – 4 Schritte)
1. **Grunddaten** (Schritt 1): Name, Beschreibung, Start-/Enddatum, Anmeldeschluss, Sichtbarkeit
2. **Veranstaltungsort** (Schritt 2): Bestehenden Ort auswählen oder neuen anlegen (EventLocation-Tabelle)
3. **Buchungsoptionen** (Schritt 3): Beliebig viele Buchungsoptionen anlegen (Name, Preis, Max. Teilnehmer)
4. **Einladungstext** (Schritt 4): Besonderheiten eingeben → KI generiert Einladungstext (Gemini)

Frontend: `/planning/events/new` → `NewEventPage.tsx`
Event wird mit allen Daten + inline Buchungsoptionen in einem POST erstellt.

### Personen verwalten
1. Jeder User kann Personen-Datensätze anlegen (Person-Model, z.B. Familienmitglieder)
2. Eine Person mit `is_owner=True` repräsentiert den User selbst
3. Felder: Name, Pfadfindername, Adresse, PLZ, E-Mail, Geburtstag, Geschlecht, Essgewohnheiten

### Anmeldung
1. User sieht Events, für die er eingeladen wurde (oder öffentliche Events)
2. User wählt Personen aus seinem Account + optionale Buchungsoption → registriert sich
3. Person-Daten werden in Participant geklont (Snapshot zum Anmeldezeitpunkt)
4. Registration verknüpft User ↔ Event, Participants hängen an der Registration

### Event-Detail-Ansicht (kontextabhängig)
- **Öffentlich** (nicht eingeloggt): Basis-Infos (Name, Datum, Ort, Beschreibung, Buchungsoptionen)
- **Eingeloggt + eingeladen**: + eigener Anmeldestatus + eigene Teilnehmer
- **Manager (responsible_person oder Staff)**: + vollständige Anmelde-Liste + Bezahlstatus bearbeiten

### Rechtemanagement
- `responsible_persons` auf Event = volle Verwaltungsrechte
- `is_staff` User = Admin, kann alles sehen und verwalten
- Gruppen-Einladung: Alle aktiven Mitglieder einer `UserGroup` werden automatisch eingeladen
- Nur Manager können Bezahlstatus (`is_paid`) ändern

## Datenmodell

### EventLocation (NEU)
- name, street, zip_code, city, state, country, description
- created_by (FK → User)
- Wiederverwendbare Orte für Events
- Eigene CRUD-API unter `/api/locations/`

### Event
- name, slug (auto-generated), description, location
- event_location (FK → EventLocation, nullable) – Strukturierter Veranstaltungsort
- invitation_text (TextField) – KI-generierter Einladungstext
- start_date, end_date, registration_deadline, registration_start
- is_public (bool)
- responsible_persons (M2M → User) – Verwaltungsrechte
- invited_users (M2M → User) – Sichtbarkeit/Registrierung
- invited_groups (M2M → UserGroup) – Gruppeneinladung
- created_by (FK → User)

### BookingOption
- name, description, price (Decimal), max_participants (0 = unbegrenzt)
- event (FK → Event)
- Properties: `current_participant_count`, `is_full`

### Person
- user (FK → User) – gehört zum Account
- scout_name, first_name, last_name, address, zip_code, email, birthday
- gender (GenderChoices), nutritional_tags (M2M → idea.NutritionalTag)
- is_owner (bool) – True wenn Person den User selbst repräsentiert

### Registration
- user (FK → User), event (FK → Event) – unique_together
- Verknüpft einen User mit einem Event

### Participant
- registration (FK → Registration)
- person (FK → Person, nullable) – Referenz zum Original
- booking_option (FK → BookingOption, nullable)
- Geklonte Felder: scout_name, first_name, last_name, address, zip_code, email, birthday, gender
- nutritional_tags (M2M → idea.NutritionalTag) – kopiert bei create_from_person()
- is_paid (bool) – nur von Managern editierbar
- Classmethod `create_from_person()` klont Person-Daten

## Choices

### GenderChoices
- male, female, diverse, no_answer

Choices sind über API-Endpunkte abrufbar (`/api/events/choices/gender/`). Ernährungstags (NutritionalTag) sind über `/api/ideas/nutritional-tags/` abrufbar.

## API-Endpunkte (unter `/api/`)

### Event Locations (`/locations/`)
| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/locations/` | Alle Orte auflisten | Optional |
| POST | `/locations/` | Neuen Ort anlegen | Required |
| GET | `/locations/{id}/` | Ort-Detail | Optional |
| PATCH | `/locations/{id}/` | Ort bearbeiten | Required |
| DELETE | `/locations/{id}/` | Ort löschen | Required |

### Events (`/events/`)
| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/events/` | Events auflisten (gefiltert nach Sichtbarkeit) | Optional |
| POST | `/events/` | Event erstellen | Required |
| GET | `/events/{slug}/` | Event-Detail (kontextabhängig) | Optional |
| PATCH | `/events/{slug}/` | Event aktualisieren | Manager |
| DELETE | `/events/{slug}/` | Event löschen | Manager |
| POST | `/events/{slug}/booking-options/` | Buchungsoption hinzufügen | Manager |
| PATCH | `/events/{slug}/booking-options/{id}/` | Buchungsoption bearbeiten | Manager |
| DELETE | `/events/{slug}/booking-options/{id}/` | Buchungsoption löschen | Manager |
| POST | `/events/{slug}/register/` | Anmelden (eigene Personen) | Invited |
| POST | `/events/{slug}/register-admin/` | Admin-Anmeldung (beliebige Personen) | Manager |
| DELETE | `/events/{slug}/participants/{id}/` | Teilnehmer entfernen | Owner/Manager |
| PATCH | `/events/{slug}/participants/{id}/` | Teilnehmer bearbeiten | Owner/Manager |
| GET | `/events/{slug}/participants/` | Teilnehmer-Liste | Manager |
| POST | `/events/{slug}/invite-group/` | Gruppe einladen | Manager |
| POST | `/events/generate-invitation/` | KI-Einladungstext generieren | Required |
| POST | `/events/{slug}/invite-users/` | User einladen | Manager |
| GET | `/events/choices/gender/` | Gender-Choices | Public |

### Personen (`/persons/`)
| Methode | Pfad | Beschreibung | Auth |
|---------|------|--------------|------|
| GET | `/persons/` | Eigene Personen auflisten (Admin: alle) | Required |
| POST | `/persons/` | Person anlegen | Required |
| GET | `/persons/{id}/` | Person abrufen | Owner/Admin |
| PATCH | `/persons/{id}/` | Person aktualisieren | Owner/Admin |
| DELETE | `/persons/{id}/` | Person löschen | Owner/Admin |

## Dateien

```
event/
  __init__.py
  apps.py           ← AppConfig
  choices.py        ← GenderChoices
  models.py         ← Event, BookingOption, Person, Registration, Participant
  schemas.py        ← Pydantic Schemas (Django Ninja)
  api.py            ← API Router (event_router, person_router)
  admin.py          ← Django Admin Config
  migrations/
  AGENTS.md         ← Diese Datei
```

## Error Handling

API-Endpunkte MÜSSEN aussagekräftige Fehlermeldungen mit passenden HTTP-Statuscodes zurückgeben. **Keine generischen 500 Internal Server Errors** an den Client durchreichen.

- **400 Bad Request** – Ungültige Eingabedaten (z. B. fehlende Pflichtfelder, ungültiges Format)
- **401 Unauthorized** – Nicht authentifiziert
- **403 Forbidden** – Keine Berechtigung (z. B. kein Manager, nicht eingeladen)
- **404 Not Found** – Ressource existiert nicht (Event, Person, Buchungsoption)
- **409 Conflict** – Konflikt (z. B. bereits registriert, Buchungsoption voll)
- **422 Unprocessable Entity** – Validierungsfehler (z. B. Anmeldeschluss überschritten)

Fehlerantworten immer als JSON mit `detail`-Feld:
```json
{"detail": "Anmeldeschluss für dieses Event ist bereits überschritten."}
```

Unerwartete Exceptions im Code abfangen und als 400/422 mit verständlicher Meldung zurückgeben – nicht als 500 an den Client weiterleiten. Logging der Original-Exception im Backend beibehalten.

## Qualitäts-Checkliste

- [ ] Pydantic Schemas (schemas.py) und Zod Schemas (Frontend) synchron halten
- [ ] Choices über API-Endpunkte bereitstellen (nicht hardcoded im Frontend)
- [ ] Person-Daten beim Klonen in Participant vollständig kopieren
- [ ] Rechteprüfung: Manager vs. Owner vs. Public in jedem Endpunkt
- [ ] Bezahlstatus (`is_paid`) nur durch Manager änderbar
- [ ] Kein 500er an den Client – alle erwartbaren Fehler mit passendem Statuscode und Meldung abfangen
