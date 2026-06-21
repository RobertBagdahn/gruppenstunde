# food-design-system Specification

## Purpose
TBD - created by archiving change food-frontend-facelift. Update Purpose after archive.
## Requirements
### Requirement: Zentrales Design-Token-System
Das Food Frontend SHALL alle Farben, Schatten, Radien und Schrift-Familien ausschließlich über zentrale Design-Token in `frontend-food/src/index.css` (CSS-Variablen) und `frontend-food/tailwind.config.ts` definieren. Zusätzlich zu den bestehenden Token SHALL vier semantische Status-Token definiert sein: `--success` (grün), `--warning` (gelb/bernstein), `--danger` (rot), `--info` (blau). Komponenten MUST diese Token über Tailwind-Utilities referenzieren (z.B. `bg-card`, `border-border`, `text-foreground`, `text-primary`, `bg-success`, `text-danger`) und SHALL NOT hartcodierte Farb-Utilities (z.B. `emerald-500`, `blue-600`, `gray-100`, `amber-50`, `red-50`) für semantische Flächen, Texte oder Borders verwenden. Der `NUTRI_SCORE_COLORS`-Mapping SHALL zentral in `@/schemas/supply` definiert sein und die Token `--success`, `--warning`, `--danger` verwenden.

#### Scenario: Komponente nutzt semantische Token
- **WHEN** eine Komponente eine Flächen-, Text- oder Border-Farbe setzt
- **THEN** verwendet sie eine Token-basierte Utility (`bg-card`, `text-foreground`, `border-border` o.ä.) statt einer hartcodierten Tailwind-Palettenfarbe

#### Scenario: Status-Komponente nutzt semantische Token
- **WHEN** eine Komponente einen Status (Erfolg/Warnung/Fehler/Info) farblich darstellt
- **THEN** verwendet sie `bg-success`, `bg-warning`, `bg-danger` oder `bg-info` anstelle von `bg-emerald-50`, `bg-amber-50`, `bg-red-50`, `bg-blue-50`

#### Scenario: Nutri-Score nutzt zentrale Quelle
- **WHEN** eine Komponente Nutri-Score-Farben benötigt
- **THEN** importiert sie `NUTRI_SCORE_COLORS` aus `@/schemas/supply` ohne lokale Neudefinition

#### Scenario: Keine hartcodierten Status-Farben im Codebase
- **WHEN** der Codebase auf hartcodierte Status-Farben (z.B. `bg-amber-50`, `text-green-700`) durchsucht wird
- **THEN** existieren solche Klassen nur noch in Ausnahmen (z.B. Print-Styles, Drittanbieter-Komponenten)

#### Scenario: Theme-Änderung an einer Stelle
- **WHEN** ein Token-Wert (z.B. `--primary`) in `index.css` geändert wird
- **THEN** ändert sich die Farbe konsistent über das gesamte Food Frontend ohne weitere Komponenten-Anpassungen

### Requirement: Grün-basierte Leitfarbe im Light Mode
Das Token-System SHALL eine grün-basierte Leitfarbe (`--primary`) im Light Mode definieren. Die Palette MUST harmonische Sekundär-, Akzent- und Diagramm-Farben (`--chart-*`) umfassen. Ein Dark Mode ist NICHT Teil dieser Capability.

#### Scenario: Primärfarbe ist grün-basiert
- **WHEN** ein primäres UI-Element (Button, aktiver Tab, Link) gerendert wird
- **THEN** verwendet es den grün-basierten Primärton aus `--primary`

#### Scenario: Diagrammfarben stammen aus der Palette
- **WHEN** ein `recharts`-Diagramm im Food Frontend gerendert wird
- **THEN** verwendet es die `--chart-*`-Token aus derselben harmonischen Palette

### Requirement: Lesbares Kontrast- und Border-System
Das Design-System SHALL verbindliche Kontrast-Token definieren, sodass angrenzende Flächen klar voneinander abgegrenzt sind. Eine graue Fläche MUST NOT direkt auf einer ähnlich hellen grauen Fläche ohne sichtbare Border oder Schatten liegen. `--border` MUST deutlich sichtbar sein (kein nahezu-weißer Ton). `--muted-foreground` SHALL ausschließlich für sekundären Text mit ausreichendem Kontrast verwendet werden.

#### Scenario: Karte auf Hintergrund
- **WHEN** eine Card auf dem Seitenhintergrund liegt
- **THEN** ist die Card durch eine sichtbare Border und/oder einen Schatten klar vom Hintergrund abgegrenzt

#### Scenario: Trennlinien in Listen
- **WHEN** Datenzeilen oder Sektionen durch Linien getrennt werden
- **THEN** sind diese Linien (`border-border`) deutlich sichtbar und nicht nahezu-weiß

