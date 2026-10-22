# Spec Delta

## REMOVED Requirements

### Requirement: Meals without recipes SHALL be visually highlighted as missing
**Reason**: Rot als Fläche widerspricht der Regel „Status mit Rand und Icon, keine großen Farbflächen“. Fehlende Mahlzeiten erscheinen als Warnung.
**Migration**: Siehe „Fehlende Mahlzeit als Warnung mit Rand“.

### Requirement: Add buttons SHALL be green
**Reason**: Die Leitfarbe ist jetzt Petrol; Grün ist entfallen.
**Migration**: Siehe „Hinzufügen-Schaltflächen in Petrol“.

### Requirement: Each meal type SHALL have a distinct accent color
**Reason**: Eigene Akzentfarben je Mahlzeittyp (Orange, Cyan, Indigo, Amber, Pink) kollidieren mit den Rezepttönungen. Mahlzeit-Köpfe sind neutral; der Eintrag trägt die Tönung seines Rezepts.
**Migration**: Siehe „Mahlzeit-Köpfe neutral, Eintrag mit Rezept-Tönung“.

### Requirement: Each meal SHALL display calorie coverage percentage
**Reason**: Die Farbe der Kalorienabdeckung allein ist kein Status. Die Abdeckung bleibt, bekommt aber Text und Icon.
**Migration**: Siehe „Kalorienabdeckung als Status mit Icon“.

### Requirement: Color logic SHALL apply consistently across all tabs
**Reason**: Der Text nennt die grün-basierte Leitfarbe, die es nicht mehr gibt.
**Migration**: Siehe „Statusfarben folgen den Token“.

## ADDED Requirements

### Requirement: Fehlende Mahlzeit als Warnung mit Rand
Eine Mahlzeit ohne Eintrag SHALL als Warnung dargestellt werden: Fläche `--warning-soft`, Rand `--warning-border`, Warn-Icon und der Text „Noch kein Rezept zugeordnet“. Es DARF KEINE rote Fläche geben.

#### Scenario: Leere Mahlzeit
- **WHEN** eine Mahlzeit keinen Eintrag hat
- **THEN** zeigt sie Warnfläche, Warnrand, Warn-Icon und den Text „Noch kein Rezept zugeordnet“

### Requirement: Hinzufügen-Schaltflächen in Petrol
Alle Hinzufügen-Schaltflächen (Rezept, Mahlzeit, Tag) SHALL die Nebenaktion verwenden: Fläche `--primary-soft`, Schrift `--primary-dark`.

#### Scenario: Rezept hinzufügen
- **WHEN** die Schaltfläche „Rezept hinzufügen“ gerendert wird
- **THEN** hat sie die Fläche `--primary-soft` und die Schrift `--primary-dark`

### Requirement: Mahlzeit-Köpfe neutral, Eintrag mit Rezept-Tönung
Der Kopf jeder Mahlzeit SHALL neutral bleiben (Text und Uhrzeit auf `--card`). Ein Eintrag mit Rezept trägt die Kategorie-Tönung seines Rezepttyps.

#### Scenario: Frühstück im Plan
- **WHEN** ein Frühstück mit Overnight Oats geplant ist
- **THEN** ist der Kopf „Frühstück · 8:00“ neutral und der Eintrag „Overnight Oats“ trägt die Tönung „Frühstück“

### Requirement: Kalorienabdeckung als Status mit Icon
Die Kalorienabdeckung einer Mahlzeit SHALL als Prozentwert mit Statusdarstellung erscheinen: unter 80 % oder über 120 % als Warnung, unter 50 % oder über 150 % als Fehler, sonst als gut. Jeder Status MUST ein Icon und einen Rand haben.

#### Scenario: Mahlzeit gut abgedeckt
- **WHEN** die Abdeckung 100 % beträgt
- **THEN** zeigt sie „100 %“ mit Erfolgsfläche, Erfolgsrand und Häkchen

#### Scenario: Mahlzeit deutlich unter Ziel
- **WHEN** die Abdeckung 40 % beträgt
- **THEN** zeigt sie „40 %“ mit Fehlerfläche, Fehlerrand und Warn-Icon

### Requirement: Statusfarben folgen den Token
Die Statusdarstellung in Tabelle, Kosten, Einkaufsliste und Cockpit SHALL die Status-Token (`--success`, `--warning`, `--danger`) mit Rand und Icon verwenden und die Kontrastregeln erfüllen. Die Leitfarbe ist Petrol.

#### Scenario: Tabellenzelle ohne Rezept
- **WHEN** eine Zelle in der Tabelle eine Mahlzeit ohne Rezept darstellt
- **THEN** zeigt sie die Warnstatus-Darstellung mit Icon und Rand

#### Scenario: Kosten mit unvollständigen Preisen
- **WHEN** Kostendaten unbepreiste Zutaten haben
- **THEN** wird die Lücke als Warnung mit Icon hervorgehoben
