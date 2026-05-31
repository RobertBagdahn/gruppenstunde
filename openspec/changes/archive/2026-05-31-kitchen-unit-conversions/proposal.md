## Why

Rezepte zeigen Zutatenmengen aktuell nur in Gramm/Milliliter an. In der deutschen Küche denkt man aber in Tassen Reis, Handvoll Nüsse oder Prisen Salz. Die Infrastruktur (MeasuringUnit, UnitConversion, Portion) existiert bereits — es fehlen zutat-spezifische Dichten und ein Frontend-Umschalter, der Mengen in Küchenmaßeinheiten darstellt.

## What Changes

- **Seed-Daten erweitern**: Fehlende MeasuringUnits hinzufügen (Handvoll, Tropfen, Bund, Tube) und zutat-spezifische Umrechnungsfaktoren für ~30 gängige Zutaten seeden (z.B. 1 Tasse Reis = 185g, 1 Tasse Mehl = 125g, 1 EL Butter = 12g)
- **Einheiten-Umschalter im Rezept**: Pro Zutat im Rezept zwischen verfügbaren Einheiten wechseln können (z.B. "200g Reis" ↔ "1 Tasse Reis" ↔ "200ml Reis")
- **Nur konvertierbare Einheiten umschalten**: Einheiten wie "Scheibe", "Stück", "Bund" sind nicht umrechenbar und werden nicht zum Umschalten angeboten — nur masse-/volumenbasierte Küchenmaße (Tasse, EL, TL, Becher, Glas, Handvoll, Prise, Messerspitze, Schuss, Tropfen)
- **API-Erweiterung**: Neuer Endpunkt der alle verfügbaren Umrechnungen für eine Zutat+Einheit-Kombination zurückgibt (für den Einheiten-Umschalter)

## Capabilities

### New Capabilities
- `kitchen-unit-display`: Frontend-Einheiten-Umschalter pro Zutat im Rezept, der zwischen konvertierbaren Küchenmaßeinheiten wechselt

### Modified Capabilities
- `unit-conversion`: Neue zutat-spezifische Seed-Daten und API-Endpunkt für verfügbare Umrechnungen

## Impact

- **Backend Django Apps**: `supply` (neue Migration für MeasuringUnits + UnitConversions Seed-Daten, neuer API-Endpunkt)
- **Backend Schemas**: Neues Pydantic-Schema für verfügbare Umrechnungen Response
- **Frontend App**: `frontend-food` (Einheiten-Umschalter Komponente, neuer TanStack Query Hook, Zod-Schema)
- **Betroffene Seiten**: `RecipeDetailPage`, `InlineIngredientEditor`
- **Migrations**: 1 neue Data-Migration für Seed-Daten
- **Keine Breaking Changes**
