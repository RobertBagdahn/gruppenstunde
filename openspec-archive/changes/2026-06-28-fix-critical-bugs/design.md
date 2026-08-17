## Context

Das Backend hat vier unabhängige, nicht miteinander verbundene Bugs:

**Bug A — ContentCollaborator tot:** Migration 0008 hat die DB-Tabelle gelöscht. Das Model existiert als Code, aber:
- `content/models/__init__.py` exportiert es nicht (ImportError beim Import)
- Der API-Router in `content/api/collaborators.py` wird nirgendwo gemountet
- `content/tests/test_permissions.py` (18 Tests) ist komplett blockiert
- Keine Admin-Registrierung
- Die DB-Tabelle existiert nicht (von Migration 0008 gelöscht, nie neu erstellt)

**Bug B — Waitlist-Notification fehlt:** `WaitlistService.notify_next()` setzt `notified_at` aber sendet keine E-Mail. Benutzer sehen nie, dass ein Platz frei ist. Die 48h-Expiration läuft trotzdem.

**Bug C — coverage_pct hardcoded:** `suggestion_service.py` iteriert alle MealItems und prüft `cached_price_total`, aber zählt nicht mit — `coverage_pct` bleibt 0.0. Das Feld wird aktuell im Frontend nicht gerendert, ist aber im Zod-Schema vorhanden.

**Bug D — ~30 fehlschlagende Tests:** API-Änderungen, Mapping-Verschiebungen, kaputte Fixtures über recipe, supply, planner, event, profiles.

## Goals / Non-Goals

**Goals:**
- ContentCollaborator wieder funktionsfähig machen (Import, API, Tabelle, Admin, Tests)
- Waitlist versendet E-Mail-Benachrichtigung bei freiem Platz
- `coverage_pct` korrekt aus cached_price_total berechnen
- Alle fehlschlagenden Tests reparieren
- Dead Code (mealEvents.ts) entfernen
- Frontend-Schemas mit Backend synchronisieren

**Non-Goals:**
- Keine neuen Features über die Bug-Fixes hinaus
- Kein Frontend-Redesign für waitlist oder coverage_pct
- Keine generelle Test-Suite-Überholung (nur die fehlschlagenden reparieren)
- Kein Refactoring des ContentCollaborator-Modells

## Decisions

### D1: ContentCollaborator — neue Migration statt Squash

Der einfachste Weg: eine neue Migration (`0009`) erstellt die Tabelle neu. Die bestehenden Migrationen 0006 (create) und 0008 (delete) bleiben unverändert. Kein Squash nötig.

### D2: ContentCollaborator-API — Router in `content/api/__init__.py` mounten

```python
from .collaborators import router as collaborators_router
# ...
content_router.add_router("/collaborators", collaborators_router)
```

### D3: Waitlist — `send_mail` direkt nutzen statt MailService

MailService arbeitet mit `Participant`-Objekten, nicht mit `User`. Eine `send_to_user()`-Methode wäre Overkill. Stattdessen: Django's `send_mail` wird direkt in `WaitlistService.notify_next()` aufgerufen. Die E-Mail enthält Event-Name, Buchungsoption und Link zur Registrierung.

### D4: coverage_pct — einfaches Counting im bestehenden Loop

Der Loop in `_check_budget()` hat bereits Zugriff auf `recipe.cached_price_total`. Zusätzlich:
```python
total_items += 1
if recipe.cached_price_total:
    items_with_price += 1
```
Nach dem Loop: `coverage_pct = (items_with_price / total_items * 100) if total_items > 0 else 100.0`

### D5: mealEvents.ts — einfach löschen

0 Imports im gesamten Codebase. Nach Löschung prüfen ob `tsc` noch sauber läuft.

## Risks / Trade-offs

- **[Bug A] Neue Migration 0009**: Muss vor bestehenden Datenbanken laufen — idempotent via `CreateModel`
- **[Bug B] Direktes send_mail**: Kein Template-System, kein Queueing — für MVP akzeptabel, da waitlist ohnehin Low-Volume ist
- **[Bug D] Test-Reparaturen**: Einige Tests testen möglicherweise veraltetes Verhalten. Entscheidung pro Test: Fix (API geändert) oder Remove (Feature entfernt?)
