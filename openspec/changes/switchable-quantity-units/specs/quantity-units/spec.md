## ADDED Requirements

### Requirement: Mengenmodell Anzahl × Einheit
Jeder Zutaten-Eintrag (`MealItem` mit `ingredient`, `RecipeItem`) SHALL seine Menge als `quantity` (Anzahl) mit genau einer Einheitenart speichern:
- `portion`: `portion_id` einer Portion der Zutat. `quantity` = Anzahl dieser Portion.
- `standard`: `standard_measure_key` ∈ `el`, `tl`, `tasse`, `prise`, `msp`. `quantity` = Anzahl des Maßes.
- `grams` / `milliliters`: keine Portion und kein Standardmaß. `quantity` = Gramm bzw. Milliliter.

Bei `MealItem` MUST `measuring_unit` nur bei `grams`/`milliliters` gesetzt sein (Gramm bzw. Milliliter) und sonst leer. Bei `RecipeItem` (Zutat über die Portion verankert) gilt `grams` = „g“-Basisportion der Zutat ohne Standardmaß, und `standard` = „g“-Basisportion mit `standard_measure_key`. Die Datenbank MUST widersprüchliche Kombinationen per CheckConstraint verhindern. Die API MUST sie mit 422 und einer deutschen Fehlermeldung ablehnen.

#### Scenario: Portion ohne Maßeinheit
- **GIVEN** ein angemeldeter Nutzer mit Bearbeitungsrecht
- **WHEN** er Frischkäse mit Portion „Portion“ (30 g) und Anzahl 0,5 hinzufügt
- **THEN** SHALL der Eintrag `portion_id` = „Portion“, `quantity = 0.5` und keine `measuring_unit` haben

#### Scenario: Widersprüchliche Angaben
- **WHEN** ein Request `portion_id` und `standard_measure_key` gleichzeitig sendet
- **THEN** MUST die API mit 422 antworten

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Client einen Eintrag anlegen oder ändern will
- **THEN** MUST die API mit 401 antworten und nichts ändern

### Requirement: Eine Gramm-Berechnung
Das Backend SHALL das Gewicht eines Zutaten-Eintrags mit genau einer Funktion berechnen: `portion` → Anzahl × vertrauenswürdiges Portionsgewicht; `standard` → Anzahl × Standardmaß über die Dichte der Zutat (Fallback 1 g/ml, dann ungefähr); `grams` → Anzahl; `milliliters` → Anzahl × Dichte. kcal, Kosten, Plausibilität, Einkaufsliste, PDF und alle API-Antworten MUST diese Funktion nutzen. `MealItemOut` und `RecipeItemOut` SHALL `quantity_g`, `unit_kind`, `unit_label`, `is_weight_approx` und `has_missing_weight` liefern.

#### Scenario: Portion
- **WHEN** ein Eintrag 0,5 × „Portion“ (30 g) hat
- **THEN** SHALL `quantity_g = 15`, `unit_kind = "portion"`, `unit_label = "Portion"` sein

#### Scenario: Standardmaß
- **WHEN** ein Eintrag 2 × EL Olivenöl (Dichte 0,92) hat
- **THEN** SHALL `quantity_g = 27.6`, `unit_label = "EL"`, `is_weight_approx = false` sein

#### Scenario: Korrigiertes Portionsgewicht wirkt überall
- **GIVEN** viele Einträge „2 Stück“ Brötchen mit Portion „Stück“ (100 g, falsch geschätzt)
- **WHEN** die Portion auf 60 g korrigiert wird
- **THEN** SHALL jeder dieser Einträge „2 Stück (120 g)“ zeigen, und kcal, Kosten und Einkaufsliste rechnen mit 120 g

