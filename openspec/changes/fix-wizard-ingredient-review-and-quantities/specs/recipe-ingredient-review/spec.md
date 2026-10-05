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

### Requirement: Suchtext kann vollständig gelöscht werden
Der Zutaten-Suchtext SHALL während der Bearbeitung exakt den eingegebenen Text darstellen. Ein leerer Suchtext MUST NOT durch den KI-Vorschlag oder einen vorherigen Zutatenamen ersetzt werden. Wenn ein Nutzer den Namen einer ausgewählten Zutat ändert oder löscht, SHALL die bisherige Zutaten-ID entfernt bleiben, bis ein Suchtreffer ausgewählt wird.

#### Scenario: Zutatenname löschen
- **GIVEN** eine Zeile mit ausgewählter Zutat „Butter“
- **WHEN** der Nutzer den Suchtext vollständig löscht
- **THEN** bleibt das Suchfeld leer
- **AND** die Zeile ist unvollständig und nicht bestätigbar
- **AND** die zuvor ausgewählte Zutaten-ID ist nicht mehr gesetzt

#### Scenario: Gelöschten Namen ersetzen
- **GIVEN** der Nutzer hat den Namen der ausgewählten Zutat vollständig gelöscht
- **WHEN** der Nutzer „Margarine“ eintippt, ohne einen Suchtreffer auszuwählen
- **THEN** bleibt „Margarine“ als Suchtext sichtbar
- **AND** die Zeile bleibt unvollständig und kann nicht mit der vorherigen Zutaten-ID bestätigt werden

### Requirement: Mengenfelder erlauben schrittweise Dezimaleingabe
Die Mengenfelder für Zutaten SHALL Eingaben als bearbeitbaren Rohtext halten, bis daraus eine gültige Zahl bestätigt werden kann. Sie MUST deutsches Dezimalkomma und Dezimalpunkt unterstützen. Leere oder vorläufig ungültige Zwischenstände während des Tippens MUST NOT durch eine Standardmenge oder einen Clamp ersetzt werden. Die Regel SHALL sowohl im Review-Dialog als auch im Mengenformular des Rezept-Suchdialogs gelten. Eine Menge SHALL nur bestätigt werden, wenn sie endlich und mindestens 0,1 ist.

#### Scenario: Menge mit führender Null eingeben
- **WHEN** der Nutzer `0,6` schrittweise in ein Mengenfeld eingibt
- **THEN** bleibt `0,6` während der Eingabe sichtbar
- **AND** die bestätigte Menge wird als numerischer Wert `0.6` übergeben

#### Scenario: Leerer oder ungültiger Mengen-Zwischenstand
- **WHEN** der Nutzer das Mengenfeld leert oder einen noch unvollständigen Dezimalwert eingibt
- **THEN** bleibt der eingegebene Zwischenstand sichtbar
- **AND** die Bestätigungsaktion ist deaktiviert, solange kein gültiger Wert von mindestens 0,1 vorliegt

#### Scenario: Dezimalpunkt akzeptieren
- **WHEN** der Nutzer `0.6` statt `0,6` eingibt
- **THEN** wird beim Bestätigen derselbe numerische Wert `0.6` übergeben
