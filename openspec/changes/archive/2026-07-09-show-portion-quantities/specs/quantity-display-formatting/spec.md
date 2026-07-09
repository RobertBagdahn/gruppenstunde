## ADDED Requirements

### Requirement: Konvention „Gramm zuerst, Portion sekundär"

Überall dort, wo eine Gramm-Menge zusammen mit einem abgeleiteten Portionshinweis angezeigt wird, SHALL die Reihenfolge „Gramm zuerst, Portion sekundär" gelten: `"{grams}g · ≈ {count} {portion_name}"`. Diese Konvention gilt sowohl für neue Anzeigeorte (Breakfast Wizard, Essensplan-Editor) als auch für bestehende Anzeigeorte, die zuvor „Portion zuerst" darstellten (z.B. `IngredientDetailPage`).

#### Scenario: Vereinheitlichung auf IngredientDetailPage

- **WHEN** `IngredientDetailPage` eine Portion mit `weight_g=285` für eine Zutat mit `name="Stück"` anzeigt
- **THEN** MUST die Anzeige `"285g · ≈ 1 Stück"` lauten (nicht mehr `"Stück (≈ 285g)"`)

#### Scenario: Konsistenz zwischen Essensplan-Editor und Wizard

- **WHEN** dieselbe Zutat sowohl im Breakfast Wizard als auch im Essensplan-Editor mit Gramm-Menge angezeigt wird
- **THEN** MUST in beiden Kontexten dieselbe „Gramm zuerst, Portion sekundär"-Reihenfolge und dasselbe Rundungsverhalten gelten