### Requirement: Einheitenoptionen pro Zutat
Das Backend SHALL für jede Zutat alle möglichen Einheiten liefern (`UnitOptionOut { key, kind, label, grams_per_unit, is_approx, has_weight }`): Gramm, Milliliter (über die Dichte, Fallback 1 g/ml), alle aktiven, nicht ersetzten Portionen außer der „g“-Basisportion (ohne Gewicht mit `has_weight = false`) und alle Standardmaße. `GET /api/ingredients/unit-options/?ids=1,2,3` SHALL die Optionen für bis zu 200 Zutaten in einem Call liefern (nicht paginiert, sichtbar nach `food_access`, auch für nicht angemeldete Besucher bei öffentlichen Zutaten).

#### Scenario: Optionen für Brötchen
- **WHEN** die Optionen für Brötchen (Portionen „Stück“ 60 g, „Hälfte“ 30 g) abgerufen werden
- **THEN** SHALL die Antwort „Stück“, „Hälfte“, EL, TL, Tasse, Prise, Msp und Gramm enthalten

### Requirement: Startansicht
Jede Mengenanzeige SHALL für alle Nutzer in der gespeicherten Einheit des Eintrags starten. Beim Hinzufügen einer Zutat SHALL die Einheit vorausgewählt sein: Portion mit niedrigstem `rank`, vertrauenswürdigem Gewicht und nicht „g“-Basisportion, mit Anzahl 1; sonst Gramm mit 100. Der Nutzer kann Einheit und Anzahl vor dem Hinzufügen ändern.

#### Scenario: Screenshot-Fall
- **GIVEN** Frischkäse mit 0,5 × „Portion“ (30 g) in der Buffet-Rolle „Belag herzhaft“
- **WHEN** der MealSlot den Eintrag zeigt
- **THEN** SHALL „0,5 Portion (15 g)“ erscheinen
- **AND** nicht „0,5 Gramm (15g)“

#### Scenario: Brötchen hinzufügen
- **WHEN** „Brötchen“ (rank 1 „Stück“ 60 g) über die Omnibar hinzugefügt wird
- **THEN** SHALL „1 Stück (60 g)“ vorausgewählt sein und so gespeichert werden

#### Scenario: Zutat ohne gewichtete Portion
- **WHEN** Mehl ohne gewichtete Portion hinzugefügt wird
- **THEN** SHALL „100 g“ vorausgewählt sein

### Requirement: Gramm ist immer sichtbar
In jeder Ansicht und Einheit MUST die Grammmenge sichtbar sein: `"{Anzahl} {Einheit} ({Gramm})"`, bei Gramm nur `"{Gramm}"`, bei Milliliter `"{ml} ml ({Gramm})"`. Bei ungefährer Umrechnung steht `≈` vor dem Gramm. Fehlt das Gewicht, steht statt der Gramm „Gewicht fehlt“ mit einer Aktion, die den Ablauf aus `piece-portion-mapping` öffnet. Während der Eingabe MUST neben dem Feld live die resultierende Grammmenge stehen. Auf 320 px darf die Zeile umbrechen, die Gramm dürfen aber nicht verschwinden. Anzahlen werden mit höchstens zwei Nachkommastellen und deutschem Komma gezeigt.

#### Scenario: Standardmaß ohne explizite Dichte
- **WHEN** ein Eintrag 1 × TL Honig ohne explizite Dichte hat
- **THEN** SHALL „1 TL (≈ 5 g)“ erscheinen

#### Scenario: Live-Vorschau
- **WHEN** der Nutzer in der Einheit „Stück“ (60 g) „2,5“ tippt
- **THEN** SHALL vor dem Speichern „= 150 g“ neben dem Feld stehen

#### Scenario: Gewicht fehlt
- **WHEN** ein Eintrag 2 × „Stück“ ohne Gewicht hat
- **THEN** SHALL „2 Stück (Gewicht fehlt)“ mit der Aktion „Gewicht ergänzen“ erscheinen

