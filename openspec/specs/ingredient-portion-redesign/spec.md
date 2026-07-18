# ingredient-portion-redesign Specification

## Purpose
Definiert das Portion-Ranking-System für Zutaten: eindeutige Namen, Normalportion (rank=1), fixierte g-Systemportion, Drag & Drop-Sortierung und KI-gestützte Gewichtsschätzung.
## Requirements
### Requirement: Portion name is unique per ingredient

Das System SHALL sicherstellen, dass keine zwei Portionen derselben Zutat denselben Namen haben (case-insensitive, ohne führende/abschließende Leerzeichen). Soft-gelöschte Portionen werden bei der Prüfung ausgeschlossen.

#### Scenario: Doppelter Name beim Anlegen

- **WHEN** ein User versucht eine Portion mit dem Namen „Packung" anzulegen, obwohl bereits eine Portion mit diesem Namen existiert
- **THEN** SHALL das Backend HTTP 422 mit der Fehlermeldung „Eine Portion mit diesem Namen existiert bereits für diese Zutat." zurückgeben
- **THEN** SHALL keine neue Portion in der Datenbank angelegt werden

#### Scenario: Case-insensitive Prüfung

- **WHEN** eine Portion mit dem Namen „Packung" existiert und ein User „packung" anlegen will
- **THEN** SHALL das Backend HTTP 422 zurückgeben

#### Scenario: Soft-gelöschte Portion ignoriert

- **WHEN** eine Portion mit dem Namen „Stück" soft-gelöscht wurde (`deleted_at IS NOT NULL`) und ein User eine neue Portion „Stück" anlegt
- **THEN** SHALL die neue Portion erfolgreich angelegt werden

---

### Requirement: rank=1 ist die Normalportion (Default)

Das System SHALL die Portion mit dem niedrigsten `rank`-Wert (rank=1) als Normalportion behandeln. Diese Portion wird bei Rezept-Erstellung, KI-Vorschlägen und allen Standardauswahl-Kontexten automatisch vorausgewählt.

#### Scenario: Rezept-Zutat-Hinzufügen wählt rank=1 vor

- **WHEN** ein User eine Zutat zu einem Rezept hinzufügt
- **THEN** SHALL die Portion mit `rank=1` automatisch ausgewählt sein
- **THEN** SHALL `quantity=1` vorausgefüllt sein, außer wenn `rank=1` die `g`-System-Portion ist (dann `quantity=100`)

#### Scenario: UI markiert rank=1 als „Standard"

- **WHEN** die Portionsliste einer Zutat angezeigt wird
- **THEN** SHALL die Portion mit `rank=1` ein „Standard"-Badge tragen
- **THEN** SHALL die Zeile der rank=1-Portion visuell hervorgehoben sein (z.B. leichter farbiger Hintergrund)

#### Scenario: Fallback wenn rank=1 die g-Portion ist

- **WHEN** keine benutzerdefinierten Portionen existieren und `rank=1` die System-Portion „g" ist
- **THEN** SHALL beim Hinzufügen zum Rezept `quantity=100` vorausgefüllt sein (100g als Standardmenge)

---

### Requirement: g-System-Portion ist immer am Ende fixiert

Das System SHALL die System-Portion „g" immer mit dem höchsten `rank`-Wert versehen und sie von der Drag & Drop-Sortierung ausschließen.

#### Scenario: Neue Zutat angelegt

- **WHEN** eine neue Zutat angelegt wird und die System-Portionen via Signal erstellt werden
- **THEN** SHALL „g" den höchsten rank (z.B. 9999) erhalten
- **THEN** SHALL „Stück" und „Packung" sortierbare ranks erhalten (z.B. rank=2, rank=3)

#### Scenario: g nicht per Drag & Drop verschiebbar

- **WHEN** die Portionsliste im UI angezeigt wird
- **THEN** SHALL die „g"-Portion keinen Drag-Handle haben und nicht verschiebbar sein

---

### Requirement: Neue Portionen erhalten den nächsten freien rank

Das System SHALL neu angelegte Portionen automatisch mit dem nächst höheren `rank` versehen, unter Ausschluss der fixierten „g"-Portion.

#### Scenario: Neue Portion wird angelegt

- **WHEN** ein User eine neue Portion anlegt und es bereits Portionen mit rank=1,2,3 sowie „g" mit rank=9999 gibt
- **THEN** SHALL die neue Portion rank=4 erhalten

---

### Requirement: Portionen per Drag & Drop sortieren

Das System SHALL dem User ermöglichen, die Reihenfolge der Portionen per Drag & Drop zu ändern. Nur die System-Portion „g" ist davon ausgenommen.

#### Scenario: User verschiebt Portion nach oben

- **WHEN** ein User eine Portion per Drag & Drop über eine andere zieht
- **THEN** SHALL der neue `rank` der gezogenen Portion dem rank der Zielposition entsprechen
- **THEN** SHALL alle betroffenen Portionen ihre ranks entsprechend neu erhalten
- **THEN** SHALL die Liste sofort in der neuen Reihenfolge angezeigt werden (optimistic update)

#### Scenario: Batch-Reorder-Endpoint

