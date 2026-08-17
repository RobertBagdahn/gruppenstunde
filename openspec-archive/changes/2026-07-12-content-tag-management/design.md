## Context

Das `content.models.Tag`-Modell ist das zentrale Tagging-System für alle Content-Typen (Recipe, Ingredient, Session, Blog, Game, Event). Es verwendet einen Integer-PK, ein `embedding`-Feld (BinaryField) und hat kein `description`-Feld. Die "Frühstückstage"-Funktionalität nutzt dieses Tag-Modell mit `group="breakfast_day"`, was auf einem sprachlichen Missverständnis basiert.

Das Recipe-Modell fehlen strukturierte Felder für Zubereitungsart und benötigtes Equipment — beides wird derzeit über freie Tags abgebildet, was für Filtering unpraktisch ist.

## Goals / Non-Goals

**Goals:**
- content.Tag von Integer-PK auf UUID-PK migrieren
- description-Feld zu Tag hinzufügen, embedding-Feld entfernen
- Frühstückstage-Feature komplett löschen (Backend, Frontend, Tests, Spec)
- preparation_method (Enum) und equipment (M2M) auf Recipe hinzufügen
- Neuen "Tags"-Tab im Admin Stammdaten mit CRUD und Detailseite

**Non-Goals:**
- Keine Seed-Tags — Tags werden rein manuell im Admin angelegt
- Keine Änderung am Frühstücks-Wizard (der nutzt content.Tag mit anderen groups, nicht breakfast_day)
- Keine neuen Grouping- oder Hierarchie-Mechanismen für Tags
- Keine Migration bestehender breakfast_day-Tags (bleiben in DB, können manuell gelöscht werden)

## Decisions

### 1. Tag-Modell: content.models.Tag erweitern statt neues Modell

**Entscheidung:** Das bestehende `content.models.Tag` wird erweitert. Kein neues Tag-Modell.

**Begründung:** Recipe und Ingredient haben bereits M2M zu content.Tag. Ein neues Modell würde parallele Tag-Systeme schaffen und bestehende Daten entwerten. Die M2M-Relationen bleiben unverändert — nur der PK-Typ ändert sich.

**Alternativen:**
- Neues `supply.Tag` Modell: Würde Doppelstruktur schaffen, bestehende M2M-Daten müssten migriert werden
- Nur description hinzufügen, UUID weglassen: Geht gegen expliziten Wunsch

### 2. UUID-Migration: Mehrschritt-Strategie mit Datenübernahme

**Entscheidung:** Drei Migrations-Schritte für den PK-Wechsel:

```
Schritt 1: uuid-Feld hinzufügen + befüllen
  → content_tag.uuid (UUIDField, nullable=False, unique=True, default=uuid4)

Schritt 2: PK tauschen, FKs umstellen
  → id entfernen, uuid zu id umbenennen
  → parent_id (self-FK) auf neue UUIDs mappen
  → Alle M2M-Through-Tabellen (tag_id) auf UUID umstellen
  → content_tagsuggestion.parent_id auf UUID umstellen

Schritt 3: Cleanup
  → Alte Indexes entfernen
  → Constraints prüfen
```

**Begründung:** PostgreSQL unterstützt UUIDs nativ und Django 5.1 erlaubt `primary_key=True` auf UUIDField. Die größte Herausforderung sind die FK-Referenzen, die per `RunPython`-Datenmigration umgemappt werden müssen.

**Alternativen:**
- Integer-PK behalten + zusätzliches uuid-Feld: Wurde vom Nutzer explizit abgelehnt
- Komplett neue Tabelle + Daten kopieren: Riskant, benötigt Ausfallzeit

### 3. Equipment: Eigenes Modell in supply App

**Entscheidung:** `supply.models.Equipment` als eigenständiges Referenz-Modell mit M2M zu Recipe. Seed mit 8 Standard-Werten.

```
supply.Equipment
  id: Integer (Auto-PK)
  name: CharField
  slug: SlugField (unique)
```

Recipe bekommt:
```
recipe.Recipe
  equipment: M2M → supply.Equipment (blank=True)
  preparation_method: CharField (max_length=50, blank=True, choices)
```

**Begründung:** Equipment-Einträge sollen admin-manageable sein (wie NutritionalTag, RetailSection). Ein M2M erlaubt Multi-Select (z.B. "Topf" + "Ofen" für ein Rezept). preparation_method ist Single-Select, daher reicht ein CharField mit choices. Equipment bekommt einen eigenen Tab im Stammdaten-Bereich (Pattern wie NutritionalTagTab).

**Alternativen:**
- ArrayField(CharField) für Equipment: PostgreSQL-spezifisch, schwerer zu filtern
- Enum-Tags für Equipment: Geht gegen "Equipment ist kein Tag"-Entscheidung

### 4. Admin-API: Neuer Router unter /api/admin/tags/

**Entscheidung:** Neuer Ninja-Router `admin_tags_router` in `backend/content/api/admin_tags.py` unter `/api/admin/tags/`. Tag-Detail-Endpoint als `/api/admin/tags/{id}/detail/`.

