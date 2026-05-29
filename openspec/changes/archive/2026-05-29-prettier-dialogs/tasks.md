## 1. RecipeSearchDialog aufwerten

- [x] 1.1 Dialog-Container auf `max-w-3xl max-h-[85vh]` vergrößern, internes Spacing auf `gap-4`
- [x] 1.2 Suchfeld: `text-base`, Material Icon `search` links im Input (relative positioning)
- [x] 1.3 Dialog-Header: Material Icon `search` neben "Rezept-Detailsuche", größere Schrift
- [x] 1.4 `TAG_COLOR_MAP` definieren — Record<string, string> mit Farb-Klassen pro Tag-Name (nach Kategorie gruppiert)
- [x] 1.5 Tag-Buttons auf `text-sm` vergrößern, Farben aus `TAG_COLOR_MAP` anwenden (Fallback: muted), selektierter Zustand bleibt `bg-primary`
- [x] 1.6 `RECIPE_TYPE_COLORS` definieren — farbige Badge-Klassen pro Rezepttyp
- [x] 1.7 Ergebnis-Items: `text-base`, Material Icon links (`menu_book` für Rezepte, `egg_alt` für Zutaten), Rezepttyp als farbiger Pill-Badge
- [x] 1.8 Hover-Effekt verbessern: `hover:bg-accent hover:shadow-sm` statt `hover:bg-muted`

## 2. ConfirmDialog auf Radix migrieren

- [x] 2.1 `ConfirmDialog.tsx` von nativem `<dialog>` auf shadcn/ui `Dialog` umbauen (gleiche Props-API beibehalten)
- [x] 2.2 Visuelles Styling angleichen: Material Icon im Header, konsistente Button-Styles

## 3. Weitere Dialoge angleichen

- [x] 3.1 `IngredientQuantityDialog` (im selben File): Material Icon im Header, größere Schrift, konsistente Buttons
- [x] 3.2 `DeleteConfirmDialog`: destructive-Farbe stärker nutzen, Material Icon `delete`
- [x] 3.3 `AiSuggestDialog`: Material Icon im Header, konsistentes Spacing
