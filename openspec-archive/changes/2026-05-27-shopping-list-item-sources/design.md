## Context

Die Einkaufsliste wird aktuell in `supply/services/shopping_service.py` generiert. Der Service aggregiert Zutaten über MealPlan → Meal → MealItem → Recipe → RecipeItem → Ingredient und summiert identische Zutaten. Dabei geht die Herkunftsinformation (welches Rezept, welche Mahlzeit) verloren.

Es gibt zwei Pfade:
1. **Transient** (MealPlan-Preview): `GET /api/meal-plans/{id}/shopping-list/` — kein DB-Persist
2. **Persistent** (Shopping App): `POST /api/shopping-lists/from-meal-plan/{id}/` — speichert in DB

## Goals / Non-Goals

**Goals:**
- Herkunft jeder Zutat nachvollziehbar machen (Rezeptname + Mahlzeit-Kontext + Teilmenge)
- Expand/Collapse-UX im Frontend (collapsed = wie bisher, expanded = Sources sichtbar)
- Funktioniert für transiente und persistierte Einkaufslisten
- Sources als Links zu Rezepten navigierbar

**Non-Goals:**
- Keine Aufhebung der Aggregation (Items bleiben zusammengefasst)
- Kein Editing einzelner Sources (nur Anzeige)
- Keine Source-Tracking für manuell hinzugefügte Items

## Decisions

### 1. Breakdown-Tabelle statt JSON-Feld

Neues Model `ShoppingListItemSource` mit FKs zu Recipe und Meal statt JSONField auf ShoppingListItem.

**Rationale:** Querybar, relationale Integrität, einfacher zu migrieren wenn sich Recipe/Meal-Models ändern.

### 2. Transiente Sources als verschachteltes Dataclass

Für die MealPlan-Preview wird kein DB-Persist benötigt. Der Service gibt `sources: list[ShoppingItemSource]` als Teil des transienten `ShoppingListItem` zurück.

### 3. Expand/Collapse im Frontend (default collapsed)

Die Liste bleibt kompakt. Tap auf ein Item klappt die Sources auf. Kein separater View-Toggle.

### 4. Meal-Label als cached String

`ShoppingListItemSource.meal_label` speichert z.B. "Tag 1 Abend" als denormalisierten String, damit die Anzeige keine zusätzlichen Queries braucht.

### 5. Recipe-Slug mitliefern für Frontend-Navigation

Sources enthalten `recipe_slug` damit das Frontend direkt auf `/recipes/:slug` verlinken kann.

## Risks / Trade-offs

- **Mehr Daten pro API-Call**: Sources-Array vergrößert die Response. Bei 50 Items mit je 3 Sources ist das vertretbar (~2KB extra).
- **Migration**: Neue Tabelle, aber keine Änderung an bestehenden Tabellen → risikoarm.
- **Konsistenz bei Rezept-Löschung**: `on_delete=SET_NULL` für recipe FK — Source bleibt mit Name erhalten, Link wird deaktiviert.
