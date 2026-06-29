## ADDED Requirements

### Requirement: Packungsoptionen in Einkaufslisten-Zeile
Das Backend SHALL für jeden `ShoppingListItem` mit einem verknüpften `Ingredient` alle verfügbaren Packungsgrößen berechnen und in `display_quantity` anhängen. Packungsgrößen sind `Portion`-Einträge, deren `name` den Substring `"packung"` (case-insensitive) enthält.

#### Scenario: Ein Ingredient mit einer Packungsgröße
- **WHEN** ein `ShoppingListItem` hat `quantity_g=750`, `ingredient` hat eine Portion `"250g Packung"` mit `weight_g=250`
- **THEN** MUST `display_quantity` den String `"750g · 3×250g"` enthalten

#### Scenario: Mehrere Packungsgrößen
- **WHEN** ein `ShoppingListItem` hat `quantity_g=750` und der Ingredient hat Portionen `"250g Packung"` (weight_g=250) und `"500g Packung"` (weight_g=500)
- **THEN** MUST `display_quantity` den String `"750g · 3×250g · 2×500g"` enthalten (alle Optionen, durch ` · ` getrennt)

#### Scenario: Kein Packung-Portion vorhanden
- **WHEN** ein `ShoppingListItem` hat keinen Ingredient oder der Ingredient hat keine Portion mit „Packung" im Namen
- **THEN** MUST `display_quantity` nur die Gramm-Menge enthalten, ohne ` · ` Erweiterung

#### Scenario: Packungsmenge geht nicht genau auf — aufrunden
- **WHEN** `quantity_g=700`, Packung `weight_g=250` → exakt 2,8 Packungen
- **THEN** MUST auf 3 aufgerundet werden: `display = "3×250g"`

#### Scenario: Packungsmenge geht nicht auf — Rest unter 10% Schwelle → abrunden
- **WHEN** `quantity_g=995`, Packung `weight_g=500` → exakt 1,99 Packungen, Rest = 5g = 0,5% von 995g
- **THEN** MUST auf 2 abgerundet werden (Rest < 10%): `display = "2×500g"`

#### Scenario: Reserve-Faktor bereits in quantity_g eingerechnet
- **WHEN** `ShoppingListItem.quantity_g` enthält bereits den skalierten Wert inkl. `reserve_factor`
- **THEN** MUST die Packungsberechnung direkt auf diesem Wert arbeiten, ohne weiteren Aufschlag

### Requirement: Packungsanzeige nur bei vorhandenen Daten
Packungsoptionen sollen nur angezeigt werden wenn tatsächlich Portionen mit Packungstyp am Ingredient definiert sind. Das System SHALL keine Schätzungen oder generischen Packungshinweise für Zutaten ohne Packungsportionen erzeugen.

#### Scenario: Gewürze ohne Packungsportionen
- **WHEN** `ingredient` hat nur Portionen vom Typ „Prise" und „g"
- **THEN** MUST `display_quantity` nur `"3g"` (oder entsprechende Gramm-Angabe) enthalten

### Requirement: Packungsoptionen nur lesend
Packungsoptionen in der Einkaufsliste sind rein informativ. Das System SHALL keine Auswahl speichern oder den `ShoppingListItem`-Datensatz beim Anzeigen von Packungsoptionen verändern.

#### Scenario: Nutzer liest Packungsoptionen
- **WHEN** die Einkaufsliste angezeigt wird
- **THEN** MUST alle Packungsoptionen sichtbar sein, ohne dass eine Interaktion nötig ist

#### Scenario: Keine Persistenz der Packungswahl
- **WHEN** ein Nutzer die Einkaufsliste ansieht und die Packungsoptionen liest
- **THEN** MUST kein Schreibvorgang auf `ShoppingListItem` stattfinden
