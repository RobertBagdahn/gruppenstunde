## Why

Die aktuellen `NutritionalTag`-Seed-Daten sind semantisch inkonsistent: Die `name`-Spalte enthält mal ein Lebensmittel ("Tierische Produkte", "Fleisch oder Fisch", "Laktose"), mal ein menschliches Merkmal ("vegan", "vegetarisch", "nussfrei"). Die `name_opposite`-Spalte ist ebenso uneinheitlich – teilweise Negationen ("nicht vegan"), teilweise Eigenschaften. Das macht die Darstellung in der UI verwirrend und die Zuordnung für Benutzer unintuitiv. Zudem fehlen wichtige Allergene (Schalentiere) und es gibt redundante Einträge (Nüsse/Schalenfrüchte).

## What Changes

- **BREAKING**: Semantik von `name` und `name_opposite` wird vereinheitlicht:
  - `name` = immer das menschliche Merkmal (z.B. "Vegan", "Eiallergie", "Laktoseunverträglichkeit")
  - `name_opposite` = immer der konkrete Inhaltsstoff (z.B. "Tierische Produkte", "Ei und Eierzeugnisse", "Laktose")
- Zwei Namensschemata: medizinisch (`-allergie`/`-unverträglichkeit`) vs. Präferenz (`-frei`), mit "Vegan"/"Vegetarisch" als etablierte Ausnahmen
- 28 bestehende Einträge werden auf das neue Schema umbenannt (PK bleibt erhalten)
- "Nüsse" und "Schalenfrüchte" werden zu "Nussallergie" zusammengeführt
- "Halal" und "Koscher" werden gelöscht
- Neue Einträge: "Milchallergie" (Rang 16), "Schalentierallergie" (Rang 17)
- `is_dangerous` wird für alle zutreffenden EU-Allergene gesetzt (Gluten, Eier, Fisch, Erdnüsse, Soja, Milch, Nüsse/Schalenfrüchte, Sellerie, Senf, Sesam, Sulfite, Lupinen, Schalentiere)
- `description` wird automatisch generiert (erklärt das menschliche Merkmal)
- Fixture-Datei `backend/data/masterdata/supply_nutritionaltag.json` wird aktualisiert
- Löschung der alten Einträge auf Prod per Django Admin

## Capabilities

### New Capabilities
- `nutritional-tag-seed-standardization`: Einheitlicher Seed mit konsistenter name/name_opposite-Semantik, vollständigen EU-Allergenen und sauberer Trennung medizinisch/Präferenz

### Modified Capabilities
- `seed-data`: Fixture `supply_nutritionaltag.json` wird auf 30 Einträge mit neuer Semantik aktualisiert

## Impact

- `backend/data/masterdata/supply_nutritionaltag.json` – komplette Überarbeitung
- `backend/supply/models/reference.py` – keine Änderung, aber `help_text` von `name`/`name_opposite` sollte die neue Semantik dokumentieren
- M2M-Verknüpfungen zu Ingredient, Recipe, UserProfile, Person, Participant bleiben intakt (PKs erhalten)
- Keine Schema-Änderungen (Pydantic/Zod), keine API-Änderungen
