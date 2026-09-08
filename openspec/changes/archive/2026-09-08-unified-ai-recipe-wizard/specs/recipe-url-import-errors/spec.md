## ADDED Requirements

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

## MODIFIED Requirements

### Requirement: Verständliche deutsche Fehlertexte im Import-Dialog
Das System SHALL im vereinheitlichten Wizard (`frontend-food/src/components/recipe/`) je `error_code` einen passenden, handlungsleitenden deutschen Text anzeigen. Für unbekannte Codes SHALL ein generischer Fallback-Text angezeigt werden. Die entfernte Seite `RecipeImportPage.tsx` ist nicht mehr Bestandteil dieser Anforderung.

#### Scenario: Text bei blockierter Quelle
- **WHEN** die Analyse `IMPORT_SOURCE_UNREACHABLE` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der erklärt, dass die Seite nicht abrufbar ist und auch die Websuche nichts gefunden hat, und eine Handlungsalternative nennt

#### Scenario: Text bei nicht verfügbarer KI
- **WHEN** die Analyse `IMPORT_AI_UNAVAILABLE` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der auf die vorübergehende Nichtverfügbarkeit hinweist

#### Scenario: Text bei fehlenden Rezeptdaten
- **WHEN** die Analyse `IMPORT_NO_RECIPE_FOUND` zurückgibt
- **THEN** SHALL der Wizard einen deutschen Text anzeigen, der zum Prüfen des Links oder zur manuellen Eingabe auffordert

#### Scenario: Unbekannter Fehlercode
- **WHEN** die Analyse einen unbekannten `error_code` zurückgibt
- **THEN** SHALL ein generischer deutscher Fallback-Text angezeigt werden

#### Scenario: Nutzer bleibt im Eingabeschritt
- **WHEN** ein beliebiger Analysefehler auftritt
- **THEN** SHALL der Nutzer im Smart-Eingabe-Schritt bleiben
- **THEN** SHALL kein teilweise erstelltes Rezept zurückbleiben
