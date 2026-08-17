# meal-plan-table-view Specification (Delta)

## ADDED Requirements

### Requirement: Graue Zellen auf ersten/letzten Tagen

Das System SHALL auf dem ersten und letzten Tag eines Essensplans (basierend auf `start_datetime`/`end_datetime`) Zellen für Mahlzeit-Typen, die aufgrund des Zeitrahmens natürlicherweise fehlen, grau hinterlegen. Eine Zelle gilt als "natürlicherweise fehlend", wenn die Default-Startzeit des Mahlzeit-Typs vor der Plan-Startzeit liegt (erster Tag) oder die Default-Endzeit nach der Plan-Endzeit liegt (letzter Tag).

Graue Zellen SHALL:
- einen dezenten grauen Hintergrund (`bg-muted/30`) und keine Interaktion (Dropdown-Button) anzeigen
- einen dezenten Text "—" oder einen Hinweis wie "Start um 14:00" enthalten
- KEINEN "Mahlzeit leer"-Alert (rot) anzeigen — das ist nur für existierende, aber leere Mahlzeiten reserviert

#### Scenario: Erster Tag mit Start um 14:00

- **WHEN** ein Essensplan am 2026-06-07 um 14:00 startet
- **AND** der Benutzer die Tabellenansicht öffnet
- **THEN** sind die Zellen für Frühstück (Start 08:00) und Mittag (Start 12:00) des 2026-06-07 grau hinterlegt
- **THEN** enthalten diese Zellen keinen "Mahlzeit leer"-Hinweis und kein Dropdown-Menü
- **THEN** enthalten diese Zellen den Hinweistext "Planstart: 14:00"

#### Scenario: Letzter Tag mit Ende um 12:00

- **WHEN** ein Essensplan am 2026-06-10 um 12:00 endet
- **AND** der Benutzer die Tabellenansicht öffnet
- **THEN** sind die Zellen für Mittag (Ende 13:00 > 12:00), Abendessen (Ende 19:00 > 12:00), Snack (Ende 15:30 > 12:00) und Getränke (Ende 16:30 > 12:00) des 2026-06-10 grau hinterlegt
- **THEN** nur die Frühstücks-Zelle ist nicht grau (Ende 09:00 ≤ 12:00)

#### Scenario: Innentag ohne Zeitrahmen-Einschränkung

- **WHEN** ein Tag weder der erste noch der letzte Tag ist
- **THEN** sind alle Zellen normal (keine grauen Zellen)

### Requirement: Coverage-Badge im Tabellen-Footer

Das System SHALL im Tabellen-Footer (`<tfoot>`) in der Tagesbilanz-Zelle für jeden Tag einen Coverage-Badge anzeigen. Der Badge SHALL zwischen den kcal- und Kosten-Informationen platziert werden.

#### Scenario: Coverage-Badge in Tagesbilanz

- **WHEN** ein Benutzer die Tabellenansicht mit einem Tag mit 40% Coverage betrachtet
- **THEN** zeigt die Tagesbilanz-Zelle einen Coverage-Badge "Teilweise 40 %" (gelb)
- **THEN** der Badge wird zwischen kcal- und Kosten-Zeile angezeigt

### Requirement: Coverage-Badge auf Datums-Buttons in NutritionView

Das System SHALL in der NutritionView auf den Datums-Buttons den Coverage-Badge anzeigen, sodass der Benutzer vor Auswahl eines Tages dessen Abdeckung sieht.

#### Scenario: Datums-Button mit Coverage

- **WHEN** ein Benutzer die NutritionView öffnet
- **THEN** zeigt jeder Datums-Button den Coverage-Badge mit Farbe und Prozentwert
- **THEN** der "Gesamter Plan"-Button zeigt "Ø Coverage: XX %" an

## MODIFIED Requirements

### Requirement: Tägliche Budget-Ampel im Tabellenfuß

- **WHEN** eine Tagesbilanz-Zelle die Kosten mit dem Budget vergleicht
- **THEN** MUSS der Budget-Vergleich das skalierte Budget (`budget × effectiveCoverage`) verwenden

### Requirement: Leere Zelle

- **WHEN** keine Mahlzeit für einen Tag/Typ existiert
- **AND** der Tag ist der erste oder letzte Tag UND der Mahlzeit-Typ liegt außerhalb des Plan-Zeitfensters
- **THEN** wird die Zelle grau hinterlegt (statt leerem Slot mit Aktionen)
