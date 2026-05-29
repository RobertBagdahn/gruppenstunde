## Context

Das Food Frontend verwendet shadcn/ui Dialoge (Radix-basiert) mit minimaler Stylung. Material Symbols sind bereits als Icon-Library eingebunden. Tailwind-Config enthält custom Inspi-Farben und Shadows. Ein Dialog (`ConfirmDialog`) nutzt noch natives `<dialog>` statt Radix.

Aktueller RecipeSearchDialog: `max-w-lg`, `text-sm` überall, keine Icons, Tags alle gleich grau, Ergebnisse als flache Text-Liste.

## Goals / Non-Goals

**Goals:**
- Dialoge visuell aufwerten: größer, farbiger, mit Material Icons
- Einheitliches Dialog-Pattern für alle Food-Frontend-Dialoge
- Nutritional Tags farbcodiert nach Kategorie für bessere Scannbarkeit
- Rezepttyp als farbiger Badge statt grauer Text
- Größere Touch-Targets und Schrift (Mobile-First)

**Non-Goals:**
- Keine Layoutänderung zu zweispaltig (bleibt einspaltig)
- Keine Backend-Änderungen
- Kein Tag-Kategorisierungs-System im Backend
- Keine Thumbnail-Bilder in Ergebnissen (existieren nicht)
- Kein Redesign der gesamten App — nur Dialoge

## Decisions

### 1. Dialog-Größe
- RecipeSearchDialog: `max-w-3xl` (768px), `max-h-[85vh]`
- Andere Dialoge bleiben bei ihrer Größe, bekommen aber konsistente Spacing/Farben

### 2. Tag-Farben hardcoded im Frontend
Da Tags keine Backend-Kategorie haben, wird ein `TAG_COLOR_MAP` als Record<string, string> im Frontend definiert. Mapping nach logischen Gruppen:
- **Rot** (`red-100/700`): Tierisch (Tierbestandteile, Tierische Produkte)
- **Amber** (`amber-100/700`): Allergene (Gluten, Laktose, Nüsse, Erdnüsse, Fisch, Soja, Sellerie, Senf, Sesam, Lupinen, Schalenfrüchte)
- **Purple** (`purple-100/700`): Intoleranzen (Histamin, Fructose, Koffeinhaltig)
- **Green** (`green-100/700`): Religiös/Ethisch (Halal, Koscher)
- **Stone** (`stone-100/700`): Getreide (Weizen, Roggen, Gerste, Hafer, Dinkel, Kamut)
- **Sky** (`sky-100/700`): Sonstige (Alkohol, Scharf, Schwefeldioxid und Sulfide)
- **Fallback**: `muted` (aktuelles Styling)

### 3. Rezepttyp-Badge-Farben
```typescript
const RECIPE_TYPE_COLORS: Record<string, string> = {
  breakfast: 'bg-yellow-100 text-yellow-800',
  warm_meal: 'bg-orange-100 text-orange-800',
  cold_meal: 'bg-blue-100 text-blue-800',
  dessert: 'bg-pink-100 text-pink-800',
  side_dish: 'bg-lime-100 text-lime-800',
  snack: 'bg-green-100 text-green-800',
  drink: 'bg-cyan-100 text-cyan-800',
  simple_meal: 'bg-slate-100 text-slate-800',
};
```

### 4. Material Icons Verwendung
- Suchfeld: `search` Icon links im Input
- Rezept-Items: `menu_book`
- Zutat-Items: `egg_alt`
- Dialog-Header: `search` neben Titel

### 5. ConfirmDialog Migration
`ConfirmDialog.tsx` wird von nativem `<dialog>` auf shadcn/ui `Dialog` (Radix) migriert. Gleiche API (Props), neues Rendering.

### 6. Schriftgrößen
- Suchfeld: `text-base` (statt `text-sm`)
- Ergebnis-Items: `text-base` (statt `text-sm`)
- Tags: `text-sm` (statt `text-xs`)
- Section-Header: `text-sm font-semibold`

## Risks / Trade-offs

- **Hardcoded Tag-Farben**: Wenn neue Tags hinzukommen, fallen sie auf den Fallback. Akzeptabel, da Tags selten ändern.
- **Größerer Dialog auf kleinen Screens**: `max-w-3xl` ist nur relevant ab Tablet. Auf Mobile füllt der Dialog ohnehin 100% Breite (shadcn/ui Default-Verhalten).
- **Mehr Tailwind-Klassen**: Etwas mehr Code, aber kein Performance-Impact.
