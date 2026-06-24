## Purpose
Konsistentes, responsives und barrierefreies Layout für alle Listenseiten (Rezepte, Zutaten, Einkaufslisten, Essensplan) im Food-Frontend mit einheitlichem Such-Container, Hero und Card-Pattern.
## Requirements
### Requirement: Einheitlicher Seiten-Container
Alle Listen-Seiten im frontend-food MUST `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8` als aeusseren Container verwenden.

#### Scenario: Benutzer oeffnet eine beliebige Listenseite
- **WHEN** eine der 4 Listenseiten geladen wird (Rezepte, Zutaten, Essensplan, Einkaufslisten)
- **THEN** ist der Inhaltsbereich auf max-w-7xl begrenzt mit konsistentem Padding

### Requirement: ListPageHero mit Count-Badge
Jede Listenseite zeigt einen ListPageHero mit einem Header im neuen Design-Token-System (grün-basierte Leitfarbe, ruhige Fläche statt buntem Gradient-Mix) und einem Count-Badge, das die Gesamtanzahl der Items anzeigt. Der Hero MUST die Display-Schrift für den Titel verwenden und sich klar vom Seitenhintergrund abheben.

#### Scenario: Listenseite mit vorhandenen Items
- **WHEN** die Seite geladen ist und Items vorhanden sind
- **THEN** zeigt der Hero den Titel in der Display-Schrift, eine Beschreibung, das passende Icon und ein Badge mit der Gesamtanzahl, abgehoben über Token-Farben

### Requirement: Gradient-Search-Container
Jede Listenseite MUST eine Suchleiste in einem Container haben, der das zentrale Design-Token-System verwendet (sichtbare Border/Card-Fläche statt blasser Hellgrau-Fläche), mit Such-Input, Such-Button und "Neu erstellen"-Button.

#### Scenario: Benutzer sucht nach Items
- **WHEN** der Benutzer einen Suchbegriff eingibt und absendet
- **THEN** wird die Liste gefiltert und die URL-Parameter aktualisiert

#### Scenario: Benutzer klickt "Neu erstellen"
- **WHEN** der Benutzer den Erstellen-Button klickt
- **THEN** wird er zur Erstellungsseite navigiert oder ein Erstellungs-Dialog geöffnet

#### Scenario: Such-Container ist klar abgegrenzt
- **WHEN** der Such-Container auf dem Seitenhintergrund liegt
- **THEN** ist er durch eine sichtbare Border und/oder Schatten klar vom Hintergrund abgegrenzt (kein Hellgrau-in-Hellgrau)

### Requirement: Responsive Grid-Layout
Items SHALL in einem responsiven CSS-Grid angezeigt werden mit sektionsspezifischer Spaltenanzahl.

#### Scenario: Desktop-Ansicht
- **WHEN** der Viewport breiter als 1280px ist
- **THEN** zeigt das Grid die maximale Spaltenanzahl (4-5 je nach Sektion)

#### Scenario: Mobile-Ansicht
- **WHEN** der Viewport schmaler als 640px ist
- **THEN** zeigt das Grid eine einzelne Spalte

### Requirement: Sort-Dropdown
Jede Listenseite MUST einen Sort-Dropdown ueber dem Grid (rechtsseitig) mit mindestens "Neueste" und "Aelteste" Optionen haben.

#### Scenario: Benutzer aendert Sortierung
- **WHEN** eine andere Sortieroption gewaehlt wird
- **THEN** wird die Liste neu sortiert und die URL-Parameter aktualisiert

### Requirement: Filter-Sidebar (wo sinnvoll)
Rezepte und Zutaten MUST eine Filter-Sidebar links vom Grid haben. Essensplan und Einkaufslisten haben keine Sidebar.

#### Scenario: Zutaten-Filter
- **WHEN** der Benutzer die Zutatenseite oeffnet
- **THEN** zeigt eine Sidebar Filter fuer Retail-Section und Status

### Requirement: Pagination
Jede Listenseite mit mehr als 20 Items MUST eine Pagination-Komponente unterhalb des Grids zeigen.

#### Scenario: Mehr als 20 Items vorhanden
- **WHEN** total > page_size
- **THEN** wird die Pagination-Komponente sichtbar mit Seitennummern

### Requirement: Listen-Karten verwenden das Card-Pattern
Item-Karten und tabellarische Listenzeilen im frontend-food MUST das zentrale Card-Pattern des Design-Systems verwenden: sichtbare Border, sparsamer Schatten, klare Abstände und Token-Farben. Sie SHALL NOT auf blassen Hellgrau-Flächen ohne erkennbare Abgrenzung dargestellt werden.

#### Scenario: Item-Karte im Grid
- **WHEN** eine Item-Karte in einem Listen-Grid gerendert wird
- **THEN** hat sie eine sichtbare Border und/oder Schatten und hebt sich klar vom Hintergrund ab

#### Scenario: Lesbarkeit auf Mobile
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Item-Karte vollständig lesbar und klar abgegrenzt
