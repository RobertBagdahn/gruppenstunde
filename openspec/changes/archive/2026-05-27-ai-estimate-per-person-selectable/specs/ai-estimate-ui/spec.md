## ADDED Requirements

### Requirement: Per-Person-Only Display
Die AI-Mengenschätzung zeigt ausschließlich Werte pro Person (1 Portion). Keine Hochrechnung auf Gesamtportionen.

#### Scenario: Dialog öffnen
- **WHEN** User die AI-Mengenschätzung auslöst
- **THEN** zeigt der Dialog nur "pro Person"-Werte ohne Gesamt-Spalte

### Requirement: Alt/Neu-Vergleich
Jede Zutat-Zeile zeigt den aktuellen Wert (Alt) neben dem geschätzten Wert (Neu).

#### Scenario: Zutat hat bestehenden Wert
- **WHEN** eine Zutat bereits eine Menge hat
- **THEN** wird diese als "Alt" angezeigt und der AI-Vorschlag als "Neu"

#### Scenario: Zutat hat keinen Wert
- **WHEN** eine Zutat keine Menge hat
- **THEN** wird "—" als Alt angezeigt und der AI-Vorschlag als "Neu"

### Requirement: Einzelselektion per Checkbox
Jede Zeile hat eine Checkbox. Standardmäßig sind alle unchecked.

#### Scenario: Übernehmen mit Selektion
- **WHEN** User einige Checkboxen aktiviert und "Übernehmen" klickt
- **THEN** werden nur die selektierten Werte in die Items übernommen

#### Scenario: Keine Selektion
- **WHEN** keine Checkbox aktiviert ist
- **THEN** ist der "Übernehmen"-Button disabled

### Requirement: Bulk-Auswahl
Ein "Alle auswählen"-Toggle ermöglicht schnelles Selektieren/Deselektieren aller Zeilen.

#### Scenario: Alle auswählen
- **WHEN** User "Alle auswählen" klickt
- **THEN** sind alle Checkboxen aktiviert
