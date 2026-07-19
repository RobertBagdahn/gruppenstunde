## ADDED Requirements

### Requirement: Einheiten-Umschalter pro Zutat im Rezept
Das System MUSS auf der Rezept-Detailseite pro Zutat einen Umschalter anbieten, der die Menge in alternativen Küchenmaßeinheiten anzeigt.

#### Scenario: Zutat mit verfügbaren Umrechnungen
- **WHEN** eine Zutat eine konvertierbare Einheit hat (g oder ml) und Umrechnungen verfügbar sind
- **THEN** MUSS neben der Einheit ein Umschalter-Button angezeigt werden

#### Scenario: Zutat ohne konvertierbare Einheit
- **WHEN** eine Zutat eine nicht-konvertierbare Einheit hat (weder `unit="g"` noch `unit="ml"`)
- **THEN** DARF kein Umschalter-Button angezeigt werden

#### Scenario: Einheit umschalten
- **WHEN** der Nutzer auf den Umschalter klickt und eine alternative Einheit wählt
- **THEN** MUSS die Menge sofort in der gewählten Einheit angezeigt werden, ohne Seitenreload

#### Scenario: Zutat-spezifische Umrechnung vorhanden
- **WHEN** eine zutat-spezifische Umrechnung existiert (z.B. 1 Tasse Reis = 185g)
- **THEN** MUSS diese verwendet werden statt der generischen Umrechnung

#### Scenario: Approximations-Hinweis bei generischer Umrechnung
- **WHEN** die angezeigte Umrechnung generisch ist (nicht zutat-spezifisch)
- **THEN** SOLL ein visueller Hinweis "(ca.)" angezeigt werden

### Requirement: Batch-Laden der verfügbaren Umrechnungen
Das System MUSS alle verfügbaren Umrechnungen für alle Zutaten eines Rezepts in einem einzigen API-Call laden können.

#### Scenario: Rezept-Detailseite wird geladen
- **WHEN** die Rezept-Detailseite geöffnet wird
- **THEN** MUSS das Frontend alle verfügbaren Umrechnungen für alle Zutaten des Rezepts in einem Batch-Request laden

#### Scenario: Kein zusätzlicher API-Call beim Umschalten
- **WHEN** der Nutzer zwischen Einheiten umschaltet
- **THEN** DARF kein zusätzlicher API-Call gemacht werden — die Daten sind bereits geladen
