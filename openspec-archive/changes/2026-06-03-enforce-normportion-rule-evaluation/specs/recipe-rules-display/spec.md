## MODIFIED Requirements

### Requirement: Werte werden pro Portion bereitgestellt

Der Endpunkt MUST für jede Regel `value_per_serving` als den Wert **einer Normportion** des Rezepts liefern. Da jedes Rezept genau eine Normportion repräsentiert (`Recipe.servings` wird stets als `1` behandelt), MUSS die Umrechnung von Nährwerten `Wert pro 100g × Gesamtgewicht_g / 100` verwenden. Es DARF KEINE Division durch `servings` und KEINE Skalierung auf reale Personen-, Aktivitäts- oder Reservemengen erfolgen. Die Parameter `weight_g` (Gesamtgewicht der Normportion) und `nutri_class` (Qualitätsklasse) MÜSSEN unskaliert bleiben. Die Statusauswertung MUSS unverändert über `Rule.evaluate()` erfolgen.

#### Scenario: Umrechnung auf Normportion

- **WHEN** ein Rezept ein Gesamtgewicht von 350g hat und sein Eiweißwert 8.0g pro 100g beträgt
- **THEN** entspricht `value_per_serving` für `protein_g` dem Normportionwert `8.0 × 350 / 100 = 28.0g`
- **AND** es erfolgt keine Division durch `servings`

#### Scenario: Gewicht bleibt unskaliert

- **WHEN** eine `scope=recipe`-Regel den Parameter `weight_g` auswertet und das Rezept ein Gesamtgewicht von 350g hat
- **THEN** entspricht `value_per_serving` dem Gesamtgewicht der Normportion (350g)

#### Scenario: Servings-Wert hat keinen Einfluss

- **WHEN** ein Rezept fälschlicherweise `servings > 1` gespeichert hätte
- **THEN** wertet das System die Regeln dennoch auf Basis einer Normportion aus und liefert dieselben `value_per_serving`-Werte wie bei `servings = 1`

### Requirement: Nutri-Class wird als Buchstabe dargestellt

Für eine Regel mit `parameter="nutri_class"` MUST das System ein `display_value` als Buchstaben (1→A, 2→B, 3→C, 4→D, 5→E) liefern und für solche Regeln keine Einheit ausgeben. Der `nutri_class`-Wert DARF NICHT mit einem Portionsfaktor multipliziert werden.

#### Scenario: Nutri-Class-Regel

- **WHEN** eine `scope=recipe`-Regel den Parameter `nutri_class` auswertet und das Rezept die Nutri-Klasse B hat
- **THEN** enthält das zugehörige `items`-Element `display_value="B"`
- **AND** der ausgewertete Wert ist der unskalierte Rohwert (2)
