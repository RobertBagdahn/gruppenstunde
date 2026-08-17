## Why

Der Event-Wizard erlaubt aktuell nur das Einladen einzelner Personen (aus "Meine Personen"). Gruppen (`UserGroup`) können im Wizard nicht ausgewählt werden, obwohl das Backend bereits M2M-Relationen (`Event.invited_groups`) und API-Endpunkte (`invite-group`) dafür besitzt. Der Info-Text im Wizard erwähnt sogar "Personen und Gruppen einladen", aber die Gruppen-Auswahl fehlt in der UI. Das führt zu einem inkonsistenten Nutzererlebnis — Gruppeneinladungen sind erst nach Event-Erstellung im Dashboard möglich.

## What Changes

- Gruppen-Auswahl im Wizard Step 2 ("Gruppe & Einladung") hinzufügen: Dropdown/Selector der eigenen Gruppen (`useMyGroups`) mit Mehrfachauswahl
- Wizard-Daten um `invited_group_ids: number[]` erweitern (Zod Schema + Zustand Store)
- `getCreatePayload()` um `invited_group_ids` erweitern
- Backend `EventCreateIn` Schema um `invited_group_ids` erweitern
- Backend `create_event` API: ausgewählte Gruppen zu `event.invited_groups` hinzufügen
- Zusammenfassungs-Step: eingeladene Gruppen anzeigen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — die Funktion nutzt bestehende Infrastruktur (UserGroup, invited_groups M2M, useMyGroups Hook)._

### Modified Capabilities

- `event-management`: Gruppen können jetzt direkt beim Event-Erstellen eingeladen werden (nicht nur nachträglich im Dashboard). `EventCreateIn` Schema erhält neues Feld `invited_group_ids`.

## Impact

- **Backend**: `event` App — `EventCreateIn` Pydantic Schema erweitern, `create_event` API anpassen. Keine neuen Migrationen nötig (M2M `invited_groups` existiert bereits).
- **Frontend**: `StepGroupInvitation.tsx` erweitern, `eventWizard.ts` Zod Schema anpassen, `eventWizardStore.ts` Store erweitern, `StepSummary.tsx` um Gruppenanzeige ergänzen.
- **Schemas**: Pydantic `EventCreateIn` + Zod `WizardStep2Schema` synchron erweitern.
