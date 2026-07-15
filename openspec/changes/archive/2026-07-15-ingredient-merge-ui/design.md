## Context

Der bestehende `merge_ingredients`-Endpoint in `content/api/data_quality.py:513` hat einen kritischen Bug (`RecipeItem.portion_id=NULL` bei non-nullable FK). Zusätzlich existiert kein Soft-Delete für `Ingredient` (anders als `Recipe`, das `SoftDeleteModel` erbt). Das Blockiert einen sauberen Merge mit Audit-Trail.

Das Frontend hat bereits eine funktionierende `DuplicateDetectionList` im Admin-Dashboard, die Duplikat-Erkennung via Embedding-Similarity, Preview und Merge-Dialog bietet. Diese Logik soll in eine gemeinsame Komponente extrahiert werden, die auch von der `IngredientEditPage` nutzbar ist.

**Constraints:**
- Keine neuen Python-Dependencies
- `@transaction.atomic` für Merge (bereits in Django)
- Mobile ist nebensächlich (wird primär am Desktop genutzt)
- Alle Texte Deutsch, Code Englisch
- Staff-only (wie bestehendes Rechtemodell)

## Goals / Non-Goals

**Goals:**
- Bugfix: RecipeItem.portion_id wird nie auf NULL gesetzt
- Ingredient bekommt Soft-Delete (`SoftDeleteModel`)
- DELETE-Endpoint wird auf Soft-Delete umgestellt
- Gemeinsame Merge-Komponente für IngredientEditPage und DuplicateDetectionList
- Merge-Flow mit Suche (Vorschläge + Freitext), Quelle/Ziel-Auswahl, Preview, Warnung bei hoher Nutzung
- Audit-Trail via ContentLink(DUPLICATE_MERGED)
- Embedding wird synchron nach Merge neu berechnet
- Vor dem Fix: Test zur Reproduktion des Bugs

**Non-Goals:**
- Kein Undo/Unmerge
- Kein manuelles Portion/UnitConversion/Alias-Mapping im Dialog
- Keine automatische Portion-Duplikat-Erkennung (alle Source-Portionen werden re-parented)
- Keine Änderung an UnitConversion-Mapping (Target behält seine)
- Keine Änderung am Haupt-Frontend (`frontend/`)

## Decisions

### D1: Portion-Re-Parenting statt Löschen/Neuanlegen

**Entscheidung:** Alle Source-Portionen bekommen `Portion.ingredient_id = target.id` (Re-Parenting). Keine Portion wird gelöscht, keine neue Portion erzeugt. RecipeItem.portion_id bleibt unverändert, da die Portion nur umgehängt wird.

**Rationale:** Vermeidet den ursprünglichen Bug strukturell — es gibt keine Löschung, keine NULL-Setzung, kein Remapping von RecipeItems auf neue Portion-IDs. Einfachster, sicherster Ansatz. Möglicher Nebeneffekt: Target hat danach ggf. mehrere fast-identische Portionen (z.B. "1 Stück" mit 150g und "1 Stück" mit 145g). Dieser Trade-off wird bewusst in Kauf genommen für Datensicherheit.

**Alternativen verworfen:**
- Portionen löschen + RecipeItems auf Target-Portion remappen → komplex, fehleranfällig
- Nur "neue" Portionen übernehmen, Duplikate verwerfen → erfordert Mapping, wieder Löschungen

### D2: SoftDeleteModel für Ingredient

**Entscheidung:** `Ingredient` erbt `SoftDeleteModel` aus `content.models.core`. Dies fügt `deleted_at`-Feld + `objects` (alive-only) + `all_objects` Manager hinzu.

**Rationale:** `SoftDeleteModel` ist eine generische, von `Content` unabhängige abstrakte Basisklasse. Kann direkt wiederverwendet werden. Die Migration ist einfach (ein nullable Feld). Bestehende Queries (`Ingredient.objects.xyz()`) ändern ihr Verhalten nicht, da nach der Migration alle `deleted_at=NULL` sind. Der DELETE-Endpoint muss auf `soft_delete()` umgestellt werden.

### D3: Merge-Flow-Design

