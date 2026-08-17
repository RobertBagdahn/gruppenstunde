## ADDED Requirements

### Requirement: Veranstaltungen wird zu Aktionen umbenannt
Das System MUSS alle UI-Texte, die "Veranstaltungen" oder "Veranstaltung" enthalten, durch "Aktionen" bzw. "Aktion" ersetzen. Code-Identifier (Variablen, Routen, API-Pfade) bleiben unverändert auf Englisch ("event").

#### Scenario: TOOL_EVENTS Label in toolColors.ts
- **WHEN** die TOOL_EVENTS-Konfiguration geladen wird
- **THEN** MUSS `label` den Wert "Aktionen" haben und `tagline` entsprechend aktualisiert sein

#### Scenario: Navigation zeigt Aktionen statt Veranstaltungen
- **WHEN** ein Nutzer die Desktop- oder Mobile-Navigation sieht
- **THEN** MUSS überall "Aktionen" statt "Veranstaltungen" stehen

#### Scenario: Alle Event-bezogenen Seiten verwenden Aktionen
- **WHEN** ein Nutzer EventsPage, MyDashboardPage oder PersonsPage besucht
- **THEN** MÜSSEN alle Überschriften und Beschreibungen "Aktionen" statt "Veranstaltungen" verwenden

### Requirement: Admin-Link im Profil-Dropdown
Der Admin-Link MUSS aus der Hauptnavigation (Desktop `<nav>` und Mobile Header-Icons) entfernt und ins Profil-Dropdown verschoben werden. Nur Staff-Nutzer sehen den Eintrag.

#### Scenario: Desktop-Header zeigt keinen Admin-Link
- **WHEN** ein Staff-Nutzer den Desktop-Header betrachtet
- **THEN** DARF kein "Admin"-NavLink in der Hauptnavigation sichtbar sein

#### Scenario: Admin-Link im Desktop-Profil-Dropdown
- **WHEN** ein Staff-Nutzer das Profil-Dropdown öffnet
- **THEN** MUSS ein "Admin"-Eintrag mit Icon `admin_panel_settings` vorhanden sein, der auf `/admin/dashboard` verlinkt
- **THEN** MUSS dieser Eintrag vor "Abmelden" positioniert sein

#### Scenario: Admin-Link im Mobile-Hamburger-Menü
- **WHEN** ein Staff-Nutzer das Mobile-Hamburger-Menü öffnet
- **THEN** MUSS ein "Admin"-Eintrag in der Profil-Section erscheinen

#### Scenario: Nicht-Staff-Nutzer sehen keinen Admin-Link
- **WHEN** ein normaler Nutzer (nicht Staff) das Profil-Dropdown öffnet
- **THEN** DARF kein Admin-Eintrag sichtbar sein

### Requirement: Aktionen als Top-Level-Link im Desktop-Header
Das System MUSS "Aktionen" als eigenständigen NavLink im Desktop-Header anzeigen, positioniert zwischen "Suchen" und dem "Inhalte"-Dropdown.

#### Scenario: Desktop-Navigation enthält Aktionen-Link
- **WHEN** ein Nutzer den Desktop-Header sieht
- **THEN** MUSS ein NavLink "Aktionen" mit Icon `celebration` sichtbar sein
- **THEN** MUSS der Link auf `/events` verweisen

#### Scenario: Aktionen-Link ist aktiv auf Event-Seiten
- **WHEN** ein Nutzer sich auf einer `/events`-Route befindet
- **THEN** MUSS der "Aktionen"-NavLink als aktiv hervorgehoben sein

### Requirement: Aktionen auf dem Erstellen-Hub
Die CreateHubPage MUSS eine Option "Aktion erstellen" enthalten, die auf `/events/app/new` verlinkt.

#### Scenario: Erstellen-Hub zeigt Aktionen-Option
- **WHEN** ein Nutzer die `/create`-Seite besucht
- **THEN** MUSS eine Karte "Aktion" mit Icon `celebration` und Link zu `/events/app/new` angezeigt werden
- **THEN** MUSS die Beschreibung den Zweck der Aktionserstellung erklären

### Requirement: Mobile Bottom-Nav Aktionen-Label
Die Mobile-Bottom-Navigation MUSS das Label des vierten Items von "Tools" zu "Aktionen" ändern.

#### Scenario: Mobile Bottom-Nav zeigt Aktionen
- **WHEN** ein Nutzer die Mobile-Bottom-Navigation sieht
- **THEN** MUSS das vierte Item das Label "Aktionen" und Icon `celebration` haben
- **THEN** MUSS es auf `/events` verlinken
