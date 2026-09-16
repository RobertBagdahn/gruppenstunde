## MODIFIED Requirements

### Requirement: Datenqualität Dashboard mit Kategorie-Auswahl
Das Datenqualität-Dashboard SHALL zwei Hauptbereiche bieten: "Zutaten" und "Rezepte". Jeder Bereich SHALL Unterkategorien als Tabs oder Accordions anzeigen. Die Kategorie „Preisanalyse" SHALL fehlende, auf `0` gesetzte, vorgeschlagene und ausstehende KI-Preise unterscheiden und einen Bestätigungsworkflow anbieten. Preisaktionen SHALL den zentralen Proposal-Approval-Workflow verwenden und keine direkten unbestätigten globalen Preisupdates ausführen.

#### Scenario: Zutaten-Kategorien
- **WHEN** Staff-User den Bereich "Zutaten" auswählt
- **THEN** SHALL folgende Kategorien verfügbar sein: Preisanalyse, Duplikaterkennung, Datenvollständigkeit, Nährwert-Plausibilität, Fehlende Klassifikation
- **THEN** SHALL die Preisanalyse als erstes Tab ausgewählt sein

#### Scenario: Preisvorschläge in Preisanalyse
- **WHEN** ein Staff-User die Preisanalyse öffnet
- **THEN** SHALL Zutaten mit fehlendem Preis, pending Vorschlag und akzeptiertem KI-Preis getrennt sichtbar sein
- **THEN** SHALL ein Batch-Vorschlag in einen pending Proposal oder ein explizites Approval-Ergebnis überführt werden

#### Scenario: Rezepte-Kategorien
- **WHEN** Staff-User den Bereich "Rezepte" auswählt
- **THEN** SHALL folgende Kategorien verfügbar sein: Duplikaterkennung, Metadaten-Check, Cache-Staleness, Portions-Plausibilität
- **THEN** SHALL die Duplikaterkennung als erstes Tab ausgewählt sein

#### Scenario: Navigation zwischen Zutaten und Rezepten
- **WHEN** Staff-User zwischen "Zutaten" und "Rezepten" wechselt
- **THEN** SHALL die URL sich zu `/admin/data-quality/ingredients` bzw. `/admin/data-quality/recipes` ändern
- **THEN** SHALL der jeweils aktive Kategorie-Tab erhalten bleiben

### Requirement: Datenvollständigkeit-Übersicht
Das Dashboard SHALL eine tabellarische Übersicht der Datenvollständigkeit aller Zutaten bzw. Rezepte bieten, sortierbar nach Score. Die Tabelle SHALL Preisstatus und Preisprovenienz neben den bestehenden Score-Komponenten anzeigen.

#### Scenario: Zutaten-Vollständigkeitstabelle
- **WHEN** Staff-User die Kategorie "Datenvollständigkeit" für Zutaten auswählt
- **THEN** SHALL eine paginierte Tabelle alle Zutaten mit `quality_score`, Namen, Status und den einzelnen Score-Komponenten (Nährwerte, Preis, Physische Daten, Klassifikation, Pfadfinder, Portionen) anzeigen
- **THEN** SHALL die Tabelle nach `quality_score` aufsteigend sortiert sein (schlechteste zuerst)
- **THEN** SHALL jede Zeile auf die Zutat-Detailseite verlinken

#### Scenario: Preisstatus
- **WHEN** eine Zutat einen KI-Preisvorschlag besitzt
- **THEN** SHALL die Tabelle den Status `Vorschlag ausstehend` und den Bestätigungslink anzeigen

#### Scenario: Sortierung ändern
- **WHEN** Staff-User auf einen Spaltenkopf klickt
- **THEN** SHALL die Tabelle nach dieser Spalte sortieren (toggle asc/desc)
