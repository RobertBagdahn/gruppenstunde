## Why

Die Dialoge im Food Frontend (insbesondere der Rezept-Detailsuche-Dialog) sind visuell minimalistisch: kleine Schrift, keine Farben, keine Icons, zu schmaler Container. Die Nutritional Tags sind schwer zu scannen, die Ergebnisliste bietet keine visuelle Hierarchie. Das Redesign verbessert Usability und Ästhetik durch größere Elemente, Material Icons, farbcodierte Tags und Badges.

## What Changes

- **RecipeSearchDialog** vergrößern (`max-w-lg` → `max-w-3xl`), Schrift vergrößern, Material Icons für Suche und Ergebnis-Items
- **Nutritional Tags** farbcodiert nach Kategorie (Allergene, Tierisch, Getreide, Religiös etc.) mit hardcoded Mapping im Frontend
- **Rezepttyp-Badges** in Ergebnisliste als farbige Pills statt grauer Text
- **Ergebnis-Items** mit Material Icons (`menu_book` für Rezepte, `egg_alt` für Zutaten) und besserem Hover-Effekt
- **ConfirmDialog** von nativem `<dialog>` auf Radix Dialog migrieren für Konsistenz
- **Weitere Dialoge** (DeleteConfirmDialog, AiSuggestDialog, IngredientQuantityDialog) an das neue Pattern angleichen

## Capabilities

### New Capabilities
- `dialog-styling`: Einheitliches visuelles Pattern für alle Dialoge im Food Frontend — Farben, Icons, Größen, Hover-Effekte

### Modified Capabilities

## Impact

- **Frontend-Food Pages**: `planning/RecipeSearchDialog.tsx`, `components/ConfirmDialog.tsx`, `components/admin/DeleteConfirmDialog.tsx`, `components/shared/AiSuggestDialog.tsx`
- **Keine API-Änderungen**: Rein visuelles Refactoring
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen
- **Keine Migrations nötig**
- **Abhängigkeiten**: Material Symbols (bereits eingebunden), Tailwind-Farben (bereits vorhanden)
