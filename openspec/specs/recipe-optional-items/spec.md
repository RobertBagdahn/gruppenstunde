## ADDED Requirements

### Requirement: Rezeptautor kann Zutaten als optional markieren

Der Autor eines Rezepts SHALL einzelne `RecipeItem`-Einträge als optional markieren können (`is_optional=True`). Eine optionale Zutat ist situationsabhängig — beim Einplanen entscheidet der Planer mit einem Portionen-Split, wie viele Portionen die Zutat erhalten.

Eine Zutat MUST entweder `is_optional=True` ODER Teil einer Exchange-Gruppe sein — nie beides. Eine DB-CHECK-CONSTRAINT erzwingt dies als Sicherheitsnetz; die API validiert zusätzlich und gibt bei Verstoß HTTP 400 zurück.

#### Scenario: Zutat als optional markieren

- **WHEN** der Autor auf den "Optional"-Toggle an einer Zutat klickt
- **THEN** wird `RecipeItem.is_optional = True` gesetzt und die Zutat in der Rezeptansicht als "(optional)" gekennzeichnet

#### Scenario: Optional-Flag entfernen ohne aktive Splits

- **WHEN** der Autor den "Optional"-Toggle deaktiviert und kein `MealItemSplit` auf diese Zutat zeigt
- **THEN** wird `RecipeItem.is_optional = False` gesetzt

#### Scenario: Optional-Flag entfernen mit aktiven Splits blockiert

- **WHEN** der Autor `is_optional=False` setzen will, während aktive `MealItemSplit`-Einträge auf diese Zutat zeigen
- **THEN** gibt das Backend HTTP 409 zurück mit Fehlermeldung "Diese Zutat wird in aktiven Essensplänen mit Varianten verwendet und kann nicht geändert werden."

#### Scenario: Optionale Zutat darf nicht in Exchange-Gruppe sein

- **WHEN** der Autor versucht, `is_optional=True` auf einem RecipeItem zu setzen, das bereits `exchange_group` gesetzt hat
- **THEN** gibt das Backend HTTP 400 zurück mit Fehlermeldung "Eine Zutat kann nicht gleichzeitig optional und Teil einer Austausch-Gruppe sein."

### Requirement: Optionale Zutaten in der Rezeptansicht anzeigen

Die öffentliche Rezeptansicht SHALL optionale Zutaten als solche kennzeichnen, damit Lesende wissen, dass sie situationsabhängig sind.

#### Scenario: Optionale Zutat mit Hinweis anzeigen

- **WHEN** ein Besucher die Rezeptdetailseite aufruft und das Rezept optionale Zutaten hat
- **THEN** erscheint neben der Zutat ein Hinweis "(optional)"

### Requirement: Default-Verhalten ohne Split

Wenn ein MealItem keine `MealItemSplit`-Einträge für eine optionale Zutat hat, MUST das System die Zutat als "eingeschlossen" (100% da) werten — identisch zu einer nicht-optionalen Zutat.

#### Scenario: Optionale Zutat ohne Split → eingeschlossen

- **WHEN** ein Rezept mit optionaler Zutat (Chili) ohne Split eingeplant wird
- **THEN** erscheint Chili für alle Portionen in der Einkaufsliste

#### Scenario: Optionale Zutat mit Split "0% da" → ausgeschlossen

- **WHEN** der Planer `share=0.0` für die optionale Zutat setzt
- **THEN** erscheint die Zutat nicht in der Einkaufsliste
