## Context

Die `KitchenReminderSection` zeigt Küchenbedarf-Erinnerungen mit einfachen HTML-Checkboxen an. Die darüber liegenden `ShoppingListItemRow`-Komponenten verwenden ein konsistentes Design mit 44x44px touch-freundlichen Buttons. Der User möchte außerdem Items als "bereits vorhanden" markieren können.

## Goals / Non-Goals

**Goals:**
- Checkbox-Style der Reminder-Items identisch zu `ShoppingListItemRow` gestalten (44x44px Button, emerald-green wenn gecheckt, Check-Icon)
- "Bereits vorhanden"-Button rechts neben jedem Item
- Weiterhin rein lokaler State (kein Server-Persist für Checks)

**Non-Goals:**
- Kein Server-seitiges Speichern des "bereits vorhanden"-Status
- Keine Änderungen an der Accordion/Collapse-Logik
- Keine Änderungen am Suggest-Feature

## Decisions

1. **Checkbox-Button**: Gleicher Style wie `ShoppingListItemRow` — `w-11 h-11 rounded-lg border-2`, emerald bg wenn checked, Material Icon "check"
2. **"Bereits vorhanden"-Button**: Kleiner Text-Button rechts (`text-xs text-muted-foreground`), setzt den Item-Status auf "vorhanden" und styled das Item leicht anders (z.B. grüner Hintergrund-Tint oder Badge)
3. **State**: Neues `Set<number>` für "vorhanden"-Items neben dem existierenden `checked`-Set
4. **Visuelles Feedback**: "Bereits vorhanden" markierte Items bekommen einen dezenten grünen Badge oder werden ausgegraut mit "✓ vorhanden" Label

## Risks / Trade-offs

- Zwei verschiedene Status (abgehakt vs. vorhanden) könnten User verwirren → klare visuelle Unterscheidung nötig
- Lokaler State geht bei Page-Reload verloren → akzeptabel für Erinnerungs-Checkliste
