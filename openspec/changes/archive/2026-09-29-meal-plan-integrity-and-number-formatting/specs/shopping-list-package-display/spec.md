## REMOVED Requirements

### Requirement: Packungsoptionen in Einkaufslisten-Zeile
**Reason**: Packungen werden nicht mehr aus Portionen abgeleitet (kleinste Packung, benannte Portion, 10 %-Abrundungsschwelle); Portions-Ableitungen wie „Glas Milch 200 g“ erzeugten Rauschen. Quelle ist ausschließlich die freigegebene Standardpackung.

**Migration**: Ersetzt durch „Packungsbedarf aus der Standardpackung“ (strukturierte Felder `package_options`, `package_surplus_g`; 5 %-Toleranz).

### Requirement: Packungsanzeige nur bei vorhandenen Daten
**Reason**: Die Bedingung bezog sich auf geeignete Portionen; sie gilt jetzt für die Standardpackung.

**Migration**: Ersetzt durch „Packungsanzeige nur mit Standardpackung“.

## ADDED Requirements

### Requirement: Packungsbedarf aus der Standardpackung

Das Backend SHALL für jeden `ShoppingListItem` mit verknüpftem `Ingredient` die benötigte Anzahl der Standardpackung (`Package` mit `rank=1`, nicht gelöscht) berechnen und als strukturierte Werte liefern: `package_options: [{count, package_name, weight_g}]` sowie den Überschuss `package_surplus_g`. Die UI SHALL die Konvention „Gramm zuerst, Packung dahinter“ anwenden: „1.020 g · 2 × 500-g-Packung“. Der Überschuss SHALL klein darunter als „+ … g Reserve“ erscheinen, sofern er > 0 ist.

Rundungsregel: `exact = quantity_g / package.weight_g`. Liegt der Anteil über der ganzen Zahl (`exact − floor(exact)`) bei höchstens 0,05 Packungen, wird abgerundet, sonst aufgerundet; mindestens 1 Packung.

#### Scenario: Knapp über der Packungsgrenze
- **WHEN** `quantity_g=1020` und Standardpackung `weight_g=500` (exakt 2,04)
- **THEN** `package_options[0].count = 2` und `package_surplus_g = -20` (Fehlmenge innerhalb der Toleranz, durch die Einkaufsreserve gedeckt, keine Reserve-Zeile); die UI zeigt „1.020 g · 2 × 500-g-Packung“

#### Scenario: Deutlich über der Packungsgrenze
- **WHEN** `quantity_g=700` und `weight_g=250` (exakt 2,8)
- **THEN** `count = 3` und `package_surplus_g = 50`; die UI zeigt „700 g · 3 × 250-g-Packung“ und „+ 50 g Reserve“

#### Scenario: Kleinstmenge
- **WHEN** `quantity_g=30` und `weight_g=500`
- **THEN** `count = 1`

#### Scenario: Reserve-Faktor bereits in quantity_g eingerechnet
- **WHEN** `ShoppingListItem.quantity_g` bereits den skalierten Wert inkl. `reserve_factor` enthält
- **THEN** MUST die Packungsberechnung direkt auf diesem Wert arbeiten, ohne weiteren Aufschlag

### Requirement: Packungsanzeige nur mit Standardpackung

Packungsoptionen SHALL nur erscheinen, wenn die Zutat eine freigegebene Standardpackung (`Package`, `rank=1`) hat. Das System SHALL keine Packungen aus Portionen ableiten oder schätzen; ohne Packung zeigt die Zeile die Menge und gegebenenfalls das Stück-Äquivalent.

#### Scenario: Gewürz ohne Packung
- **WHEN** die Zutat keine `Package`-Zeile hat
- **THEN** ist `package_options` leer und die UI zeigt nur „3 g“


### Requirement: Flüssigkeiten in Litern
Für Zutaten mit `physical_viscosity` in (`beverage`, `liquid`) MUST die Einkaufsliste die Menge über `physical_density` in Milliliter umrechnen und mit `unit="ml"` liefern. Die UI zeigt ab 1.000 ml Liter mit einer Nachkommastelle („9,1 l“). `PhysicalViscosityChoices` erhält den Wert `liquid` („Flüssig“, z. B. Öl, Essig, Sahne); `beverage` bleibt für Getränke.

#### Scenario: Milch
- **WHEN** 9.400 g Milch mit `physical_viscosity="beverage"` und Dichte 1,03 benötigt werden
- **THEN** liefert die API `quantity: 9126, unit: "ml"` und die UI zeigt „9,1 l“

#### Scenario: Feste Zutat
- **WHEN** eine Zutat `physical_viscosity="solid"` hat
- **THEN** bleibt die Einheit Gramm
