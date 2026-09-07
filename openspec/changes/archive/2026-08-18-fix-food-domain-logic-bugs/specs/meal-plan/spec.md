## MODIFIED Requirements

### Requirement: Berechnungsgrundlage

Kosten-, Nährwert-, Einkaufslisten- und Kochplanregeln SHALL die zentrale Definition von
`effective_portions` und die gemeinsame Item-/Override-Auflösung verwenden.
Template-Mahlzeiten mit `is_reference=True` (`RefMeal`) SHALL von allen realen Berechnungen
(Einkaufsliste `generate_shopping_list`, `nutrition_summary`, Kosten und Gesamtplan-Cockpit `_aggregate_meal_plan_values`)
vollständig ausgeschlossen werden.
Direkte Zutaten (`MealItem.ingredient`) SHALL in allen Berechnungen und PDF-Exporten mit `item.factor * effective_portions` skaliert werden.

#### Scenario: Gemeinsame Berechnung
- **WHEN** eine Food-Ausgabe Mengen berechnet
- **THEN** verwendet sie `effective_portions` und die zentrale Item-Auflösung

#### Scenario: RefMeal Isolation in Einkaufsliste
- **WHEN** eine Einkaufsliste für einen MealPlan mit 7 realen Mahlzeiten und 1 RefMeal-Vorlage generiert wird
- **THEN** fließen ausschließlich die Zutaten der 7 realen Mahlzeiten in die Einkaufsliste ein
- **AND** die RefMeal-Vorlage wird nicht als zusätzlicher 8. Tag eingerechnet

#### Scenario: RefMeal Isolation in Nährwert-Summary
- **WHEN** die Gesamtplan-Nährwertübersicht abgerufen wird
- **THEN** werden Mahlzeiten mit `is_reference=True` ignoriert
