## ADDED Requirements

### Requirement: Darstellung reiner Untergrenzen-Nährstoffe als Mindest-Schwelle
Das System SHALL Nährstoffe ohne definiertes Maximum (z.B. Ballaststoffe) im Nährwert-Diagramm als Mindest-Schwelle darstellen, sodass Werte über dem Minimum als erreicht/gut und NICHT als Überschreitung („zu viel") erscheinen.

#### Scenario: Ballaststoffe über Minimum
- **WHEN** der Ballaststoff-Ist-Wert über dem Mindestwert (z.B. 30 g bei Minimum 25 g) liegt
- **THEN** SHALL die Darstellung dies als erreicht/positiv kennzeichnen
- **AND** SHALL NICHT als „zu viel"/Überschreitung dargestellt werden

#### Scenario: Ballaststoffe unter Minimum
- **WHEN** der Ballaststoff-Ist-Wert unter dem Mindestwert liegt
- **THEN** SHALL die Darstellung das Unterschreiten der Mindest-Schwelle kennzeichnen

#### Scenario: Obergrenzen-Nährstoffe unverändert
- **WHEN** ein Nährstoff mit definiertem Maximum (z.B. Zucker, Salz) dargestellt wird
- **THEN** SHALL er weiterhin mit Obergrenze dargestellt werden und ein Überschreiten als „zu viel" kennzeichnen

### Requirement: Keine veralteten Maximum-Schwellen für reine Untergrenzen-Nährstoffe
Das System SHALL sicherstellen, dass für reine Untergrenzen-Nährstoffe (insbesondere Ballaststoffe) keine Rule mit gesetztem Maximum (`max_green`/`max_yellow`) wirksam ist.

#### Scenario: Datenhygiene Ballaststoff-Rules
- **WHEN** die Rules nach dem Bereinigungs-/Seed-Schritt geprüft werden
- **THEN** SHALL keine `fibre_g`-Rule ein Maximum (`max_green` oder `max_yellow`) gesetzt haben

#### Scenario: Keine zu-viel-Ampel bei Ballaststoffen
- **WHEN** der Ballaststoff-Ist-Wert über dem Mindestwert liegt
- **THEN** SHALL die Ampelbewertung NICHT „gelb" oder „rot" wegen Überschreitung ergeben
