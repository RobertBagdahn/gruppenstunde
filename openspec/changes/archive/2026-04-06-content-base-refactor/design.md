## Context

Inspi ist eine modulare Tool-Plattform für Pfadfinder-Gruppenführer. Aktuell existieren zwei separate Content-Models (`Idea` in der `idea` App und `Recipe` in der `recipe` App) mit duplizierten Querschnittsfunktionen (Kommentare, Emotionen, Views, Tags). Die `Idea` hat zwei Typen (`idea` = Gruppenstundenidee, `knowledge` = Wissensbeitrag), die logisch unterschiedliche Konzepte sind. Neue Content-Typen (Games, Blogs) erfordern erneute Duplizierung. Es gibt kein einheitliches Linking-, Embedding-, Approval- oder Soft-Delete-System.

Das Refactoring führt eine abstrakte Basisklasse `Content` ein, aus der alle Content-Typen (GroupSession, Blog, Game, Recipe) erben. Parallel dazu wird `Supply` als abstrakte Basis für Material und Ingredient eingeführt.

### Stakeholder
- **Gruppenführer** (Endnutzer): Erstellen und konsumieren Content, suchen übergreifend
- **Admins**: Moderieren, genehmigen Content, prüfen Embedding-Qualität
- **Entwickler**: Neue Content-Typen mit minimalem Boilerplate hinzufügen

## Goals / Non-Goals

**Goals:**
- Einheitliche abstrakte Basisklasse `Content` für alle Content-Typen
- Einheitliche abstrakte Basisklasse `Supply` für Material und Ingredients
- Generisches Content-Linking mit Embedding-basierten Empfehlungen
- Globale Suche über alle Content-Typen mit Tab-Filter
- Mehrstufiger Stepper für Content-Erstellung mit KI-Unterstützung
- Inline-Bearbeitung mit Editorstiften in der Detailansicht
- Approval-Workflow mit E-Mail-Benachrichtigungen
- Soft Delete für alle Content- und Supply-Models
- Event-Tagesplan mit Zeitslots
- Einheitliches Bewertungssystem (Emotions) für alle Content-Typen
- Admin-UI für Embedding-Qualitätsprüfung und Approval-Queue

**Non-Goals:**
- Migration bestehender User-Daten (Projekt hat noch keine Produktionsdaten, nur 3 Commits)
- JWT oder OAuth2 (Session-basierte Auth bleibt)
- Full-Text-Search-Engine (Elasticsearch, Meilisearch) — pgvector + pg_trgm reichen
- Multi-Language-Support (UI bleibt Deutsch)
- Echtzeit-Collaboration (WebSockets)
- Monetarisierung oder Payment-System
- Mobile App (bleibt Web-only, Mobile-First responsive)

## Decisions

### 1. Abstract Base Class Pattern (Django Abstract Model)

**Entscheidung**: `Content` wird als `class Meta: abstract = True` Django Model implementiert, NICHT als Multi-Table-Inheritance oder Generic Relations via ContentType.

**Alternativen**:
- **Multi-Table Inheritance (MTI)**: Jede Unterklasse bekommt eine eigene Tabelle + JOIN auf die Elterntabelle. Nachteil: Performancekosten durch JOINs bei jeder Query, komplexe Migrations.
- **ContentType + Generic Relations**: Django's GenericForeignKey. Nachteil: Keine DB-Level Constraints, Query-Performance schlecht, Type-Safety verloren.
- **Abstract Model** (gewählt): Jede Unterklasse bekommt eine vollständige eigene Tabelle. Vorteil: Beste Query-Performance (kein JOIN), klare DB-Schema, einfache Migrations. Nachteil: Duplizierte Spalten in jeder Tabelle — bei ~30 Feldern akzeptabel.

**Rationale**: Da keine Rückwärtskompatibilität nötig ist und das Projekt in aktiver Entwicklung ist, ist Abstract Model das einfachste Pattern. Die globale Suche wird über eine dedizierte Search-Query über alle Tabellen gelöst (UNION ALL oder separate Queries + Merge).

### 2. Separate Django Apps pro Content-Typ

**Entscheidung**: Jeder Content-Typ bekommt eine eigene Django App.

