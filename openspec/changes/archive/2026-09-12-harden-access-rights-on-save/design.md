## Context

Zugriffsrechte werden teils zentral (`content/services/food_access.py`) und teils ad-hoc pro App (`_can_edit_*`, `_require_*`) geprüft. Mehrere Save-Endpunkte haben nur `require_auth`/`is_authenticated` oder gar keinen Check. Ziel: Objekt-Level-Autorisierung auf jeden mutierenden Endpunkt bringen, ohne die bestehende Architektur zu brechen.

## Decisions

- **Zentral bleiben, ad-hoc nachziehen**: Wo die zentrale `food_access`-Policy existiert, wird sie genutzt. Event/Packinglist/Planner behalten ihre lokalen Helper, bekommen aber die fehlenden Ownership-/Rollen-Checks ergänzt.
- **403 vs 404**: Bei fehlender Leseberechtigung bleibt das bestehende Muster (404, keine Existenz preisgeben). Bei vorhandener Lese-, aber fehlender Schreibberechtigung wird 403 zurückgegeben.
- **`can_delete != can_edit`**: In `food_access.py` wird `can_delete` für Collaborator-`editor` auf False gesetzt; nur Owner/Collaborator-`admin`/Staff löschen.
- **Moderation**: `status` wird in den PATCH-Endpunkten von game/blog/session (und ggf. zentraler `content`-Update-Logik) aus dem editierbaren Feldset entfernt; `approved` bleibt staff-only (konsistent zu `recipe/api/recipes.py`).

## Approach

```
Endpunkt                                  Check (nach Fix)
───────────────────────────────────────── ──────────────────────────────
EventLocation update/delete               created_by == user OR staff
MeetingPoint update                       created_by == user OR group-admin
PackingList clone/export                  visibility==LINK_ONLY|TEMPLATE
                                          OR user_can_edit(user)
ContentLink create                        can_read(source) AND can_read(target)
Public food profile                       lists: only public/visible; plans: visibility filter
game/blog/session PATCH                   status staff-only
food_access.can_delete                    not for editor collaborators
planner.update group_id                   only owner/admin
waitlist.join                             invitation check + person.user==user
```

## Risks / Tradeoffs

- **Bestehende Nutzer-Flows**: Clone von geteilten Packlisten bleibt für berechtigte User möglich; nur unautorisierte Zugriffe brechen.
- **Content-Links**: Rückwärts-Inkompatibilität möglich, falls bestehende Frontend-Flows Links ohne `can_read` des Targets erzeugen — muss im Frontend geprüft werden.
- Kein neuer State/Schema-Zwang; Pydantic-Schemas unverändert (außer ggf. `can_delete`-Berechnung in Responses).
