## ADDED Requirements

### Requirement: Anzeigemenge aus Gramm und Dichte
`ShoppingListItemOut` und `ShoppingListItemSourceOut` MUST die Anzeigemenge (`quantity`, `unit`) für Einträge mit Zutat immer aus `quantity_g` über `shopping_quantity(quantity_g, ingredient)` ableiten, unabhängig vom gespeicherten Feld `unit`. Nur Freitext-Einträge ohne Zutat DÜRFEN `quantity_g` mit dem gespeicherten `unit` unverändert anzeigen. Eine aus einem Essensplan erzeugte Einkaufsliste MUST für jede Zutat dieselbe Menge und Einheit zeigen wie der Einkaufen-Tab des Plans.

#### Scenario: Honig in der erzeugten Liste
- **GIVEN** ein Essensplan benötigt 273 g „Blütenhonig“ mit Dichte 1,4
- **WHEN** ein angemeldeter Nutzer daraus eine Einkaufsliste erstellt
- **THEN** zeigen Einkaufen-Tab und Liste beide 195 ml

#### Scenario: Freitext-Eintrag
- **WHEN** ein Nutzer den Freitext „Grillkohle“ ohne Zutat mit 3 kg anlegt
- **THEN** zeigt die Liste 3 kg

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Besucher `GET /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet die API mit HTTP 401 und liefert keine Einträge

### Requirement: Einträge ohne Abteilung
Einträge ohne Abteilung MUST in der Einkaufsliste unter einer eigenen Überschrift „Sonstiges“ am Ende erscheinen und DÜRFEN NICHT optisch der ersten Abteilung zugeordnet werden.

#### Scenario: Freitext unter Sonstiges
- **WHEN** eine Liste die Abteilungen „Obst“ und „Gemüse“ sowie den Freitext „2 kg Zimt“ enthält
- **THEN** steht „2 kg Zimt“ unter der Überschrift „Sonstiges“ nach „Gemüse“
