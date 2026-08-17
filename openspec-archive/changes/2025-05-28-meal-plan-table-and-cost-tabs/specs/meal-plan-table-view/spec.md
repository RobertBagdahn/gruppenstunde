## ADDED Requirements

### Requirement: Tabellarische Grid-Übersicht

Die MealPlan-Detailseite bietet einen Tab "Tabelle" mit einer Grid-Darstellung: Spalten = Tage, Zeilen = Mahlzeittypen (Frühstück, Mittag, Abend, Snack).

#### Scenario: Benutzer öffnet Tabellen-Tab
- **WHEN** der Benutzer den Tab "Tabelle" in der MealPlan-Detailseite auswählt
- **THEN** wird ein Grid angezeigt mit Tagen als Spalten und Mahlzeittypen als Zeilen

#### Scenario: Zelle zeigt Mahlzeit-Zusammenfassung
- **WHEN** eine Mahlzeit für einen bestimmten Tag und Typ existiert
- **THEN** zeigt die Zelle: Rezeptname(n), Personenzahl (override_portions oder norm_portions), und Notiz (falls vorhanden)

#### Scenario: Leere Zelle
- **WHEN** keine Mahlzeit für einen Tag/Typ existiert
- **THEN** wird die Zelle leer oder mit Platzhalter dargestellt

#### Scenario: Mobile Darstellung
- **WHEN** die Ansicht auf einem schmalen Bildschirm (< 768px) angezeigt wird
- **THEN** wird die Tabelle horizontal scrollbar oder in eine gestapelte Ansicht umgewandelt
