# food-runtime-capacity Specification

## Purpose
Anforderungen an food runtime capacity: Cloud Run database connections stay within the database budget; Ingredient distribution processing has bounded resource use; Backend capacity failures are observable.
## Requirements
### Requirement: Cloud Run database connections stay within the database budget
The deployment configuration SHALL declare a database-connection envelope that accounts for Cloud Run maximum instances, request concurrency, Gunicorn workers and threads, background workers, and Django connection lifetime. A capacity-check command MUST compare the configured application maximum with the database connection limit and an explicit reserve. The GitHub Actions deploy workflow (the single production pipeline), `Dockerfile.backend`, the Terraform defaults and the Makefile MUST use consistent values; proposed defaults MUST NOT be represented as production-validated until measured.

#### Scenario: Capacity preflight exceeds the declared budget
- **WHEN** the capacity-check command calculates a maximum application connection count above the database budget
- **THEN** the command SHALL exit with an error that identifies the capacity mismatch
- **THEN** the configured maximum and reserve SHALL be included in its report

#### Scenario: Short-lived and background database work
- **WHEN** a request or background task completes
- **THEN** its database connection SHALL be released according to the configured connection policy
- **THEN** background task concurrency SHALL be included in the same connection budget

### Requirement: Ingredient distribution processing has bounded resource use
Ingredient-statistics distribution endpoints SHALL process verified ingredient data with bounded peak memory and a bounded number of concurrent expensive computations. They MUST NOT materialize unbounded duplicate representations of the full ingredient dataset per request when database-side aggregation or bounded iteration can provide the required result.

#### Scenario: Concurrent distribution requests
- **WHEN** multiple distribution requests for different fields run concurrently against the complete ingredient dataset
- **THEN** each request SHALL stay within its declared memory budget
- **THEN** load SHALL NOT cause the backend container to exceed its memory limit

### Requirement: Backend capacity failures are observable
The backend SHALL emit structured operational signals for database connection saturation and container memory pressure, including service/revision and request correlation where applicable, without logging credentials or user-submitted private content.

#### Scenario: Database capacity approaches its budget
- **WHEN** available database connection capacity crosses the configured warning threshold
- **THEN** operators SHALL be able to identify the affected service and revision before requests begin failing

### Requirement: Lastprobe vor Kapazitätsänderungen
Das Projekt SHALL eine wiederholbare Lastprobe für das Gruppeneinkauf-Szenario bereitstellen (`scripts/loadtest/shopping_group.py`) und deren Ergebnis vor jeder Änderung der Backend-Laufzeitlimits (Concurrency, Gunicorn-Worker und -Threads, maximale Instanzen) und vor jedem Release mit Änderung an `backend/shopping` dokumentieren. Die Probe MUST Geräteanzahl, Pulse-Takt, Abhaken-Takt und Dauer als Parameter nehmen und je Endpunkt Requests, Statuscodes, p50, p95 und Maximum ausgeben. Die Standardparameter MUST 6 Geräte, 5 s Pulse-Takt, 1 Abhaken je 10 s und 10 Minuten sein. Die Probe SHALL im Einkaufsmodus arbeiten (Pulse, bei geänderter Marke `GET …/board/`; optional der Vollabruf) und gegen einen lokalen, produktionsnahen Stack laufen (Container aus `Dockerfile.backend` mit den Limits aus `deploy.yml`); eine Ausführung gegen Produktion MUST ausdrücklich freigegeben sein und außerhalb der Nutzungszeit stattfinden. Sie gilt als bestanden bei 0 Antworten mit 429, p95 des Board-Abgleichs unter 1 s und p95 des Vollabrufs unter 3 s.

#### Scenario: Probe besteht
- **GIVEN** der lokale Stack läuft mit den Limits aus `deploy.yml`
- **WHEN** die Probe mit den Standardparametern läuft
- **THEN** meldet sie 0 × 429, p95 des Board-Abgleichs unter 1 s und p95 des Vollabrufs unter 3 s
- **AND** sie beendet sich mit Exit-Code 0

#### Scenario: Probe scheitert
- **WHEN** mindestens eine Antwort mit 429 eintrifft oder ein p95-Wert überschritten wird
- **THEN** beendet sich die Probe mit Exit-Code 1 und nennt die verletzte Schwelle

#### Scenario: Andere Parameter
- **WHEN** die Probe mit `--devices 10 --duration 300` gestartet wird
- **THEN** simuliert sie 10 Geräte für 5 Minuten und gibt dieselben Kennzahlen aus

#### Scenario: Produktion nur mit Freigabe
- **WHEN** die Probe mit einer Produktions-URL gestartet wird, ohne dass `--confirm-production` gesetzt ist
- **THEN** bricht sie ab und gibt eine Fehlermeldung aus
