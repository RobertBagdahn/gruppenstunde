## ADDED Requirements

### Requirement: Term-Normalisierung via deutsches Stemming
Das System SHALL eine Normalisierungs-Utility bereitstellen, die einen deutschen Begriff auf eine sprachlich normalisierte Form (Stamm) abbildet, sodass Singular- und Pluralformen (inkl. häufiger unregelmäßiger Plurale wie „Apfel"/„Äpfel") auf dieselbe Form abgebildet werden.

#### Scenario: Regelmäßiger Plural
- **WHEN** „Zwiebel" und „Zwiebeln" normalisiert werden
- **THEN** SHALL beide dieselbe normalisierte Form ergeben

#### Scenario: Unregelmäßiger Plural
- **WHEN** „Apfel" und „Äpfel" normalisiert werden
- **THEN** SHALL beide dieselbe normalisierte Form ergeben

### Requirement: Singular/Plural-robustes Zutaten-Matching
Das System SHALL beim Zuordnen von Zutaten (KI-Vorschläge und Import) zusätzlich zum exakten Namens- und Alias-Match einen Vergleich der normalisierten Formen durchführen. Der exakte Name/Alias hat dabei stets Vorrang; die normalisierte Übereinstimmung dient als zusätzlicher Match-Pfad.

#### Scenario: Match über normalisierte Form
- **WHEN** eine Zutat „Zwiebel frisch" existiert und die KI „Zwiebeln" vorschlägt
- **THEN** SHALL das System „Zwiebeln" der bestehenden Zutat zuordnen, statt eine neue Zutat anzulegen

#### Scenario: Exakter Match hat Vorrang
- **WHEN** sowohl ein exakter Alias-Treffer als auch ein abweichender Stemming-Treffer möglich wären
- **THEN** SHALL der exakte Treffer gewählt werden

### Requirement: Singular/Plural-robuste Duplikat-/Dedup-Erkennung
Das System SHALL bei der Deduplizierung von KI-Vorschlägen gegen bereits im Rezept/Plan vorhandene Zutaten die normalisierten Formen vergleichen, sodass „Zwiebel" und „Zwiebeln" als dieselbe Zutat erkannt und nicht doppelt vorgeschlagen werden.

#### Scenario: Kein Doppelvorschlag bei Plural
- **WHEN** ein Rezept bereits die Zutat „Zwiebel" enthält und die KI „Zwiebeln" vorschlägt
- **THEN** SHALL die KI-Vorschlagsliste „Zwiebeln" als bereits vorhanden behandeln und nicht erneut vorschlagen

### Requirement: Schutz vor Übergeneralisierung
Das System SHALL die normalisierte Übereinstimmung niemals als alleiniges Kriterium für eine Zusammenführung verwenden; bei reiner Stemming-Übereinstimmung ohne exakten/Alias-Treffer SHALL die Zuordnung als Vorschlag behandelt und nicht automatisch zusammengeführt werden.

#### Scenario: Kritisches Wortpaar wird nicht fälschlich gemerged
- **WHEN** „Tomate" und „Tomatenmark" geprüft werden und nur die Stemming-Form ähnlich ist
- **THEN** SHALL das System sie NICHT automatisch als dieselbe Zutat zusammenführen
