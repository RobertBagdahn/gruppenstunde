## ADDED Requirements

### Requirement: description wird zum generierten Feld
Sobald ein Rezept strukturierte Steps hat, SHALL `Content.description` weiterhin als Kompatibilitäts-/SEO-Text aus den Steps generiert werden können. Die Konsumenten MUST jedoch strukturierte Steps als separate Zubereitungsschritte darstellen und dürfen den generierten Text nicht als einzige Schrittquelle behandeln.

#### Scenario: Rezept hat strukturierte Schritte und Beschreibung
- **WHEN** ein Rezept beide Datenquellen besitzt
- **THEN** die API SHALL beide Felder liefern
- **THEN** Detailseite und PDF SHALL Beschreibung und Schritte getrennt darstellen

#### Scenario: Rezept wird per API mit Steps erstellt
- **WHEN** ein Rezept mit Steps gespeichert wird
- **THEN** die Steps SHALL gespeichert werden
- **THEN** ein kompatibler Description-Text DARF generiert werden
