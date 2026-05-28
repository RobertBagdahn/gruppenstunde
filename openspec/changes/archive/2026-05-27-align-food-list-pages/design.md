## Context

Im `frontend-food` existieren 4 Listenseiten mit inkonsistenten Layouts. Die Rezepte-Seite (`RecipeListPage.tsx`) dient als Referenz-Implementation. Die anderen 3 Seiten (Zutaten, Essensplan, Einkaufslisten) sollen visuell und strukturell angeglichen werden.

Aktueller Stand:
- **Rezepte**: max-w-7xl, ListPageHero + Count, Gradient-Search-Container, Filter-Sidebar, 5-col Grid, Sort-Dropdown, Pagination
- **Zutaten**: max-w-5xl, ListPageHero ohne Count, Inline-Filter, Listen-Darstellung
- **Essensplan**: max-w-6xl, eigener Card-Header (kein Hero), keine Suche, 2-col Grid, keine Pagination
- **Einkaufslisten**: max-w-3xl, ListPageHero ohne Count, keine Suche/Filter, Listen-Darstellung

## Goals / Non-Goals

**Goals:**
- Einheitliches visuelles Pattern fuer alle 4 Listenseiten
- Wiederverwendbare Komponenten extrahieren
- Jede Seite hat: Hero + Search + Filter + Grid + Sort + Pagination
- Mobile-first responsive Design beibehalten

**Non-Goals:**
- Backend-API-Aenderungen
- Neue Filter-Endpunkte
- Aenderung der Detail-Seiten
- Funktionale Erweiterung der Filter (nur visuelles Refactoring bestehender Filter)

## Decisions

### 1. Einheitliches Seiten-Skeleton

Alle 4 Seiten folgen diesem Aufbau:

```
┌─ Container: max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-8 ─┐
│                                                                      │
│  ┌─ ListPageHero (mit totalCount + countLabel) ─────────────────┐   │
│  └──────────────────────────────────────────────────────────────-┘   │
│                                                                      │
│  ┌─ Search-Container (Gradient-BG, rounded-2xl, border) ────────┐   │
│  │  Input + Search-Button + "Neu erstellen"-Button               │   │
│  └──────────────────────────────────────────────────────────────-┘   │
│                                                                      │
│  ┌─ Sidebar ──┐  ┌─ Content ─────────────────────────────────── ┐   │
│  │ Filter-    │  │  Sort-Dropdown (rechts)                       │   │
│  │ gruppen    │  │  Grid (responsive cols)                       │   │
│  │            │  │  Pagination                                   │   │
│  └────────────┘  └──────────────────────────────────────────────-┘   │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

### 2. Gemeinsame Komponente: `ListPageSearchBar`

Props: `placeholder`, `value`, `onChange`, `onSubmit`, `createLabel`, `createHref | onCreateClick`, `gradientClasses`

### 3. Seiten-spezifische Filter-Sidebars

- **Zutaten**: Retail-Section (Radio), Status (Radio), Nutri-Score (Checkbox)
- **Essensplan**: Keine Sidebar (zu wenige Filter sinnvoll) — stattdessen nur Sort
- **Einkaufslisten**: Source-Type Filter (Radio: Alle, Rezept, Essensplan, Manuell)

### 4. Card-Komponenten

- `IngredientCard.tsx`: Name, Retail-Section, Nutri-Score-Badge, Preis, Energie
- `MealPlanCard.tsx`: Bereits vorhanden als Inline-Card, in eigene Komponente extrahieren
- `ShoppingListCard`: Bereits vorhanden, bleibt

### 5. Grid-Konfiguration

- Rezepte: grid-cols-1 sm:2 md:3 lg:4 xl:5
- Zutaten: grid-cols-1 sm:2 md:3 lg:4 (breitere Cards wg. mehr Text)
- Essensplan: grid-cols-1 md:2 lg:3 (wenige Items, groessere Cards)
- Einkaufslisten: grid-cols-1 sm:2 md:3 (kompakte Cards)

### 6. Gradient-Farben pro Sektion

Aus `toolColors.ts` bereits definiert:
- Rezepte: rose/pink
- Zutaten: amber/orange
- Essensplan: blau/indigo (primary)
- Einkaufslisten: teal/cyan

## Risks / Trade-offs

- **Essensplan hat typisch wenige Items** (2-5 Plaene): Sidebar + Search wirken dort evtl. ueberdimensioniert. Kompromiss: Search-Bar ja, aber keine Sidebar. Filter nur als Sort-Dropdown.
- **Einkaufslisten sind persoenlich**: Kein oeffentlicher Katalog, daher weniger Filterlogik noetig. Sidebar mit Source-Type-Filter reicht.
- **Ingredient-Grid vs. Liste**: Cards zeigen weniger Info als Tabellenzeilen. Kompromiss: Kompakte Cards mit den wichtigsten Infos, Detail-Seite fuer Rest.
