## Why

Mehrere Save-Endpunkte (create/update/delete/clone) prüfen keine Objekt-Rechte: Jeder eingeloggte User kann fremde Veranstaltungsorte ändern/löschen, private Packlisten klonen oder anonym exportieren, beliebige Inhalte verlinken und private Daten über öffentliche Profile abrufen. Zusätzlich können Rollen (Collaborator-Editor, Gruppen-Member, Autor) ihre Rechte eskalieren. Das ist ein akutes Daten- und Integritätsrisiko.

## What Changes

- **EventLocation** update/delete auf Eigentümer bzw. Staff beschränken (`event/api/locations.py`).
- **MeetingPoint** update auf Ersteller/Gruppen-Admin beschränken (Delete ist bereits korrekt).
- **PackingList** clone + text-export gegen `visibility` und `user_can_edit` absichern (kein anonymer Export privater Listen).
- **Content-Links** create nur erlauben, wenn der User beide Enden (`source`/`target`) lesen darf.
- **Öffentliches Food-Profil** filtert private Einkaufslisten und Essenspläne (`visibility`/Status).
- **Content-Moderation** (`game`/`blog`/`session`): `status` ist staff-only; Autoren können sich nicht selbst auf `approved` setzen.
- **Collaborator-Editor** kann geteilte Food-Inhalte nicht mehr löschen (`can_delete != can_edit`).
- **Planner**-Kollaborator (editor) kann `group_id` nicht mehr ändern.
- **Waitlist**: Beitritt an Einladung koppeln, `person_id` auf eigene Person prüfen.

## Capabilities

### New Capabilities
- `content-link-permissions`: Autorisierung für das Erstellen von Content-Links (beide Enden müssen lesbar sein, kein Titel-Orakel für private Inhalte).

### Modified Capabilities
- `food-access-policy`: `can_delete` darf für Collaborator-Editoren nicht aus `can_edit` abgeleitet werden.
- `event-meeting-points`: Update-Autorisierung (nur Ersteller/Admin, nicht jeder Gruppen-Member).
- `packing-list`: Klonen und Text-Export respektieren `visibility`/`user_can_edit`.
- `public-user-profile`: Private Listen/Pläne dürfen nicht im öffentlichen Profil erscheinen.
- `content-base`: `status`-Übergang auf `approved` ist staff-only.

## Impact

- Backend: `event/api/locations.py`, `event/api/meeting_points.py`, `event/api/waitlist.py`, `packinglist/api.py`, `content/api/content_links.py`, `content/services/food_access.py`, `content/api/base` (game/blog/session PATCH), `planner/api/planner.py`, `profiles/api/profile.py`.
- Tests: neue Negativ-Tests für jeden abgesicherten Endpunkt.
- Keine Migration nötig (reine Autorisierungslogik); `content-link` ggf. Prüf-Helper im Service.
