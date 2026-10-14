## ADDED Requirements

### Requirement: Keine widersprüchliche à-Angabe
Ist der Portionsname eine Volumen- oder Masseneinheit (Liter, ml, g, kg), MUST die Mengenanzeige das Gewicht statt einer umgerechneten à-Angabe zeigen, z. B. „1 Liter (≈ 1.020 g)“.

#### Scenario: Haferdrink
- **WHEN** ein Rezeptposten „1 Liter“ Haferdrink mit Portion „Liter“ angezeigt wird
- **THEN** steht dort „1 Liter (≈ 1.020 g)“ und nicht „1 Liter à 980 ml“

#### Scenario: Stückportion
- **WHEN** die Portion „Scheibe“ heißt
- **THEN** bleibt „à 25 g“ unverändert

### Requirement: Dry-run-Report für Dichteabweichungen
Das System SHALL ein Management-Command bereitstellen, das Zutaten mit Volumen-Portion und abweichender Dichte (> 1 %) ausschließlich auflistet. Datenänderungen MUST nur nach ausdrücklichem OK erfolgen.

#### Scenario: Report läuft
- **WHEN** das Command ausgeführt wird
- **THEN** gibt es eine Liste mit Zutat, Portion, hinterlegtem und erwartetem Gewicht aus und ändert keine Daten
