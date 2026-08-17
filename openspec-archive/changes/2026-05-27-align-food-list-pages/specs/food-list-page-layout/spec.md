## ADDED Requirements

### Requirement: Einheitlicher Seiten-Container
Alle Listen-Seiten im frontend-food verwenden `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8` als aeusseren Container.

#### Scenario: Benutzer oeffnet eine beliebige Listenseite
- **WHEN** eine der 4 Listenseiten geladen wird (Rezepte, Zutaten, Essensplan, Einkaufslisten)
- **THEN** ist der Inhaltsbereich auf max-w-7xl begrenzt mit konsistentem Padding

### Requirement: ListPageHero mit Count-Badge
Jede Listenseite zeigt einen ListPageHero mit Gradient-Header und einem Count-Badge das die Gesamtanzahl der Items anzeigt.

#### Scenario: Listenseite mit vorhandenen Items
- **WHEN** die Seite geladen ist und Items vorhanden sind
- **THEN** zeigt der Hero den Titel, eine Beschreibung, das passende Icon und ein Badge mit der Gesamtanzahl

### Requirement: Gradient-Search-Container
Jede Listenseite hat eine Suchleiste in einem Gradient-Container (passend zur Sektionsfarbe) mit Such-Input, Such-Button und "Neu erstellen"-Button.

#### Scenario: Benutzer sucht nach Items
- **WHEN** der Benutzer einen Suchbegriff eingibt und absendet
- **THEN** wird die Liste gefiltert und die URL-Parameter aktualisiert

#### Scenario: Benutzer klickt "Neu erstellen"
- **WHEN** der Benutzer den Erstellen-Button klickt
- **THEN** wird er zur Erstellungsseite navigiert oder ein Erstellungs-Dialog geoeffnet

### Requirement: Responsive Grid-Layout
Items werden in einem responsiven CSS-Grid angezeigt mit sektionsspezifischer Spaltenanzahl.

#### Scenario: Desktop-Ansicht
- **WHEN** der Viewport breiter als 1280px ist
- **THEN** zeigt das Grid die maximale Spaltenanzahl (4-5 je nach Sektion)

#### Scenario: Mobile-Ansicht
- **WHEN** der Viewport schmaler als 640px ist
- **THEN** zeigt das Grid eine einzelne Spalte

### Requirement: Sort-Dropdown
Jede Listenseite hat einen Sort-Dropdown ueber dem Grid (rechtsseitig) mit mindestens "Neueste" und "Aelteste" Optionen.

#### Scenario: Benutzer aendert Sortierung
- **WHEN** eine andere Sortieroption gewaehlt wird
- **THEN** wird die Liste neu sortiert und die URL-Parameter aktualisiert

### Requirement: Filter-Sidebar (wo sinnvoll)
Rezepte und Zutaten haben eine Filter-Sidebar links vom Grid. Essensplan und Einkaufslisten haben keine Sidebar.

#### Scenario: Zutaten-Filter
- **WHEN** der Benutzer die Zutatenseite oeffnet
- **THEN** zeigt eine Sidebar Filter fuer Retail-Section und Status

### Requirement: Pagination
Jede Listenseite mit mehr als 20 Items zeigt eine Pagination-Komponente unterhalb des Grids.

#### Scenario: Mehr als 20 Items vorhanden
- **WHEN** total > page_size
- **THEN** wird die Pagination-Komponente sichtbar mit Seitennummern
