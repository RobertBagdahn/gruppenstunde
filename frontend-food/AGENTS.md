# AI Agent Configuration — Inspi Food Frontend

## Design-System & Visuelle Richtlinien

### 1. Farb-Token & Theme-System
Alle Farben und Flächen müssen HSL-basiert über die CSS-Variablen in `index.css` und das Tailwind-Theme gesteuert werden.
* **Primärfarbe (Grün):** `--primary` (Emerald-basiert) für Haupt-Buttons, Links, aktive States.
* **Hintergrund:** `--background` (sehr helles neutrales HSL-Grau/Zink) für die gesamte App.
* **Karten:** `--card` (reinweiß, `bg-card`) für klaren Kontrast und Separation vom Hintergrund.
* **Borders:** `--border` (deutlich sichtbares Zink-200) für klare, lesbare Linien.
* **Muted Text:** `--muted-foreground` für sekundäre Beschriftungen mit ausreichendem Kontrast.

Es dürfen **keine** hartcodierten Farbklassen wie `bg-emerald-500`, `text-blue-600` oder `gray-50` verwendet werden, um "Hellgrau-in-Hellgrau"-Visuals zu vermeiden.

### 2. Typografie
* **Überschriften (`h1`–`h6`):** Müssen die moderne Display-Schrift `Plus Jakarta Sans` (`font-display font-bold`) verwenden.
* **Fließtext / Listen:** Verwendet die extrem lesbare Body-Schrift `Inter` (`font-sans`).

### 3. Icon-Nutzungsregeln
Im Food Frontend sind zwei Icon-Bibliotheken aktiv. Um ein konsistentes und aufgeräumtes Erscheinungsbild zu gewährleisten, gilt folgende Aufteilung:
* **Lucide-Icons (Standard):** Müssen für alle Standard-UI-Aktionen, interaktive Schaltflächen, Navigationen, Status-Anzeigen und Inline-Symbole verwendet werden (z.B. `<Search />`, `<Check />`, `<Plus />`, `<ArrowRight />`).
* **Material Symbols (Ausnahme):** Dürfen ausschließlich für illustrative Sektionssymbole (z.B. im Hero-Bereich) oder bereits etablierte, große Feature-Karten verwendet werden. In neuen Komponenten ist Lucide zu bevorzugen.

### 4. Card-basierte Tabellen-Zeilen
Herkömmliche Tabellen-Schnittstellen mit dünnen, blassen Zeilenlinien werden durch das Card-basierte Tabellen-Pattern ersetzt:
* **Komponenten:** `CardTable` als Container und `DataCardRow` für einzelne Zeilen.
* **Stil:** Einzelne Zeilen haben abgerundete Ecken (`rounded-xl`), eine dezente weiße Card-Fläche auf grauem Seitenhintergrund, eine sichtbare Border (`border-border`) und einen feinen Schatten.
* **Mobile-First:** Spalten klappen auf Viewports < 768px untereinander zusammen.

### 5. Styleguide & Referenz-Umgebung
Der integrierte interaktive Styleguide unter `/styleguide` dient als „Single Source of Truth“ für das gesamte visuelle System im Food Frontend. Er demonstriert live:
* Alle aktiven Farb-Token und die HSL-Farbpaletten.
* Die Typografie-Skala und Fonts.
* UI-Muster wie Buttons, Badges, standardisierte Formularelemente und Card-Tabellen.
* Vorlagen für Lade- und leere Zustände.
Bei der Entwicklung neuer Komponenten oder Seiten muss immer zuerst der `/styleguide` herangezogen und als visuelle Referenz verwendet werden.
