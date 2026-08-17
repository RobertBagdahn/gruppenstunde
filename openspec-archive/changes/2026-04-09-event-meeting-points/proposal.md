## Why

Bei Pfadfinder-Veranstaltungen ist der Veranstaltungsort oft nicht der gleiche Ort, an dem sich Teilnehmer treffen oder abgeholt werden. Gruppenleiter brauchen die Möglichkeit, separate **Treffpunkte** (Start) und **Abholpunkte** (Ende) mit konkreten Adressen anzugeben. Diese Punkte sollen pro User und pro Gruppe wiederverwendbar sein, aber nicht öffentlich für andere einsehbar — im Gegensatz zu `EventLocation`, das aktuell keine Sichtbarkeitsbeschränkung hat.

## What Changes

- **Neues Model `MeetingPoint`**: Wiederverwendbare Adress-Einträge mit strukturierten Adressfeldern (Name, Straße, PLZ, Ort), die einem User oder einer Gruppe gehören. Nicht öffentlich einsehbar.
- **Neue Felder auf `Event`**: Optionale FK-Referenzen für `meeting_point` (Treffpunkt/Start) und `pickup_point` (Abholpunkt/Ende), jeweils mit optionaler Freitext-Notiz.
- **CRUD-API für MeetingPoints**: Endpoints zum Erstellen, Lesen, Bearbeiten und Löschen von Meeting Points, gefiltert nach Ownership (eigene + Gruppen-MeetingPoints).
- **Event-API erweitern**: Event-Create/Update-Schemas um `meeting_point_id` und `pickup_point_id` erweitern. Event-Detail-Response enthält die aufgelösten Adressen.
- **Frontend: MeetingPoint-Verwaltung**: UI zum Erstellen und Auswählen von Treff-/Abholpunkten bei Event-Erstellung und in den Event-Settings.
- **Frontend: Anzeige für Teilnehmer**: Treff- und Abholpunkt mit Adresse in der Event-Detailansicht anzeigen.

## Capabilities

### New Capabilities
- `event-meeting-points`: Wiederverwendbare Treff- und Abholpunkte für Events mit User-/Gruppen-Ownership und privater Sichtbarkeit.

### Modified Capabilities
- `event-management`: Event-Model erhält neue FK-Felder für `meeting_point` und `pickup_point`. Event-API-Schemas werden um diese Felder erweitert.

## Impact

- **Backend Django Apps**: `event` (neues Model, Migration, API-Endpoints, Schemas)
- **Models**: Neues `MeetingPoint` Model, erweiterte `Event` Model-Felder
- **Pydantic Schemas**: Neue `MeetingPointOut`, `MeetingPointCreateIn`, `MeetingPointUpdateIn`; erweiterte `EventCreateIn`, `EventUpdateIn`, `EventDetailOut`, `EventListOut`
- **Zod Schemas**: Frontend-Gegenstücke zu allen neuen/geänderten Pydantic Schemas
- **API-Endpoints**: Neuer Router `/api/meeting-points/` + erweiterte Event-Endpoints
- **Frontend-Seiten**: `NewEventPage`, `SettingsTab`, Event-Detailansicht (Member-View + Guest-View)
- **Migration**: Eine neue Migration für `MeetingPoint` Model + `Event`-Felder
