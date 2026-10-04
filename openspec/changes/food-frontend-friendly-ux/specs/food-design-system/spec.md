## MODIFIED Requirements

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
