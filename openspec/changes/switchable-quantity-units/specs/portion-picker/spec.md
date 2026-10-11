## ADDED Requirements

### Requirement: PortionPicker als Einheiten-Umschalter an allen Mengenorten
Für Essensplan, Referenz-Mahlzeit, Buffet, Frühstück und Einkaufsliste SHALL das Food-Frontend einen Einheiten-Umschalter (`components/quantity/UnitPicker.tsx`) verwenden; der Rezept-Editor SHALL denselben Optionskatalog und dieselbe Umrechnungslogik nutzen. Der Umschalter SHALL immer alle Einheitenoptionen der Zutat zeigen, jeweils mit Grammgewicht. Er SHALL zwei Modi unterstützen: **Ansicht** (Auswahl ändert nur die Anzeige) und **Eingabe** (Auswahl stellt die Einheit des Mengenfelds um und rechnet die Anzahl mengenerhaltend um; gespeichert wird erst beim Bestätigen). In bearbeitbaren Essensplan-Einträgen (`MealItem`) speichert die Auswahl einer Einheit mit Gewicht ohne neue Eingabe sofort mit konstantem Gewicht und bietet „Rückgängig“ an (`quantity-units`, „Einheitenwechsel mit konstantem Gewicht“). Eine kompakte Trigger-Variante MUST ab 320 px in eine Zeile mit Mengenfeld und Gramm-Vorschau passen oder umbrechen, ohne horizontal zu scrollen.

#### Scenario: Ansichtsmodus
- **WHEN** ein Nutzer ohne Bearbeitungsrecht im MealSlot „EL“ wählt
- **THEN** SHALL nur die Anzeige der Zeile wechseln

#### Scenario: Eingabemodus
- **GIVEN** ein Mengenfeld „90 g“ Brötchen außerhalb des Essensplans (z. B. Rezept-Editor)
- **WHEN** der Nutzer „Stück“ (60 g) wählt
- **THEN** SHALL das Feld „1,5“ mit Einheit „Stück“ und „= 90 g“ zeigen, und gespeichert wird erst beim Bestätigen

#### Scenario: Eingabemodus im Essensplan
- **GIVEN** ein bearbeitbarer Essensplan-Eintrag „90 g“ Brötchen
- **WHEN** der Nutzer „Stück“ (60 g) wählt
- **THEN** SHALL der Eintrag sofort als „1,5 Stück (90 g)“ gespeichert werden, und ein Hinweis „Einheit geändert“ mit „Rückgängig“ erscheint

### Requirement: Standardmaß-Auswahl behält die Einheit
Wählt der Nutzer im Abschnitt „Standardmengen“ ein Maß, SHALL der Eintrag auf `standard_measure_key` wechseln, mit mengenerhaltend umgerechneter Anzahl (bei unbekanntem Gewicht: 1). Das gilt auch im Rezept-Editor (`InlineIngredientEditor`, `IngredientQuantityDialog`), der bisher in Gramm umgerechnet hat.

#### Scenario: EL im Rezept-Editor
- **GIVEN** eine Rezept-Zutat Öl mit 30 g ohne explizite Dichte
- **WHEN** der Nutzer „EL“ wählt und speichert
- **THEN** SHALL die Zeile „2 EL (≈ 30 g)“ zeigen und `standard_measure_key = "el"`, `quantity = 2` speichern
