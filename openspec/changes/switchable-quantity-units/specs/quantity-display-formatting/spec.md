## MODIFIED Requirements

### Requirement: Konvention „Gramm zuerst, Portion sekundär"
Überall, wo eine Zutatenmenge angezeigt wird, SHALL gelten: Einheit zuerst, Gramm in Klammern (`"{count} {unit_label} ({grams})"`), bei Gramm nur `"{grams}"`. Gramm MUST immer sichtbar sein. Startansicht ist die gespeicherte Einheit des Eintrags; wird nur ein Gramm-Wert angezeigt (z. B. Portionslisten), ist die Startansicht die Standardportion mit Gewicht. Der Nutzer kann die Ansicht nach `quantity-units` dynamisch umschalten. Die Regel gilt für alle Nutzer gleich und an allen Anzeigeorten (Buffet- bzw. Frühstücksbaukasten, Essensplan, Referenz-Mahlzeit, Rezept, Einkaufsliste, `IngredientDetailPage`, PDF-Export).

#### Scenario: Vereinheitlichung auf IngredientDetailPage
- **WHEN** `IngredientDetailPage` eine Portion mit `weight_g=285` und `name="Stück"` anzeigt
- **THEN** MUST die Anzeige `"1 Stück (285 g)"` lauten

#### Scenario: Gespeicherte Einheit
- **WHEN** ein Eintrag 2 × „Scheibe“ (30 g) hat
- **THEN** MUST die Anzeige `"2 Scheibe (60 g)"` lauten

#### Scenario: Konsistenz zwischen Essensplan-Editor und Wizard
- **WHEN** dieselbe Zutat sowohl im Baukasten als auch im Essensplan-Editor angezeigt wird
- **THEN** MUST in beiden Kontexten dieselbe Reihenfolge und dasselbe Rundungsverhalten gelten