### Requirement: Dynamische Ansicht
Jede Zeile mit Zutatenmenge SHALL an jedem Anzeigeort einen Einheiten-Umschalter mit allen Einheitenoptionen der Zutat haben (Gruppen „Zutat“, „Standardmengen“, „Gramm“; jede Option mit Grammgewicht). Die Wahl ändert nur die Anzeige der Zeile, sendet keinen Request und gilt bis zum Verlassen der Seite. Jede Seite mit Zutatenmengen SHALL den Modus „Alles in Gramm“ über den URL-Parameter `?units=grams` anbieten; eine Zeilenwahl hat Vorrang. Auch nicht angemeldete Besucher und Nutzer ohne Bearbeitungsrecht SHALL umschalten können.

#### Scenario: Zeile auf EL umschalten
- **GIVEN** „Frischkäse 0,5 Portion (15 g)“
- **WHEN** der Nutzer „EL“ wählt
- **THEN** SHALL „≈ 1 EL (15 g)“ erscheinen, und es wird nichts gespeichert

#### Scenario: Alle sehen weiter die gespeicherte Einheit
- **GIVEN** Peter hat eine Zeile auf EL umgeschaltet, ohne etwas einzugeben
- **WHEN** eine Mitplanerin den Plan öffnet
- **THEN** SHALL sie „0,5 Portion (15 g)“ sehen

#### Scenario: Seite in Gramm
- **WHEN** der Nutzer „Alles in Gramm“ wählt
- **THEN** SHALL jede Zeile ohne eigene Wahl nur Gramm zeigen, und die URL enthält `?units=grams`

### Requirement: Eingabe in jeder Einheit
Wo der Nutzer Mengen bearbeiten darf, SHALL das Mengenfeld die Anzahl in der aktuell gezeigten Einheit enthalten. Bestätigt der Nutzer eine Eingabe, MUST der Eintrag mit genau dieser Einheit und Anzahl gespeichert werden (`PATCH … { quantity, portion_id?, measuring_unit_id?, standard_measure_key? }`). Die Gramm berechnet das Backend. Portionen ohne Gewicht SHALL wählbar sein, weil die Anzahl als Absicht erhalten bleibt; sie werden aber als „Gewicht fehlt“ markiert und erzeugen die bestehende Warnung. Für synchronisierte Mahlzeiten und Nutzer ohne Bearbeitungsrecht SHALL kein Mengenfeld erscheinen.

#### Scenario: Peter trägt Brötchen in Stück ein
- **GIVEN** ein Frühstück mit „Brötchen 90 g“ (Einheit Gramm)
- **WHEN** Peter „Stück“ wählt, „2“ eingibt und bestätigt
- **THEN** SHALL der Eintrag Portion „Stück“ mit `quantity = 2` speichern und „2 Stück (120 g)“ zeigen

#### Scenario: Prise Salz
- **WHEN** ein Nutzer für Salz „Prise“ wählt und „1“ eingibt
- **THEN** SHALL der Eintrag `standard_measure_key = "prise"`, `quantity = 1` speichern und „1 Prise (≈ 500 mg)“ zeigen

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein angemeldeter Nutzer ohne Bearbeitungsrecht den Eintrag ändern will
- **THEN** MUST die API mit 403 antworten

### Requirement: Gemeinsamer Formatierer
Das Food-Frontend SHALL genau eine Umrechnungs- und Formatierungsfunktion für Zutatenmengen haben (`lib/quantityUnits.ts`: `toUnit`, `toCount`, `formatAmount`). Alle Anzeigeorte MUST sie nutzen. Das Backend SHALL für den PDF-Export dieselbe Formatierung umsetzen. Ein gemeinsamer Fixture-Satz MUST in Backend und Frontend identische Strings ergeben.

#### Scenario: Gleiche Anzeige an allen Orten
- **GIVEN** derselbe Eintrag
- **WHEN** er in MealSlot (Karte und Buffet-Rolle), Tabellen- und Tagesansicht, Referenz-Mahlzeit-Editor, Buffet-Wizard und PDF erscheint
- **THEN** MUST an allen Orten derselbe Text stehen
