## Why

Der Frühstücks-Cockpit (Wizard Schritt 5) und die MealPlan-Anzeige zeigen Brot und Belag in Gramm statt in natürlichen Portionseinheiten. Das ist verwirrend und unübersichtlich — der Nutzer denkt in Scheiben und Portionen, nicht in Gramm. Im MealPlan sind alle Wizard-Items als einzelne Karten aufgelistet, was den Frühstücks-Block unnötig lang macht.

## What Changes

- **BREAKING**: Cockpit-Tabelle zeigt Portionen statt Gramm: `×2,64 Scheibe` statt `175g`. BE-Konzept aus der Anzeige entfernt.
- **BREAKING**: Cockpit bekommt Summenzeilen pro Kategorie (Brote gesamt, Belag gesamt).
- **BREAKING**: MealSlot gruppiert Frühstücks-Items in Kategorien: Brot, Belag, Warme Gerichte, Extras, Getränke.
- **BREAKING**: QuantityInput wird nur einmal pro Item angezeigt (kein doppelter Wert mehr).
- Cockpit: Getränke-Sektion bleibt separat ohne Coverage-Einfluss.
- MealSlot: Nicht-Frühstücks-Items (manuell hinzugefügte Rezepte) bleiben als Einzelkarten.

## Capabilities

### New Capabilities
- `breakfast-cockpit-portions`: Cockpit zeigt Portionen (Scheiben/Portionen/Tassen/Schuss) statt Gramm, mit Kategorie-Summenzeilen
- `breakfast-mealplan-groups`: MealSlot gruppiert Frühstücks-Items nach Kategorie (Brot/Belag/Warme Gerichte/Extras/Getränke)

### Modified Capabilities
- `breakfast-wizard`: Cockpit-Zusammenfassung zeigt Portionsgrößen statt Gramm

## Impact

- **Frontend Cockpit**: `frontend-food/src/pages/planning/breakfast/StepCockpit.tsx` — Tabellenzeilen für Basis/Belag auf Portionen umstellen, Summenzeilen einfügen
- **Frontend MealSlot**: `frontend-food/src/pages/planning/MealSlot.tsx` — Items nach `ingredient_tags` kategorisieren, Gruppen-Rendering, QuantityInput+Dup entfernen
- **Frontend Schemas**: Keine Änderung (ingredient_tags existiert bereits im MealItemOut)
- **Backend**: Keine Änderung
