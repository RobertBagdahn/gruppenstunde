## MODIFIED Requirements

### Requirement: Korrekte Ampel-Richtung für Ballaststoffe, Zucker und Protein

Die Seed-Regeln für Nährwert-Ampeln SHALL ausschließlich sinnvolle Richtungen für den Pfadfinderlager-Kontext implementieren: Ballaststoffe nur Minimum, Zucker nur Maximum, Protein nur Minimum. „Zu viele Ballaststoffe" ist kein Pfadfinder-Problem und DARF NICHT als Warnung erscheinen.

#### Scenario: Ballaststoffe — nur Minimum-Regel

- **WHEN** ein Rezept ausgewertet wird dessen Ballaststoffgehalt unter dem Mindestwert liegt
- **THEN** zeigt die Ampel eine Warnung „Zu wenig Ballaststoffe"
- **WHEN** ein Rezept ausgewertet wird dessen Ballaststoffgehalt über einem Maximum liegt
- **THEN** zeigt die Ampel KEINE Warnung (kein Maximum für Ballaststoffe)

#### Scenario: Zucker — nur Maximum-Regel

- **WHEN** ein Rezept ausgewertet wird dessen Zuckergehalt über dem Maximalwert liegt
- **THEN** zeigt die Ampel eine Warnung „Zu viel Zucker"
- **WHEN** ein Rezept ausgewertet wird dessen Zuckergehalt sehr niedrig ist
- **THEN** zeigt die Ampel KEINE Warnung (kein Minimum für Zucker)

#### Scenario: Protein — nur Minimum-Regel

- **WHEN** ein Rezept ausgewertet wird dessen Proteingehalt unter dem Mindestwert liegt
- **THEN** zeigt die Ampel eine Warnung „Zu wenig Protein"
- **WHEN** ein Rezept ausgewertet wird dessen Proteingehalt sehr hoch ist
- **THEN** zeigt die Ampel KEINE Warnung (kein Maximum für Protein)
