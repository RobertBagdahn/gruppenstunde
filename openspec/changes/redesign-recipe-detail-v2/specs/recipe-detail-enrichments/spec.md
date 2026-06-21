## ADDED Requirements

### Requirement: Nährwert-Tabelle mit pro-Portion-, Gesamt- und DGE-Spalten
Die Rezept-Detailseite SHALL eine ausklappbare Nährwert-Tabelle anzeigen, die je Nährwert (Energie, Protein, Fett, Kohlenhydrate, Zucker, Ballaststoffe, Salz) drei Werte zeigt: pro 100g, pro Portion und prozentualer Anteil am DGE-Referenzwert. Bei gesetzter Portionszahl `n` SHALL zusätzlich eine Gesamt-Spalte (× n) erscheinen.

#### Scenario: Tabelle anzeigen
- **WHEN** ein Nutzer die Nährwert-Tabelle öffnet
- **THEN** SHALL je Nährwert pro 100g, pro Portion und DGE-% angezeigt werden
- **WHEN** die Portionszahl auf n > 1 gesetzt ist
- **THEN** SHALL eine zusätzliche Gesamtspalte (× n) erscheinen

### Requirement: Allergen-Ampel
Die Rezept-Detailseite SHALL eine visuelle Allergen-Ampel anzeigen, die auf Basis von `NutritionalTag.is_dangerous` und den Zutaten kennzeichnet, welche Allergene enthalten sind und welche nicht ("enthält Nüsse" / "nussfrei"). Jeder Allergen-Eintrag SHALL klickbar sein und zur zugehörigen Zutaten-Detailseite oder gefilterten Liste führen.

#### Scenario: Allergene anzeigen
- **WHEN** ein Rezept Zutaten mit gefährlichen Ernährungstags enthält
- **THEN** SHALL die enthaltenen Allergene mit Warn-Icon und die nicht enthaltenen als "frei von" dargestellt werden
- **WHEN** ein Nutzer auf ein Allergen klickt
- **THEN** SHALL er zur zugehörigen Zutat/gefilterten Ansicht navigiert

### Requirement: Verlinkte Kosten-Aufschlüsselung
Die Kosten-Aufschlüsselung pro Zutat SHALL jeden Zutaten-Eintrag mit der jeweiligen Zutaten-Detailseite verlinken.

#### Scenario: Kosten-Zutat anklicken
- **WHEN** ein Nutzer in der Kosten-Aufschlüsselung auf eine Zutat klickt
- **THEN** SHALL die Zutaten-Detailseite `/ingredients/{slug}` geöffnet werden

### Requirement: Verwendung in Essensplänen
Die Rezept-Detailseite SHALL anzeigen, in wie vielen für den Nutzer sichtbaren Essensplänen das Rezept verwendet wird, und auf diese verlinken. Die Zählung SHALL nur Essenspläne berücksichtigen, die der Nutzer sehen darf.

#### Scenario: Verwendung anzeigen
- **WHEN** ein Rezept in für den Nutzer sichtbaren Essensplänen verwendet wird
- **THEN** SHALL ein Hinweis "In X Essensplänen verwendet" mit Links zu diesen Plänen erscheinen

#### Scenario: Keine Verwendung
- **WHEN** das Rezept in keinem sichtbaren Essensplan verwendet wird
- **THEN** SHALL kein Verwendungs-Hinweis gerendert werden

### Requirement: Saisonalitäts-Anzeige
Die Rezept-Detailseite SHALL eine Saisonalitäts-Leiste anzeigen, wenn Zutaten Saison-Daten (`season_start`/`season_end`) besitzen, und den günstigsten/besten Zeitraum kennzeichnen.

#### Scenario: Saison vorhanden
- **WHEN** mindestens eine Zutat Saison-Monate definiert hat
- **THEN** SHALL eine Jahres-Leiste den saisonalen Zeitraum hervorheben

### Requirement: Versions- und Änderungshinweis
Die Rezept-Detailseite SHALL einen Hinweis "zuletzt aktualisiert" anzeigen und bei abgeleiteten Rezepten ("Fork") auf das Originalrezept verlinken.

#### Scenario: Fork-Hinweis
- **WHEN** das Rezept ein `forked_from`-Original hat
- **THEN** SHALL "Basiert auf {Originaltitel}" mit Link zum Originalrezept erscheinen

### Requirement: Sticky Sprung-Navigation
Die Rezept-Detailseite SHALL auf Desktop eine mitscrollende Anker-Navigation (Mini-TOC) bereitstellen, die zu den Hauptsektionen (Zutaten, Zubereitung, Analyse, Ähnliche) springt.

#### Scenario: TOC auf Desktop
- **WHEN** ein Nutzer auf Desktop (lg-Breakpoint) die Seite betrachtet
- **THEN** SHALL eine sticky Anker-Leiste sichtbar sein
- **WHEN** ein Nutzer einen Anker anklickt
- **THEN** SHALL die Seite zur entsprechenden Sektion scrollen
