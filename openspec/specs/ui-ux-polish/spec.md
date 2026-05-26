## ADDED Requirements

### Requirement: Konsistente Karten-Hover-Effekte
Alle klickbaren Karten im System MÜSSEN einheitliche Hover-Effekte verwenden: `hover:-translate-y-1 transition-all duration-200 hover:shadow-md`.

#### Scenario: Karte mit Hover-Effekt
- **WHEN** ein Nutzer mit der Maus über eine klickbare Karte fährt
- **THEN** MUSS die Karte um 4px nach oben versetzt werden
- **THEN** MUSS ein erhöhter Schatten sichtbar sein

### Requirement: Breadcrumb-Navigation auf Unterseiten
Alle Unterseiten (Detail-Seiten, Erstellen-Seiten, Einstellungen) MÜSSEN eine Breadcrumb-Navigation anzeigen.

#### Scenario: Detail-Seite mit Breadcrumbs
- **WHEN** ein Nutzer eine Detail-Seite wie `/sessions/:slug` besucht
- **THEN** MUSS eine Breadcrumb-Zeile angezeigt werden (z.B. "Start > Gruppenstunden > [Titel]")
- **THEN** MÜSSEN alle Breadcrumb-Segmente außer dem letzten klickbar sein

#### Scenario: Erstellen-Seite mit Breadcrumbs
- **WHEN** ein Nutzer eine Erstellen-Seite besucht
- **THEN** MUSS eine Breadcrumb-Zeile angezeigt werden (z.B. "Start > Erstellen > Gruppenstunde")

### Requirement: Sticky Header mit Scroll-Shadow
Der Desktop-Header MUSS sticky sein und beim Scrollen einen subtilen Schatten anzeigen.

#### Scenario: Header wird sticky beim Scrollen
- **WHEN** ein Nutzer die Seite nach unten scrollt
- **THEN** MUSS der Header fixiert oben bleiben
- **THEN** MUSS ein `shadow-sm` Schatten erscheinen, sobald `scrollY > 0`

#### Scenario: Header ohne Shadow bei Scroll-Top
- **WHEN** ein Nutzer ganz oben auf der Seite ist
- **THEN** DARF der Header keinen Schatten haben

### Requirement: Aktive Route-Hervorhebung
Die aktive Route MUSS in allen Navigations-Varianten (Desktop-Nav, Mobile-Bottom-Nav, Hamburger-Menü) konsistent visuell hervorgehoben werden.

#### Scenario: Desktop-Nav aktive Route
- **WHEN** ein Nutzer auf `/events` ist
- **THEN** MUSS der "Aktionen"-NavLink visuell hervorgehoben sein (z.B. `text-primary font-semibold`)

#### Scenario: Mobile-Bottom-Nav aktive Route
- **WHEN** ein Nutzer auf `/events` ist
- **THEN** MUSS das "Aktionen"-Icon in der Bottom-Nav farbig hervorgehoben sein

### Requirement: Einheitliche Seitenüberschriften
Alle Hauptseiten MÜSSEN ein konsistentes Header-Pattern verwenden: Material-Symbol-Icon + Titel + optionaler Untertitel.

#### Scenario: Seite mit einheitlichem Header
- **WHEN** ein Nutzer eine Hauptseite (z.B. Sessions, Events, Rezepte) besucht
- **THEN** MUSS die Überschrift ein passendes Icon links vom Titel enthalten
- **THEN** MUSS der Titel als `h1` gerendert werden

### Requirement: Footer-Links aktualisiert
Der Desktop-Footer MUSS alle verfügbaren Module und Tools korrekt verlinken, inklusive "Aktionen".

#### Scenario: Footer enthält alle Module
- **WHEN** ein Nutzer den Footer sieht
- **THEN** MÜSSEN Links zu Gruppenstunden, Blog, Spiele, Rezepte vorhanden sein
- **THEN** MUSS ein Link zu "Aktionen" (`/events`) vorhanden sein
- **THEN** MÜSSEN Links zu allen Planungs-Tools vorhanden sein

### Requirement: Konsistente Zurück-Navigation
Detail- und Erstellen-Seiten MÜSSEN einen "Zurück"-Link/Button im Seitenkopf anbieten.

#### Scenario: Detail-Seite mit Zurück-Button
- **WHEN** ein Nutzer eine Detail-Seite besucht
- **THEN** MUSS ein Zurück-Link vorhanden sein, der zur übergeordneten Listenansicht navigiert

### Requirement: Einheitliche Loading-States
Alle Seiten mit API-Daten MÜSSEN Skeleton-Loading-States verwenden statt Spinner.

#### Scenario: Seite lädt Daten
- **WHEN** eine Seite API-Daten lädt
- **THEN** MÜSSEN Skeleton-Platzhalter in der Form des erwarteten Inhalts angezeigt werden
- **THEN** DARF kein rotierender Spinner als alleiniger Loading-Indikator verwendet werden

### Requirement: Einheitliche Empty-States
Alle Listen-Seiten MÜSSEN einen konsistenten leeren Zustand anzeigen, wenn keine Daten vorhanden sind.

#### Scenario: Leere Liste
- **WHEN** eine Listenansicht keine Ergebnisse hat
- **THEN** MUSS ein zentrierter Empty-State mit Icon, Titel und Call-to-Action angezeigt werden

### Requirement: Mobile Hamburger-Menü Aktionen prominent
Im Mobile-Hamburger-Menü MUSS "Aktionen" als erster Eintrag in der Tools-Section erscheinen.

#### Scenario: Hamburger-Menü Tools-Reihenfolge
- **WHEN** ein Nutzer das Mobile-Hamburger-Menü öffnet
- **THEN** MUSS "Aktionen" der erste Eintrag in der Tools-Section sein


---

# Scroll to Top

### Requirement: Scroll to top on route change
The application SHALL reset the scroll position to the top of the page when the user navigates to a new route (pathname change). This MUST apply to all routes without exception.

#### Scenario: Navigate from list page to detail page
- **WHEN** a user scrolls down on a list page and clicks a link to a detail page
- **THEN** the detail page SHALL be displayed starting from the top (scroll position 0, 0)

#### Scenario: Navigate back to list page
- **WHEN** a user navigates from a detail page back to a list page via a link
- **THEN** the list page SHALL be displayed starting from the top

#### Scenario: Query parameter change does not reset scroll
- **WHEN** a user changes filter or pagination parameters (URL search params) without changing the pathname
- **THEN** the scroll position SHALL NOT be reset

#### Scenario: Hash fragment change does not reset scroll
- **WHEN** a user clicks an in-page anchor link (hash change only)
- **THEN** the scroll-to-top behavior SHALL NOT be triggered


---

# UI Navigation Restructure

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
