## Requirements

### Requirement: Drei-Tab-Ansicht in der Essensplan-Liste

Die Essensplan-Übersichtsseite SHALL die Pläne in drei Kategorien aufteilen: „Meine Pläne", „Geteilt mit mir" und „Referenz-Vorlagen".

#### Scenario: Tab „Meine Pläne"

- **WHEN** ein Nutzer die Essensplan-Liste aufruft
- **THEN** ist „Meine Pläne" der Standard-Tab
- **THEN** zeigt er alle Pläne bei denen der Nutzer Owner ist

#### Scenario: Tab „Geteilt mit mir"

- **WHEN** ein Nutzer den Tab „Geteilt mit mir" öffnet
- **THEN** sieht er alle Pläne die mit ihm geteilt wurden und bei denen er nicht Owner ist

#### Scenario: Tab „Referenz-Vorlagen"

- **WHEN** ein Nutzer den Tab „Referenz-Vorlagen" öffnet
- **THEN** sieht er alle Pläne mit `is_reference=True`
- **THEN** sind diese Pläne read-only für normale Nutzer
- **THEN** kann er einen Referenzplan kopieren um eine eigene Variante zu erstellen

### Requirement: Referenzplan-Markierung durch Admin

Das System SHALL ein `is_reference` Boolean-Feld auf `MealPlan` haben das nur Admins setzen können.

#### Scenario: Admin markiert Plan als Referenz

- **WHEN** ein Admin `MealPlan.is_reference = True` setzt
- **THEN** erscheint der Plan im Tab „Referenz-Vorlagen" für alle Nutzer
- **THEN** ist der Plan mit einem „Referenz"-Badge gekennzeichnet

#### Scenario: Normaler Nutzer kann nicht als Referenz markieren

- **WHEN** ein normaler Nutzer versucht `is_reference` zu setzen
- **THEN** wird der Wert ignoriert (kein Fehler, aber keine Änderung)
