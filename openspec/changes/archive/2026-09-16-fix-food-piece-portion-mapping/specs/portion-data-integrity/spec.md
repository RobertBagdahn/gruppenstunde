## MODIFIED Requirements

### Requirement: Zentrale weight_g-Berechnung
Das System MUST `Portion.weight_g` über eine zentrale Berechnung oder eine explizit bestätigte Gewichtsangabe bestimmen. Für stückartige Portionsnamen ohne explizit bestätigtes Gewicht DARF die Model-Berechnung keinen impliziten `1 g`-Wert erzeugen.

#### Scenario: Ungewichtete Stückportion
- **WHEN** eine Portion `1 Lauch` ohne bestätigtes Gewicht gespeichert wird
- **THEN** bleibt `weight_g` unbekannt oder die Speicherung wird wegen fehlender Bestätigung abgelehnt
- **THEN** wird niemals automatisch `1.0` gesetzt

#### Scenario: Grammportion bleibt gültig
- **WHEN** eine echte Grammportion mit `quantity=1` und Gramm-Einheit erstellt wird
- **THEN** wird `weight_g=1.0` als gültiger technischer Wert gespeichert

### Requirement: Frontend kennzeichnet unvollständige Portionen
Die Portions- und Rezeptansichten MUST Portionen mit unbekanntem oder unbestätigtem Stückgewicht sichtbar kennzeichnen und dürfen sie nicht wie verlässliche Grammwerte darstellen.

#### Scenario: Unbestätigte Stückportion in der Zutatendetailseite
- **WHEN** eine Portion einen KI-Vorschlag ohne Nutzerbestätigung besitzt
- **THEN** zeigt die Food-UI eine Warnung und den Bestätigungsstatus an
