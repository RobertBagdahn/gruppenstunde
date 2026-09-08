## Purpose
Differenzierte und handlungsleitende Fehlerbehandlung für den Rezept-URL-Import einschließlich Grounding-Fallback und Portionskollisionen.

## Requirements

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
Das System SHALL im vereinheitlichten Wizard (`frontend-food/src/components/recipe/`) je `error_code` einen passenden, handlungsleitenden deutschen Text anzeigen. Für unbekannte Codes SHALL ein generischer Fallback-Text angezeigt werden. Die entfernte Seite `RecipeImportPage.tsx` ist nicht mehr Bestandteil dieser Anforderung.

#### Scenario: Text bei blockierter Quelle
- **WHEN** der Import `IMPORT_SOURCE_UNREACHABLE` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der erklärt, dass die Seite nicht abrufbar ist und auch die Websuche nichts gefunden hat, und eine Handlungsalternative nennt

#### Scenario: Text bei nicht verfügbarer KI
- **WHEN** der Import `IMPORT_AI_UNAVAILABLE` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der auf die vorübergehende Nichtverfügbarkeit hinweist

#### Scenario: Text bei fehlenden Rezeptdaten
- **WHEN** der Import `IMPORT_NO_RECIPE_FOUND` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der zum Prüfen des Links oder zur manuellen Eingabe auffordert

#### Scenario: Fallback für unbekannten Code
- **WHEN** der Import einen unbekannten `error_code` zurückgibt
- **THEN** SHALL ein generischer deutscher Fallback-Text angezeigt werden

### Requirement: Portions-Kollision führt nicht zu einem Serverfehler
Das System SHALL beim Import keine Kollision von Portionsnamen zu einem unbehandelten Serverfehler eskalieren lassen. Ein `IntegrityError` auf der Eindeutigkeit von Portionsnamen MUST NICHT auftreten.

#### Scenario: Zielname bereits vergeben
- **WHEN** der Import eine Portion anlegen möchte, deren Name bei derselben Zutat bereits vergeben ist
- **THEN** SHALL das System einen eindeutigen Namen verwenden
- **THEN** SHALL der Endpunkt mit HTTP 200 antworten
- **THEN** SHALL kein `error_code = "INTERNAL_ERROR"` zurückgegeben werden

#### Scenario: Soft-gelöschte Portion belegt den Namen
- **WHEN** eine soft-gelöschte Portion denselben Namen bei derselben Zutat belegt
- **THEN** SHALL das Anlegen einer neuen aktiven Portion mit diesem Namen zulässig sein
- **THEN** SHALL der Import erfolgreich abschließen

#### Scenario: Wiederholter Import derselben Quelle
- **WHEN** dieselbe Rezept-URL mehrfach hintereinander importiert wird
- **THEN** SHALL jeder Aufruf mit HTTP 200 antworten

### Requirement: Grounding-Fallback vor der Fehlermeldung
Bevor das System `IMPORT_SOURCE_UNREACHABLE` meldet, SHALL es einen Rekonstruktionsversuch über die KI-Websuche unternehmen. Erst wenn auch dieser scheitert, SHALL der Fehler gemeldet werden.

#### Scenario: Grounding rettet den Import
- **WHEN** der direkte Seitenabruf scheitert und die KI-Websuche verwertbare Rezeptdaten liefert
- **THEN** SHALL das System mit HTTP 200 antworten
- **THEN** SHALL die Antwort das Ergebnis als rekonstruiert kennzeichnen
- **THEN** SHALL kein Fehlercode zurückgegeben werden

#### Scenario: Grounding liefert ebenfalls nichts
- **WHEN** weder der direkte Abruf noch die KI-Websuche verwertbare Rezeptdaten liefern
- **THEN** SHALL die Antwort `error_code = "IMPORT_SOURCE_UNREACHABLE"` mit HTTP 422 und deutschem Text enthalten

#### Scenario: KI-Dienst während des Fallbacks nicht verfügbar
- **WHEN** der direkte Abruf scheitert und der KI-Dienst nicht erreichbar ist
- **THEN** SHALL die Antwort `error_code = "IMPORT_AI_UNAVAILABLE"` mit HTTP 503 enthalten

### Requirement: Hinweis auf rekonstruierte Daten in der Oberfläche
Wurde ein Rezept über die KI-Websuche rekonstruiert, SHALL die Oberfläche einen deutschen Hinweis anzeigen, der zur Prüfung der Daten auffordert.

#### Scenario: Rekonstruiertes Ergebnis wird gekennzeichnet
- **WHEN** die Analyse ein als rekonstruiert gekennzeichnetes Ergebnis liefert
- **THEN** SHALL der Wizard einen deutschen Hinweis anzeigen, dass die Daten aus der Websuche stammen und geprüft werden sollten

#### Scenario: Direkt abgerufenes Ergebnis ohne Hinweis
- **WHEN** die Analyse ein direkt abgerufenes Ergebnis liefert
- **THEN** SHALL kein Rekonstruktionshinweis angezeigt werden