```
backend/
  content/          ← Abstract Base Classes (Content, ContentComment, etc.)
    models.py       ← Content (abstract), ContentComment, ContentEmotion, ContentView, ContentLink, EmbeddingFeedback, ApprovalLog
    base_schemas.py ← Pydantic Base Schemas
    base_api.py     ← Mixin/Helper für gemeinsame API-Endpunkte
    services/
      embedding_service.py  ← Text-Embedding-Pipeline
      approval_service.py   ← Approval-Workflow + E-Mail
      linking_service.py    ← ContentLink + Empfehlungen
      search_service.py     ← Globale Suche (ersetzt idea/services/search_service.py)
  session/          ← GroupSession (ehem. Idea type=idea)
    models.py, schemas.py, api.py, admin.py, choices.py
  blog/             ← Blog (ehem. Idea type=knowledge)
    models.py, schemas.py, api.py, admin.py, choices.py
  game/             ← Game (neu)
    models.py, schemas.py, api.py, admin.py, choices.py
  recipe/           ← Recipe (bestehend, refactored)
    models.py, schemas.py, api.py, admin.py, choices.py
  supply/           ← Supply Base + Material + Ingredient
    models.py       ← Supply (abstract), Material, Ingredient, Portion, Price, etc.
    schemas.py, api.py, admin.py
```

**Rationale**: Separate Apps ermöglichen unabhängige Entwicklung, klare Ownership und saubere Imports. Die `content` App enthält nur abstrakte Klassen und gemeinsame Services — keine eigenen DB-Tabellen (außer ContentLink, EmbeddingFeedback, ApprovalLog die über ContentType FK arbeiten).

### 3. ContentLink mit Django ContentType Framework

**Entscheidung**: `ContentLink` verwendet Django's `ContentType` Framework für polymorphe Verlinkungen.

```python
class ContentLink(models.Model):
    source_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='outgoing_links')
    source_object_id = models.PositiveIntegerField()
    target_content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE, related_name='incoming_links')
    target_object_id = models.PositiveIntegerField()
    link_type = models.CharField(choices=LinkType.choices)  # 'manual', 'embedding', 'ai_suggested'
    relevance_score = models.FloatField(null=True)  # Cosine similarity score
    is_rejected = models.BooleanField(default=False)  # Admin rejected this suggestion
    created_by = models.ForeignKey(User, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**Rationale**: ContentType ist Django's eingebautes Framework für polymorphe Beziehungen. Es ist stabil, gut getestet und ermöglicht Verlinkungen zwischen allen Content-Typen ohne N×N M2M-Tabellen.

### 4. Embedding-Strategie

**Entscheidung**: pgvector `VectorField(dimensions=768)` direkt im Abstract Model. Embedding-Generierung asynchron via Celery Task oder synchron im Save-Signal.

```python
class Content(models.Model):
    embedding = VectorField(dimensions=768, null=True, blank=True)
    embedding_updated_at = models.DateTimeField(null=True)
    
    class Meta:
        abstract = True
```

**Embedding-Pipeline**:
1. Content wird erstellt/aktualisiert
2. `post_save` Signal triggert Embedding-Update
3. Embedding wird aus `title + summary + description + tags` generiert (Gemini text-embedding-001)
4. Cosine-Similarity-Query über pgvector für Empfehlungen

**Cross-Table-Empfehlungen**: Da Abstract Models separate Tabellen haben, müssen Empfehlungen über alle Tabellen hinweg gesucht werden. Lösung: Bei Embedding-Update werden die Top-N ähnlichsten Items aus ALLEN Content-Tabellen via separate Queries + Merge ermittelt und als `ContentLink(link_type='embedding')` gespeichert. Batch-Job aktualisiert diese periodisch.

### 5. Supply-Hierarchie

**Entscheidung**: `Supply` als Abstract Model, `Material` und `Ingredient` als eigene Tabellen.

```python
class Supply(models.Model):
    name = models.CharField(max_length=255)
    slug = models.SlugField(unique=True)
    description = models.TextField(blank=True)
    image = models.ImageField(null=True, blank=True)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        abstract = True

class Material(Supply):
    """Tools and equipment: knife, cutting board, oven, paper, pens..."""
    material_category = models.CharField(choices=MaterialCategory.choices)
    is_consumable = models.BooleanField(default=False)
    purchase_links = models.JSONField(default=list)  # [{url, shop_name, price}]

