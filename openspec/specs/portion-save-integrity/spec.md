# portion-save-integrity Specification

## Purpose
Save pipeline integrity for recipe items: invalid quantities are rejected with 422 instead of crashing, the frontend never sends 0/NaN, and rows honestly display unknown weights.

## Requirements

### Requirement: PATCH-Validierung lehnt ungueltige Mengen mit 422 ab

Der Endpoint `PATCH /api/recipes/{recipe_id}/recipe-items/{item_id}/` SHALL Mengen `<= 0` mit HTTP 422 und der Meldung "Menge muss größer als 0 sein." ablehnen. Er SHALL dabei niemals mit einem 500er-Crash (DB-Constraint-Violation) antworten. Nicht-endliche Werte (NaN) SHALL waehrend der Schema-Validierung mit 422 abgelehnt werden.

#### Scenario: Menge 0 wird abgelehnt
- **WHEN** ein authentifizierter Nutzer mit Bearbeitungsrecht einen PATCH mit `{"quantity": 0}` sendet
- **THEN** antwortet die API mit HTTP 422 und der Meldung "Menge muss größer als 0 sein."
- **THEN** es SHALL kein HTTP-500 aufgezeichnet werden und der Datenbestand bleibt unveraendert

#### Scenario: Negative Menge wird abgelehnt
- **WHEN** ein PATCH mit `{"quantity": -3}` gesendet wird
- **THEN** antwortet die API mit HTTP 422 und identischer Meldung

#### Scenario: Null-Menge wird als unveraendert behandelt
- **WHEN** ein PATCH mit `{"quantity": null}` gesendet wird
- **THEN** wird die Menge ignoriert (Feld bleibt unveraendert) und andere Felder des PATCH werden normal gespeichert

#### Scenario: Gueltige Menge wird gespeichert
- **WHEN** ein PATCH mit `{"quantity": 1.5}` gesendet wird
- **THEN** antwortet die API mit HTTP 200 und der aktualisierten RecipeItem-Ressource

### Requirement: Frontend sendet niemals 0 oder NaN als Menge

Die Persistenzlogik (`toPersistedRecipeItemQuantity`) SHALL vor dem Senden pruelen, dass die Menge endlich und groesser als 0 ist. Liefert die Berechnung 0/NaN, SHALL stattdessen die Fallback-Menge 1 verwendet werden. Regulaere Eingaben duerfen dabei nicht veraendert werden.

#### Scenario: NaN-Ergebnis wird abgefangen
- **WHEN** die Gramm-Verhaeltnis-Berechnung fuer ein Item 0/NaN ergibt (z. B. ungewichtete Portion mit `baseWeightG: 0`)
- **THEN** sendet der PATCH `quantity: 1` statt `null`/`0`
- **THEN** es erscheint kein HTTP-500 und kein Datenbank-Crash

#### Scenario: Normale Eingaben bleiben unveraendert
- **WHEN** ein Item eine gueltige Menge wie 1,5 besitzt
- **THEN** wird 1,5 unveraendert gesendet

### Requirement: Anzeige "Gewicht unbekannt" statt "= 0 g"

Ist fuer ein Item kein Gewicht bekannt (backend-seitig `weight_g == 0` bzw. Portion ohne vertrauenswuerdiges Gewicht), SHALL die Editor-Zeile statt "= 0 g" ein Warn-Icon mit dem Text "Gewicht unbekannt" anzeigen.

#### Scenario: Ungewichtete Portion in der Zeile
- **WHEN** ein Item mit `is_weight_trusted: false` geladen wird
- **THEN** zeigt die Gewichtsspalte "Gewicht unbekannt" mit Warn-Kennzeichnung statt "= 0 g"

#### Scenario: Gewichtete Portion in der Zeile
- **WHEN** ein Item ein bekanntes Gewicht hat
- **THEN** zeigt die Gewichtsspalte weiterhin den berechneten Grammwert ("= 150 g")
