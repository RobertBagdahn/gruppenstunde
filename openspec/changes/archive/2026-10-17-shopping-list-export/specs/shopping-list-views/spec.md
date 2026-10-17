## MODIFIED Requirements

### Requirement: Print View
Das Food-Frontend SHALL für Einkaufslisten eine druckoptimierte Ansicht bereitstellen. Sie wird über „Liste exportieren“ → „Drucken oder als PDF speichern“ geöffnet und nutzt den Druckdialog des Browsers, der auch „Als PDF speichern“ anbietet. Die Druckansicht MUST die Inhalte aus der Anforderung „Inhalt des Exports“ (`shopping-list-export`) zeigen:
- Listenname, Stand, Zähler;
- nur offene Einträge, gruppiert nach Abteilungen mit Überschriften;
- je Eintrag ein leeres Kästchen zum Abhaken auf Papier, Name, Menge mit Packungsbedarf und gegebenenfalls Zuständigkeit.

Navigation, Kopfband, Buttons, Hinweise, Fortschrittsbalken, Mitglieder-, Teilen-, REWE- und Küchenbedarfsbereiche MUST im Druck fehlen. Das Layout MUST auf A4 zweispaltig sein und schwarz auf weiß ohne Schatten oder Hintergrundflächen gedruckt werden. Eine Abteilung MUST nach Möglichkeit nicht über Spalten- oder Seitenumbrüche zerrissen werden. Am Ende MUST ein Abschnitt „Zusätzlich“ mit fünf leeren Zeilen für handschriftliche Ergänzungen stehen. Die Bildschirmansicht MUST durch das Drucken unverändert bleiben.

#### Scenario: Print button triggers print
- **WHEN** ein Nutzer „Liste exportieren“ → „Drucken oder als PDF speichern“ wählt
- **THEN** öffnet der Browser den Druckdialog mit der Druckansicht ohne Navigations- und Bedienelemente

#### Scenario: Print layout structure
- **WHEN** die Druckansicht gedruckt wird
- **THEN** stehen die offenen Einträge nach Abteilungen gruppiert mit Kästchen, Name und Menge in zwei Spalten auf A4
- **AND** am Ende steht „Zusätzlich“ mit fünf leeren Zeilen

#### Scenario: Abgehakte Einträge fehlen im Druck
- **GIVEN** „Milch“ ist abgehakt und „Brot“ offen
- **WHEN** der Nutzer druckt
- **THEN** enthält der Ausdruck „Brot“, aber nicht „Milch“

#### Scenario: Druckblatt nur beim Drucken
- **WHEN** der Nutzer druckt
- **THEN** enthält die Seite das Druckblatt nur während des Druckvorgangs
- **AND** nach dem Druckdialog zeigt die Seite wieder nur die Bildschirmansicht, ohne doppelten Text

#### Scenario: Papier ohne Hintergrund
- **WHEN** die Druckansicht gedruckt wird
- **THEN** erscheinen Seitenhintergrund, Schatten und Kopfband nicht auf dem Papier

#### Scenario: Gast druckt
- **GIVEN** ein Gast mit gültigem Gast-Token
- **WHEN** er „Drucken oder als PDF speichern“ wählt
- **THEN** öffnet sich derselbe Druckdialog mit derselben Druckansicht