- **WHEN** nach einem Drag & Drop das Frontend die neue Reihenfolge persistieren will
- **THEN** SHALL das Backend einen Endpoint `POST /api/ingredients/{slug}/portions/reorder/` bereitstellen
- **THEN** SHALL der Body `{ "orders": [{"id": int, "rank": int}, ...] }` akzeptiert werden
- **THEN** SHALL alle übergebenen Portionen atomisch mit den neuen rank-Werten aktualisiert werden

---

### Requirement: Warnung wenn Packung kein weight_g hat

Das System SHALL im UI eine deutliche Warnung anzeigen wenn die System-Portion „Packung" kein `weight_g` hat. Das Speichern ist trotzdem möglich.

#### Scenario: Packung ohne weight_g

- **WHEN** die Zutat-Detailseite angezeigt wird und die „Packung"-Portion kein `weight_g` hat
- **THEN** SHALL ein gelbes Warn-Banner oder Badge „Packungsgewicht fehlt" sichtbar sein
- **THEN** SHALL der User trotzdem speichern können ohne Blocker

#### Scenario: Packung mit weight_g

- **WHEN** die „Packung"-Portion ein gültiges `weight_g` hat
- **THEN** SHALL keine Warnung angezeigt werden

---

### Requirement: KI schätzt weight_g für Stück und Packung

Das System SHALL beim KI-gestützten Anlegen einer Zutat (`ai-create`) immer eine Schätzung für `stueck_weight_g` und `packung_weight_g` vom Gemini-Modell anfordern. Die KI darf `null` zurückgeben wenn das Konzept für diese Zutat nicht sinnvoll ist.

#### Scenario: KI schätzt Stück-Gewicht für stückbare Zutat

- **WHEN** `ai-create` für „Apfel" aufgerufen wird
- **THEN** SHALL `stueck_weight_g` ≈ 180 (g) im KI-Response vorhanden sein
- **THEN** SHALL die System-Portion „Stück" mit diesem `weight_g` befüllt werden

#### Scenario: KI gibt null für Stück bei nicht-stückbarer Zutat

- **WHEN** `ai-create` für „Nudeln" aufgerufen wird
- **THEN** DARF `stueck_weight_g` null sein
- **THEN** SHALL die System-Portion „Stück" ohne `weight_g` angelegt werden (leere Hülle)

#### Scenario: KI legt Normalportion als rank=1 an

- **WHEN** `ai-create` für „Nudeln" aufgerufen wird
- **THEN** SHALL die KI eine Normalportion (z.B. „125g", weight_g=125) als erste Portion zurückgeben
- **THEN** SHALL diese Portion `rank=1` erhalten
- **THEN** SHALL Stück (rank=2) und Packung (rank=3) danach kommen, g am Ende

### Requirement: Rank-1 Portion Must Have Plausible Weight
Every ingredient's rank-1 portion SHALL have a weight_g that reflects a typical serving amount for that ingredient type. Portions with weight_g ≤ 1.0g are only permitted for trace ingredients (spices, seasonings in "Prise" portions).

#### Scenario: Plausible rank-1 for vegetables
- **WHEN** viewing portions for "Zucchini"
- **THEN** rank-1 portion has weight_g between 100 and 300 (one whole zucchini)
- **AND** is named descriptively (e.g., "1 Stück (200g)")

#### Scenario: Plausible rank-1 for spices
- **WHEN** viewing portions for "gemahlener schwarzer Pfeffer"
- **THEN** rank-1 portion has weight_g between 2 and 5 (one teaspoon)
- **AND** is named descriptively (e.g., "1 TL (2g)")

#### Scenario: Plausible rank-1 for liquids
- **WHEN** viewing portions for "Kuhmilch 3,5 % Fett"
- **THEN** rank-1 portion has weight_g of 100 or 200 (100ml or 200ml)
- **AND** uses a liquid measuring unit (ml)

### Requirement: Nonsensical Portions Removed
Portions with meaningless names and weights SHALL be removed from the seed data. This includes "ml" on solid ingredients, "evtl." (parsing artifact), and "Stück"/"Packung"/"Becher"/"Glas" without specified weights.

#### Scenario: Garbage portion removed
- **WHEN** ingredient "Zitrone" has a portion named "ml" with weight_g=1.0
- **THEN** the portion is deleted
- **AND** a proper portion (e.g., "1 Stück (120g)") is added as rank 1

#### Scenario: Gram base portion preserved
- **WHEN** an ingredient has a portion named "g" with weight_g=1.0
- **THEN** the portion is kept at rank=9999 as the free-form gram entry
- **AND** its measuring_unit is the "g" MeasuringUnit

### Requirement: Portion Type Defaults
Ingredients without curated portions SHALL receive type-based default portions derived from their retail section and physical properties.

#### Scenario: Default portions for vegetables
- **WHEN** ingredient is in retail section "Gemüse" and has no curated portions
- **THEN** rank-1 is created as "1 Stück (150g)" with weight_g=150
- **AND** rank-2 is created as "100g" with weight_g=100
- **AND** rank-9999 is "g" (1g) for free-form entry

