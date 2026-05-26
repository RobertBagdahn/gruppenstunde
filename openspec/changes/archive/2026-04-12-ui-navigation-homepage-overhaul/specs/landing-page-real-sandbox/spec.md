## ADDED Requirements

### Requirement: Fake-Sandbox in EventsLandingPage entfernen
Die EventsLandingPage MUSS den interaktiven Fake-Sandbox-Simulator (EventSandbox mit hardcodierten Demo-Events, Teilnehmern und Stats) entfernen und durch eine kompakte Vorschau ersetzen.

#### Scenario: EventsLandingPage ohne Sandbox
- **WHEN** ein Nutzer die `/events`-Landing-Page besucht
- **THEN** DARF kein interaktiver Sandbox-Simulator mit Fake-Daten sichtbar sein
- **THEN** MUSS stattdessen ein direkter CTA-Button "Jetzt starten" zur App-Route `/events/app` vorhanden sein

#### Scenario: EventsLandingPage mit echtem Content-Preview
- **WHEN** ein eingeloggter Nutzer die `/events`-Landing-Page besucht
- **THEN** SOLL eine Vorschau der echten Events des Nutzers angezeigt werden (via API)
- **THEN** MUSS bei keinen vorhandenen Events ein leerer Zustand mit Erstellen-CTA gezeigt werden

### Requirement: Fake-Sandbox in SessionPlannerLandingPage entfernen
Die SessionPlannerLandingPage MUSS den interaktiven Kalender-Demo-Simulator entfernen.

#### Scenario: SessionPlannerLandingPage ohne Sandbox
- **WHEN** ein Nutzer die `/session-planner`-Landing-Page besucht
- **THEN** DARF kein Fake-Kalender mit hardcodierten Wochen/Sessions sichtbar sein
- **THEN** MUSS stattdessen ein CTA zur echten App `/session-planner/app` vorhanden sein

### Requirement: Fake-Sandbox in MealEventLandingPage entfernen
Die MealEventLandingPage MUSS den interaktiven Mahlzeiten-Demo-Simulator entfernen.

#### Scenario: MealEventLandingPage ohne Sandbox
- **WHEN** ein Nutzer die `/meal-events`-Landing-Page besucht
- **THEN** DARF kein Fake-3-Tage-Essensplan mit hardcodierten Mahlzeiten sichtbar sein
- **THEN** MUSS stattdessen ein CTA zur echten App `/meal-events/app` vorhanden sein

### Requirement: Fake-Sandbox in PackingListLandingPage entfernen
Die PackingListLandingPage MUSS den interaktiven Packlisten-Demo-Simulator entfernen.

#### Scenario: PackingListLandingPage ohne Sandbox
- **WHEN** ein Nutzer die `/packing-lists`-Landing-Page besucht
- **THEN** DARF kein Fake-Packlisten-Simulator sichtbar sein
- **THEN** MUSS stattdessen ein CTA zur echten App `/packing-lists/app` vorhanden sein

### Requirement: Landing-Page-Struktur vereinheitlicht
Alle Tool-Landing-Pages MÜSSEN einer einheitlichen Struktur folgen:
1. Hero mit Titel, Beschreibung und CTA-Button
2. Feature-Liste (was kann das Tool?)
3. Echte Daten-Preview oder Screenshot (wenn eingeloggt)
4. CTA-Block "Jetzt starten"

#### Scenario: Einheitliche Landing-Page-Struktur
- **WHEN** ein Nutzer eine Tool-Landing-Page besucht
- **THEN** MUSS die Seite der 4-Schritt-Struktur (Hero, Features, Preview, CTA) folgen
- **THEN** DARF die Seite maximal 300 Zeilen Code haben (statt aktuell 400-800)
