## MODIFIED Requirements

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

## ADDED Requirements

### Requirement: Listen-Karten verwenden das Card-Pattern
Item-Karten und tabellarische Listenzeilen im frontend-food MUST das zentrale Card-Pattern des Design-Systems verwenden: sichtbare Border, sparsamer Schatten, klare Abstände und Token-Farben. Sie SHALL NOT auf blassen Hellgrau-Flächen ohne erkennbare Abgrenzung dargestellt werden.

#### Scenario: Item-Karte im Grid
- **WHEN** eine Item-Karte in einem Listen-Grid gerendert wird
- **THEN** hat sie eine sichtbare Border und/oder Schatten und hebt sich klar vom Hintergrund ab

#### Scenario: Lesbarkeit auf Mobile
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Item-Karte vollständig lesbar und klar abgegrenzt
