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
Das System MUST beim Wechsel von Einheit oder Portion ohne neue `quantity` die neue Menge so berechnen, dass die Grammmenge pro Person (`quantity_g`) gleich bleibt: neue Menge = bisherige Gramm ÷ Gramm einer Zieleinheit, gerundet auf drei Nachkommastellen. Energie, Kosten und Einkaufsmengen ändern sich im Rahmen dieser Rundung nicht. Bei einer Portion speichert das System `portion` ohne `measuring_unit`; die angezeigte Einheit ergibt sich aus `unit_label`/`unit_kind`. Wird gleichzeitig `quantity` gesendet, gilt dieser Wert als Menge in der neuen Einheit und es wird nicht umgerechnet. Fehlt dem Eintrag oder der Zieleinheit ein vertrauenswürdiges Gewicht und wird keine `quantity` gesendet, antwortet das System mit HTTP 422 und ändert den Eintrag nicht.

#### Scenario: Gleiche Energie nach Wechsel
- **WHEN** der Eintrag von „0,5 × EL (15 g)" auf Gramm wechselt
- **THEN** ist `quantity_g` vorher und nachher 15 und `energy_kcal` unverändert

#### Scenario: Gramm-Eintrag zu Stück
- **GIVEN** ein Eintrag enthält 55 g einer Zutat, und die Zutat hat eine bestätigte Portion „Stück“ mit 100 g
- **WHEN** ein Nutzer mit Bearbeitungsrecht `portion_id` = „Stück“ ohne `quantity` sendet
- **THEN** speichert das System `portion` = „Stück“, `measuring_unit = null` und `quantity = 0.55`
- **AND** `quantity_g` bleibt 55

#### Scenario: Neue Einheit ohne Gewicht
- **WHEN** die gewählte Portion kein vertrauenswürdiges `weight_g` hat und keine `quantity` gesendet wird
- **THEN** antwortet das System mit HTTP 422, weil die Grammmenge nicht erhalten werden kann
- **AND** Portion, Einheit und Menge des Eintrags bleiben unverändert

#### Scenario: Menge und Einheit zusammen
- **WHEN** `quantity=2` und eine neue Portion zusammen gesendet werden
- **THEN** speichert das System `quantity=2` mit der neuen Portion ohne Umrechnung

#### Scenario: Wechsel ohne Anmeldung
- **WHEN** ein nicht angemeldeter Client den Eintrag mit einer neuen Einheit aktualisiert
- **THEN** antwortet das System mit HTTP 401 und ändert den Eintrag nicht

### Requirement: Plan-Zeile mit Einheitenauswahl
Jede Plan-Zeile einer Einzelzutat SHALL in Tages- und Tabellenansicht für Nutzer mit Bearbeitungsrecht in einer nicht synchronisierten Mahlzeit die Menge und eine Einheitenauswahl zeigen. Die Auswahl SHALL aktive Portionen, anwendbare Standardmaße sowie Gramm bzw. Milliliter der Zutat enthalten. Ein reiner Einheitenwechsel ohne neue Menge SHALL sofort gespeichert werden (Umrechnung bei gleichem Gewicht, siehe „Einheitenwechsel behält die Grammmenge“); danach SHALL der Hinweis „Einheit geändert“ mit „Rückgängig“ erscheinen, der Einheit und Menge exakt wiederherstellt. Einheiten ohne vertrauenswürdiges Gewicht werden nicht umgerechnet, sondern erst mit einer bestätigten Menge gespeichert („Gewicht ergänzen“). Gibt der Nutzer eine Menge ein, gilt sie in der gewählten Einheit. Portionen, die nur Gramm- oder Milliliter-Aliase sind („Gramm“, „g“, „Milliliter“, „ml“), SHALL als direkte Masse bzw. Volumen angezeigt werden („55 g“), nicht als Stück-Portion („1 Gramm (1 g)“). Wer nicht bearbeiten darf, und synchronisierte Mahlzeiten sehen die Menge ohne speichernde Auswahl; ein Umschalter ändert dort nur die Anzeige.

#### Scenario: Einheit in der Zeile wählen
- **WHEN** der Nutzer in der Zeile „Gramm" statt „EL" wählt
- **THEN** zeigt die Zeile „15 g" und die Kalorien bleiben gleich

#### Scenario: Einheitenwechsel mit Rückgängig
- **GIVEN** eine bearbeitbare Zeile zeigt 55 g einer Zutat mit bestätigter Portion „Stück“ (100 g)
- **WHEN** der Nutzer „Stück“ wählt, ohne eine Menge einzugeben
- **THEN** zeigt die Zeile sofort „0,55 Stück (55 g)“ und den Hinweis „Einheit geändert“ mit „Rückgängig“
- **AND** nach „Rückgängig“ ist wieder 55 g gespeichert

#### Scenario: Menge in der gewählten Einheit eingeben
- **WHEN** der Nutzer bei gewählter Einheit „EL" den Wert „2" eingibt
- **THEN** speichert das System `quantity=2` mit dieser Portion und die Gramm- und Kalorienwerte werden neu berechnet

#### Scenario: Gramm-Alias als Masse anzeigen
- **WHEN** ein Eintrag die Portion „Gramm“ mit Menge 55 hat
- **THEN** zeigt die Zeile „55 g“ und nicht „55 Gramm (55 g)“ oder „1 g“

#### Scenario: Schreibgeschützt
- **WHEN** der Nutzer keine Bearbeitungsrechte hat oder die Mahlzeit synchronisiert ist
- **THEN** zeigt die Zeile die Menge mit Einheit als Text ohne Eingabefeld und ohne speichernden Einheitenwechsel

### Requirement: Einheit beim Hinzufügen wählbar
Beim Hinzufügen einer Einzelzutat zu einer Mahlzeit SHALL der Nutzer die Einheit/Portion wie bei Rezepten wählen können (`IngredientQuantityDialog`). Die Auswahl wird mit `portion_id` und `measuring_unit_id` an die API übergeben.

#### Scenario: Zutat mit EL hinzufügen
- **WHEN** der Nutzer eine Zutat hinzufügt, „EL" wählt und „2" eingibt
- **THEN** wird der Eintrag mit dieser Portion und `quantity=2` angelegt
