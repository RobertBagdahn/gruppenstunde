# ingredient-statistics Delta Spec

## MODIFIED Requirements

### Requirement: Statistik-Seite ist unter /ingredients/statistics/:tab erreichbar

Das Food-Frontend SHALL eine Unterseite `/ingredients/statistics/:tab` bereitstellen, die interaktive Zutaten-Statistiken mit 19 kuratierten Tabs (reduziert von 20) anzeigt. Tabs, deren Backend-API-Endpoints noch nicht implementiert sind, SHALL einen Platzhalter-Zustand („Demnächst verfügbar") anzeigen und den Build nicht blockieren.

#### Scenario: Navigation von der Zutaten-Übersicht
- **WHEN** ein Nutzer auf der `/ingredients`-Seite auf den Button "Statistiken" klickt
- **THEN** SHALL der Nutzer zu `/ingredients/statistics` navigiert werden
- **THEN** SHALL der erste verfügbare Tab standardmäßig ausgewählt sein

#### Scenario: Tab ohne Backend-Endpoint zeigt Platzhalter
- **WHEN** ein Tab ausgewählt wird, dessen Backend-Endpoint nicht existiert
- **THEN** SHALL „Demnächst verfügbar" mit einer kurzen Beschreibung angezeigt werden
- **THEN** SHALL kein Ladezustand oder Fehler erscheinen

#### Scenario: Ungültiger Tab
- **WHEN** ein Nutzer `/ingredients/statistics/nicht-existenter-tab` aufruft
- **THEN** SHALL auf den ersten Tab redirectet werden

### Requirement: Dedizierte Statistik-API-Hooks

Das Frontend SHALL TanStack Query Hooks für alle Statistik-Endpoints bereitstellen. Hooks für nicht implementierte Endpoints SHALL mit `enabled: false` angelegt werden.

#### Scenario: Existierender Hook funktioniert
- **WHEN** ein implementierter Statistik-Endpoint aufgerufen wird
- **THEN** SHALL der Hook Daten fetchen und anzeigen

#### Scenario: Stub-Hook blockiert keinen Build
- **WHEN** `npm run build` ausgeführt wird
- **THEN** SHALL kein TypeScript-Fehler durch fehlende Hook-Exports auftreten
