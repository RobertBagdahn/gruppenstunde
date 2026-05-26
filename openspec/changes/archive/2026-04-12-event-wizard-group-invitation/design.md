## Context

Der Event-Wizard (Step 2: "Gruppe & Einladung") erlaubt aktuell nur die Einladung einzelner Personen über `usePersons()`. Das Backend hat bereits eine M2M-Relation `Event.invited_groups` zu `profiles.UserGroup` und funktionale API-Endpunkte (`POST /api/events/{slug}/invite-group/`) für nachträgliche Gruppen-Einladungen. Die Gruppen-Auswahl fehlt nur im Wizard-Flow.

Betroffene Dateien:
- `frontend/src/components/events/wizard/StepGroupInvitation.tsx` — UI erweitern
- `frontend/src/schemas/eventWizard.ts` — `WizardStep2Schema` um `invited_group_ids` erweitern
- `frontend/src/store/eventWizardStore.ts` — Default-Daten + `getCreatePayload()`
- `frontend/src/components/events/wizard/StepSummary.tsx` — Gruppenanzeige
- `backend/event/schemas/core.py` — `EventCreateIn` um `invited_group_ids` erweitern
- `backend/event/api/events.py` — `create_event` Gruppen-Zuweisung
- `frontend/src/api/profile.ts` — bestehender `useMyGroups()` Hook wird genutzt

## Goals / Non-Goals

**Goals:**
- Nutzer kann beim Event-Erstellen eigene Gruppen einladen (Mehrfachauswahl)
- Gruppen-Einladung wird im Zusammenfassungs-Step angezeigt
- Backend verarbeitet `invited_group_ids` beim Erstellen

**Non-Goals:**
- Keine neue Gruppen-Suche (nur eigene Gruppen via `useMyGroups`)
- Kein Gruppen-Erstellen im Wizard
- Kein Ändern der nachträglichen Gruppen-Einladung im Dashboard (bleibt wie es ist)

## Decisions

### 1. `invited_group_ids` statt einzelnem `group_id`

Das bestehende `group_id` Feld im Schema ist ein einzelner Wert (nullable number). Für echte Gruppen-Einladung brauchen wir ein Array `invited_group_ids: number[]`. Das alte `group_id` Feld wird entfernt, da es nie in der UI genutzt wurde.

Alternative: `group_id` beibehalten und zusätzlich `invited_group_ids` einführen — abgelehnt, weil `group_id` nie verwendet wurde und Verwirrung stiftet.

### 2. Checkbox-Liste statt Dropdown

Gruppen werden als Checkbox-Liste angezeigt (gleicher Stil wie Personen-Liste), weil:
- Konsistenz mit der Personen-Auswahl darunter
- Mehrfachauswahl ist intuitiver als Multi-Select-Dropdown
- Typischerweise hat ein Nutzer nur 1-5 Gruppen

### 3. Gruppen vor Personen

Die UI-Reihenfolge wird: erst Gruppen-Auswahl, dann Personen-Einladung. Grund: Wenn eine Gruppe ausgewählt wird, sind alle Mitglieder automatisch eingeladen — die Person-Checkboxen sind dann zusätzliche Einzel-Einladungen.

## Risks / Trade-offs

- [Keine Gruppen vorhanden] → Sektion wird nicht angezeigt, Info-Text bleibt bestehen
- [Doppelte Einladung] → Kein Problem: Backend dedupliziert über `user_is_invited()` Methode, die sowohl `invited_users` als auch `invited_groups` prüft

**API-Änderung:**
- `POST /api/events/` — Request-Schema `EventCreateIn` erhält neues optionales Feld `invited_group_ids: list[int] = []`
- Keine neuen Endpunkte nötig

**Keine Migrationen nötig** — `Event.invited_groups` M2M existiert bereits.
