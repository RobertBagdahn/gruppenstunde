## ADDED Requirements

### Requirement: Editierbare Menge basiert auf autoritativem Backend-Gewicht
Der `InlineIngredientEditor` MUSS den editierbaren `quantity`-Wert eines RecipeItems aus dem backend-autoritativen `item.weight_g`-Feld (im Verhältnis zur ursprünglichen `item.quantity`) berechnen, nicht aus einer Client-seitigen Suche in `ingredient_portions` nach `item.portion_id`. Die Menge MUSS immer in Gramm angezeigt werden, gebunden an die Bezeichnung der Rank-1-Portion der Zutat.

#### Scenario: Portion ist in ingredient_portions vorhanden
- **WHEN** ein RecipeItem geladen wird, dessen `portion_id` in der mitgelieferten `ingredient_portions`-Liste enthalten ist
- **THEN** MUSS der angezeigte `quantity`-Wert `item.weight_g / item.quantity`-Verhältnis korrekt widerspiegeln (Gramm-Anzeige)

#### Scenario: Portion fehlt in ingredient_portions (z.B. soft-gelöscht)
- **WHEN** ein RecipeItem geladen wird, dessen `portion_id` NICHT in der mitgelieferten `ingredient_portions`-Liste enthalten ist (z. B. weil die referenzierte Portion soft-gelöscht wurde)
- **THEN** DARF der angezeigte `quantity`-Wert NICHT auf Basis von `weight_g = 1` (Fallback) berechnet werden
- **THEN** MUSS stattdessen `item.weight_g` (backend-autoritativ) als Grundlage verwendet werden

#### Scenario: Regression — Jodsalz-Item mit soft-gelöschter Portion
- **WHEN** ein RecipeItem (wie im Rezept "Linsensuppe" beobachtet) auf eine soft-gelöschte Portion mit `weight_g = 100` zeigt, deren aktuelle Gesamtmenge laut Backend `item.weight_g = 7.3` Gramm beträgt
- **THEN** MUSS der Editor einen `quantity`-Wert anzeigen, der `7.3` Gramm entspricht, nicht einen aus dem fehlerhaften Fallback (`weight_g = 1`) resultierenden, deutlich abweichenden Wert
