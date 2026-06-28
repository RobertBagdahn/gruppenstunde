## Context

Der aktuelle Sync-Mechanismus in `sync_recipe_nutritional_tags()` berechnet die Schnittmenge (AND-Logik) aller Zutaten-Tags und preserviert dann zusätzlich alle non-dangerous Tags, die bereits auf dem Rezept gesetzt sind. Das soll manuelle Overrides schützen, führt aber zu einem Self-Perpetuating-Bug:

1. Sync setzt "vegan" auf Rezept (weil alle Zutaten es hatten)
2. Käse wird als Zutat hinzugefügt (hat kein "vegan"-Tag)
3. Sync läuft erneut → preserviert "vegan" (non-dangerous, denkt es sei manuell)
4. AND-Logik ergibt [] (Käse hat kein vegan)
5. Ergebnis: ["vegan"] + [] = ["vegan"] → **"vegan" bleibt für immer**

Der Sync kann nicht zwischen manuell gesetzten und auto-synchronisierten Tags unterscheiden.

## Goals / Non-Goals

**Goals:**
- Self-Perpetuating-Bug eliminieren: Tags werden korrekt entfernt, wenn Zutaten sich ändern
- Manuelle Tag-Overrides bleiben erhalten (User kann "vegan" setzen, auch wenn Honig als Zutat kein vegan-Tag hat)
- API-Contract bleibt identisch (Frontend muss nichts ändern)
- Bestehende Rezepte mit falschen Tags werden beim nächsten Sync korrigiert

**Non-Goals:**
- Keine Frontend-Änderungen
- Kein neuer API-Endpunkt
- Keine Änderung am NutritionalTag-Model oder Ingredient-Tagging

## Decisions

### Decision 1: Separates M2M-Feld `manual_nutritional_tags`

**Problem**: Sync kann nicht unterscheiden, welche Tags manuell und welche auto-synced sind.

**Lösung**: Neues `manual_nutritional_tags` M2M-Feld auf `Recipe`. Sync schreibt nur noch `nutritional_tags` (pure Intersection ohne Preservation). API create/update speichert `nutritional_tag_ids` in `manual_nutritional_tags`. Der Response merged beide Felder.

```
┌────────────────────────────────────────────┐
│              Recipe                         │
│                                              │
│  nutritional_tags        (auto-synced)      │
│  manual_nutritional_tags (user-set, M2M)   │
│                                              │
│  Response = nutritional_tags                │
│             ∪ manual_nutritional_tags        │
└────────────────────────────────────────────┘
```

**Alternativen verworfen**:
- **Pure Intersection (kein Preserve)**: User-Overrides gehen bei Zutatenänderung verloren
- **API-Override nach Sync**: Gleiches Problem – nächste Zutatenänderung überschreibt
- **Through-Model mit Flag**: Aufwändiger, komplexere Queries

### Decision 2: Sync schreibt nur `nutritional_tags`

`sync_recipe_nutritional_tags()` wird auf pure Intersection reduziert. Kein Lesen oder Schreiben von `manual_nutritional_tags`. Der Sync ist damit deterministisch und idempotent.

### Decision 3: API speichert in `manual_nutritional_tags` nach dem Sync

In create/update:
1. Recipe + Items speichern → Signal triggert Sync (pure Intersection)
2. `nutritional_tag_ids` aus Payload → in `manual_nutritional_tags` speichern
3. `.set()` auf M2M triggert kein `post_save` → kein erneuter Sync

### Decision 4: Response merged beide Felder

`RecipeDetailOut.resolve_nutritional_tags` gibt die Union aus `nutritional_tags` und `manual_nutritional_tags` zurück. Der API-Contract bleibt identisch.

### Decision 5: Management Command nutzt neue Logik

`sync_recipe_nutritional_tags` Management Command ruft `sync_recipe_nutritional_tags()` auf (pure Intersection) ohne die alten `manual_nutritional_tags` zu beeinflussen.

## Migration Plan

1. Migration: `manual_nutritional_tags` M2M-Feld zu Recipe hinzufügen
2. Für bestehende Rezepte: `manual_nutritional_tags` bleibt leer → Sync berechnet Intersection → falsche Tags (die vorher preserviert wurden) fallen weg
3. Management Command `sync_recipe_nutritional_tags` für Bulk-Re-Sync

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| **Bestehende manuelle Tags gehen verloren**: Wenn ein User "vegan" manuell gesetzt hatte, aber der alte Sync es auch automatisch gesetzt hatte → der neue Sync löscht es, weil es nicht in `manual_nutritional_tags` steht | Akzeptiert: Der alte Bug macht es unmöglich zu unterscheiden, welche Tags manuell waren. Ein manuelles Re-Setzen ist nötig. In der Praxis sind manuelle Setzungen selten (die UI bietet den Tag-Picker kaum prominent an). |
| **Django Admin-User setzen Tags direkt in `nutritional_tags`**: Diese gehen beim nächsten Sync verloren | Admin-Nutzer müssen `manual_nutritional_tags` verwenden für Overrides. Ist dokumentiert. |
