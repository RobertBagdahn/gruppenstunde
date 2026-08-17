## Why

Das aktuelle Tag-System hat zwei strukturelle Probleme: (1) Die "Frühstückstage"-Verwaltung im Admin Stammdaten basiert auf einem Missverständnis — "Tags" (deutsch für Tage) wurden mit content-Tags verwechselt. (2) `content.models.Tag` nutzt Integer-PKs, hat kein `description`-Feld, aber ein ungenutztes `embedding`-Feld. Zudem fehlt eine Admin-Detailansicht, die zeigt, welche Rezepte und Zutaten einen Tag verwenden.

## What Changes

- **BREAKING**: `content.models.Tag.id` wechselt von Integer zu UUID als Primärschlüssel. Alle FK-Referenzen (parent, TagSuggestion, M2M-Through-Tabellen) werden mitmigriert
- **BREAKING**: `content.models.Tag.embedding` wird entfernt
- `content.models.Tag.description` (TextField) wird hinzugefügt
- **BREAKING**: Frühstückstage-Feature wird komplett entfernt (Backend-API, Frontend-Komponente, Admin-Tab, Tests, Spec)
- `supply.models.Equipment` wird als neues Referenz-Modell angelegt (name, slug)
- `recipe.Recipe.preparation_method` als Enum-Feld (TextChoices) hinzugefügt
- `recipe.Recipe.equipment` als M2M zu Equipment hinzugefügt
- Neuer "Tags"-Tab im Admin Stammdaten mit CRUD und Detailseite pro Tag
- Seed für Tags entfällt — Tags werden rein manuell im Admin angelegt

## Capabilities

### New Capabilities
- `content-tag-model-upgrade`: Upgrade von content.models.Tag auf UUID-PK, +description, -embedding
- `recipe-enum-fields`: preparation_method (Enum) und equipment (M2M) auf Recipe
- `tag-admin`: Admin "Tags"-Tab mit CRUD, Detailseite pro Tag mit verknüpften Rezepten/Zutaten

### Modified Capabilities
- `breakfast-days`: **ENTFERNT** — Komplette Löschung der Frühstückstage-Funktionalität
- `food-admin`: Tags-Tab hinzugefügt, Frühstückstage-Tab entfernt
- `recipe`: Neue Felder preparation_method und equipment

## Impact

- **Backend Models**: `content.models.Tag` (UUID-Migration, +description, -embedding), `supply.models.Equipment` (neu), `recipe.Recipe` (+preparation_method, +equipment)
- **Backend API**: Löschung `supply/api/breakfast_days.py`, neue Admin-API für Tag-CRUD + Detail, Equipment-CRUD
- **Backend Migrations**: Mehrschrittige UUID-Migration für content_tag + alle FK-Referenzen (parent, TagSuggestion, recipe_recipe_tags, supply_ingredient_tags, session/blog/game/event M2M-Tabellen)
- **Frontend**: AdminPage.tsx (Frühstückstage-Tab entfernen, Tags-Tab hinzufügen), BreakfastDayManager.tsx löschen, TagTab.tsx + TagDetailPage.tsx neu, api/breakfast.ts & schemas/breakfast.ts (BreakfastDay-Teile entfernen)
- **Specs**: breakfast-days/spec.md entfernen, food-admin/spec.md aktualisieren, recipe/spec.md aktualisieren
