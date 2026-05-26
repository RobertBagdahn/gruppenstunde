## MODIFIED Requirements

### Requirement: BlogCard Metadaten-Anzeige

Die BlogCard MUSS Lesezeit und Summary prominent anzeigen.

#### Scenario: Lesezeit auf BlogCard
- **WHEN** eine BlogCard gerendert wird
- **THEN** MUSS eine geschätzte Lesezeit angezeigt werden (berechnet aus Textlänge: ~200 Wörter/Minute)
- **THEN** MUSS das Format „X Min. Lesezeit" mit Buch-Icon sein

#### Scenario: Summary auf BlogCard
- **WHEN** eine BlogCard gerendert wird und der Blog ein `summary` hat
- **THEN** MUSS das Summary als max 2-zeiliger Text unter dem Titel angezeigt werden (`line-clamp-2`)
- **THEN** MÜSSEN bis zu 3 Tags als kompakte Chips sichtbar sein
