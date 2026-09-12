## MODIFIED Requirements

### Requirement: Kosten-Übersichtskarten
Das Dashboard SHALL Kosten-Werte mit 2 Dezimalstellen und "€"-Suffix formatieren.

#### Scenario: Kostenkarte zeigt Gesamtkosten
- **WHEN** der Staff-User den KI-Feedback-Tab öffnet
- **THEN** SHALL eine Karte "Gesamtkosten" mit dem Wert `total_cost_eur` angezeigt werden
- **THEN** der Wert SHALL mit genau 2 Dezimalstellen formatiert sein (z. B. "0,42 €")

### Requirement: Kontext-Kostenaggregation
Die `by_context`-Aggregation SHALL gegen die tatsächlich gespeicherten `context`-Strings gruppieren. Die Kontext-Tabelle SHALL für jeden real genutzten Kontext eine Zeile mit Kosten und Tokens anzeigen.

#### Scenario: Kontext-Tabelle ist gefüllt
- **WHEN** AiInteraction-Datensätze mit `context` wie `improve_text`, `meal_plan_ai_suggest` oder `recipe_ai_create` existieren
- **THEN** die Kontext-Tabelle SHALL für jeden dieser Kontexte eine aggregierte Zeile mit `total_tokens` und `total_cost_eur` anzeigen
- **THEN** die Tabelle SHALL nicht leer sein, wenn entsprechende Interaktionen existieren
