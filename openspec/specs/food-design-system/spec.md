# food-design-system Specification

## Purpose
TBD - created by archiving change food-frontend-facelift. Update Purpose after archive.
## Requirements
### Requirement: Zentrales Design-Token-System
Das Food Frontend SHALL alle Farben, Schatten, Radien, Schriftgrößen und Schrift-Familien ausschließlich über zentrale Design-Token in `frontend-food/src/index.css` (CSS-Variablen) und `frontend-food/tailwind.config.ts` definieren. Vier semantische Status-Token MUST je als Tripel existieren: `--success`, `--warning`, `--danger`, `--info` jeweils mit `-soft` (Fläche) und `-border` (Rand) sowie `-foreground` (Text auf der Vollfarbe). Komponenten MUST diese Token über Tailwind-Utilities referenzieren (z. B. `bg-card`, `text-foreground`, `bg-warning-soft`, `text-warning`, `border-danger-border`) und SHALL NOT Tailwind-Palettenfarben (z. B. `emerald-500`, `amber-50`, `gray-100`) verwenden. `--chart-*` SHALL ausschließlich in Diagrammen verwendet werden. Die Nutri-Score-Token `--nutri-a` bis `--nutri-e` bleiben als Fachfarben bestehen und SHALL ausschließlich von `NutriScoreBadge` verwendet werden. Schriftgrößen MUST ausschließlich über die fünf Token `text-caption`, `text-body`, `text-emphasis`, `text-section`, `text-title` gesetzt werden; Tailwind-Standardgrößen (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl` …) SHALL NOT vorkommen. Die Token sind so strukturiert, dass ein späterer Dark Mode nur Werte unter `.dark` ergänzen muss; ein Dark Mode ist nicht Teil dieses Changes.

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

### Requirement: Grün-basierte Leitfarbe im Light Mode
Das Token-System SHALL eine frische, grün-basierte Leitfarbe im Light Mode definieren: `--primary` ≈ `#15803D` (Buttons, aktive Navigation, Links), `--primary-bright` ≈ `#16A34A` (Icons, Fortschrittsbalken, Akzente ohne Text auf der Fläche) und `--primary-soft` ≈ `#F0FDF4` (Hover, Auswahl, sekundäre Buttons). Die Grundflächen MUST hell und offen sein: `--background` ≈ `#FCFBF8`, `--card` weiß, `--foreground` ≈ `#1F2937`. Zusätzlich SHALL vier Bereichsfarben als Paar aus Ton und Tönung existieren: `--area-recipes` (Koralle ≈ `#F43F5E` / `#FFF1F2`), `--area-ingredients` (Grün ≈ `#16A34A` / `#F0FDF4`), `--area-planner` (Himmelblau ≈ `#0EA5E9` / `#F0F9FF`), `--area-shopping` (Sonnengelb ≈ `#F59E0B` / `#FFFBEB`). Bereichsfarben MUST nur in Icon-Kacheln, im Navigations-Indikator und als kleine Akzente verwendet werden, nie als großflächiger Hintergrund und nie als Fläche unter Text. Großflächige dunkle Farbflächen (Leitfarbe oder dunkle Statusfarbe als Banner- oder Abschnittshintergrund) SHALL NOT vorkommen. Ein Dark Mode ist NICHT Teil dieser Capability.

#### Scenario: Primärfarbe ist grün-basiert
- **WHEN** ein primärer Button gerendert wird
- **THEN** hat er die Fläche `--primary` mit weißer Schrift

#### Scenario: Sekundäre Aktion
- **WHEN** neben einer Hauptaktion eine zweite Aktion steht (z. B. „Einkaufsliste“ neben „Kochen starten“)
- **THEN** verwendet sie `--primary-soft` als Fläche mit `--primary` als Schrift

#### Scenario: Bereichsfarbe im Seitenkopf
- **WHEN** die Rezeptliste gerendert wird
- **THEN** zeigt die Icon-Kachel im Seitenkopf das Koralle-Icon auf Koralle-Tönung und der Rest des Kopfes ist hell

#### Scenario: Diagrammfarben stammen aus der Palette
- **WHEN** ein `recharts`-Diagramm im Food Frontend gerendert wird
- **THEN** verwendet es die `--chart-*`-Token aus derselben harmonischen Palette

### Requirement: Lesbares Kontrast- und Border-System
Das Design-System SHALL verbindliche Kontrast-Token definieren, sodass angrenzende Flächen klar voneinander abgegrenzt sind. Karten MUST sich durch einen feinen Schatten (`shadow-card`) und optional eine sehr helle Border vom Hintergrund abheben; verschachtelte umrandete Boxen (Box in Box) SHALL NOT verwendet werden, Untergliederung innerhalb einer Karte erfolgt über Abstand oder Trennlinien. Jede Text-/Hintergrund-Kombination der Token MUST WCAG AA erfüllen (≥ 4,5:1 für normalen Text, ≥ 3:1 für Text ab 18 px bzw. 14 px fett und für Rahmen von Bedienelementen). Richtwerte: Primär `#15803D`, Danger ≈ `0 72% 45%`, Warning-Text ≈ `#B45309` auf Warning-Fläche ≈ `#FFFBEB`. Statusfarben (`--warning`, `--danger`, `--success`, `--info`) SHALL NOT als Fläche normaler Aktions-Buttons verwendet werden; nur destruktive Aktionen dürfen `--danger` als Button-Fläche nutzen.

#### Scenario: Karte auf Hintergrund
- **WHEN** eine Card auf dem Seitenhintergrund liegt
- **THEN** ist die Card durch Schatten und/oder sehr helle Border klar vom Hintergrund abgegrenzt

#### Scenario: Trennlinien in Listen
- **WHEN** Datenzeilen oder Sektionen durch Linien getrennt werden
- **THEN** sind diese Linien (`border-border`) sichtbar, aber ruhig

#### Scenario: Kochen starten
- **WHEN** die Rezeptseite den Button „Kochen starten“ zeigt
- **THEN** verwendet er `--primary` und nicht `--warning`

#### Scenario: Kontrast-Test
- **WHEN** der automatisierte Kontrast-Test (Vitest über alle Token-Paare aus `index.css`) läuft
- **THEN** erreicht weißer Text auf `--primary` und `--danger` ≥ 4,5:1, `--warning` als Text auf `--warning-soft` ≥ 4,5:1 und `--primary` als Text auf `--primary-soft` ≥ 4,5:1

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
Das Food Frontend MUST ausschließlich **Lucide** für alle Icons verwenden (UI, Aktionen, Navigation, Status, Leerzustände, Feature-Kacheln). Material Symbols und die zugehörige Icon-Schrift SHALL NICHT geladen oder verwendet werden. Icons MUST über eine gemeinsame Komponente `Icon` bzw. Lucide-Komponenten mit den Größen 16, 20, 24 oder 48 px und Strichstärke 2 gerendert werden: 16 px im Fließtext und in kleinen Buttons, 20 px in Buttons und Navigation, 24 px in Kopfzeilen, 48 px nur in Leerzuständen. Die Regel MUST in `frontend-food/AGENTS.md` dokumentiert sein.

#### Scenario: Aktions-Icon in Button
- **WHEN** ein Button ein Icon benötigt
- **THEN** wird ein Lucide-Icon in 16 oder 20 px verwendet

#### Scenario: Keine Icon-Schrift
- **WHEN** `frontend-food/index.html` und der Quellcode durchsucht werden
- **THEN** gibt es keinen Verweis auf `Material Symbols` oder die Klasse `material-symbols-*`

#### Scenario: Regel dokumentiert
- **WHEN** ein Entwickler die Icon-Konvention nachschlägt
- **THEN** findet er die Regel „nur Lucide, 16/20/24/48 px“ in `frontend-food/AGENTS.md`

### Requirement: Reduziertes Gradient- und Schatten-Set
Das Design-System SHALL ein kleines, kuratiertes Set an Schatten definieren (`shadow-card`, `shadow-raised`). Die Utility-Klassen `gradient-hero`, `gradient-primary`, `gradient-sunset`, `gradient-fun`, `gradient-warm` und `gradient-rainbow` SHALL entfernt werden. Erlaubt ist höchstens ein sehr heller Verlauf aus Tönungs-Token (`gradient-soft`) für den Begrüßungsbereich der Startseite. Verspielte Hintergrund- und Bewegungs-Effekte (z.B. Rainbow-/Confetti-Hintergründe, dauerhafte Float-/Wiggle-/Pulse-Animationen) MUST sparsam und gezielt eingesetzt werden, statt flächendeckend. Bestehende Print-Styles MUST funktionsfähig bleiben.

#### Scenario: Aufgeräumter Flächen-Look
- **WHEN** eine Standard-Inhaltsseite gerendert wird
- **THEN** verwendet sie helle Token-Flächen ohne dunkle Verlaufs-Banner

#### Scenario: Entfernte Gradient-Klassen
- **WHEN** im Code nach `gradient-hero`, `gradient-primary`, `gradient-sunset`, `gradient-fun`, `gradient-warm` oder `gradient-rainbow` gesucht wird
- **THEN** gibt es keinen Treffer

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

### Requirement: Schriftgrößen-Skala
Das Food Frontend MUST genau fünf Schriftgrößen verwenden: 12 px (klein, Chips, Metadaten), 14 px (Standard), 16 px (hervorgehoben), 20 px (Abschnittsüberschrift), 28 px (Seitentitel). Sie SHALL als Tailwind-Token (`text-caption`, `text-body`, `text-emphasis`, `text-section`, `text-title`) definiert sein. Kleinere Größen als 12 px und freie Werte (`text-[…]`) SHALL NICHT vorkommen.

#### Scenario: Badge-Text
- **WHEN** ein Badge oder Chip Text zeigt
- **THEN** ist die Schriftgröße 12 px

#### Scenario: Lint
- **WHEN** eine `.tsx`-Datei `text-[11px]` oder `text-xs`/`text-2xl` außerhalb der Skala enthält
- **THEN** meldet ESLint einen Fehler

### Requirement: Eckenradien
Das Food Frontend MUST genau drei Radien verwenden: 8 px (`rounded-lg`) für Bedienelemente (Buttons, Inputs, Chips, Selects), 12 px (`rounded-xl`) für Karten und Dialoge, `rounded-full` für Pills, Badges, Avatare und runde Icon-Buttons. Andere Radius-Utilities SHALL NICHT vorkommen.

#### Scenario: Button und Karte
- **WHEN** ein Button in einer Karte gerendert wird
- **THEN** hat der Button 8 px und die Karte 12 px Radius

### Requirement: Durchsetzung per ESLint
Die Regeln zu Farben, Schriftgrößen, Radien, Icons und Zahlenformatierung MUST per ESLint im Food Frontend als Fehler durchgesetzt werden (eigene Regel bzw. `no-restricted-syntax` auf `className`-Strings und Importe von Icon-Schriften). `npm run lint` MUST im CI laufen. Tests (`*.test.tsx`) und der Styleguide (`/styleguide`) sind von Palettenregeln ausgenommen, sofern sie Tokens demonstrieren.

#### Scenario: Verstoß im Pull Request
- **WHEN** eine Änderung `bg-amber-50` oder `rounded-md` einführt
- **THEN** schlägt `npm run lint` fehl
