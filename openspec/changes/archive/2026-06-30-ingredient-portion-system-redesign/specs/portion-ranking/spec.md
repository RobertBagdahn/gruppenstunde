## MODIFIED Requirements

### Requirement: Portionen-Reihenfolge per Drag & Drop ändern

Das System MUSS dem Nutzer Drag & Drop ermöglichen, mit dem die Sortierreihenfolge der Portionen geändert werden kann. Die System-Portion „g" ist davon ausgenommen und immer ans Ende fixiert. ▲/▼-Buttons werden nicht mehr verwendet.

#### Scenario: Portion per Drag & Drop verschieben

- **WHEN** der Nutzer eine Portion per Drag-Handle greift und an eine neue Position zieht
- **THEN** tauscht die Portion ihre Position mit dem Ziel
- **THEN** werden alle betroffenen rank-Werte atomisch via `POST /{slug}/portions/reorder/` aktualisiert
- **THEN** wird die Liste sofort in neuer Reihenfolge angezeigt (optimistic update)

#### Scenario: g-Portion nicht verschiebbar

- **WHEN** die Portionsliste angezeigt wird
- **THEN** hat die „g"-Portion keinen Drag-Handle und kann nicht verschoben werden
- **THEN** bleibt „g" immer am Ende der Liste

#### Scenario: Touch-Bedienung funktioniert

- **WHEN** ein User auf einem Touch-Gerät eine Portion verschiebt
- **THEN** SHALL Drag & Drop via TouchSensor (`@dnd-kit`) funktionieren

---

### Requirement: Primäre Anzeigeauswahl nach rank=1

Die Auswahl der „primären" Portion für die Anzeige in `IngredientList` MUST explizit nach dem `rank`-Feld des `Portion`-Modells erfolgen: Die Portion mit dem niedrigsten `rank`-Wert, die eine bekannte `weight_g > 0` hat und keine Gramm-Basiseinheit ist, wird als primäre Anzeigeeinheit gewählt.

Gramm-Portionen (Einheit `g`, `Gramm`, `kg`, `Kilogramm`, `ml`, `Milliliter`, `l`, `Liter`) MUST als Gramm-Basiseinheiten klassifiziert werden und dürfen nicht als nicht-Gramm-Primäranzeige gewählt werden.

#### Scenario: Mehrere Portionen mit unterschiedlichen ranks

- **WHEN** ein Ingredient die Portionen `[{name: "125g", rank: 1, weight_g: 125}, {name: "Stück", rank: 2, weight_g: 180}, {name: "g", rank: 9999, weight_g: 1}]` hat
- **THEN** wird `125g` (rank: 1) als Primäranzeige gewählt

#### Scenario: rank=1 Portion ist Gramm-basiert

- **WHEN** ein Ingredient nur Gramm-basierte Portionen hat (z.B. nur „g" als rank=1)
- **THEN** wird Gramm als einzige Anzeige verwendet, keine nicht-Gramm-Primäranzeige

#### Scenario: Portion ohne weight_g wird übersprungen

- **WHEN** die rank=1-Portion `weight_g: null` hat
- **THEN** wird die nächste Portion mit bekanntem `weight_g > 0` verwendet

---

### Requirement: Verständliche Gewichtsanzeige

Das System MUSS das berechnete Gewicht einer Portion klar und verständlich anzeigen.

#### Scenario: Portion mit berechnetem Gewicht

- **WHEN** eine Portion mit `weight_g > 0` angezeigt wird
- **THEN** wird `≈ {weight_g}g` neben dem Portionsnamen angezeigt

#### Scenario: Basis-Portion „g"

- **WHEN** die Portion den Namen „g" hat und `weight_g = 1`
- **THEN** wird keine zusätzliche Gewichtsinfo angezeigt (wäre redundant)

---

### Requirement: Standard-Badge für Normalportion

Das System MUSS die Portion mit rank=1 in der Portionsliste der Zutaten-Detailseite deutlich als „Standard" kennzeichnen.

#### Scenario: rank=1 Portion wird angezeigt

- **WHEN** die Portionsliste einer Zutat angezeigt wird
- **THEN** trägt die Portion mit rank=1 ein „Standard"-Badge
- **THEN** ist die Zeile leicht farblich hervorgehoben

#### Scenario: Keine rank=1 Portion vorhanden (Fallback)

- **WHEN** keine Portion mit rank=1 existiert (technischer Fehlerfall)
- **THEN** wird kein „Standard"-Badge angezeigt

## REMOVED Requirements

### Requirement: Portionen-Reihenfolge per Buttons ändern

**Reason**: Ersetzt durch Drag & Drop (siehe neues Requirement oben). ▲/▼-Buttons sind auf Touch-Geräten fehleranfälliger und visuell aufwändiger als Drag & Drop.

**Migration**: Der `POST /{slug}/portions/{id}/move/?direction=up|down` Endpoint wird durch `POST /{slug}/portions/reorder/` ersetzt. Bestehende Clients müssen auf den neuen Endpoint migriert werden.

### Requirement: Klares Quantity-Label im Edit-Modus

**Reason**: Dieses Requirement wird in `ingredient-portion-redesign/spec.md` (neue Capability) zusammengeführt. Kein eigenständiges Requirement mehr nötig.

**Migration**: Keine — rein kosmetisch, kein Breaking Change im Backend.
