## Context

Der `RecipeSearchDialog` in `frontend-food/src/pages/planning/RecipeSearchDialog.tsx` wird an drei Stellen genutzt:
- `MealSlot.tsx` — rendert immer, steuert per `open`-Prop
- `DayPlanView.tsx` — rendert konditional (`{searchDialogMeal !== null && <RecipeSearchDialog>}`)
- `TableView.tsx` — rendert konditional (gleiches Pattern)

Drei Sub-Dialoge sind involviert:
- `RecipePreviewDialog` (eigenständiger shadcn/ui Dialog)
- `IngredientQuantityDialog` (eigenständiger shadcn/ui Dialog, inline in RecipeSearchDialog)
- `VariantSliderDialog` (eigener Dialog, nach erfolgreicher Mutation)

Die Flicker-Quellen:
1. **TanStack Query verwirft alte Daten** bei Query-Key-Änderung → "Keine Ergebnisse" blinkt zwischen den Suchen
2. **Konditionales Rendern** in DayPlanView/TableView mountet/unmountet den Dialog bei jedem Öffnen/Schließen
3. **Sub-Dialog versteckt Hauptdialog** (`open={open && !ingredientDialog}`) → Exit/Enter-Animationen überlagern sich
4. **RecentlyUsedSection** blendet sich beim Tippen ein/aus → Layout-Shift

## Goals / Non-Goals

**Goals:**
- Kein Flackern der Suchergebnisse während API-Calls
- Dialog-Layout bleibt stabil (gleiche Größe, Suchleiste an gleicher Position)
- Sub-Dialoge (Preview, Ingredient Quantity) öffnen sich als Overlay INNERHALB des Hauptdialogs
- Dialog wird nicht mehr konditional gerendert (immer gemountet wie MealSlot)
- Keine sichtbaren Übergänge zwischen Haupt- und Sub-Dialog

**Non-Goals:**
- Dialog offen halten nach Auswahl (schließt weiterhin nach Hinzufügen)
- Backend-Änderungen
- Schema-Änderungen (Pydantic/Zod)

## Decisions

### 1. `keepPreviousData` für `useRecipeSearch`

**Problem**: Bei jeder Änderung von `debouncedQuery` ändert sich der Query-Key. TanStack Query verwirft `data` und setzt auf `undefined`. Die Ergebnisliste zeigt kurz "Keine Ergebnisse".

**Lösung**: `placeholderData: keepPreviousData` in der Query-Option. Alte Ergebnisse bleiben sichtbar, bis die neue API-Antwort da ist. Kein Flackern.

**Alternative**: `isFetching`-Indikator (z.B. schmaler Ladebalken oben in der Liste). KeepPreviousData ist einfacher und für 300ms-Debounce ausreichend.

### 2. Sub-Dialoge als Overlay im Hauptdialog (nicht eigenständige Dialogs)

**Problem**: `IngredientQuantityDialog` und `RecipePreviewDialog` sind eigenständige `<Dialog>`-Komponenten. Wenn sie öffnen, läuft die Exit-Animation des Hauptdialogs (durch `open={open && !ingredientDialog}`), dann die Enter-Animation des Sub-Dialogs. Sieht aus wie "Zappeln".

**Lösung**: Sub-Dialoge in den `DialogContent` des Hauptdialogs integrieren:

```
<Dialog open={open} onOpenChange={onOpenChange}>
  <DialogContent className="max-w-3xl max-h-[85vh] ...">
    {previewRecipe ? (
      <RecipePreviewInline recipe={previewRecipe} ... />
    ) : ingredientDialog ? (
      <IngredientQuantityInline ingredient={ingredientDialog} ... />
    ) : (
      <>normale Such-UI</>
    )}
  </DialogContent>
</Dialog>
```

**Radix Dialog Portal As Child**: Da Radix Dialog mittels Portal rendert, können wir die Inhalte einfach austauschen. Der Dialog bleibt gemountet, kein Exit/Enter.

**Alternative**: Dialog innerhalb des Hauptinhalts mit einem separaten Drawer/Panel zu öffnen. Overlay ist einfacher und konsistent mit bestehenden Pattern.

