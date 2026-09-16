## MODIFIED Requirements

### Requirement: Warnung wenn Packung kein weight_g hat
Das System SHALL historische oder noch nicht reparierte Packungsportionen ohne `weight_g` im UI deutlich als Reparaturfall anzeigen. Neue aktive Packungsportionen ohne positives `weight_g` dürfen nicht gespeichert werden. Der Portions-Zauberstab SHALL eine Vorschau und einen Reparaturweg anbieten.

#### Scenario: Historische Packung ohne weight_g
- **WHEN** die Zutat-Detailseite eine bestehende „Packung“-Portion ohne `weight_g` anzeigt
- **THEN** SHALL ein gelbes Warn-Banner oder Badge „Packungsgewicht fehlt“ sichtbar sein
- **THEN** SHALL ein berechtigter User den Portions-Zauberstab zur Reparatur öffnen können

#### Scenario: Neue Packung ohne weight_g
- **WHEN** ein User eine neue Packungsportion ohne positives `weight_g` speichern will
- **THEN** SHALL das Backend HTTP 422 zurückgeben
- **THEN** SHALL keine aktive Packungsportion angelegt werden

### Requirement: KI schätzt weight_g für Stück und Packung
Das System SHALL beim Portions-Zauberstab zutatenspezifische Gewichtsvorschläge für passende Stück- und Packungsportionen anfordern. Die KI darf keinen Wert liefern, wenn eine Portion fachlich nicht sinnvoll ist; in diesem Fall muss die Vorschau eine manuelle positive Eingabe oder eine ausdrückliche Löschung ohne Ersatz verlangen.

#### Scenario: KI schlägt Stückgewicht vor
- **WHEN** der Portions-Zauberstab für eine stückbare Zutat wie „Apfel“ aufgerufen wird
- **THEN** SHALL die Vorschau einen positiven Gewichtsvorschlag für „Stück“ oder eine passende Größenvariante enthalten
- **THEN** SHALL der Vorschlag vor dem Speichern bestätigt werden müssen

#### Scenario: KI gibt kein sinnvolles Gewicht zurück
- **WHEN** die KI für eine vorgeschlagene Portion keinen sinnvollen Wert liefern kann
- **THEN** SHALL die Vorschau ein positives manuelles Gewichtsfeld oder die Option „ohne Ersatz löschen“ anbieten
- **THEN** SHALL keine gewichtlose aktive Portion gespeichert werden
