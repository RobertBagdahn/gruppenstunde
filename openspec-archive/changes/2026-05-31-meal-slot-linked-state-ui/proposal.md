## Why

Wenn eine Mahlzeit (MealSlot) mit einer Referenz-Mahlzeit verknüpft ist (`is_synced = true`), ist das für den User kaum erkennbar — nur ein kleines 🔗 Emoji zeigt den Zustand an. Der User versteht nicht, dass die Inhalte aus einem RefMeal kommen und nicht direkt bearbeitet werden sollten. Das führt zu Verwirrung und Fehlbedienungen.

## What Changes

- **Verknüpfte Meals werden read-only**: Wenn `is_synced = true`, sind Items nicht mehr editierbar (kein Factor-Input, kein Delete-Button, kein Add-Recipe-Button)
- **Visueller Zustand "verknüpft"**: Items werden in grauer/gedämpfter Farbe dargestellt
- **Label "Referenz-Mahlzeit"**: Ein Hinweistext über den Items macht klar, woher die Daten kommen
- **Icon-Logik**: Verknüpft zeigt `link_off` (Kette durchgestrichen = Entkoppeln), nicht verknüpft zeigt `link` (Kette = Verknüpfen)

## Capabilities

### New Capabilities

- `meal-slot-linked-state`: UI-Verhalten und visuelle Darstellung von verknüpften MealSlots (read-only Zustand, gedämpfte Farben, Label, Icon-Wechsel)

### Modified Capabilities

<!-- Keine bestehenden Specs betroffen -->

## Impact

- **Frontend**: `frontend-food/src/pages/planning/MealEventDetailPage.tsx` — `MealSlot` Komponente
- **Keine Schema-Änderungen**: `is_synced` existiert bereits im Meal-Schema (Pydantic + Zod)
- **Keine Migrations nötig**: Rein Frontend-seitige Änderung
- **Keine API-Änderungen**: Backend liefert bereits alle nötigen Daten
