## ADDED Requirements

### Requirement: Einheitlicher Warengruppen-Katalog als Single Source of Truth
Das System SHALL einen einzigen Warengruppen-Katalog (Name, rank) als gemeinsame Datenquelle bereitstellen, die Seed, automatisches Zuordnungs-Mapping und Legacy-Import gemeinsam verwenden. Der Katalog baut auf den real existierenden Warengruppen-Namen auf und ergänzt die im Mapping verwendeten, aber bisher fehlenden Namen.

#### Scenario: Seed nutzt den Katalog
- **WHEN** der Seed ausgeführt wird
- **THEN** SHALL er genau die Warengruppen aus dem Katalog (mit deren rank) anlegen bzw. sicherstellen

#### Scenario: Legacy-Import nutzt den Katalog
- **WHEN** der Legacy-Import RetailSections anlegt
- **THEN** SHALL er denselben Katalog verwenden und keine abweichenden Namen erzeugen

### Requirement: Vollständige Mapping-Abdeckung
Das System SHALL sicherstellen, dass jeder im automatischen Zuordnungs-Mapping verwendete Warengruppen-Zielname als Warengruppe existiert, sodass keine Zutat mangels existierender Zielgruppe ohne Warengruppe bleibt.

#### Scenario: Konsistenz Mapping zu Katalog
- **WHEN** die Menge der Mapping-Zielnamen mit den Katalognamen verglichen wird
- **THEN** SHALL jeder Mapping-Zielname im Katalog enthalten sein

#### Scenario: Zuvor fehlende Zielgruppe vorhanden
- **WHEN** eine Zutat mit einem Keyword angelegt wird, dessen Mapping-Ziel bisher fehlte (z.B. „Linsen" → „Hülsenfrüchte & Nüsse")
- **THEN** SHALL die Zielgruppe existieren und der Zutat zugeordnet werden

### Requirement: Getrennte Warengruppen für alkoholische und alkoholfreie Getränke
Das System SHALL zwei klar benannte Getränke-Warengruppen führen: „Alkoholfreie Getränke" und „Alkoholische Getränke". Die bisherige generische Gruppe „Getränke" SHALL zu „Alkoholfreie Getränke" umbenannt werden, sodass ihre bestehenden Zutaten erhalten bleiben.

#### Scenario: Bier korrekt eingeordnet
- **WHEN** eine Zutat „Bier" zugeordnet wird
- **THEN** SHALL sie der Warengruppe „Alkoholische Getränke" zugeordnet werden

#### Scenario: Saft als alkoholfrei eingeordnet
- **WHEN** eine Zutat „Saft" zugeordnet wird
- **THEN** SHALL sie der Warengruppe „Alkoholfreie Getränke" zugeordnet werden
- **AND** SHALL sie NICHT der Warengruppe „Alkoholische Getränke" zugeordnet werden

#### Scenario: Umbenennung erhält Bestandszutaten
- **WHEN** die bestehende Gruppe „Getränke" zu „Alkoholfreie Getränke" umbenannt wird
- **THEN** SHALL die bisher zugeordneten Zutaten in der umbenannten Gruppe verbleiben

### Requirement: Auffanggruppe für nicht zuordenbare Zutaten
Das System SHALL eine Auffang-Warengruppe „Sonstiges" bereitstellen. Beim automatischen Re-Mapping SHALL jede Zutat, die über das Keyword-Mapping keiner Gruppe zugeordnet werden kann, „Sonstiges" erhalten, statt ohne Warengruppe zu bleiben.

#### Scenario: Unzuordenbare Zutat
- **WHEN** eine bisher unzugeordnete Zutat über kein Keyword gemappt werden kann
- **THEN** SHALL ihr die Warengruppe „Sonstiges" zugeordnet werden

#### Scenario: Zuordenbare Zutat wird gemappt
- **WHEN** eine bisher unzugeordnete Zutat über ein Keyword gemappt werden kann
- **THEN** SHALL ihr die passende Warengruppe (nicht „Sonstiges") zugeordnet werden

### Requirement: Laden-Rundgang-Reihenfolge statt rank 0
Das System SHALL allen Warengruppen einen `rank` gemäß einer an einem Supermarkt-Rundgang orientierten Reihenfolge zuweisen (nicht `rank = 0` für alle), sodass Einkaufslisten in sinnvoller Reihenfolge gruppiert werden.

#### Scenario: Warengruppen haben unterschiedliche ranks
- **WHEN** die Warengruppen nach Anwendung des Katalogs abgefragt werden
- **THEN** SHALL nicht alle Warengruppen `rank = 0` haben
- **AND** SHALL die Einkaufslisten-Gruppierung dem rank folgen

### Requirement: Bestehende Warengruppen bleiben erhalten
Das System SHALL die bereits existierenden Warengruppen-Namen beibehalten und lediglich fehlende Gruppen ergänzen sowie ranks/Zuordnungen angleichen, ohne bestehende Gruppen umzubenennen.

#### Scenario: Bestandsgruppe unverändert
- **WHEN** der Katalog/die Datenmigration angewendet wird
- **THEN** SHALL eine zuvor existierende Warengruppe (z.B. „Gemüse") weiterhin unter demselben Namen existieren
