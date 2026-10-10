## REMOVED Requirements

### Requirement: Stückzahl-Äquivalente in der Einkaufsliste
**Reason**: Der feste Hinweis „≈ 26 Scheiben“ hinter der Grammangabe wird durch Startansicht und dynamische Ansicht aus `quantity-units` ersetzt.
**Migration**: `piece_equivalent` entfällt; stattdessen werden `start_unit` und `ingredient_id` geliefert.

## ADDED Requirements

### Requirement: Einkaufsliste mit Startansicht und dynamischer Ansicht
Die Einkaufsliste (Ansicht im Essensplan und kollaborative Liste) SHALL intern weiter mit `quantity_g` rechnen und speichern. Die Startansicht je Zutat SHALL sein: die gemeinsame Einheit aller Quell-Einträge, sonst die Standardportion mit Gewicht, sonst Gramm. Anzeige nach `quantity-units` mit Gramm immer sichtbar, z. B. „24 Stück (1,4 kg)“. Umschalten wirkt nur auf die Ansicht. In der kollaborativen Liste SHALL ein Mitglied mit Bearbeitungsrecht Mengen in jeder Einheit eingeben; gespeichert wird `quantity_g`, verteilt per Echtzeit-Update. Stückartige Einheiten werden nach `shopping-list-views` aufgerundet. Packungsangaben und REWE-Export bleiben unverändert.

#### Scenario: Brötchen aus dem Plan
- **GIVEN** „Brötchen“ als 1,5 × „Stück“ (60 g) pro Person für 16 Personen ohne Reserve
- **WHEN** die Einkaufsliste angezeigt wird
- **THEN** SHALL der Eintrag „24 Stück (1,4 kg)“ zeigen

#### Scenario: Gemischte Quell-Einheiten
- **GIVEN** Frischkäse kommt einmal in EL und einmal als „Portion“ vor, Standardportion ist „Portion“ (30 g)
- **WHEN** die Einkaufsliste angezeigt wird
- **THEN** SHALL der Eintrag in „Portion“ mit Gramm in Klammern starten

#### Scenario: Menge in Stück ändern
- **GIVEN** ein angemeldetes Mitglied mit Bearbeitungsrecht an der Liste
- **WHEN** es „30 Stück“ eingibt
- **THEN** SHALL `quantity_g = 1800` gespeichert und allen Betrachtern übertragen werden

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein Betrachter ohne Bearbeitungsrecht eine Menge ändern will
- **THEN** MUST die API mit 403 antworten
