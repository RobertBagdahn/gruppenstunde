## Context

Der Frühstücksassistent hat 5 Schritte. Schritt 4 (Getränke) hat aktuell drei hartcodierte Drink-Slider (Kaffee/Kakao/Tee) mit Milch-Unteroptionen. Die Getränke werden als recipe_id-Items gespeichert, aber der Nutzer kann keine eigenen Drink-Rezepte auswählen. Die Drink-Rezepte kommen aus dem BreakfastCatalog (getagged mit `breakfast-drink`).

Es gibt kein Konzept für "Frühstückstage" — Rezepte können nicht für bestimmte Tage markiert werden.

## Goals / Non-Goals

**Goals:**
- Dynamische Drink-Liste in Step 4 statt fester Kaffee/Kakao/Tee-Slider
- Rezepte via RecipeSearchDialog als Getränk auswählbar (vorgefiltert auf `recipe_type=drink` + optional nach Frühstückstag)
- Frühstückstag-Tags auf Rezepten (content.Tag mit `group="breakfast_day"`)
- Tag-Verwaltungs-UI (CRUD für Frühstückstage)
- RecipeSearchDialog-Filter-Pill für Frühstückstage (entfernbar)
- Per-Drink-Prozent-Slider (wie bisher, nur dynamisch)

**Non-Goals:**
- Keine Milch in Step 4 (Milch fliegt raus)
- Keine Getränkekalorien im Cockpit
- Keine Multi-Day-Planung im Wizard
- Keine Migration alter RefMeal-Daten
- Keine Freitext-Getränke (nur Rezepte)

## Decisions

### 1. Tag.group für Frühstückstage

**Entscheidung**: `content.Tag` erhält ein `group`-Feld (`CharField(max_length=50, default="general", blank=True)`).

**Alternativen**:
- **Neues Model `BreakfastDay`**: Vom User abgelehnt (wählte content.Tag). Zusätzlich: bräuchte separate M2M zu Recipe, kein Zugriff auf existierende Tag-Infrastruktur.
- **Namenskonvention**: Fragil, unzuverlässig beim Filtern.

**Konsequenzen**:
- Bestehende Tags erhalten `group="general"` (Default)
- Neue Tags mit `group="breakfast_day"` werden vom Breakfast-Catalog erkannt
- API-Filter: `GET /api/content/tags/?group=breakfast_day`
- Migration: `Tag.objects.all().update(group="general")` + `AlterField` für Default

### 2. DrinkState-Format

```typescript
// Neu
drinks: {
  mlPerPerson: number;         // Gesamtmenge pro Person (unverändert)
  selected: Array<{
    recipeId: number;
    recipeTitle: string;
    sharePercent: number;      // 0-100, Summe = 100
  }>;
}
```

**Alternativen**:
- Absolute ml pro Drink: Brüche die Prozent-Slider-Konvention und zwingt Nutzer zu mehr Rechnung.
- Per-Drink-Milch: Vom User explizit entfernt.

**Konsequenzen**:
- Keine `coffeePercent/cocoaPercent/teaPercent` mehr
- Keine `coffeeMilkMlPerPerson/cocoaMilkMlPerPerson` mehr
- Rebalance-Logik bleibt identisch (nur auf dynamischem Array statt festen Feldern)
- Milch komplett aus Step 4 entfernt

### 3. RecipeSearchDialog-Filter

**Entscheidung**: Neue Filter-Pill-Reihe "Frühstückstag" unterhalb der CategoryPills.

```
CategoryPills: [breakfast] [warm_meal] [cold_meal] [dessert] [recipe_part] [drink ✓] [snack]
Frühstückstag: [Tag 1 ✕] [Tag 2] [Tag 3] [Alle]
```

- Standardmäßig ist KEIN Tag vorgewählt (alle Drinks sichtbar)
- Die gewählten Tag-Pills werden als `tag_ids`-Parameter an die Recipe-Search-API gesendet
- "Alle" = kein Tag-Filter
- ✕ auf einem Tag = Filter entfernen

**Neue Props für RecipeSearchDialog**:
```typescript
breakfastDayTagIds?: number[];       // IDs der verfügbaren Frühstückstag-Tags
selectedBreakfastDayTagIds?: Set<number>; // Aktuell gewählte Tag-IDs
onBreakfastDayTagsChange?: (ids: Set<number>) => void;
```

### 4. Tag-Verwaltung

**Backend-API**:
- `GET /api/content/tags/?group=breakfast_day` — Liste der Frühstückstage
- `POST /api/content/tags/` — neuen Tag anlegen (mit `group="breakfast_day"`)
- `PUT /api/content/tags/{id}/` — Tag umbenennen
- `DELETE /api/content/tags/{id}/` — Tag löschen (nur wenn kein Recipe ihn verwendet)

**Frontend-Komponenten**:
- `BreakfastDayManager` — eigenständige Page/Modal: Liste + CRUD
- Recipe-Edit: Tag Multi-Select (bestehende Tag-Auswahl, gefiltert auf `group="breakfast_day"`)

### 5. StepGetraenke-Rewrite

**UI-Struktur**:
```
┌──────────────────────────────────────┐
│  Gesamtmenge: [300] ml / Person     │
│                                      │
│  ─── Getränke ────────────────────  │
│                                      │
│  ☕ Filterkaffee           40% ████  │
│  🍫 Kakao                 30% ███   │
│  🧉 Pfefferminztee        30% ███   │
│                                      │
│              [+ Getränk]             │
└──────────────────────────────────────┘
```

**Interaktionen**:
- Prozent-Slider pro Drink (Rebalance wie bisher, aber auf dynamischem Array)
- "X"-Button auf jedem Drink → entfernt aus Liste, Neuverteilung auf restliche
- "[+ Getränk]" → öffnet RecipeSearchDialog
- RecipeSearchDialog öffnet mit vorgefiltert: `recipe_type=["drink"]` + `breakfastDayTagIds`

### 6. Backend-API-Änderungen

**BreakfastCatalog**: Optionaler `tag_ids`-Filter für drink_recipes
- `GET /api/supply/breakfast-catalog/?tag_ids=1,2,3`
- Filtert `drink_recipes` auf Rezepte, die ALLE angegebenen Tags haben

**RecipeSearch**: Bereits vorhandener `tag_ids`-Parameter wird genutzt
- `GET /api/recipes/search/?recipe_types=drink&tag_ids=1,2,3`
- Keine neue API nötig — existiert bereits

**RefMeal-Items**: Speicherlogik bleibt gleich
- Drinks werden als `recipe_id` + `quantity` (ml) + `measuring_unit_id` (ml) gespeichert
- Nur der Frontend-State ändert sich (Array statt fester Felder)

## Risks / Trade-offs

- **[Risiko] Alt-RefMeals nicht lesbar**: Alte RefMeals mit coffee/cocoa/tea-Format können nicht mehr in den Wizard geladen werden
  → **Mitigation**: bewusste Entscheidung (User hat "ignorieren" gewählt). Alte Daten bleiben in der DB, werden nur nicht mehr im Wizard angezeigt
- **[Risiko] Tag.group ist generisch**: Jeder kann Tags mit `group="breakfast_day"` anlegen, auch außerhalb des Breakfast-Day-Managers
  → **Mitigation**: Akzeptiert. Tag-Admin-UI zeigt Gruppe an. Missbrauch ist unwahrscheinlich.
- **[Risiko] RecipeSearchDialog wird komplexer**: Neue Filter-Reihe erhöht kognitive Last
  → **Mitigation**: Nur sichtbar wenn breakfastDayTagIds gesetzt sind (conditional rendering)
