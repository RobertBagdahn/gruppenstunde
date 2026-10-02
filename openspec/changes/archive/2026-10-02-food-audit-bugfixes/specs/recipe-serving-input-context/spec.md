## MODIFIED Requirements

### Requirement: Gesamtmengen im gewählten Eingabekontext
Das System SHALL Zutatenmengen im Editor als Gesamtmengen für den festgelegten Personen-Kontext behandeln. Bei bestehenden Rezepten SHALL es die gespeicherten Pro-1-Person-Mengen erst nach der Kontextauswahl für die Anzeige multiplizieren. Bereits kontextbezogene neue oder importierte Mengen SHALL nicht ein zweites Mal multipliziert werden. Das gilt ausdrücklich für Mengen aus dem Mengen-Dialog der Detailsuche und aus dem Alternativen-Dialog. Nur die automatische Vorbelegung beim Hinzufügen über die Schnellsuche und beim Anlegen einer Alternative (jeweils 1 Portion pro Person, ohne Mengeneingabe des Nutzers) SHALL mit dem Kontext multipliziert werden. Eine Mengeneingabe in Gramm oder über ein Standardmaß SHALL immer auf die Gramm-Portion der Zutat abgebildet werden. Das System SHALL NICHT still auf eine andere Portion ausweichen. Ohne Gramm-Portion SHALL die Option „Gramm“ (und die Standardmaße) nicht angeboten werden.

#### Scenario: Bestehendes Rezept für vier Personen bearbeiten
- **GIVEN** ein Rezept mit technisch gespeicherten Pro-1-Person-Mengen
- **WHEN** der Nutzer vor dem Öffnen des Editors 4 Personen auswählt
- **THEN** zeigt der Editor jede bestehende Menge als Gesamtmenge für 4 Personen an

#### Scenario: Neue Mengen für vier Personen eingeben
- **GIVEN** der festgelegte Personen-Kontext beträgt 4
- **WHEN** der Nutzer 500 g Mehl eingibt
- **THEN** wird 500 g als Gesamtmenge für 4 Personen behandelt
- **AND** die Menge wird nicht zusätzlich durch einen weiteren Personenfaktor vervierfacht

#### Scenario: Menge aus der Detailsuche
- **GIVEN** der festgelegte Personen-Kontext beträgt 4
- **WHEN** der Nutzer über die Detailsuche „weißer Haushaltszucker“ mit 2 × „100g Zucker“ hinzufügt
- **THEN** zeigt die neue Zeile 2 × „100g Zucker“ = 200 g
- **AND** beim Speichern wird 0,5 × „100g Zucker“ pro Person gespeichert

#### Scenario: Gramm-Eingabe in der Detailsuche
- **GIVEN** der festgelegte Personen-Kontext beträgt 4
- **WHEN** der Nutzer „Weizenmehl Type 405“ mit Einheit „Gramm“ und Menge 250 hinzufügt
- **THEN** zeigt die neue Zeile 250 g in der Gramm-Portion
- **AND** die Zeile verwendet nicht die Portion „Tasse Mehl“

#### Scenario: Zutat ohne Gramm-Portion
- **GIVEN** eine Zutat hat keine Portion mit 1 g Gewicht
- **WHEN** der Nutzer den Mengen-Dialog öffnet
- **THEN** wird die Option „Gramm“ nicht angeboten
- **AND** ohne jede Portion ist „Hinzufügen“ deaktiviert und ein Hinweis erklärt, dass zuerst eine Portion angelegt werden muss

#### Scenario: Personenzahl nach Öffnen des Editors ändern
- **GIVEN** der Zutateneditor wurde mit einem festgelegten Personen-Kontext geöffnet
- **WHEN** der Nutzer versucht, die Personenzahl zu ändern
- **THEN** bleibt die Personenzahl gesperrt
- **AND** bestehende Mengen werden nicht automatisch in einen anderen Kontext umgerechnet
