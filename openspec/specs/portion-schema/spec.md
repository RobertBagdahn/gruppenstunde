## Requirements

### Requirement: PortionOut SHALL expose is_default based on rank
Das `PortionOut`-Schema SHALL ein `is_default: bool`-Feld enthalten, das `True` ist, wenn die Portion `rank == 1` hat.

#### Scenario: Rank-1 portion reports as default
- **WHEN** eine Portion mit `rank=1` über `PortionOut` serialisiert wird
- **THEN** ist `is_default` `true`

#### Scenario: Higher-rank portion reports as non-default
- **WHEN** eine Portion mit `rank > 1` über `PortionOut` serialisiert wird
- **THEN** ist `is_default` `false`

#### Scenario: Portion from dict with rank
- **WHEN** `PortionOut.resolve_is_default` mit einem Dict `{"rank": 1}` aufgerufen wird
- **THEN** ist das Ergebnis `true`

### Requirement: Frontend PortionSchema SHALL include is_default
Das Zod `PortionSchema` SHALL ein `is_default: z.boolean()`-Feld enthalten, synchron zum Pydantic `PortionOut`.

#### Scenario: API response with is_default passes validation
- **WHEN** das Frontend eine API-Antwort mit `ingredient_portions` erhält
- **THEN** validiert Zod das `is_default`-Feld erfolgreich als Boolean

### Requirement: build_package_display tests SHALL use Package model
Tests für `build_package_display()` MÜSSEN `Package`-Objekte erstellen, nicht `Portion`-Objekte, da die Funktion das `Package`-Modell verwendet.

#### Scenario: Package portion created in test helper
- **WHEN** `_make_package_portion` aufgerufen wird
- **THEN** erstellt es ein `Package`-Objekt mit `ingredient`, `name`, `weight_g`, `rank`

### Requirement: Dead Portion tests SHALL be removed
Tests, die auto-erstellte Portionen (g, Packung, Stück) erwarten, MÜSSEN entfernt werden, da kein Mechanismus diese Portionen mehr automatisch erzeugt.

#### Scenario: No auto-created portions on ingredient creation
- **WHEN** `make_ingredient()` aufgerufen wird
- **THEN** werden keine `Portion`-Objekte automatisch erstellt
