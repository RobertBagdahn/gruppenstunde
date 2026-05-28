## ADDED Requirements

### Requirement: BackButton rendert als Link wenn `to` gegeben
Die Komponente rendert ein `<Link>` Element mit der angegebenen Route.

#### Scenario: Explizite Route
- **WHEN** `to="/recipes"` gesetzt ist
- **THEN** rendert als `<Link to="/recipes">` mit ChevronLeft Icon und Text "Zurück"

### Requirement: BackButton navigiert zurück ohne Props
Ohne `to` oder `onClick` navigiert die Komponente einen Schritt zurück im Browser-Verlauf.

#### Scenario: Kein to, kein onClick
- **WHEN** keine Props gesetzt sind
- **THEN** ruft `navigate(-1)` auf bei Klick

### Requirement: BackButton nutzt onClick wenn gegeben
Ein custom onClick-Handler überschreibt das Standardverhalten.

#### Scenario: Custom Handler
- **WHEN** `onClick` gesetzt ist
- **THEN** ruft den Handler auf und rendert als `<button>`

### Requirement: Einheitliches Styling
Der Button hat immer das gleiche visuelle Erscheinungsbild.

#### Scenario: Visuelles Erscheinungsbild
- **WHEN** die Komponente gerendert wird
- **THEN** zeigt Lucide ChevronLeft (w-4 h-4), Text "Zurück", text-sm, text-muted-foreground, hover:text-foreground

### Requirement: Breadcrumb-artiges Layout auf Detail-Seiten
Alle Detail-Seiten zeigen BackButton und Titel in einer Zeile.

#### Scenario: Desktop-Layout
- **WHEN** eine Detail-Seite gerendert wird
- **THEN** stehen BackButton und Seitentitel nebeneinander (flex-row)
