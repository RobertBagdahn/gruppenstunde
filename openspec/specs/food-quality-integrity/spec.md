## Purpose
Diese Spezifikation definiert die konsistente Variantenberechnung und die Integritätsregeln für Rezept-Forks und aktive Planungen.

## Requirements

### Requirement: Variantenauswahl ist in allen Food-Berechnungen konsistent
Nach einer Portionsdaten-Reparatur MUST das System dieselbe aktive RecipeItem-Auswahl und die korrigierten Portionen in Nährwertaggregation, Preisen, Einkaufslisten und Kochplan verwenden.

#### Scenario: Default ohne aktive Auswahl
- **WHEN** ein MealItem keine aktiven RecipeItem-IDs übermittelt
- **THEN** normale Zutaten und die Default-Position jeder Austauschgruppe werden in allen vier Berechnungspfaden berücksichtigt

#### Scenario: Explizite Alternative
- **WHEN** ein MealItem eine Alternative einer Austauschgruppe aktiviert
- **THEN** die Default-Position wird ersetzt und die Alternative erscheint genau einmal in Nährwerten, Kosten, Einkaufsliste und Kochplan

#### Scenario: Überschriebene oder ausgeschlossene Zutat
- **WHEN** ein MealItem einen Mengen-Override oder Ausschluss enthält
- **THEN** alle betroffenen Berechnungspfade verwenden denselben Override bzw. lassen die Zutat vollständig weg

#### Scenario: Repaired portion across consumers
- **WHEN** ein RecipeItem auf eine korrigierte Replacement-Portion umgestellt wurde
- **THEN** müssen Nährwerte, Kosten, Einkaufsliste und Kochplan dieselbe neue Portion verwenden
- **THEN** darf die alte Portion nicht zusätzlich aggregiert werden

### Requirement: Rezept-Forking und Variantenschutz sind atomar
Repair-Rebinds dürfen keine aktiven MealPlan-Variantendaten beschädigen und MUST innerhalb einer atomaren Transaktion erfolgen.

#### Scenario: Fork mit Austauschgruppen
- **WHEN** ein sichtbares Rezept mit Austauschgruppen geforkt wird
- **THEN** werden Rezept, Gruppen, Items, optionale Flags und Gruppenpositionen vollständig kopiert

#### Scenario: Fehler während des Forks
- **WHEN** das Kopieren eines Fork-Bestandteils fehlschlägt
- **THEN** wird die gesamte Transaktion zurückgerollt und kein unvollständiger Fork bleibt bestehen

#### Scenario: Aktive Variante löschen
- **WHEN** eine Variante von einem aktiven MealItem referenziert wird
- **THEN** verweigert die API die Löschung mit einem dokumentierten Konfliktstatus

#### Scenario: Repair with active meal plan
- **WHEN** ein zu reparierendes RecipeItem von einem aktiven MealPlan referenziert wird
- **THEN** darf die Reparatur nur vollständig oder gar nicht angewendet werden
- **THEN** bleiben aktive Varianten und ihre Auswahlsemantik gültig
