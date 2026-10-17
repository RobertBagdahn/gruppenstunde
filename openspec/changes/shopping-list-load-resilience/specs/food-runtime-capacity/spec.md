## ADDED Requirements

### Requirement: Lastprobe vor Kapazitätsänderungen
Das Projekt SHALL eine wiederholbare Lastprobe für das Gruppeneinkauf-Szenario bereitstellen (`scripts/loadtest/shopping_group.py`) und deren Ergebnis vor jeder Änderung der Backend-Laufzeitlimits (Concurrency, Gunicorn-Worker und -Threads, maximale Instanzen) und vor jedem Release mit Änderung an `backend/shopping` dokumentieren. Die Probe MUST Geräteanzahl, Pulse-Takt, Abhaken-Takt und Dauer als Parameter nehmen und je Endpunkt Requests, Statuscodes, p50, p95 und Maximum ausgeben. Die Standardparameter MUST 6 Geräte, 5 s Pulse-Takt, 1 Abhaken je 10 s und 10 Minuten sein. Die Probe SHALL gegen einen lokalen, produktionsnahen Stack laufen (Container aus `Dockerfile.backend` mit den Limits aus `deploy.yml`); eine Ausführung gegen Produktion MUST ausdrücklich freigegeben sein und außerhalb der Nutzungszeit stattfinden. Sie gilt als bestanden bei 0 Antworten mit 429, p95 des inkrementellen Abgleichs unter 1 s und p95 des Vollabrufs unter 3 s.

#### Scenario: Probe besteht
- **GIVEN** der lokale Stack läuft mit den Limits aus `deploy.yml`
- **WHEN** die Probe mit den Standardparametern läuft
- **THEN** meldet sie 0 × 429, p95 des Abgleichs unter 1 s und p95 des Vollabrufs unter 3 s
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
