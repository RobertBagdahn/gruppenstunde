## Why

Das Backend hat vier kritische Bugs, die Funktionalität und Test-Suite beeinträchtigen:

1. **ContentCollaborator-Import fehlt**: `content/models/__init__.py` exportiert das Model nicht, blockiert `test_permissions.py` (18 Tests) und den Collaborator-API-Router.
2. **Waitlist benachrichtigt niemanden**: `notify_next()` setzt `notified_at` aber sendet nie eine E-Mail – Benutzer erfahren nie von freien Plätzen.
3. **coverage_pct immer 0.0**: Der Budget-Coverage-Prozentsatz in `suggestion_service.py` ist hartkodiert, obwohl die Daten verfügbar sind.
4. **~30 fehlschlagende Tests**: Tests in recipe, supply, planner, event, profiles schlagen fehl aufgrund von API-Änderungen, Mapping-Verschiebungen und fehlenden Fixtures.

## What Changes

- **BREAKING (Fix)**: `ContentCollaborator` wird in `content/models/__init__.py` re-exportiert → unblockt API-Router + Test-File
- **FIX**: Collaborator-API-Router wird in `content/api/__init__.py` gemountet
- **FIX**: Waitlist-Mail-Notification wird implementiert (E-Mail an User bei freiem Platz)
- **FIX**: `coverage_pct` wird aus `cached_price_total` berechnet statt hartkodiert
- **FIX**: Fehlerhafte Tests werden repariert (Statuscodes, NOT-NULL-Constraints, Meal-Type-Mappings, Energy-Kcal-Werte, Retail-Section-Mappings)
- **FIX**: `mealEvents.ts` (Dead Code) wird entfernt
- **FIX**: Schema-Mismatches (`slug`-Felder in `frontend/`) werden synchronisiert

## Capabilities

### New Capabilities
- `waitlist-notification`: Automatische E-Mail-Benachrichtigung bei freiem Wartelisten-Platz

### Modified Capabilities
- `content-collaborator`: ContentCollaborator wird als fully supported feature aktiviert (war tot)
- `event-waitlist`: Waitlist erhält E-Mail-Notification (neues Requirement)
- `suggestion-service`: `coverage_pct` wird korrekt berechnet (war broken)
- `frontend-food-app`: mealEvents.ts wird entfernt (Dead Code Cleanup)
- `content-base`: Schemas werden mit Backend synchronisiert (slug-Felder)

## Impact

- **`backend/content/models/__init__.py`** — eine Zeile hinzufügen
- **`backend/content/api/__init__.py`** — Collaborator-Router mounten
- **`backend/event/services/waitlist.py`** — E-Mail-Versand implementieren
- **`backend/recipe/services/suggestion_service.py`** — coverage_pct-Berechnung
- **~10 Test-Dateien** in recipe, supply, planner, event, profiles — Assertions/Setup fixen
- **`frontend-food/src/api/mealEvents.ts`** — löschen
- **`frontend/src/schemas/content.ts`, `profile.ts`** — `slug`-Feld hinzufügen