### Requirement: Moderne Typografie mit Display- und Body-Schrift
Das Design-System SHALL eine moderne Display-Schrift für Überschriften und eine klare Body-Schrift definieren. Die Schriften MUST über `frontend-food/index.html` (oder ein äquivalentes Font-Lade-Verfahren) mit `display=swap` eingebunden und als Tailwind `fontFamily`-Token (`sans`, `display`) bereitgestellt werden. Überschriften (`h1`–`h6`) MUST die Display-Schrift verwenden.

#### Scenario: Überschrift verwendet Display-Schrift
- **WHEN** ein `h1`–`h3` gerendert wird
- **THEN** verwendet es die definierte Display-Schrift

#### Scenario: Fließtext verwendet Body-Schrift
- **WHEN** Fließtext in einer Card oder Liste gerendert wird
- **THEN** verwendet er die definierte Body-Schrift

### Requirement: Card-basiertes Tabellen-Pattern
Das Design-System SHALL eine wiederverwendbare Shared-Komponente für Card-basierte Tabellen-Zeilen unter `frontend-food/src/components/shared/` bereitstellen. Datenzeilen MUST als eigenständige Cards mit sichtbarer Border, sparsamem Schatten und definierten Abständen dargestellt werden. Das Pattern MUST auf 320px Mindestbreite lesbar bleiben.

#### Scenario: Datenzeile als Card
- **WHEN** eine Datenzeile (z.B. in TableView oder CostDashboard) gerendert wird
- **THEN** erscheint sie als eigenständige Card mit klarer Border und Abstand zu Nachbarzeilen

#### Scenario: Mobile Darstellung
- **WHEN** der Viewport 320px breit ist
- **THEN** bleibt die Card-Zeile vollständig lesbar ohne horizontales Scrollen des Hauptinhalts

### Requirement: Verbindliche Icon-Nutzungsregel
Das Design-System SHALL eine verbindliche Regel für die Verwendung von Icon-Bibliotheken festlegen: **Lucide** MUST als Standard für UI-/Aktions-Icons (Buttons, Navigation, Status, Inline) verwendet werden; **Material Symbols** SHALL nur für ausgewählte illustrative oder etablierte Stellen (z.B. Tool-/Feature-Symbole) eingesetzt werden. Die Regel MUST in `frontend-food/AGENTS.md` dokumentiert sein.

#### Scenario: Aktions-Icon in Button
- **WHEN** ein Button ein Icon benötigt
- **THEN** wird ein Lucide-Icon verwendet

#### Scenario: Regel dokumentiert
- **WHEN** ein Entwickler die Icon-Konvention nachschlägt
- **THEN** findet er die Lucide-vs-Material-Symbols-Regel in `frontend-food/AGENTS.md`

### Requirement: Reduziertes Gradient- und Schatten-Set
Das Design-System SHALL ein kleines, kuratiertes Set an Gradients und Schatten definieren. Verspielte Hintergrund- und Bewegungs-Effekte (z.B. Rainbow-/Confetti-Hintergründe, dauerhafte Float-/Wiggle-/Pulse-Animationen) MUST sparsam und gezielt eingesetzt werden, statt flächendeckend. Bestehende Print-Styles MUST funktionsfähig bleiben.

#### Scenario: Aufgeräumter Flächen-Look
- **WHEN** eine Standard-Inhaltsseite gerendert wird
- **THEN** verwendet sie ruhige Token-Flächen ohne flächendeckende Rainbow-/Confetti-Hintergründe

#### Scenario: Print bleibt funktionsfähig
- **WHEN** eine druckbare Seite (z.B. Einkaufsliste, Rezept) gedruckt wird
- **THEN** funktionieren die bestehenden Print-Styles weiterhin korrekt

### Requirement: Lebende Styleguide-Page
Das Food Frontend SHALL eine Route `/styleguide` bereitstellen, die als lebendes Showcase alle Design-Token, die Typo-Scale, Kern-Komponenten (Buttons, Badges, Cards), das Card-Tabellen-Pattern, die Icon-Regel sowie Empty-/Loading-States darstellt.

#### Scenario: Styleguide aufrufen
- **WHEN** ein Nutzer `/styleguide` öffnet
- **THEN** sieht er Sektionen für Farben/Token, Typografie, Buttons/Badges, Cards, Card-Tabelle, Icon-Regel und State-Beispiele

#### Scenario: Styleguide spiegelt aktuelle Token
- **WHEN** ein Design-Token geändert wurde
- **THEN** zeigt die Styleguide-Page den aktualisierten Wert ohne separate Pflege

