## Why

Nach dem Ändern der Normportionen in einem Essensplan meldet das Food-Frontend `Body is disturbed or locked`, obwohl die Backend-Anfrage erfolgreich sein kann. Zusätzlich können eventgebundene Pläne die gewünschte feste Teilnehmerzahl nicht manuell beibehalten, weil Gruppenänderungen die Normportionen automatisch neu berechnen.

## What Changes

- Behebt das doppelte Lesen erfolgreicher PATCH-Response-Bodies im Food-Frontend.
- Führt für eventgebundene Essenspläne eine dauerhafte manuelle Normportionen-Überschreibung mit ganzen Personen ein.
- Zeigt für eventgebundene Pläne einen Umschalter zwischen manuellen Normportionen und automatischer Gruppenberechnung.
- Bewahrt den manuellen Wert bei Änderungen am Aktivitätsfaktor und bei der Synchronisierung von Event-Teilnehmern.
- Ermöglicht das Zurücksetzen auf automatische Berechnung.
- Synchronisiert Backend-Pydantic-Schemas und Food-Frontend-Zod-Schemas sowie die zugehörigen Tests.

## Capabilities

### New Capabilities

- `manual-norm-portions-override`: Manuelle, dauerhafte Normportionen für eventgebundene Essenspläne.

### Modified Capabilities

- `meal-plan`: Automatische Normportionen- und Aktivitätsfaktor-Berechnung muss einen aktivierten manuellen Override respektieren.

## Impact

- Backend: `planner`-MealPlan-Modell, Migration, Meal-Plan-API, GroupMember- und Event-Synchronisierungslogik, Pydantic-Schemas und Tests.
- Food-Frontend: `mealPlans`-API-Hook, Meal-Plan-Zod-Schemas, `SettingsPanel`, Detailseite und UI-/API-Tests.
- Persistierte Daten: Neues Feld zur Kennzeichnung des manuellen Normportionen-Overrides; bestehende Pläne bleiben standardmäßig automatisch berechnet.
