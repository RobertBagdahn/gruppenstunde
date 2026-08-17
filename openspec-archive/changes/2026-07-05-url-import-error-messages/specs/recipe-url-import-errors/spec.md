## ADDED Requirements

### Requirement: Differenzierte Fehlertypen beim Rezept-URL-Import
Das System SHALL beim Endpoint `POST /api/recipes/import-from-url-enhanced/` Fehlerursachen unterscheiden und maschinenlesbare `error_code`-Werte gemäß dem projektweiten `error-handling`-Format (`{ error_code, detail }`, deutscher `detail`-Text) zurückgeben, statt jeden Fehler als generisches HTTP 422 zu maskieren.

#### Scenario: Quelle nicht ladbar oder blockiert
- **WHEN** die Quellseite nicht geladen werden kann (Verbindungsfehler, Timeout, Bot-Block, HTTP-Fehler der Quelle)
- **THEN** SHALL die Antwort `error_code = "IMPORT_SOURCE_UNREACHABLE"` mit HTTP-Status 422 und einem deutschen `detail`-Text enthalten

#### Scenario: KI-Dienst nicht verfügbar
- **WHEN** der KI-Dienst nicht verfügbar ist (Region nicht unterstützt, Quota erschöpft, Auth-Fehler)
- **THEN** SHALL die Antwort `error_code = "IMPORT_AI_UNAVAILABLE"` mit HTTP-Status 503 und einem deutschen `detail`-Text enthalten

#### Scenario: Seite ladbar, aber keine Rezeptdaten
- **WHEN** die Seite geladen werden konnte, die KI aber keine verwertbaren Rezeptdaten extrahiert
- **THEN** SHALL die Antwort `error_code = "IMPORT_NO_RECIPE_FOUND"` mit HTTP-Status 422 und einem deutschen `detail`-Text enthalten

#### Scenario: Erfolgreicher Import unverändert
- **WHEN** der Import erfolgreich ist
- **THEN** SHALL der Endpoint wie bisher das Rezept-Entwurf-Ergebnis mit HTTP-Status 200 zurückgeben

#### Scenario: Unauthentifizierter Nutzer
- **WHEN** ein unauthentifizierter Nutzer den Endpoint aufruft
- **THEN** SHALL das System HTTP 403 zurückgeben

### Requirement: Keine Maskierung von KI-Fehlern
Das System SHALL `GeminiUnavailableError` und `GeminiAuthError` aus dem KI-Service nicht mehr in ein generisches 422 verpacken, sondern als `IMPORT_AI_UNAVAILABLE` (503) durchreichen. Ein verbleibender, nicht klassifizierbarer Fehler SHALL als `INTERNAL_ERROR` (500) gemäß `error-handling`-Spec beantwortet werden, ohne technische Details (Stacktrace) preiszugeben.

#### Scenario: Gemini-Fehler wird nicht maskiert
- **WHEN** der Import intern einen `GeminiUnavailableError` oder `GeminiAuthError` auslöst
- **THEN** SHALL die Antwort `error_code = "IMPORT_AI_UNAVAILABLE"` (503) sein und NICHT als generisches 422 erscheinen

#### Scenario: Unerwarteter Fehler ohne Detail-Leak
- **WHEN** ein nicht klassifizierbarer interner Fehler auftritt
- **THEN** SHALL die Antwort `error_code = "INTERNAL_ERROR"` (500) mit einem generischen deutschen Text sein
- **AND** SHALL kein Stacktrace oder technische Detailmeldung an den Client gelangen

### Requirement: Verständliche deutsche Fehlertexte im Import-Dialog
Das System SHALL im Frontend-Import-Dialog (`frontend-food/src/pages/recipes/RecipeImportPage.tsx`) je `error_code` einen passenden, handlungsleitenden deutschen Text anzeigen. Für unbekannte Codes SHALL ein generischer Fallback-Text angezeigt werden.

#### Scenario: Text bei blockierter Quelle
- **WHEN** der Import `IMPORT_SOURCE_UNREACHABLE` zurückgibt
- **THEN** SHALL der Dialog einen deutschen Text anzeigen, der erklärt, dass die Seite nicht abrufbar ist, und eine Handlungsalternative nennt (z.B. manuelle Eingabe / andere Quelle)

#### Scenario: Text bei nicht verfügbarer KI
- **WHEN** der Import `IMPORT_AI_UNAVAILABLE` zurückgibt
- **THEN** SHALL der Dialog einen deutschen Text anzeigen, der zu einem späteren erneuten Versuch auffordert

#### Scenario: Text bei fehlenden Rezeptdaten
- **WHEN** der Import `IMPORT_NO_RECIPE_FOUND` zurückgibt
- **THEN** SHALL der Dialog einen deutschen Text anzeigen, der zum Prüfen des Links oder zur manuellen Eingabe auffordert

#### Scenario: Fallback für unbekannten Code
- **WHEN** der Import einen unbekannten `error_code` zurückgibt
- **THEN** SHALL der Dialog einen generischen deutschen Fehlertext anzeigen