```
┌──────────────────────────────────────────────────────┐
│ IngredientEditPage / DuplicateDetectionList           │
│                                                        │
│ [Zutat zusammenführen]  ← Staff-only Button            │
│         │                                              │
│         ▼                                              │
│ ┌──────────────────────────────────────────────┐      │
│ │ IngredientMergeDialog                        │      │
│ │                                              │      │
│ │ Schritt 1: Zutat suchen                      │      │
│ │  ┌──────────────────────────────┐            │      │
│ │  │ 🔍 Suchfeld (Freitext)       │            │      │
│ │  ├──────────────────────────────┤            │      │
│ │  │ Vorschläge (Embedding-Simil) │            │      │
│ │  │  ● Tomate (92%)              │            │      │
│ │  │  ● Tomaten frisch (88%)      │            │      │
│ │  │  ● Tomatenmark (75%)         │            │      │
│ │  └──────────────────────────────┘            │      │
│ │                                              │      │
│ │ Schritt 2: Quelle / Ziel wählen              │      │
│ │  [A ← B]  B wird in A gemerged  ←→           │      │
│ │  [A → B]  A wird in B gemerged               │      │
│ │                                              │      │
│ │ Schritt 3: Preview                           │      │
│ │  "Betrifft 12 Rezepte"                       │      │
│ │  ⚠️ usage_count > 20: Warnung + Checkbox     │      │
│ │                                              │      │
│ │         [Abbrechen]  [Zusammenführen]        │      │
│ └──────────────────────────────────────────────┘      │
│                                                        │
│ Ergebnis: Detaillierte Erfolgsmeldung                  │
│  "X Rezepte aktualisiert, Y Portionen übernommen,      │
│   Z Aliase hinzugefügt"                                │
└──────────────────────────────────────────────────────┘
```

### D4: Merge-Backend-Logik (@transaction.atomic)

**Ablauf:**
1. Source-Name als `IngredientAlias` auf Target anlegen (get_or_create, Duplikate übersprungen)
2. Alle Source-Aliase als `IngredientAlias` auf Target anlegen (get_or_create)
3. Alle Source-Portionen: `Portion.ingredient_id = target.id` (Re-Parenting)
4. `MealItem.objects.filter(ingredient=source).update(ingredient=target)`
5. Source-Portionen mit `Portion.ingredient_id=source.id`? — Nicht nötig, da Schritt 3 bereits alle umgehängt hat
6. `UnitConversion.objects.filter(ingredient=source).delete()` (Target behält seine, Source verworfen)
7. `update_ingredient_embedding(target, force=True)` (synchron)
8. `source.soft_delete()`
9. `ContentLink.objects.create(..., link_type=DUPLICATE_MERGED)`

**Alles in `@transaction.atomic`** — bei Fehler wird alles zurückgerollt.

### D5: Merge Preview

**Preview liefert:**
- Anzahl `RecipeItem.objects.filter(portion__ingredient=source).count()` = Anzahl betroffener Rezepte
- `source.usage_count` für die Warnschwelle
- `source.name` und `target.name` für die Bestätigung

### D6: Warnung bei hoher Nutzung

**Warnschwelle:** `source.usage_count > 20`
**UI:** Warnungstext + Pflicht-Checkbox "Ich bin sicher", bevor der Bestätigen-Button aktiv wird.

### D7: Gemeinsame Komponente

`IngredientMergeDialog` in `frontend-food/src/components/ingredients/IngredientMergeDialog.tsx`:
- Akzeptiert Props: `currentIngredient` (die aktuelle Zutat, von der aus gestartet), optional `preSelectedTarget` (vom Admin-Dashboard)
- Wird verwendet von:
  - `IngredientEditPage.tsx` — mit nur `currentIngredient`
  - `DuplicateDetectionList.tsx` — mit `currentIngredient` + `preSelectedTarget` (ersetzt den bestehenden Inline-Merge-Dialog)

## Risks / Trade-offs

| Risk | Mitigation |
|------|-----------|
| **Soft-Delete bricht Queries**: 309 Stellen mit `Ingredient.objects` | SoftDeleteManager filtert nur `deleted_at IS NULL`. Nach Migration alle NULL, keine Verhaltensänderung. Tests. |
| **Mehrere fast-identische Portionen** nach Merge | Akzeptierter Trade-off. Datenintegrität > Portion-Cleanup. Späteres Bereinigungsskript möglich. |
| **Embedding-Neuberechnung blockiert Request** (Vertex AI kann >1s dauern) | Synchron (User-Wunsch), aber nur für Staff-Merge, der selten und bewusst ausgeführt wird. |
| **ContentLink zeigt auf soft-gelöschte Source-ID** nach Merge | Analog zu Recipe-Merge. Die Quelle ist via `all_objects` immer noch erreichbar. Acceptable. |
