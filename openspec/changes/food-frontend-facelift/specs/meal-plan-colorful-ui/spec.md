## MODIFIED Requirements

### Requirement: Color logic SHALL apply consistently across all tabs
The same semantic color system (green=good, yellow=warning, red=missing/critical) MUST be applied to the Tabelle, Kosten, Einkaufsliste, and Cockpit tabs where applicable. The semantic colors MUST be derived from the central Food design tokens (grün-basierte Leitfarbe, abgestimmte Warning/Critical-Token) rather than ad-hoc hardcoded palette values, and MUST meet the design system's contrast requirements.

#### Scenario: Table view cell with missing recipe
- **WHEN** a cell in the table view represents a meal without a recipe
- **THEN** it shows a red accent indicator using the design-system critical token

#### Scenario: Cost view with incomplete pricing
- **WHEN** cost data has unpriced ingredients
- **THEN** incomplete coverage is highlighted in yellow/red using the design-system warning/critical tokens

#### Scenario: Positive coverage indicator
- **WHEN** a meal or value meets its target
- **THEN** the "good" state uses the grün-basierte Leitfarbe of the design system

## ADDED Requirements

### Requirement: Meal-Plan-Tabellen verwenden Card-basierte Zeilen
Die Tabelle- und Kosten-Ansichten des Essensplans MUST das Card-basierte Tabellen-Pattern des Design-Systems verwenden: Datenzeilen als eigenständige Cards mit sichtbarer Border, sparsamem Schatten und klaren Abständen. Blasse Hellgrau-auf-Hellgrau-Flächen SHALL NOT verwendet werden.

#### Scenario: Tabellenzeile als Card
- **WHEN** eine Zeile in der Tabelle- oder Kosten-Ansicht gerendert wird
- **THEN** erscheint sie als eigenständige Card mit klarer Border und Abstand zu Nachbarzeilen

#### Scenario: Mobile Lesbarkeit der Meal-Plan-Tabelle
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Card-Zeile vollständig lesbar und klar abgegrenzt

### Requirement: Meal-Plan-UI folgt dem zentralen Token-System
Das bunte Meal-Plan-UI MUST seine Farben (Leitfarbe, Akzente, Meal-Type-Farben, Diagrammfarben) aus dem zentralen Design-Token-System beziehen und SHALL NOT semantische Farben hartcodieren. Überschriften MUST die Display-Schrift verwenden.

#### Scenario: Akzentfarben aus Token
- **WHEN** ein Meal-Type-Akzent oder eine Diagrammfarbe gerendert wird
- **THEN** stammt der Wert aus den zentralen Design-Token (`--primary`, `--chart-*` o.ä.)
