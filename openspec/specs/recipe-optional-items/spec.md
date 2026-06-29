> **⚠️ MODIFIED — Varianten statt Splits**
> Optionale Items existieren weiterhin. Die Planung verwendet jetzt `MealItem.active_recipe_item_ids`
> statt `MealItemSplit`. Siehe `openspec/changes/variant-items/`.

## ADDED Requirements

### Requirement: Rezeptautor kann Zutaten als optional markieren

Der Autor eines Rezepts SHALL einzelne `RecipeItem`-Einträge als optional markieren können (`is_optional=True`). Eine optionale Zutat ist situationsabhängig — beim Einplanen entscheidet der Planer mit einem Portionen-Split, wie viele Portionen die Zutat erhalten.

Eine Zutat MUST entweder `is_optional=True` ODER Teil einer Exchange-Gruppe sein — nie beides. Eine DB-CHECK-CONSTRAINT erzwingt dies als Sicherheitsnetz; die API validiert zusätzlich und gibt bei Verstoß HTTP 400 zurück.

#### Scenario: Zutat als optional markieren

- **WHEN** der Autor auf den "Optional"-Toggle an einer Zutat klickt
- **THEN** wird `RecipeItem.is_optional = True` gesetzt und die Zutat in der Rezeptansicht als "(optional)" gekennzeichnet

#### Scenario: Optional-Flag entfernen ohne aktive Varianten

- **WHEN** der Autor den "Optional"-Toggle deaktiviert und keine Varianten-Items (`MealItem.active_recipe_item_ids`) auf diese Zutat verweisen
- **THEN** wird `RecipeItem.is_optional = False` gesetzt

#### Scenario: Optional-Flag entfernen mit aktiven Varianten blockiert

- **WHEN** der Autor `is_optional=False` setzen will, während aktive Varianten-Items (`MealItem.active_recipe_item_ids`) auf diese Zutat verweisen
- **THEN** gibt das Backend HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen mit Varianten verwendet und kann nicht geändert werden."

#### Scenario: Optionale Zutat darf nicht in Exchange-Gruppe sein

- **WHEN** der Autor versucht, `is_optional=True` auf einem RecipeItem zu setzen, das bereits `exchange_group` gesetzt hat
- **THEN** gibt das Backend HTTP 400 zurück mit Fehlermeldung "Eine Zutat kann nicht gleichzeitig optional und Teil einer Austausch-Gruppe sein."

### Requirement: Optionale Zutaten in der Rezeptansicht anzeigen

Die öffentliche Rezeptansicht SHALL optionale Zutaten als solche kennzeichnen, damit Lesende wissen, dass sie situationsabhängig sind.

#### Scenario: Optionale Zutat mit Hinweis anzeigen

- **WHEN** ein Besucher die Rezeptdetailseite aufruft und das Rezept optionale Zutaten hat
- **THEN** erscheint neben der Zutat ein Hinweis "(optional)"

### Requirement: Default-Verhalten ohne Variante

Wenn ein MealItem keine Varianten-Einträge für eine optionale Zutat in `active_recipe_item_ids` hat, MUST das System die Zutat als "eingeschlossen" (100% da) werten — identisch zu einer nicht-optionalen Zutat.

#### Scenario: Optionale Zutat ohne Varianteneintrag → eingeschlossen

- **WHEN** ein Rezept mit optionaler Zutat (Chili) ohne Varianten konfiguriert eingeplant wird
- **THEN** erscheint Chili für alle Portionen in der Einkaufsliste

#### Scenario: Optionale Zutat in keiner active_recipe_item_ids → ausgeschlossen

- **WHEN** die optionale Zutat in keiner `MealItem.active_recipe_item_ids`-Liste einer Variante enthalten ist
- **THEN** erscheint die Zutat nicht in der Einkaufsliste

## MODIFIED Requirements

### Requirement: Delete-Protection über active_recipe_item_ids

Die Delete-Protection für optionale Zutaten wurde von `MealItemSplit`-FK (PROTECT) auf `MealItem.active_recipe_item_ids`-JSON-Contains-Query umgestellt.

#### Scenario: Optional-Flag-Entfernung mit aktiven Varianten über active_recipe_item_ids blockiert

- **WHEN** der Autor `is_optional=False` setzen will und `MealItem.objects.filter(active_recipe_item_ids__contains=[item.id]).exists()` wahr ist
- **THEN** gibt das Backend HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen mit Varianten verwendet und kann nicht geändert werden."

#### Scenario: RecipeItem-Edit mit aktiven Varianten blockiert

- **WHEN** der Autor `exchange_group_id` eines optionalen RecipeItems ändern will, das in `active_recipe_item_ids` referenziert wird
- **THEN** prüft das Backend `MealItem.objects.filter(active_recipe_item_ids__contains=[item.id]).exists()` und gibt HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen verwendet und kann nicht geändert werden."
