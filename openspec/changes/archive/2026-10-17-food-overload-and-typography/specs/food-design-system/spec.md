## MODIFIED Requirements

### Requirement: Schriftgrößen-Skala
Das Food Frontend MUST genau sieben Schriftgrößen verwenden, definiert als Tailwind-Tokens in `tailwind.config.ts`: `text-caption` (12 px, Chips und Metadaten), `text-body` (14 px, Standard), `text-emphasis` (16 px, hervorgehoben), `text-section` (20 px, Abschnittsüberschrift), `text-title` (28 px, Seitentitel), `text-metric` (32 px, nur Kennzahlen) und `text-display` (fluid 36 bis 64 px, nur Seitentitel im Kopfband). Kleinere Größen als 12 px und freie Werte (`text-[…]`) SHALL NICHT vorkommen.

#### Scenario: Badge-Text
- **WHEN** ein Badge oder Chip Text zeigt
- **THEN** ist die Schriftgröße 12 px

#### Scenario: Kennzahl
- **WHEN** eine Kennzahl wie ein Preis oder eine Kalorienzahl gezeigt wird
- **THEN** verwendet sie `text-metric` (32 px)

#### Scenario: Lint
- **WHEN** eine `.tsx`-Datei `text-[11px]` oder `text-xs`/`text-2xl` außerhalb der Skala enthält
- **THEN** meldet ESLint einen Fehler

### Requirement: Zentrales Design-Token-System
Das Food Frontend SHALL alle Farben, Schatten, Radien, Schriftgrößen und Schrift-Familien ausschließlich über zentrale Design-Token in `frontend-food/src/index.css` (CSS-Variablen) und `frontend-food/tailwind.config.ts` definieren. Vier semantische Status-Token MUST je als Tripel existieren: `--success`, `--warning`, `--danger`, `--info` jeweils mit `-soft` (Fläche) und `-border` (Rand) sowie `-foreground` (Text auf der Vollfarbe). Komponenten MUST diese Token über Tailwind-Utilities referenzieren (z. B. `bg-card`, `text-foreground`, `bg-warning-soft`, `text-warning`, `border-danger-border`) und SHALL NOT Tailwind-Palettenfarben (z. B. `emerald-500`, `amber-50`, `gray-100`) verwenden. `--chart-*` SHALL ausschließlich in Diagrammen verwendet werden. Die Nutri-Score-Token `--nutri-a` bis `--nutri-e` bleiben als Fachfarben bestehen und SHALL ausschließlich von `NutriScoreBadge` verwendet werden. Schriftgrößen MUST ausschließlich über die sieben Token `text-caption`, `text-body`, `text-emphasis`, `text-section`, `text-title`, `text-metric`, `text-display` gesetzt werden; Tailwind-Standardgrößen (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl` …) SHALL NOT vorkommen. Die Token sind so strukturiert, dass ein späterer Dark Mode nur Werte unter `.dark` ergänzen muss; ein Dark Mode ist nicht Teil dieses Changes.

#### Scenario: Komponente nutzt semantische Token
- **WHEN** eine Komponente eine Flächen-, Text- oder Border-Farbe setzt
- **THEN** verwendet sie eine Token-basierte Utility statt einer Tailwind-Palettenfarbe

#### Scenario: Status-Komponente nutzt semantische Token
- **WHEN** eine Komponente einen Status (Erfolg/Warnung/Fehler/Info) farblich darstellt
- **THEN** verwendet sie `success`, `warning`, `danger` oder `info` (inkl. `-soft`/`-border`) statt `chart-*` oder Palettenfarben

#### Scenario: Nutri-Score nutzt zentrale Quelle
- **WHEN** eine Komponente einen Nutri-Score anzeigt
- **THEN** rendert sie `NutriScoreBadge` und verwendet weder `NUTRI_SCORE_COLORS` noch `nutri-*`-Klassen direkt

#### Scenario: Keine hartcodierten Status-Farben im Codebase
- **WHEN** `npm run lint` läuft
- **THEN** meldet ESLint jede Tailwind-Palettenfarbe und jede Tailwind-Standard-Schriftgröße in `className` als Fehler

#### Scenario: Theme-Änderung an einer Stelle
- **WHEN** ein Token-Wert (z. B. `--primary`) in `index.css` geändert wird
- **THEN** ändert sich die Farbe konsistent über das gesamte Food Frontend ohne weitere Komponenten-Anpassungen

## ADDED Requirements

### Requirement: Schriftgrößen-Tokens bleiben beim Zusammenführen erhalten
Die Hilfsfunktion `cn()` SHALL die Schriftgrößen-Tokens der Skala als Schriftgrößen erkennen. Eine Schriftgröße MUST auch dann erhalten bleiben, wenn eine Textfarbe im selben Aufruf folgt, und eine spätere Schriftgröße MUST die frühere ersetzen.

#### Scenario: Größe neben Farbe
- **WHEN** `cn('text-body', 'text-foreground')` aufgerufen wird
- **THEN** enthält das Ergebnis `text-body` und `text-foreground`

#### Scenario: Projektfarbe ist keine Schriftgröße
- **WHEN** `cn('text-body', 'text-hero-foreground')` aufgerufen wird
- **THEN** bleiben beide Klassen erhalten
