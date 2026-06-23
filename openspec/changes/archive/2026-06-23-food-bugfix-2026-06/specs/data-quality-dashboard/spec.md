## ADDED Requirements

### Requirement: Nährwert-Plausibilitätsprüfung zeigt Ausreißer prominent

Die Datenqualitäts-Seite SHALL Zutaten mit `energy_kcal > 900` (unmöglich für natürliche Lebensmittel) prominent als „unplausibel" markieren.

#### Scenario: Zutat mit unmöglichem Energiewert

- **WHEN** eine Zutat `energy_kcal = 1400` hat
- **THEN** erscheint sie in der Datenqualitäts-Ansicht als „Unplausibler Nährwert: 1400 kcal/100g (Maximum: 900)"
- **THEN** ist sie visuell hervorgehoben (z.B. roter Badge)

#### Scenario: Zutat innerhalb des Plausibilitätsbereichs

- **WHEN** eine Zutat `energy_kcal = 884` hat (Olivenöl)
- **THEN** erscheint sie NICHT in der Ausreißer-Liste

## MODIFIED Requirements

### Requirement: Nährwertvergleich-Balken zeigt Ausreißer korrekt

Der Einordnungsbalken (Vergleich mit ähnlichen Rezepten/Zutaten) SHALL korrekt reagieren wenn die aktuelle Zutat außerhalb des normalen Wertebereichs liegt. Der Balken SHALL seinen Bereich erweitern und die eigene Position klar markieren.

#### Scenario: Zutat ist teuerste im Vergleich

- **WHEN** die aktuelle Zutat die teuerste in der Vergleichsgruppe ist
- **THEN** zeigt der Balken die Zutat als Maximum-Marker
- **THEN** wird NICHT „0 Euro" als Maximum angezeigt

#### Scenario: Zutat außerhalb des normalen Bereichs

- **WHEN** eine Zutat weit außerhalb des Vergleichsbereichs liegt (z.B. 500g vs. übliche 280–360g)
- **THEN** wird der Balken entsprechend erweitert um die Zutat einzuschließen
- **THEN** ist die Position der aktuellen Zutat klar markiert
