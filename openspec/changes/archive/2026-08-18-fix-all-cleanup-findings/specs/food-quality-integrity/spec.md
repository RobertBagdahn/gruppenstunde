## ADDED Requirements

### Requirement: Variantenauswahl ist in allen Food-Berechnungen konsistent
Das System MUST normale Zutaten, optionale Zutaten, Default-Austauschpositionen, aktive Alternativen und Overrides nach derselben Auswahlsemantik in Nährwertaggregation, Preisen, Einkaufslisten und Kochplan verwenden.

#### Scenario: Default ohne aktive Auswahl
- **WHEN** ein MealItem keine aktiven RecipeItem-IDs übermittelt
- **THEN** normale Zutaten und die Default-Position jeder Austauschgruppe werden in allen vier Berechnungspfaden berücksichtigt

#### Scenario: Explizite Alternative
- **WHEN** ein MealItem eine Alternative einer Austauschgruppe aktiviert
- **THEN** die Default-Position wird ersetzt und die Alternative erscheint genau einmal in Nährwerten, Kosten, Einkaufsliste und Kochplan

#### Scenario: Überschriebene oder ausgeschlossene Zutat
- **WHEN** ein MealItem einen Mengen-Override oder Ausschluss enthält
- **THEN** alle betroffenen Berechnungspfade verwenden denselben Override bzw. lassen die Zutat vollständig weg

### Requirement: Rezept-Forking und Variantenschutz sind atomar
Das System MUST Rezept-Forks vollständig oder gar nicht anlegen und darf Rezept- oder Variantendaten nicht löschen, solange eine aktive Planung sie referenziert.

#### Scenario: Fork mit Austauschgruppen
- **WHEN** ein sichtbares Rezept mit Austauschgruppen geforkt wird
- **THEN** werden Rezept, Gruppen, Items, optionale Flags und Gruppenpositionen vollständig kopiert

#### Scenario: Fehler während des Forks
- **WHEN** das Kopieren eines Fork-Bestandteils fehlschlägt
- **THEN** wird die gesamte Transaktion zurückgerollt und kein unvollständiger Fork bleibt bestehen

#### Scenario: Aktive Variante löschen
- **WHEN** eine Variante von einem aktiven MealItem referenziert wird
- **THEN** verweigert die API die Löschung mit einem dokumentierten Konfliktstatus