class Ingredient(Supply):
    """Food ingredients with nutritional data, portions, prices..."""
    # Existing fields from idea.Ingredient
    is_standalone_food = models.BooleanField(default=False)
    # ... all nutritional fields, scores, etc.
```

**Zuordnung zu Content**:
```python
class ContentMaterialItem(models.Model):
    """Zuordnung Material → Content (GroupSession, Recipe)"""
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    material = models.ForeignKey(Material, on_delete=models.CASCADE)
    quantity = models.DecimalField()
    quantity_per_person = models.BooleanField(default=True)  # pro Person oder gesamt

class RecipeItem(models.Model):
    """Zuordnung Ingredient → Recipe (bestehend, refactored)"""
    recipe = models.ForeignKey(Recipe, on_delete=models.CASCADE)
    portion = models.ForeignKey(Portion, on_delete=models.CASCADE)
    quantity = models.DecimalField()
    # quantity ist immer pro NormPerson
```

### 6. Globale Suche über alle Content-Typen

**Entscheidung**: Union-basierte Suche über alle Content-Tabellen mit Tab-Filter.

```python
def unified_search(query: str, content_type: str | None, filters: dict) -> list[SearchResult]:
    """
    1. Fulltext-Suche (pg_trgm) in jeder Content-Tabelle
    2. Optional: Embedding-Suche (pgvector cosine distance)
    3. Ergebnisse mergen, nach Relevanz sortieren
    4. Optional: Nach content_type filtern (Tab-Filter)
    """
    results = []
    for model_class in [GroupSession, Blog, Game, Recipe]:
        if content_type and model_class._meta.label_lower != content_type:
            continue
        qs = model_class.objects.filter(status='approved', deleted_at__isnull=True)
        qs = qs.annotate(rank=SearchRank(...))
        results.extend(serialize_results(qs, model_class))
    return sorted(results, key=lambda r: r.score, reverse=True)
```

**Frontend Tab-Leiste**:
```
/search?q=feuer                    → Tab "Alle" aktiv
/search?q=feuer&type=session       → Tab "Ideen" aktiv
/search?q=feuer&type=recipe        → Tab "Rezepte" aktiv
/search?q=feuer&type=game          → Tab "Spiele" aktiv
/search?q=feuer&type=blog          → Tab "Blog" aktiv
```

### 7. Approval-Workflow

**Entscheidung**: Status-Feld im Content + ApprovalLog für Audit-Trail + E-Mail-Benachrichtigungen.

```python
class ContentStatus(models.TextChoices):
    DRAFT = 'draft', 'Entwurf'
    SUBMITTED = 'submitted', 'Eingereicht'
    APPROVED = 'approved', 'Genehmigt'
    REJECTED = 'rejected', 'Abgelehnt'
    ARCHIVED = 'archived', 'Archiviert'

