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
