# material-list Specification

## Purpose
TBD - created by archiving change recipe-materials-consumables. Update Purpose after archive.
## Requirements
### Requirement: Materialliste erzeugen
Das System SHALL eine nicht gespeicherte Materialliste aus einem Rezept (mit gewählten Portionen), einem Essens-/Kochplan oder einer bestehenden Einkaufsliste berechnen. Die Liste enthält Geräte und Verbrauchsmaterial in getrennten Gruppen.

#### Scenario: Einzelnes Rezept
- **GIVEN** ein Rezept mit „1 Pappteller pro Portion“ und „1 Topf“
- **WHEN** die Materialliste für 8 Portionen angefordert wird
- **THEN** enthält sie 8 Pappteller (Verbrauchsmaterial) und 1 Topf (Gerät)

#### Scenario: Einkaufsliste als Quelle
- **WHEN** die Materialliste einer Einkaufsliste angefordert wird, die aus einem Plan entstand
- **THEN** wird sie aus den Rezepten und Portionen dieser Quelle berechnet

#### Scenario: Keine Berechtigung
- **WHEN** ein Nutzer ohne Zugriff auf den Plan die Liste anfordert
- **THEN** antwortet die API mit HTTP 404 (Plan nicht auffindbar) oder 403

### Requirement: Zusammenfassen
Verbrauchsmaterial MUST über Rezepte summiert werden; bei Geräten MUST das Maximum über die Rezepte gelten. Jeder Eintrag SHALL die Rezepte nennen, die ihn benötigen.

#### Scenario: Geräte
- **GIVEN** zwei Rezepte benötigen je 1 Topf
- **WHEN** die Liste berechnet wird
- **THEN** steht dort 1 Topf mit beiden Rezepten

#### Scenario: Verbrauchsmaterial
- **GIVEN** zwei Rezepte benötigen je 20 Zahnstocher
- **WHEN** die Liste berechnet wird
- **THEN** stehen dort 40 Zahnstocher

### Requirement: Ausgabe
Die Materialliste SHALL in der App ansehbar, über die Druckansicht als PDF speicherbar und als Text kopier-/teilbar sein. Abhaken MUST nur lokal im Browser gespeichert werden und darf nicht an den Server gesendet werden.

#### Scenario: Text kopieren
- **WHEN** der Nutzer „Kopieren“ wählt
- **THEN** liegt ein Text mit den Gruppen „Geräte“ und „Verbrauchsmaterial“ in der Zwischenablage

#### Scenario: Abhaken
- **WHEN** der Nutzer einen Eintrag abhakt und die Seite neu lädt
- **THEN** bleibt der Haken erhalten, ohne dass ein Server-Request erfolgt

#### Scenario: Leere Liste
- **WHEN** kein Rezept Material hat
- **THEN** zeigt die Ansicht „Kein Material nötig“
