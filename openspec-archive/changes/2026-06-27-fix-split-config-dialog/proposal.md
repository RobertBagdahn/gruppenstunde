## Why

Beim Hinzufügen eines Rezepts mit optionalen Zutaten oder Austausch-Gruppen zu einem Essensplan schließt der SplitConfigDialog sofort, bevor der Benutzer Optionen auswählen kann. Grund ist eine Race Condition: `hasBuiltOnce.current` wird im `useEffect` gesetzt, während `recipeItems` noch leer ist (Ladezustand). Wenn die Daten eintreffen, rendert React vor dem useEffect und sieht `groups=[]` + `hasBuiltOnce=true` → schließt den Dialog fälschlich.

## What Changes

- **SplitConfigDialog.tsx**: Umstellung von `useEffect` + `hasBuiltOnce`-Ref auf synchrones `useMemo` für die Gruppen-Berechnung
- Die Schließ-Entscheidung wird synchron aus den aktuellen Props getroffen, nicht asynchron aus State/Refs
- Eliminierung der Race Condition zwischen Render-Zyklus und useEffect
- Keine sichtbaren Änderungen für den Benutzer — der Dialog verhält sich jetzt korrekt

## Capabilities

### New Capabilities
<!-- Keine neuen Capabilities — reiner Bugfix -->

### Modified Capabilities
<!-- Keine Spec-Änderungen, nur Implementierungsdetails -->

## Impact

- **Nur betroffen**: `frontend-food/src/components/meal/SplitConfigDialog.tsx`
- Keine API-Änderungen, keine Schema-Änderungen, keine Migrationen
- Keine Änderungen an der Benutzeroberfläche außerhalb des Dialogs