**Konsequenz**: `RecipePreviewDialog.tsx` wird zu einer Inline-Komponente umgebaut. `IngredientQuantityDialog` (inline in RecipeSearchDialog) wird ebenfalls zum Inline-Panel.

### 3. Immer gemountet (kein Conditional Render)

**Problem**: DayPlanView und TableView rendern RecipeSearchDialog nur, wenn `searchDialogMeal !== null`. Beim Schließen unmountet React den Dialog sofort — Radix' Exit-Animation kann nicht abspielen.

**Lösung**: Dialog immer rendern, nur per `open`-Prop steuern, genau wie MealSlot es bereits macht.

**Vorher** DayPlanView:
```tsx
{searchDialogMeal !== null && (
  <RecipeSearchDialog
    mealType={searchDialogMeal.meal_type}
    open={searchDialogMeal !== null}
    ...
  />
)}
```

**Nachher**:
```tsx
<RecipeSearchDialog
  mealType={searchDialogMeal?.meal_type ?? 'snack'}
  open={searchDialogMeal !== null}
  onOpenChange={(open) => { if (!open) setSearchDialogMeal(null); }}
  ...
/>
```

### 4. Feste Dialog-Höhe

**Problem**: RecentlyUsedSection, Filter-Zeilen und Ergebnisse ändern die Content-Höhe, was den Dialog dynamisch resize.

**Lösung**: `DialogContent` erhält eine feste `min-h-[60vh]` (oder passender Wert) zusätzlich zur `max-h-[85vh]`. Der Inhalt scrollt innerhalb dieser festen Höhe.

### 5. RecentlyUsedSection nicht mehr per `searchQuery.length` toggeln

**Problem**: `showRecentlyUsed` schaltet um, sobald der User tippt. Das verschiebt die Ergebnisliste.

**Lösung**: RecentlyUsedSection bleibt sichtbar, solange keine Suchergebnisse da sind (nicht nur basierend auf Suchtextlänge). Sobald API-Ergebnisse kommen, wechselt die Anzeige fließend. Oder: RecentlyUsedSection oberhalb der Ergebnisliste fixieren, sodass sie beim Verschwinden keinen Layout-Shift verursacht.

### 6. Keine sichtbaren Übergänge bei Filter-Änderungen

Filter (CategoryPills, BadgePill, Tag-Buttons) lösen ebenfalls Query-Neufetches aus. `keepPreviousData` (Decision 1) deckt auch diesen Fall ab.

## Risks / Trade-offs

- **[Risk] Overlay-Pattern statt eigener Dialogs**: Der Sub-Dialog-Overlay hat kein separates `onOpenChange`. Der User kann den Overlay nur über "Abbrechen"/"Hinzufügen"-Buttons verlassen, nicht durch Klick außerhalb. → **Mitigation**: Escape-Key-Handling und explizite Buttons wie bisher.
- **[Risk] Feste Dialog-Höhe**: Auf sehr kleinen Screens (320px) könnte `min-h-[60vh]` zu viel Platz beanspruchen. → **Mitigation**: `min-h-[60vh]` mit `max-h-[85vh]` und `overflow-y-auto` kombinieren; auf kleinen Screens ggf. `min-h` reduzieren.
- **[Risk] keepPreviousData veraltete Ergebnisse**: Kurzzeitig könnten alte Suchergebnisse sichtbar sein, die nicht mehr zur aktuellen Suche passen. → **Mitigation**: 300ms Debounce minimiert das Risiko; die Verzögerung ist kaum wahrnehmbar.
- **[Risk] VariantSliderDialog**: Bleibt ein separater Dialog (wird nach erfolgreicher Mutation geöffnet). Da der RecipeSearchDialog vorher schließt, gibt es keine Überlappung. Das ist OK.

## Open Questions

- Soll `min-h` fest auf `[60vh]` oder flexibler `[min(60vh, 500px)]`?
- RecentlyUsedSection: Bei `keepPreviousData` vielleicht ganz entfernen oder immer anzeigen?
