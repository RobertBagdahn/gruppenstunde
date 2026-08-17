## ADDED Requirements

### Requirement: Asynchrone Wizard-Rehydration

Der Food-Frontend-Wizard MUST bestehende Daten erst rehydrieren, wenn die dafür benötigten Plan-, RefMeal- und Katalogdaten geladen und validiert sind. Ein früher Default-State DARF den geladenen Zustand nicht überschreiben.

#### Scenario: Bestehendes Frühstück wird nach Query-Laden angezeigt
- **WHEN** RefMeal und Frühstückskatalog nach dem ersten Render eintreffen
- **THEN** zeigt der Wizard die gespeicherten Basis-, Belag-, Fett- und Getränkeauswahlen

### Requirement: Kontextgebundene Wizard-Persistenz

Persistierte Wizard-Daten MUST Benutzer, Plan, Modus und Versionsnummer enthalten. Daten für einen anderen Kontext MUST ignoriert werden.

#### Scenario: Planwechsel verwendet keine alten Eingaben
- **WHEN** ein Benutzer einen anderen MealPlan öffnet
- **THEN** wird kein Wizard-State des vorherigen Plans geladen

### Requirement: Validierte Wizard-Payloads

LocalStorage- und KI-Payloads MUST vor Verwendung durch ein konkretes Zod-Schema validiert werden. Ungültige Daten MUST verworfen und dem Benutzer mit einer deutschen Fehlermeldung erklärt werden.

#### Scenario: Beschädigte Persistenz wird verworfen
- **WHEN** LocalStorage syntaktisch gültiges, aber strukturell ungültiges JSON enthält
- **THEN** startet der Wizard mit sicheren Defaults und zeigt keinen Laufzeitfehler