class ApprovalLog(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    action = models.CharField(choices=[('submitted', ...), ('approved', ...), ('rejected', ...)])
    reviewer = models.ForeignKey(User, null=True)
    reason = models.TextField(blank=True)  # Begründung bei Ablehnung
    created_at = models.DateTimeField(auto_now_add=True)
```

**E-Mail-Flow**:
- `submitted` → E-Mail an alle Staff-User: "Neuer Content zur Freigabe: {title}"
- `approved` → E-Mail an Autor: "Dein Beitrag '{title}' wurde veröffentlicht!"
- `rejected` → E-Mail an Autor: "Dein Beitrag '{title}' wurde abgelehnt. Grund: {reason}"

### 8. Soft Delete Pattern

**Entscheidung**: `deleted_at` Timestamp + Custom Manager im Abstract Model.

```python
class SoftDeleteManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().filter(deleted_at__isnull=True)

class SoftDeleteModel(models.Model):
    deleted_at = models.DateTimeField(null=True, blank=True, db_index=True)
    
    objects = SoftDeleteManager()
    all_objects = models.Manager()
    
    def soft_delete(self):
        self.deleted_at = timezone.now()
        self.save(update_fields=['deleted_at'])
    
    def restore(self):
        self.deleted_at = None
        self.save(update_fields=['deleted_at'])
    
    class Meta:
        abstract = True
```

`Content` und `Supply` erben beide von `SoftDeleteModel`.

### 9. Mehrstufiger Stepper

**Entscheidung**: Universeller Stepper mit Content-Typ-spezifischen Schritten.

**Gemeinsame Schritte (alle Content-Typen)**:
1. **Basis**: Titel + Untertyp + KI/Manuell-Auswahl
2. **KI-Import** (optional): Großes Textfeld für unstrukturierten Text → Gemini parsed → Felder vorbefüllt
3. **Beschreibung**: Summary, Description (Markdown), Schwierigkeit, Dauer, Kosten
4. **Tags & Stufen**: Tag-Auswahl + KI-Tag-Vorschläge, Scout-Level-Auswahl
5. **Titelbild**: Upload oder KI-Generierung

**Typ-spezifische Schritte**:
- **GroupSession**: Schritt 3b: Material-Zuordnung (Supply-Suche → MaterialItem)
- **Recipe**: Schritt 3b: Zutaten-Zuordnung (Supply-Suche → RecipeItem), Schritt 3c: Küchengeräte (Material-Zuordnung)
- **Game**: Schritt 3b: Spieleranzahl, Spielfläche, Spielregeln
- **Blog**: Schritt 3b: Lesezeit (auto-berechnet), Inhaltsverzeichnis-Toggle

**Inline-Bearbeitung** (Detail-Ansicht):
- Jede Sektion hat einen Stift-Button (nur für Autor/Admin sichtbar)
- Klick öffnet Dialog oder Inline-Editor
- Jeder Editor hat "KI-Vorschlag" Button
- Save → PATCH API → Invalidate TanStack Query Cache

### 10. Event-Tagesplan

**Entscheidung**: Neues `EventDaySlot` Model in der `event` App.

```python
class EventDaySlot(models.Model):
    event = models.ForeignKey(Event, on_delete=models.CASCADE, related_name='day_slots')
    date = models.DateField()
    start_time = models.TimeField()
    end_time = models.TimeField()
    title = models.CharField(max_length=255, blank=True)
    notes = models.TextField(blank=True)
    # Polymorphe Content-Zuordnung
    content_type = models.ForeignKey(ContentType, null=True, on_delete=models.SET_NULL)
    object_id = models.PositiveIntegerField(null=True)
    sort_order = models.PositiveIntegerField(default=0)
```

### 11. Frontend-Architektur (Feature-basierte Struktur)

**Entscheidung**: Migration zu feature-basierter Ordnerstruktur.

```
frontend/src/
  features/
    content/              ← Shared Content components
      components/
        ContentStepper.tsx
        InlineEditor.tsx
        ContentLinkSection.tsx
        ContentEmotions.tsx
        ContentComments.tsx
        ContentCard.tsx       ← Generische Card für alle Typen
      hooks/
        useContentLinks.ts
        useContentEmotions.ts
        useContentComments.ts
      schemas/
        content.ts            ← Base Zod Schema
    session/
      components/
        SessionDetailPage.tsx
        SessionCard.tsx
      hooks/
        useSessions.ts
      schemas/
        session.ts
    blog/
      components/, hooks/, schemas/
    game/
      components/, hooks/, schemas/
    recipe/
      components/, hooks/, schemas/ (refactored)
    supply/
      components/
        SupplySearch.tsx      ← Universelle Supply-Suche
        MaterialDetailPage.tsx
        IngredientDetailPage.tsx
      hooks/, schemas/
    search/
      components/
        UnifiedSearchPage.tsx
        SearchTabs.tsx
      hooks/, schemas/
    admin/
      components/
        ApprovalQueue.tsx
        EmbeddingViewer.tsx
        EmbeddingFeedback.tsx
      hooks/
    events/
      components/
        EventDayPlan.tsx
      hooks/
```

## Risks / Trade-offs

### [Performance] Globale Suche über 4+ Tabellen
Die globale Suche muss 4 separate Tabellen abfragen und Ergebnisse mergen.
→ **Mitigation**: Separate Queries parallelisieren (async), Ergebnisse nach Relevanz-Score sortieren. Bei <10k Einträgen pro Tabelle ist dies kein Problem. Langfristig: Materialized View oder Search-Index-Tabelle.

### [Komplexität] Abstract Model = duplizierte Spalten
Jede Content-Tabelle hat ~30 identische Spalten.
→ **Mitigation**: Bei einem Schema-Change muss nur das Abstract Model geändert werden; `makemigrations` generiert Migrations für alle Apps automatisch. Trade-off akzeptabel für bessere Query-Performance.

### [Migration] Bestehende Idea-Daten müssen aufgeteilt werden
Ideas mit `idea_type=idea` → GroupSession, `idea_type=knowledge` → Blog.
→ **Mitigation**: Da das Projekt keine Produktionsdaten hat (nur Seed-Daten), kann die Migration destructive sein. Seed-Commands werden aktualisiert.

### [ContentType-Overhead] ContentLink und verwandte Models nutzen GenericForeignKey
GenericForeignKey hat schlechtere Query-Performance als direkte FKs.
→ **Mitigation**: ContentLink wird hauptsächlich zum Speichern/Abrufen von Empfehlungen verwendet, nicht für hochfrequente Queries. Indices auf (content_type, object_id) Paaren. Pre-computed Links statt Live-Berechnung.

### [E-Mail-Delivery] Approval-E-Mails müssen zuverlässig ankommen
→ **Mitigation**: Django's `send_mail` mit SMTP-Backend (Gmail/SendGrid). Für die Entwicklungsphase `console.EmailBackend`. Später Upgrade zu einem dedizierten E-Mail-Service.

### [Embedding-Kosten] Gemini-API-Calls bei jedem Content-Update
→ **Mitigation**: Embeddings nur bei signifikanten Textänderungen neu generieren (Hash-Check). Batch-Processing für initiale Embedding-Generierung. Rate-Limiting und Retry-Logik.

### 12. Tag & ScoutLevel Migration (Confirmed Decision)

**Entscheidung**: Tag, ScoutLevel, TagSuggestion, SearchLog werden von `idea` App nach `content` App verschoben.

**Rationale**: Diese Models werden von ALLEN Content-Typen gebraucht. In der `idea` App zu belassen würde zu Circular Dependencies führen, da `session`, `blog`, `game`, `recipe` alle auf Tags/ScoutLevels referenzieren.

**Betroffene Models**:
- `Tag` → `content.Tag` (mit M2M zu allen Content-Typen via Abstract Model)
- `ScoutLevel` → `content.ScoutLevel`
- `TagSuggestion` → `content.TagSuggestion`
- `SearchLog` → `content.SearchLog`
- `IdeaOfTheWeek` → `content.FeaturedContent` (generalisiert, siehe Decision 13)

### 13. IdeaOfTheWeek → FeaturedContent (Confirmed Decision)

**Entscheidung**: `IdeaOfTheWeek` wird zu `FeaturedContent` generalisiert mit ContentType FK.

```python
class FeaturedContent(models.Model):
    content_type = models.ForeignKey(ContentType, on_delete=models.CASCADE)
    object_id = models.PositiveIntegerField()
    featured_from = models.DateField()
    featured_until = models.DateField()
    reason = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
```

**Rationale**: Kann jetzt jedes Content-Stück featuren (GroupSession, Recipe, Game, Blog). Ersetzt das alte "Idee der Woche" Konzept.

### 14. is_public entfernt (Confirmed Decision)

**Entscheidung**: Das `is_public` Feld aus `TimeStampMixin` wird NICHT in das neue `Content` Abstract Model übernommen.

**Rationale**: `status=approved` ersetzt die Sichtbarkeitssteuerung. `is_public` war redundant. Vereinfacht das Datenmodell und vermeidet doppelte Logik ("ist der Content approved UND public?").

### 15. MaterialName → Material (Confirmed Decision)

**Entscheidung**: Das bestehende `MaterialName` Model (einfaches name+slug) wird durch das neue `Material` Model in der `supply` App ersetzt. Keine Datenmigration nötig — nur neue Seed-Daten.

### 16. Service-Verteilung (Confirmed Decision)

**Entscheidung**: Services werden nach Domain auf Apps verteilt:

| App | Services | Quelle |
|-----|----------|--------|
| `content/services/` | ai_service, search_service, view_service, embedding_service, approval_service, email_service, linking_service | Aus `idea/services/` migriert + neu |
| `supply/services/` | nutri_service, price_service, norm_person_service, ingredient_ai_service | Aus `idea/services/` migriert |
| `recipe/services/` | recipe_checks, hint_service | Bestehend in `recipe/` |
| `session/services/` | export_service (Instagram-Slides) | Aus `idea/services/` migriert |
| `planner/services/` | shopping_service | Bestehend in `planner/` |

**Hinweis**: `ai_service.py` und `ingredient_ai_service.py` nutzen verschiedene Gemini-Modelle (3.1-flash-lite vs 2.5-flash). Diese Unterscheidung bleibt erhalten.

## Migration Plan (Vertical Slices)

Da das Projekt in aktiver Entwicklung ist und keine Produktionsdaten existiert, ist eine clean Migration möglich. **Implementierungsstrategie: Vertical Slices** — jeder Slice liefert ein funktionierendes E2E-Feature.

### Slice 1: Infrastruktur
1. Django Apps erstellen: `content`, `session`, `blog`, `game`, `supply`
2. Abstract Models: `SoftDeleteModel`, `Content`, `Supply`
3. Tag, ScoutLevel, TagSuggestion, SearchLog → `content` App migrieren
4. FeaturedContent Model in `content` App
5. ContentComment, ContentEmotion, ContentView, ContentLink, ApprovalLog, EmbeddingFeedback
6. Registrierung in INSTALLED_APPS

### Slice 2: GroupSession E2E
7. GroupSession Model + Migrations
8. Material Model + ContentMaterialItem in `supply` App
9. GroupSession Pydantic Schemas + API-Endpunkte
10. GroupSession Admin
11. GroupSession Zod Schema + TanStack Query Hooks
12. GroupSession Detail + List Pages (Frontend)

### Slice 3: Blog E2E
13. Blog Model + Migrations
14. Blog Schemas + API
15. Blog Admin
16. Blog Zod + Hooks + Pages

### Slice 4: Game E2E
17. Game Model + Migrations
18. Game Schemas + API
19. Game Admin
20. Game Zod + Hooks + Pages

### Slice 5: Recipe Refactor
21. Recipe Model refactored (inherits Content, drops duplicated fields)
22. Ingredient → supply App
23. RecipeItem refactored (FK zu supply.Ingredient/Portion)
24. Recipe Schemas/API/Admin updated
25. Recipe Frontend updated

### Slice 6: Globale Suche + Content Linking
26. Unified search_service (über alle 4 Tabellen)
27. Search API + Frontend SearchTabs
28. ContentLink Service (Embedding-basierte Empfehlungen)
29. ContentLinkSection Frontend-Komponente

### Slice 7: Content Stepper + Inline-Editing
30. ContentStepper Komponente
31. InlineEditor Komponente
32. Create-Pages für alle 4 Content-Typen
33. Inline-Editing in Detail-Pages

### Slice 8: Admin + Embeddings
34. Embedding Service + VectorField Migration
35. Approval Service + E-Mail
36. Admin-Pages (Approval Queue, Embedding Viewer)

### Slice 9: Event Day Plan
37. EventDaySlot Model + API
38. Event Day Plan Frontend

### Slice 10: Cleanup
39. Alte `idea` App entfernen
40. Seed-Commands aktualisieren
41. AGENTS.md Dateien aktualisieren
42. Planner + Packinglist Referenzen aktualisieren
43. Full Test Suite + Verification

### Rollback-Strategie
Nicht nötig — keine Produktionsdaten. Bei Problemen: Git Revert.

## Open Questions

1. **Celery für Embeddings?** — Soll Embedding-Generierung asynchron via Celery/Task-Queue laufen, oder synchron im API-Request (mit Loading-Spinner)? Empfehlung: Synchron für jetzt, Celery später wenn Performance-Probleme auftreten.

2. **ContentLink Batch-Update-Frequenz** — Wie oft sollen Embedding-basierte Empfehlungen neu berechnet werden? Optionen: Bei jedem Save, stündlich, täglich. Empfehlung: Bei jedem Save für den geänderten Content, täglich für den vollständigen Refresh.

3. **Supply-Suche: Fuzzy Matching** — Soll die Supply-Suche beim Content-Erstellen auch Tippfehler erkennen (pg_trgm)? Empfehlung: Ja, mit similarity threshold 0.3.

4. **Blog: Markdown-TOC** — Soll das Inhaltsverzeichnis für Blogs automatisch aus Markdown-Headings generiert werden (Frontend) oder serverseitig gespeichert? Empfehlung: Frontend-seitig aus den Headings generieren.
