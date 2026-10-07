# meal-item-unit-edit Specification

## Purpose
TBD - created by archiving change unified-ingredient-amount-display. Update Purpose after archive.
## Requirements
### Requirement: Einheit und Portion einer Einzelzutat sind im Plan änderbar
Das System SHALL `PATCH /{meal_plan_id}/meal-items/{item_id}/` um die Felder `portion_id` und `measuring_unit_id` erweitern. Die Felder gelten nur für Einträge mit `ingredient_id`. Die gewählte Portion MUSS eine aktive Portion der Zutat sein, eine Einheit MUSS für die Zutat definiert sein (Gramm und Milliliter immer). Sonst antwortet das System mit HTTP 422.

#### Scenario: Portion wechseln
- **WHEN** ein Eintrag „Frischkäse" mit `quantity=0.5` und Portion „EL (15 g)" auf die Gramm-Einheit umgestellt wird
- **THEN** speichert das System `measuring_unit` Gramm, `portion=null` und `quantity=15`

#### Scenario: Portion gehört nicht zur Zutat
- **WHEN** `portion_id` auf die Portion einer anderen Zutat zeigt
- **THEN** antwortet das System mit HTTP 422 und ändert den Eintrag nicht

#### Scenario: Einheit nicht definiert
- **WHEN** `measuring_unit_id` eine Einheit nennt, für die die Zutat keine aktive Portion hat und die weder Gramm noch Milliliter ist
- **THEN** antwortet das System mit HTTP 422

#### Scenario: Rezept-Eintrag
- **WHEN** `portion_id` für einen Eintrag mit `recipe_id` gesendet wird
- **THEN** antwortet das System mit HTTP 422

### Requirement: Einheitenwechsel behält die Grammmenge
Das System MUST beim Wechsel von Einheit oder Portion die neue `quantity` so berechnen, dass die Grammmenge pro Person (`quantity_g`) gleich bleibt. Energie und Kosten des Eintrags ändern sich dadurch nicht. Wird gleichzeitig `quantity` gesendet, gilt dieser Wert als Menge in der neuen Einheit und es wird nicht umgerechnet.

#### Scenario: Gleiche Energie nach Wechsel
- **WHEN** der Eintrag von „0,5 × EL (15 g)" auf Gramm wechselt
- **THEN** ist `quantity_g` vorher und nachher 15 und `energy_kcal` unverändert

#### Scenario: Neue Einheit ohne Gewicht
- **WHEN** die gewählte Portion kein `weight_g` hat
- **THEN** antwortet das System mit HTTP 422, weil die Grammmenge nicht erhalten werden kann

#### Scenario: Menge und Einheit zusammen
- **WHEN** `quantity=2` und eine neue Portion zusammen gesendet werden
- **THEN** speichert das System `quantity=2` mit der neuen Portion ohne Umrechnung

### Requirement: Plan-Zeile mit Einheitenauswahl
Jede Plan-Zeile einer Einzelzutat SHALL für Nutzer mit Bearbeitungsrecht die Menge und eine Einheit-/Portionsauswahl zeigen (Optionen und Labels wie im Rezept-Editor: `PortionPicker`, `formatPortionOptionLabel`). Wer nicht bearbeiten darf oder bei synchronisierten Mahlzeiten, sieht die Menge ohne Auswahl. Die Menge wird in der gewählten Einheit eingegeben.

#### Scenario: Einheit in der Zeile wählen
- **WHEN** der Nutzer in der Zeile „Gramm" statt „EL" wählt
- **THEN** zeigt die Zeile „15 Gramm" und die Kalorien bleiben gleich

#### Scenario: Menge in der gewählten Einheit eingeben
- **WHEN** der Nutzer bei gewählter Einheit „EL" den Wert „2" eingibt
- **THEN** speichert das System `quantity=2` mit dieser Portion und die Gramm- und Kalorienwerte werden neu berechnet

#### Scenario: Schreibgeschützt
- **WHEN** der Nutzer keine Bearbeitungsrechte hat oder die Mahlzeit synchronisiert ist
- **THEN** zeigt die Zeile die Menge mit Einheit als Text ohne Eingabefeld

### Requirement: Einheit beim Hinzufügen wählbar
Beim Hinzufügen einer Einzelzutat zu einer Mahlzeit SHALL der Nutzer die Einheit/Portion wie bei Rezepten wählen können (`IngredientQuantityDialog`). Die Auswahl wird mit `portion_id` und `measuring_unit_id` an die API übergeben.

#### Scenario: Zutat mit EL hinzufügen
- **WHEN** der Nutzer eine Zutat hinzufügt, „EL" wählt und „2" eingibt
- **THEN** wird der Eintrag mit dieser Portion und `quantity=2` angelegt