Pydantic Schemas:
```python
class TagIn(Schema):
    name: str
    description: str = ""
    parent_id: str | None = None
    group: str = "general"
    icon: str = ""
    # slug wird auto-generiert aus name, kein Input-Feld

class TagOut(Schema):
    id: str  # UUID
    name: str
    slug: str  # auto-generated, read-only
    description: str
    parent_id: str | None
    icon: str
    group: str
    sort_order: int
    is_approved: bool

class TagDetailOut(Schema):
    tag: TagOut
    recipes: list[dict]   # [{id, title, slug}]
    ingredients: list[dict]  # [{id, name, slug}]
```

Alle Endpunkte prüfen `request.user.is_staff`.

**Begründung:** Clean separation von der public Tag-API (`/api/tags/`). Staff-only durch den Router-Tag "admin" und explizite Staff-Checks. Der Slug wird serverseitig per `slugify(name)` generiert und ist im Admin read-only.

### 5. Frontend: TagTab folgt NutritionalTagTab-Pattern

**Entscheidung:** `TagTab.tsx` in `frontend-food/src/pages/admin/` folgt exakt dem Pattern von `NutritionalTagTab.tsx`: react-hook-form + zodResolver, Dialog für Create/Edit, DeleteConfirmDialog für Löschen, Card-Table-Layout. `TagDetailPage.tsx` als eigene Route `/admin/tag/:id` (Singular, um Routing-Konflikt mit `/admin/:section` zu vermeiden).

**Begründung:** Konsistenz mit bestehenden Admin-Tabs. Das Pattern ist erprobt und maintainable.

**Alternativen:**
- Inline-Editing wie BreakfastDayManager: Weniger konsistent mit anderen Stammdaten-Tabs
- Detailseite als Modal: Weniger geeignet für paginierte Listen

### 6. Frühstückstage: Vollständige Löschung

**Zu löschende Dateien:**
- `backend/supply/api/breakfast_days.py` (ganze Datei)
- `backend/supply/tests/test_breakfast_days.py` (ganze Datei)
- `frontend-food/src/components/breakfast/BreakfastDayManager.tsx` (ganze Datei)

**Zu ändernde Dateien:**
- `backend/supply/api/__init__.py`: breakfast_days_router entfernen
- `backend/inspi/urls.py`: breakfast_days_router-Registrierung entfernen
- `frontend-food/src/pages/admin/AdminPage.tsx`: Tab + Import + Rendering entfernen
- `frontend-food/src/api/breakfast.ts`: BreakfastDay-Hooks (Zeilen 208-299) entfernen
- `frontend-food/src/schemas/breakfast.ts`: BreakfastDay-Schema (Zeilen 239-247) entfernen
- `frontend-food/src/pages/recipes/EditRecipePage.tsx`: Frühstückstage-Sektion entfernen
- `frontend-food/src/pages/planning/RecipeSearchDialog.tsx`: Frühstückstag-Filter entfernen
- `backend/planner/api/meal_plan.py`: breakfast_day-Filter entfernen (Zeile ~1994)
- `backend/supply/management/commands/seed_breakfast_catalog.py`: breakfast_day-Seed entfernen

### 7. Frontend Admin-Tabs Reihenfolge

Der Tags-Tab wird zwischen "Ernährungstags" und "Regeln" eingefügt, der Equipment-Tab zwischen "Abteilungen" und "Ernährungstags":
```
Freigaben → Abteilungen → Equipment → Ernährungstags → Tags → Regeln → KI Feedback → Datenqualität
```

## Risks / Trade-offs

- **[UUID-Migration]** Integer→UUID PK-Wechsel betrifft 6+ Through-Tabellen. Bei großen Datenmengen (>10k Tags, >100k M2M-Relationen) kann die Migration zeitaufwändig sein. → Migration in kleine Schritte aufteilen, lokale und Production-DB vorher testen.
- **[Frühstücks-Wizard]** Die Frühstückstage-Löschung darf den Frühstücks-Wizard nicht beeinträchtigen. Der Wizard verwendet Tags mit `group` "breakfast_base"/"breakfast_topping"/etc., NICHT "breakfast_day". → Vor Löschung prüfen, ob andere Systeme breakfast_day-Tags referenzieren.
- **[embedding-Feld]** Entfernung des embedding-Felds von Tag könnte AI-Features beeinträchtigen, die Tag-Embeddings nutzen. → Codebase auf embedding-Referenzen auf Tag durchsuchen. Falls verwendet: stattdessen VectorField behalten oder auf Recipe-Ingredient-Embeddings umstellen.
- **[Datenverlust]** Bestehende breakfast_day-Tags und deren M2M-Verknüpfungen gehen beim Löschen des Features nicht verloren (Tags bleiben in der DB), aber die API/UI zur Verwaltung verschwindet. → Admin kann über den neuen Tags-Tab manuell aufräumen.
- **[Recipe-API-Kompatibilität]** Neue Felder auf Recipe (preparation_method, equipment) ändern die API-Response. → Frontend muss Zod-Schemas synchron aktualisieren. Kein Breaking Change für Clients, da es additive Felder sind.

## Open Questions

- Nutzt irgendein AI-Feature derzeit `Tag.embedding`? Falls ja, muss das auf Recipe-Embeddings umgestellt werden.
- Gibt es eine bessere Option als die Mehrschritt-UUID-Migration? Können wir `SeparateDatabaseAndState` nutzen?
