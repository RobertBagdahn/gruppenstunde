## MODIFIED Requirements

### Requirement: Content-Grid-Layout

Das Content-Grid-Layout MUSS 5 Kacheln pro Zeile auf Desktop-Bildschirmen anzeigen.

#### Scenario: Desktop-Ansicht (xl, >= 1280px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 1280px Breite gerendert wird
- **THEN** MUSS das Grid 5 Spalten verwenden (`xl:grid-cols-5`)

#### Scenario: Large-Ansicht (lg, >= 1024px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 1024px und < 1280px gerendert wird
- **THEN** MUSS das Grid 4 Spalten verwenden (`lg:grid-cols-4`)

#### Scenario: Medium-Ansicht (md, >= 768px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 768px und < 1024px gerendert wird
- **THEN** MUSS das Grid 3 Spalten verwenden (`md:grid-cols-3`)

#### Scenario: Small-Ansicht (sm, >= 640px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm >= 640px und < 768px gerendert wird
- **THEN** MUSS das Grid 2 Spalten verwenden (`sm:grid-cols-2`)

#### Scenario: Mobile-Ansicht (< 640px)
- **WHEN** die Content-Listenansicht auf einem Bildschirm < 640px gerendert wird
- **THEN** MUSS das Grid 1 Spalte verwenden

### Requirement: Content-Card Tag-Anzeige

Alle Content-Cards MÜSSEN mehr Tags anzeigen als aktuell.

#### Scenario: Tags auf der Card
- **WHEN** eine Content-Card gerendert wird
- **THEN** MÜSSEN bis zu 3 Tags als kompakte Chips sichtbar sein
- **THEN** MUSS bei mehr als 3 Tags ein „+N"-Indikator angezeigt werden

### Requirement: Content-Card Summary

Content-Cards MÜSSEN eine kurze Zusammenfassung anzeigen wenn verfügbar.

#### Scenario: Summary auf der Card
- **WHEN** eine Content-Card gerendert wird und der Content ein `summary`-Feld hat
- **THEN** MUSS die Zusammenfassung als einzeiliger, abgeschnittener Text unter dem Titel angezeigt werden (max 2 Zeilen, `line-clamp-2`)

### Requirement: Autor-Position auf Detailseiten

Der Autor-Bereich MUSS auf allen Content-Detailseiten am unteren Ende positioniert sein.

#### Scenario: Autor unten auf Detailseite
- **WHEN** eine Content-Detailseite gerendert wird
- **THEN** MUSS der Autor-Bereich (Name, Avatar, Profil-Link) nach der Beschreibung und vor den Kommentaren positioniert sein
- **THEN** DARF der Autor NICHT in der oberen Info-Box erscheinen
