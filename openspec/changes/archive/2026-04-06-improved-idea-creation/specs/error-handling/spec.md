## ADDED Requirements

### Requirement: KI-spezifische Fehlercodes

Das System MUST KI-spezifische Fehlercodes als Erweiterung des Standard-Fehlerformats unterstützen.

#### Scenario: KI-Fehler-Response-Format

- GIVEN ein KI-Endpunkt, der einen Fehler zurückgibt
- WHEN der Client die Antwort empfängt
- THEN hat die Antwort folgendes erweitertes Format:
  ```json
  {
    "detail": "Deutsche Fehlermeldung",
    "error_code": "AI_TIMEOUT"
  }
  ```
- AND der HTTP-Statuscode entspricht dem Fehlertyp

#### Scenario: KI-Fehlercode-Tabelle

- GIVEN ein Fehler in einem KI-Endpunkt
- THEN werden folgende Fehlercodes und HTTP-Statuscodes verwendet:
  - `AI_TIMEOUT` (504) — KI-Verarbeitung hat den Timeout überschritten
  - `AI_UNAVAILABLE` (503) — KI-Dienst ist nicht erreichbar
  - `AI_INVALID_RESPONSE` (502) — KI hat ungültige Daten zurückgegeben
  - `AI_INTERNAL_ERROR` (500) — Unerwarteter Fehler im KI-Dienst
- AND jeder Fehlercode ist maschinenlesbar (UPPER_SNAKE_CASE)
- AND jede Fehlermeldung ist auf Deutsch und enthält den Hinweis "oder erstelle die Idee manuell"
