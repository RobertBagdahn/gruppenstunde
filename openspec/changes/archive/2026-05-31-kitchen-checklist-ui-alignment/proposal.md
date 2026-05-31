## Why

Die Küchenbedarf-Erinnerungen (KitchenReminderSection) verwenden einfache HTML-Checkboxen, während die Einkaufslisten-Items darüber einen touch-freundlichen 44x44px Button-Style haben. Das visuelle Erscheinungsbild ist inkonsistent und die kleinen Checkboxen sind auf Mobile schwer zu treffen. Zusätzlich fehlt eine Möglichkeit, Items als "bereits vorhanden" zu markieren.

## What Changes

- Checkbox-Style der Kitchen-Reminder-Items angleichen an `ShoppingListItemRow` (44x44px touch target, runder Button mit Check-Icon)
- Rechts von jedem Reminder-Item einen "Bereits vorhanden"-Button hinzufügen, der das Item visuell als vorhanden markiert (lokal, kein Server-Persist)
- Layout der Reminder-Items auf `flex items-center gap-3` umstellen (wie ShoppingListItemRow)

## Capabilities

### New Capabilities

_(keine neuen Capabilities – rein UI-Angleichung innerhalb bestehender Komponente)_

### Modified Capabilities

_(keine Spec-Level-Änderungen – rein visuelles Refactoring)_

## Impact

- **Frontend-Food**: `frontend-food/src/components/shopping/KitchenReminderSection.tsx` wird überarbeitet
- **Keine Backend-Änderungen**: Alles lokal im State
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen
- **Keine Migrations nötig**
