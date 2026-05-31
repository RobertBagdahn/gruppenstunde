## Why

Mehrere OpenSpec-Specs widersprechen sich untereinander oder dem tatsächlichen Code. Veraltete Architektur-Entscheidungen (z.B. Ingredient erbt von Supply, viele Mikronährstoff-Felder) stehen noch in einigen Specs, obwohl der Code und neuere Specs längst anders implementiert sind. Das führt zu Verwirrung bei der Implementierung neuer Features.

## What Changes

- **ingredient-database/spec.md**: Korrektur "inherits from Supply" → "standalone model (models.Model)"
- **supply-base/spec.md**: Entfernung der "13 Vitamin, 12 Mineral"-Referenz → nur `vitamin_c_mg`
- **meal-cockpit/spec.md**: Vitamin/Mineral-Aggregation auf nur `vitamin_c_mg` reduzieren
- **recipe/spec.md**: Interner Widerspruch entfernen (servings=4 Beispiel entfernen, servings=1 durchgängig)
- **recipe-portion-scaling-edit/spec.md**: Klarstellen dass DB immer servings=1 hat, Frontend hochskaliert
- **fine-grained-quantity-rounding/spec.md**: Grenze von < 1 auf < 2 angleichen (konsistent mit quantity-display-formatting)
- **cost-overview-page/spec.md**: `price_total` → `cached_price_total`
- **recipe-quantity-display/spec.md**: Klarstellen dass measuring_unit über Portion-FK aufgelöst wird
- **unit-conversion/spec.md**: Klarstellen: Pfad ist RecipeItem → Portion → MeasuringUnit

Keine Code-Änderungen nötig. Nur Spec-Dokumente werden aktualisiert.

## Capabilities

### New Capabilities

(keine)

### Modified Capabilities

- `ingredient-database`: Vererbungs-Aussage korrigieren (standalone, nicht Supply-Erbung)
- `supply-base`: Mikronährstoff-Feldliste auf vitamin_c_mg reduzieren
- `meal-cockpit`: Vitamin/Mineral-Parameter auf nur vitamin_c_mg beschränken
- `recipe`: Interner servings-Widerspruch bereinigen
- `recipe-portion-scaling-edit`: Semantik klarstellen (DB=1, Frontend skaliert)
- `fine-grained-quantity-rounding`: Rundungsgrenze < 1 → < 2 angleichen
- `cost-overview-page`: Feldnamen-Korrektur
- `recipe-quantity-display`: Klarstellung measuring_unit-Auflösung über Portion
- `unit-conversion`: Klarstellung RecipeItem→Portion→MeasuringUnit Pfad

## Impact

- Keine Django-Apps betroffen (nur Dokumentation)
- Keine Pydantic/Zod-Schema-Änderungen
- Keine Migrations nötig
- Betroffen: 9 Spec-Dateien unter `openspec/specs/`
