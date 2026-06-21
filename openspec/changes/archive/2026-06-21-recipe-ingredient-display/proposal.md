## Why

Die Zutatenliste auf der Rezept-Detailseite vermittelt wichtige Informationen unklar: Das `egg_alt`-Icon hat keinen Bezug zu Zutaten, die Anzahl-Zahl neben "Zutaten" ist ohne Kontext semantisch leer, und stückbasierte Zutaten (z.B. Apfel) zeigen nur Gramm statt der natürlichen Einheit. Zusätzlich werden beim Hinzufügen neuer Zutaten im Edit-Modus immer 0 g voreingestellt statt der Standard-Portion der Zutat. Diese Mängel betreffen alle Rezept-Ansichten (Detail, Edit, Planung).

## What Changes

- **Icon-Austausch**: `egg_alt` (Material Symbols) → `UtensilsCrossed` (Lucide) im Zutaten-Sektions-Header
- **Badge-Text**: Anzahl-Badge von `"2"` → `"2 Zutaten"` — sofort verständlich ohne Kontext
- **Doppelte Portionsanzeige**: Zutaten mit nicht-Gramm-Portionen zeigen die höchstpriorisierte Portion als Primäranzeige + Gramm als sekundäre Zeile (z.B. `1 Stück Apfel · 150 g`). Auch reine Gramm-Zutaten zeigen die nächste Portion mit höchstem Ranking als Sekundäranzeige (z.B. `100 g Butter · 7 EL`)
- **Edit-Modus Default**: Beim Hinzufügen einer Zutat wird automatisch die Portion mit der höchsten Priorität (nicht `is_default`) mit ihrer Default-Menge vorausgewählt statt `quantity: 0, Einheit: g`
- **Ampel für ungewöhnliche Mengen**: Subtile visuelle Warnung (⚠️) wenn eine Zutat im Verhältnis zum Rezeptgewicht oder Normalwert statistisch außergewöhnlich viel ist
- **Scope**: Alle Rezept-Ansichten — `IngredientList`, `InlineIngredientEditor`, `RecipePreviewDialog`, Planung

## Capabilities

### New Capabilities

- `recipe-ingredient-display`: Verbesserte Zutatendarstellung mit Icon, Badge-Text, Doppelportionsanzeige, Smart-Default-Portion beim Hinzufügen und Mengen-Ampel

### Modified Capabilities

- `recipe-inline-edit`: Die Logik beim Hinzufügen neuer Zutaten ändert sich — Standard-Portion und -Menge werden aus der höchstpriorisierten Portion der Zutat befüllt statt aus einem statischen `0g`-Default
- `portion-ranking`: Die Auswahl der "primären" Portion für die Anzeige folgt explizit dem `priority`-Feld des Portion-Modells (höchster Wert gewinnt, nicht-Gramm bevorzugt)

## Impact

**Frontend (frontend-food/)**
- `src/components/supply/IngredientList.tsx` — Portionsanzeige-Logik, Ampel-Logik
- `src/components/recipe/InlineIngredientEditor.tsx` — `handleAddIngredient`, Default-Portion/Menge
- `src/pages/recipes/RecipeDetailPage.tsx` — Icon und Badge im Zutaten-Header
- `src/pages/planning/RecipePreviewDialog.tsx` — falls `IngredientList` verwendet wird

**Backend**
- Keine Model- oder API-Änderungen erforderlich
- `Portion.priority` und `Portion.is_default` sind bereits vorhanden und werden vom API zurückgegeben

**Schemas**
- Keine Änderungen an Zod- oder Pydantic-Schemas nötig — `priority` ist bereits im `PortionSchema`

**Migrations**
- Keine Migrationen erforderlich
