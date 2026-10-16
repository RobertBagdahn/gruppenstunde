# back-button-component Specification

## Purpose
Anforderungen an back button component: BackButton rendert als Link wenn `to` gegeben; BackButton navigiert zurück ohne Props; BackButton nutzt onClick wenn gegeben.

## Requirements
### Requirement: BackButton rendert als Link wenn `to` gegeben
Wenn `to` gesetzt ist, SHALL die Komponente ein `<Link>`-Element mit der angegebenen Route rendern.

#### Scenario: Explizite Route
- **WHEN** `to="/recipes"` gesetzt ist
- **THEN** rendert als `<Link to="/recipes">` mit ChevronLeft Icon und Text "Zurück"

### Requirement: BackButton navigiert zurück ohne Props
Ohne `to` oder `onClick` SHALL die Komponente einen Schritt zurück im Browser-Verlauf navigieren.

#### Scenario: Kein to, kein onClick
- **WHEN** keine Props gesetzt sind
- **THEN** ruft `navigate(-1)` auf bei Klick

### Requirement: BackButton nutzt onClick wenn gegeben
Ein übergebener onClick-Handler SHALL das Standardverhalten überschreiben.

#### Scenario: Custom Handler
- **WHEN** `onClick` gesetzt ist
- **THEN** ruft den Handler auf und rendert als `<button>`

### Requirement: Einheitliches Styling
Der Button SHALL überall das gleiche visuelle Erscheinungsbild haben.

#### Scenario: Visuelles Erscheinungsbild
- **WHEN** die Komponente gerendert wird
- **THEN** zeigt Lucide ChevronLeft (w-4 h-4), Text "Zurück", text-sm, text-muted-foreground, hover:text-foreground

### Requirement: Breadcrumb-artiges Layout auf Detail-Seiten
Alle Detail-Seiten SHALL BackButton und Titel in einer Zeile zeigen.

#### Scenario: Desktop-Layout
- **WHEN** eine Detail-Seite gerendert wird
- **THEN** stehen BackButton und Seitentitel nebeneinander (flex-row)
