## ADDED Requirements

### Requirement: Zutat ändern ersetzt den Suchtext
Beim Aktivieren von „Zutat ändern“ SHALL das Suchfeld den Fokus erhalten und den vorhandenen Text markieren, sodass Tippen ihn ersetzt.

#### Scenario: Ersetzen statt anhängen
- **WHEN** der Nutzer bei einer Zeile mit „Tomate“ auf „Zutat ändern“ klickt und „Tomaten gehackt“ tippt
- **THEN** lautet der Feldinhalt „Tomaten gehackt“
- **AND** nicht „TomateTomaten gehackt“

### Requirement: Auswahl einer vorhandenen Zutat räumt das Neu-Formular auf
Wählt der Nutzer eine vorhandene Zutat oder eine Alternative, SHALL das System den Entwurf einer neuen Zutat der Zeile verwerfen und das Formular „Neue Zutat prüfen“ ausblenden.

#### Scenario: Alternative statt Neuanlage
- **WHEN** eine Zeile ein Formular „Neue Zutat prüfen“ zeigt und der Nutzer eine Alternative auswählt
- **THEN** verschwindet das Formular
- **AND** die gewählte Zutat ist zugeordnet

#### Scenario: Bewusste Neuanlage
- **WHEN** der Nutzer „Neue Zutat anlegen“ wählt
- **THEN** bleibt das Formular sichtbar

### Requirement: Suchdropdown ohne horizontalen Überlauf
Der Zutaten-Suchdropdown im Review SHALL ab 320 px Breite innerhalb der Spalte bleiben. Die Warengruppen-Chips MUST umbrechen oder innerhalb des Dropdowns scrollen.

#### Scenario: Viewport 1024 px
- **WHEN** der Dropdown mit Warengruppen-Chips geöffnet ist
- **THEN** entsteht kein horizontaler Seitenüberlauf
