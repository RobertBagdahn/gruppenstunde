# meal-cockpit Specification

## Purpose

Nährwert- und Kostenaggregation für die Vorschlags- und Cockpit-Ausgaben.

## Legacy Migrations

Die frühere HealthRule- und MealEvent-Cockpit-API wurde durch das einheitliche Rule- und
Suggestions-System ersetzt. Regeln werden über `/api/rules/` verwaltet und über
`/api/meal-plans/{id}/suggestions/` ausgewertet. Ein separates Cockpit-Tab ist nicht erforderlich.

## Requirements

### Requirement: Gemeinsame Cockpit-Berechnung

Das Cockpit SHALL denselben Berechnungskontext wie Kosten, Nährwerte, Einkaufsliste und Kochplan
verwenden: aktive RecipeItems, Overrides, `factor`, `Recipe.servings` und
`effective_portions`. Für Rezeptwerte gilt die jeweilige Gesamtmenge skaliert mit
`factor × effective_portions / Recipe.servings`.

#### Scenario: Rezept mit Mahlzeiten-Override
- **WHEN** ein Rezept mit `servings=4` in einer Mahlzeit mit `effective_portions=20` und `factor=1.5` verwendet wird
- **THEN** berechnet das Cockpit den Beitrag mit `cached_total × 1.5 × (20 / 4)`

#### Scenario: Override schließt Zutat aus
- **WHEN** ein `MealItemOverride` ein RecipeItem ausschließt
- **THEN** trägt diese Zutat nicht zu Energie, Kosten oder Nährwertregeln bei

### Requirement: Aggregation nach Scope

Mahlzeitwerte SHALL aus dem gemeinsamen Kontext stammen. Tages- und Planwerte SHALL diese
Mahlzeitwerte gemäß dem jeweiligen Rule-Scope aggregieren; `meal_event`-Werte werden als
Tagesdurchschnitt ausgegeben. Die Soll-Band-Felder `min_green`, `max_green` und `target_mid`
werden mit der Auswertung zurückgegeben.

#### Scenario: Tagesdurchschnitt
- **WHEN** ein Plan zwei Tage mit aggregierten Tageswerten enthält
- **THEN** liefert eine `meal_event`-Regel den Durchschnitt beider Tage ohne zusätzliche globale
  Division durch `norm_portions`

### Requirement: Fehlende Cachewerte

Das System SHALL fehlende Rezeptgewichte oder Cachewerte durch eine RecipeItem-basierte
Neuberechnung oder eine kontrollierte unvollständige Ausgabe behandeln.

#### Scenario: Fehlender Rezeptcache
- **WHEN** ein Rezept keinen gültigen Cache besitzt
- **THEN** versucht das Cockpit die Werte aus den aktiven RecipeItems zu berechnen
