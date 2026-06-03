## MODIFIED Requirements

### Requirement: Portion-Import mit Gewichtsableitung

Portions MUST derive `weight_g` from their MetaInfo reference. `food.portion`-Einträge MÜSSEN als `supply.Portion` importiert werden; `weight_g` MUSS aus dem per `portion.meta_info` referenzierten MetaInfo übernommen werden. Fehlt eine MetaInfo-Referenz oder ein gültiger MetaInfo-`weight_g`, MUSS `weight_g` über die zentrale Berechnung (`quantity × measuring_unit.quantity`) abgeleitet werden, sofern das Ergebnis `> 0` ist. Portionen MÜSSEN pro Zutat über `(name, measuring_unit, quantity)` dedupliziert werden.

#### Scenario: Portion mit MetaInfo-Referenz

- **WHEN** eine Portion mit `meta_info`-FK importiert wird
- **THEN** MUSS `Portion.weight_g = metainfo.weight_g` gesetzt werden
- **THEN** MUSS `Portion.ingredient` auf das neu erstellte Ingredient zeigen
- **THEN** MUSS `Portion.measuring_unit` auf die gemappte neue MeasuringUnit-ID zeigen
- **THEN** MUSS `Portion.quantity` und `Portion.rank` unverändert übernommen werden

#### Scenario: Portion ohne MetaInfo

- **WHEN** eine Portion keine MetaInfo-Referenz hat (oder MetaInfo keinen gültigen `weight_g` enthält)
- **THEN** MUSS `weight_g` über die zentrale Berechnung `quantity × measuring_unit.quantity` abgeleitet werden, sofern `> 0`
- **THEN** MUSS `weight_g = None` nur dann gesetzt werden, wenn die Berechnung `≤ 0` ergibt

#### Scenario: Portion mit Default-Namen

- **WHEN** eine Legacy-Portion keinen oder einen leeren Namen hat
- **THEN** MUSS ein Name aus der zugehörigen `measuring_unit` abgeleitet werden, da `Portion.name` Pflicht ist

### Requirement: Duplikat-Toleranz für Content-Daten

The bulk import MUST NOT deduplicate Ingredient- and Recipe-Inhalte. Für Ingredients, Recipes und RecipeItems DARF der Import KEINE Deduplizierung auf Basis von Name oder Slug vornehmen; jede Legacy-Zeile MUSS als neue DB-Zeile angelegt werden. Portionen sind hiervon AUSGENOMMEN: Innerhalb einer Zutat MÜSSEN Portionen über `(name, measuring_unit, quantity)` dedupliziert werden, um Vervielfachung bei Mehrfachläufen zu verhindern.

#### Scenario: Mehrfachimport erlaubt Ingredient-/Recipe-Duplikate

- **WHEN** `import_legacy_food` zweimal hintereinander ohne Truncate läuft
- **THEN** MÜSSEN die Ingredient-/Recipe-/RecipeItem-Zahlen sich nach dem zweiten Lauf verdoppeln
- **THEN** DARF das Command KEINE `IntegrityError`s werfen (Slugs werden per Counter-Suffix eindeutig gemacht)

#### Scenario: Portionen werden bei Mehrfachimport nicht vervielfacht

- **WHEN** `import_legacy_food` zweimal läuft und dieselbe Zutat mit identischer Portion (`name`, `measuring_unit`, `quantity`) importiert
- **THEN** MUSS die bestehende Portion wiederverwendet werden statt eine zweite identische Portion anzulegen

#### Scenario: Legacy-Ingredient mit gleichem Namen wie bestehender

- **WHEN** eine Legacy-Zeile den Namen "Mehl" hat und bereits ein Ingredient "Mehl" in der DB existiert
- **THEN** MUSS ein zweites Ingredient "Mehl" angelegt werden (mit eindeutigem Slug wie `mehl-1`)
