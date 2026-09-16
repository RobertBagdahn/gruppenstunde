## MODIFIED Requirements

### Requirement: Zentrale weight_g-Berechnung
Das System MUST `Portion.weight_g` über eine zentrale Berechnung oder eine explizit bestätigte Gewichtsangabe bestimmen. Alle Erzeugungspfade (API, URL-Import, Legacy-Import, Admin, KI-Apply und Portions-Zauberstab) MÜSSEN diese Regel verwenden. Für jede aktive, nicht gelöschte Portion MUSS der aufgelöste Wert positiv sein; stückartige Portionsnamen ohne bestätigtes Gewicht dürfen keinen impliziten `1 g`-Wert erzeugen.

#### Scenario: Aktive Portion ohne Gewicht wird angelegt
- **WHEN** ein Erzeugungspfad eine aktive Portion ohne positives explizites oder sicher berechenbares Gewicht speichern will
- **THEN** MUSS der Vorgang mit einem Validierungsfehler abgelehnt werden
- **THEN** DARF keine aktive Portion angelegt werden

#### Scenario: Sichere automatische Berechnung
- **WHEN** eine Portion mit positiver Menge und kanonischer Maßeinheit ohne explizites Gewicht erstellt wird
- **THEN** MUSS `weight_g = quantity × measuring_unit.quantity` gesetzt werden
- **THEN** MUSS die Portion gespeichert werden, wenn das Ergebnis positiv ist

#### Scenario: Stückportion ohne bestätigtes Gewicht
- **WHEN** eine Portion `1 Lauch` ohne bestätigtes Gewicht gespeichert werden soll
- **THEN** MUSS die Speicherung abgelehnt oder als nicht speicherbarer Reparaturfall zurückgegeben werden
- **THEN** DARF niemals automatisch `1.0 g` gesetzt werden

### Requirement: Frontend kennzeichnet unvollständige Portionen
Die Portions- und Rezeptansichten MUST unvollständige historische Portionen sichtbar kennzeichnen. Neue aktive Portionen ohne positives Gewicht dürfen jedoch nicht mehr über die normale Erstellungs- oder Bearbeitungsoberfläche gespeichert werden.

#### Scenario: Historische unvollständige Portion wird angezeigt
- **WHEN** eine bereits vorhandene historische Portion ohne `weight_g` in der IngredientDetailPage gerendert wird
- **THEN** MUSS sie sichtbar als unvollständig und reparaturbedürftig markiert werden
- **THEN** MUSS ein Reparatur- oder Portions-Zauberstab-Fluss angeboten werden, sofern der User bearbeiten darf

#### Scenario: Manuelles Speichern ohne Gewicht
- **WHEN** ein User eine neue oder bearbeitete Portion ohne positives Gewicht absendet
- **THEN** MUSS das Frontend die Eingabe ablehnen oder eine positive Eingabe verlangen
- **THEN** MUSS das Backend die Regel unabhängig davon ebenfalls erzwingen
