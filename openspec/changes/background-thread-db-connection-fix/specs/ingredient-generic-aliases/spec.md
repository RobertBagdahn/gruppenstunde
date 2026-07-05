## ADDED Requirements

### Requirement: Eindeutigkeit pro Zutat
Das System SHALL verhindern, dass für dieselbe Zutat zweimal derselbe Alias-Name (case-insensitive) angelegt wird — unabhängig vom `is_generic`-Flag. Dies wird durch einen Datenbank-`UniqueConstraint` auf (`ingredient`, `Lower(name)`) durchgesetzt, nicht nur durch eine applikationsseitige Prüfung.

#### Scenario: Doppelter Alias-Name für dieselbe Zutat wird abgelehnt
- **WHEN** für die Zutat „Fusilli trocken" bereits ein Alias „Nudeln" existiert
- **AND** derselbe Alias-Name „nudeln" (andere Groß-/Kleinschreibung) erneut für „Fusilli trocken" angelegt werden soll
- **THEN** SHALL das System die Anlage ablehnen, auch wenn `is_generic = true` gesetzt ist

#### Scenario: Paralleler Request erzeugt kein stilles Duplikat
- **GIVEN** zwei parallele Requests legen gleichzeitig denselben Alias-Namen für dieselbe Zutat an
- **WHEN** beide Requests die applikationsseitige Duplikat-Prüfung passieren, bevor der erste committed hat
- **THEN** SHALL die Datenbank-Constraint den zweiten Schreibversuch mit einem Fehler ablehnen
- **AND** SHALL das System diesen Fehler in eine verständliche 409-Fehlermeldung übersetzen, statt ihn unbehandelt durchzureichen

#### Scenario: Gleicher generischer Alias an verschiedenen Zutaten bleibt erlaubt
- **WHEN** ein generischer Alias „Nudeln" (`is_generic = true`) für die Zutat „Fusilli trocken" existiert
- **AND** derselbe generische Alias „Nudeln" für die Zutat „Spaghetti" angelegt wird
- **THEN** SHALL das System beide Aliase akzeptieren (unverändert gegenüber bestehendem Verhalten — die neue Constraint gilt pro Zutat, nicht global)
