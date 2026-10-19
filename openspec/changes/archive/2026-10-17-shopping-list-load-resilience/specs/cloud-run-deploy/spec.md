## ADDED Requirements

### Requirement: Preflight vor manuellen Deploys
Der Deploy-Skill SHALL vor jedem manuellen Deploy mit `gcloud` oder `make` prüfen und anzeigen: ob ein CI-Deploy (`deploy.yml`) läuft oder wartet, ob der lokale Stand von `origin/main` abweicht, ob in den letzten 15 Minuten eine Revision entstanden ist (Ersteller und Alter der letzten 5 Revisionen; dasselbe Konto kann aus einer anderen Session stammen, deshalb gilt jede junge Revision als Befund), und, falls die Änderung Scaling- oder Gunicorn-Werte betrifft, die vier Dateien, die gemeinsam zu ändern sind (`deploy.yml`, `Dockerfile.backend`, Terraform, `Makefile`). Der Skill MUST bei jedem Befund eine ausdrückliche Bestätigung verlangen und den Weg „Fix nach `main`, CI deployt“ nennen. Der Skill MUST NICHT ohne diese Bestätigung deployen.

#### Scenario: CI-Deploy läuft
- **GIVEN** ein CI-Deploy von `main` ist in Arbeit
- **WHEN** der Nutzer einen manuellen Deploy startet
- **THEN** zeigt der Skill den Lauf, warnt, dass die CI manuelle Werte überschreibt, und fragt nach Bestätigung

#### Scenario: Branch weicht von main ab
- **GIVEN** der Deploy-Stand ist nicht `origin/main`
- **WHEN** der Preflight läuft
- **THEN** zeigt der Skill die Abweichung und weist darauf hin, dass der nächste CI-Deploy den Stand ersetzt

#### Scenario: Andere Session hat gerade deployt
- **GIVEN** die letzte Revision ist 8 Minuten alt, auch wenn sie vom selben Konto stammt
- **WHEN** der Preflight läuft
- **THEN** nennt der Skill Revision, Ersteller und Alter und fragt nach Bestätigung

#### Scenario: Scaling-Änderung
- **WHEN** die Änderung Concurrency oder maximale Instanzen betrifft
- **THEN** nennt der Skill die vier Dateien und dass `test_runtime_limits` ihre Übereinstimmung erzwingt

#### Scenario: Sauberer Zustand
- **GIVEN** kein CI-Lauf, Stand gleich `origin/main`, keine Revision in den letzten 15 Minuten
- **WHEN** der Preflight läuft
- **THEN** meldet der Skill „keine Befunde“ und deployt nach der üblichen Bestätigung
