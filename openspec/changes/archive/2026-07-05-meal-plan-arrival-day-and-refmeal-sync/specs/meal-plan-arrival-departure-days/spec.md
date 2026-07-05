## ADDED Requirements

### Requirement: Anreise-/Abreisetag als Teiltag
Das System SHALL am ersten Tag eines Essensplans Mahlzeiten, deren Startzeit vor der Plan-Startzeit liegt, nicht anlegen, und am letzten Tag Mahlzeiten, deren Endzeit nach der Plan-Endzeit liegt, nicht anlegen.

#### Scenario: Anreise am späten Nachmittag
- **WHEN** ein Plan mit Startzeit 17:00 am ersten Tag erzeugt wird
- **THEN** SHALL am ersten Tag kein Frühstück und kein Mittagessen angelegt werden
- **AND** SHALL Mahlzeiten ab 17:00 (z.B. Abendessen) angelegt werden

#### Scenario: Abreise am Vormittag
- **WHEN** ein Plan mit Endzeit 11:00 am letzten Tag erzeugt wird
- **THEN** SHALL am letzten Tag kein Mittag- und kein Abendessen angelegt werden
- **AND** SHALL Mahlzeiten bis 11:00 (z.B. Frühstück) angelegt werden

### Requirement: Sinnvolle Default-Zeiten für aus Events erzeugte Pläne
Das System SHALL beim Erzeugen eines Essensplans aus einem Event Start- und Endzeit NICHT auf `00:00` setzen, sondern auf sinnvolle Default-Anreise-/Abreisezeiten (z.B. Anreise nachmittags, Abreise mittags), sodass Anreise- und Abreisetag als Teiltage behandelt werden.

#### Scenario: Event-Plan ohne explizite Zeiten
- **WHEN** ein Essensplan aus einem Event ohne explizite Uhrzeiten erzeugt wird
- **THEN** SHALL die Plan-Startzeit am Anreisetag nicht `00:00` sein
- **AND** SHALL der Anreisetag nicht alle Mahlzeiten enthalten
- **AND** SHALL der Abreisetag nicht komplett leer sein

### Requirement: Konsistente Mahlzeitenzeiten via meal_default_times
Das System SHALL für die Skip-Logik der Anreise-/Abreisetage die Mahlzeitenzeiten aus dem Plan-Feld `meal_default_times` verwenden (mit Fallback auf die hartkodierten Default-Zeiten, falls leer), sodass die serverseitige Skip-Entscheidung mit der Frontend-Darstellung übereinstimmt.

#### Scenario: Angepasste Mahlzeitenzeiten
- **WHEN** ein Plan abweichende `meal_default_times` (z.B. Frühstück 09:00) hat und ein Anreisetag mit Startzeit 10:00 erzeugt wird
- **THEN** SHALL die Skip-Entscheidung auf Basis von 09:00 erfolgen (Frühstück entfällt)
- **AND** SHALL Backend und Frontend dieselbe Menge übersprungener Mahlzeiten ergeben

#### Scenario: Keine meal_default_times gesetzt
- **WHEN** ein Plan keine `meal_default_times` gesetzt hat
- **THEN** SHALL das System auf die hartkodierten Default-Zeiten zurückfallen
