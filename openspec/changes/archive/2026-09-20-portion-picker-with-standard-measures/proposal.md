# Proposal: portion-picker-with-standard-measures

## Why

Portionen ohne vertrauenswürdiges Gewicht (z. B. „Stück" bei Speisezwiebeln) legen das Speichern lahm: Die Mengen-Mathematik im Editor kollabiert auf 0/NaN, der PATCH crasht mit 500 (produktionsseitig belegt: `NotNullViolation`/Check-Constraint auf `recipe_recipeitem.quantity`). Gleichzeitig ist die Portionsauswahl ein winziges natives `<select>` mit abgeschnittenen, verwirrenden Labels („Stück (100g)" bei `= 0 g`), und Standardmengen wie EL, TL oder Tasse fehlen als niedrigschwellige Alternative komplett.

## What Changes

- **Speichern reparieren**: Editor-Mengen dürfen nie mehr 0/NaN an den PATCH senden; Portionswechsel von einer Portion ohne bekanntes Gewicht fällt auf Menge 1 zurück. Der PATCH-Endpoint lehnt ungültige Mengen (≤ 0) mit 422 und klarer deutscher Meldung ab statt mit 500 zu crashen.
- **Neues Custom-Portion-Dropdown („PortionPicker")**: ersetzt das native `<select>` im Inline-Ingredient-Editor (inkl. Wizard über den eingebetteten Editor) und im „Zutat hinzufügen"-Dialog. Gruppierte Abschnitte (Zutat / Standardmengen / Gramm), zeilenweise Portionsname (oder Fallback-Text) links und Gewicht rechts, Warnkennzeichnung bei fehlendem/unbestätigtem Gewicht.
- **Standardmengen-Katalog als feste Datenbank**: EL, TL, Tasse, Prise, Msp werden aus einer festen Serverseitigen Liste geliefert – Gewicht dichtebasiert (falls die Zutat eine Dichte hat), sonst generischer Faktor, gekennzeichnet mit „ca." Sie sind reine Anzeige-/Berechnungshilfen und werden **nicht** als Portionen persistiert; bei Auswahl wird die Gramm-Menge übernommen.
- **Ehrliche Anzeige**: „= 0 g" bei unbekanntem Gewicht wird im Editor zu „Gewicht unbekannt" (mit Warn-Icon), konsistent zur Read-Ansicht.
- Unmittelbar nach Implementierung werden Backend und food-Frontend auf Cloud Run deployed (das Speicher-Problem ist produktiv aktiv).

## Capabilities

### New Capabilities
- `portion-picker`: Verhalten und Darstellung des neuen Custom-Portion-Dropdowns (Abschnitte, Name + Gewicht, Fallback-Labels, Auswahl-Semantik, 0/NaN-Schutz).
- `portion-save-integrity`: Backend-Validierung des PATCH auf gültige Mengen (422 statt 500), Frontend-Guards gegen 0/NaN und Fallback-Menge 1 beim Portionswechsel ohne Gewichtsbasis.
- `standard-measure-catalog`: Feste Standardmengen-Liste (EL, TL, Tasse, Prise, Msp) mit dichtebasierter bzw. generischer Gewichtsberechnung, bereitgestellt über die API, reine Anzeige ohne Persistierung.

### Modified Capabilities
- `recipe-inline-edit`: Die Editor-Zeilen verwenden den neuen PortionPicker statt des nativen `<select>`; die Gewichtsanzeige zeigt bei unbekanntem Gewicht „Gewicht unbekannt" statt „= 0 g".

## Impact

- **Backend**
  - `recipe/api/items.py`: PATCH-Validierung `quantity <= 0` → 422 (Meldung deutsch), kein DB-Check-Constraint-Crash mehr. Kein Schemawechsel in Pydantic.
  - `supply`: neuer kleiner API-Endpunkt bzw. erweiterte Ausgabe für den Standardmengen-Katalog (feste Daten aus `supply/data/`, gewichtsberechnung über vorhandene Dichte-/UnitConversion-Logik). Pydantic-Schema dafür neu; Zod-Schema im Frontend synchron.
  - **Keine Migrationen** – der Katalog ist feste, unpersistierte Daten; DB-Modelle bleiben unverändert.
- **Frontend (frontend-food)**
  - Neue Komponente `PortionPicker` (shadcn Popover, gruppierte Abschnitte), eingebaut in `InlineIngredientEditor.tsx`, `IngredientQuantityDialog.tsx` (wirkt über `IngredientDetailSearchDialog` auch beim Hinzufügen) und damit im `RecipeWizard` (`WizardStepIngredients` bettet den Editor ein).
  - `lib`-Helfer: Standardmengen-Spiel, Gewichts-Berechnung, Fallback-Menge; Zod-Schema-Ergänzung für den Katalog.
  - Anzeige „Gewicht unbekannt" in der Editor-Zeile (`getItemWeightG`-/Anzeigepfad).
- **Betrieb**: Deploy Backend + frontend-food direkt nach Abschluss (Cloud Build, `inspi-backend`, `inspi-frontend-food`, Traffic auf neueste Revision).
