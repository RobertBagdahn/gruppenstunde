## Why

Beim Essensplan müssen Nutzer aktuell über einen Date-Picker ein Datum auswählen, um einen neuen Tag hinzuzufügen. Das ist umständlich, wenn man einfach den Plan um einen Tag vor oder nach den bestehenden Tagen erweitern möchte. Zwei dedizierte Buttons machen diese häufige Aktion schneller und intuitiver.

## What Changes

- Neuer Button "Tag davor hinzufügen" oberhalb der Tagesliste, der automatisch das Datum (erster Tag - 1) verwendet
- Neuer Button "Tag danach hinzufügen" unterhalb der Tagesliste, der automatisch das Datum (letzter Tag + 1) verwendet
- Beide Buttons nutzen den bestehenden `POST /api/meal-plans/{id}/days/` Endpunkt
- Buttons werden deaktiviert wenn kein Tag existiert (dann muss der Date-Picker genutzt werden)

## Capabilities

### New Capabilities

_Keine neuen Capabilities nötig — rein Frontend-UI-Erweiterung._

### Modified Capabilities

_Keine Spec-Änderungen — der bestehende API-Endpunkt wird unverändert genutzt._

## Impact

- **Frontend**: `frontend/src/pages/tools/MealPlanDetailPage.tsx` — zwei neue Buttons
- **Backend**: Keine Änderungen nötig
- **Schemas**: Keine Änderungen (bestehender `{ date: string }` Payload wird wiederverwendet)
- **Migrations**: Keine
