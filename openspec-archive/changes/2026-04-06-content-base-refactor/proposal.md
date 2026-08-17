## Why

Das aktuelle Datenmodell hat strukturelle Schwächen: `Idea` (idea App) und `Recipe` (recipe App) teilen viele Felder, aber ohne gemeinsame Basis. Kommentare, Emotionen, Views und Tags sind jeweils dupliziert (`Comment`/`RecipeComment`, `Emotion`/`RecipeEmotion`, etc.). `TimeStampMixin` existiert doppelt. Die Suche unterstützt nur Ideas und Recipes getrennt. Neue Content-Typen (Games, Blogs) erfordern erneute Duplizierung aller Querschnittsfunktionen. Es gibt kein einheitliches Verlinkungssystem zwischen Content-Typen, kein Soft Delete, keinen Approval-Workflow und keine konsistenten Embeddings für semantische Empfehlungen.

Dieses Refactoring löst all diese Probleme durch eine abstrakte Basisklasse `Content`, die als Single Source of Truth für alle Content-Typen dient. Gleichzeitig wird `Supply` als abstrakte Basis für Material und Ingredients eingeführt, was Packlisten, Rezepte und GroupSessions auf die gleiche Datenquelle zugreifen lässt.

## What Changes

### Neue abstrakte Basisklasse `Content` (Abstract Model)
- **BREAKING**: `Idea` Model wird aufgelöst. Felder werden in abstrakte Klasse `Content` verschoben
- **BREAKING**: `Recipe` Model erbt von `Content` statt eigenständig zu sein
- Neue concrete Models erben von `Content`: `GroupSession`, `Blog`, `Game`, `Recipe`
- Jeder Content-Typ hat eigene Untertypen (TextChoices)
- Gemeinsame Felder in `Content`: title, slug, summary, description (Markdown), difficulty, costs_rating, execution_time, preparation_time, status, image, embedding (pgvector 768-dim), view_count, like_score, authors (M2M), tags (M2M), scout_levels (M2M), created_at, updated_at, deleted_at (Soft Delete)

### Neue abstrakte Basisklasse `Supply` (Abstract Model)
- **BREAKING**: `MaterialItem` und `Ingredient`-Zuordnung werden vereinheitlicht
- `Supply` als abstrakte Basis mit: name, slug, description, image, purchase_links, deleted_at
- `Material` (Werkzeuge, Ausrüstung): Schneidebrett, Messer, Ofen, Stifte, Papier etc.
- `Ingredient` (Lebensmittel): bleibt wie bisher mit Nährwerten, Portions, Preisen, Nutri-Score
- Beide haben eigene Detail-Seiten mit "Wo wird das verwendet"-Sektion und Kauflinks
- Packlisten greifen auf die gleiche Supply-Datenquelle zu

### Generisches Content-Linking-System
- Neues `ContentLink` Model (source_type, source_id, target_type, target_id, link_type, sort_order)
- Embedding-basierte automatische Empfehlungen ("Passende Spiele", "Passende Rezepte")
- Manuelle Verlinkungen durch Autoren und Admins
- Admin-Oberfläche zur Qualitätsprüfung: nicht-passende Empfehlungen markieren und speichern

### Einheitliches Bewertungssystem (Emotions)
- **BREAKING**: `RecipeEmotion` wird durch generisches `ContentEmotion` ersetzt
- Emotion-Reaktionen (love, happy, disappointed, complex) für alle Content-Typen
- `ContentComment` ersetzt `Comment` und `RecipeComment`
- `ContentView` ersetzt `IdeaView` und `RecipeView`

### Text-Embeddings für alle Content-Typen
- pgvector VectorField(768) in `Content`-Basisklasse
- Automatische Embedding-Generierung bei Erstellung/Update (Gemini text-embedding-001)
- Cosine-Similarity-basierte Empfehlungen zwischen allen Content-Typen
- Admin-Oberfläche: Embeddings anzeigen, nach Ähnlichkeit filtern/sortieren, Qualität prüfen
- `EmbeddingFeedback` Model: nicht-passende Empfehlungen speichern, in Admin anzeigen

### Approval-Workflow mit E-Mail-Benachrichtigungen
- Status-Flow: `draft` → `submitted` → `approved` / `rejected`
- Nur `approved` Content erscheint in der globalen Suche
- E-Mail an Admins bei neuer Freigabe-Anfrage
- E-Mail an Ersteller bei Veröffentlichung oder Ablehnung (mit Begründung)
- Admin-Queue für ausstehende Freigaben

### Soft Delete für alle Models
- `deleted_at` (nullable DateTimeField) in `Content` und `Supply` Basisklassen
- Custom Manager: `objects` filtert gelöschte automatisch aus, `all_objects` zeigt alles
- Kaskade: Soft-Delete eines Contents soft-deleted auch verknüpfte Daten

### Mehrstufiger Stepper für Content-Erstellung
- Einheitlicher Creation-Flow für alle Content-Typen
- Schritt 1: Titel + Auswahl KI-Erstellung oder Manuell
- KI-Erstellung: Großes Textfeld für unstrukturierten Text, schrittweise Umwandlung
- Manuelle Erstellung: Schritt-für-Schritt durch alle Felder
- Jeder Schritt hat optionale KI-Ausfüllhilfe
- KI kann neue Tags vorschlagen
- Material/Zutaten: Suche in Supply-Datenbank, Vorschlag neuen Datenpunkt anzulegen
- Mengen immer pro Person (Material) bzw. pro NormPerson (Zutaten)
- Titel ist einziges Pflichtfeld bei Erstellung; weitere Pflichtfelder erst bei Approval
- Autorbild wird immer gespeichert

### Inline-Bearbeitung in Detail-Ansicht
- **BREAKING**: Bearbeitung nicht mehr über Stepper
- Editorstifte je Sektion in der Detailansicht
- Dialog oder Inline-Editing mit KI-Vorschlags-Option
- KI kann für jedes Feld Verbesserungen vorschlagen

### Titelbilder generieren
- KI-Bildgenerierung (Gemini) für alle Content-Typen
- Verfügbar in Erstellung und Bearbeitung
- Konsistenter Stil über alle Content-Typen

### Event-Tagesplan
- Neue `EventDayPlan` Sektion in Events
- Zeitslot-basierter Plan (Tag + Zeitslots)
- Games und GroupSessions können Zeitslots zugewiesen werden
- MealPlan-Integration für Rezepte (besteht bereits)

### Globale Suche über alle Content-Typen
- **BREAKING**: Suchindex wird für alle Content-Typen vereinheitlicht
- Tab-Leiste oben: "Alle | Ideen | Rezepte | Spiele | Blog"
- Hybrid-Suche: Fulltext + pgvector + Filter
- `is_standalone_food` Flag bei Ingredients: rohverzehrbare Zutaten erscheinen in Rezept-Suche

### Separate Django Apps pro Content-Typ
- **BREAKING**: `idea` App wird zu `content` App (Basisklasse + gemeinsame Models)
- Neue Apps: `session` (GroupSession), `blog` (Blog), `game` (Game)
- `recipe` App bleibt, erbt aber von `Content`
- `supply` App (neu): Material + Ingredient Basisklasse und gemeinsame Supply-Logik
- Ingredients und Portions bleiben in `supply` App

### Content-Typ Untertypen

**GroupSession** (session App):
- `scout_skills` (Pfadfindertechnik), `navigation` (Orientierung), `nature_study` (Naturkunde), `crafts` (Basteln), `active_games` (Geländespiele), `outdoor_cooking` (Lagerküche), `first_aid` (Erste Hilfe), `community` (Soziales), `campfire_culture` (Musisches), `exploration` (Forschung)

**Recipe** (recipe App):
- `breakfast` (Frühstück), `lunch` (Mittagessen), `dinner` (Abendessen), `snack` (Snack), `drink` (Getränk)

**Game** (game App):
- `field_game` (Geländespiel), `group_game` (Gruppenspiel), `icebreaker` (Kennenlernspiel), `cooperation` (Kooperationsspiel), `night_game` (Nachtspiel), `board_game` (Brettspiel/Kartenspiel), `running_game` (Laufspiel), `skill_game` (Geschicklichkeitsspiel)

**Blog** (blog App):
- `tutorial` (Tutorial), `guide` (Ratgeber), `experience` (Erfahrungsbericht), `background` (Hintergrundwissen), `methodology` (Methodik), `legal` (Recht & Versicherung)

## Capabilities

### New Capabilities
- `content-base`: Abstrakte Content-Basisklasse, Content-Typ-Registry, gemeinsame Felder, Soft Delete, Approval-Workflow, Autoren-Verwaltung
- `content-linking`: Generisches ContentLink-Model, Embedding-basierte Empfehlungen, manuelles Linking, Qualitätsprüfung
- `content-embeddings`: Text-Embedding-Pipeline für alle Content-Typen, pgvector-Storage, Admin-UI für Embedding-Qualität, EmbeddingFeedback
- `content-search`: Vereinheitlichte globale Suche über alle Content-Typen, Tab-Filter, Hybrid-Suche (Fulltext + pgvector)
- `content-stepper`: Mehrstufiger Erstellungs-Wizard mit KI-Unterstützung, Inline-Bearbeitung mit Editorstiften
- `content-approval`: Status-Queue (draft/submitted/approved/rejected), E-Mail-Benachrichtigungen, Admin-Queue
- `supply-base`: Abstrakte Supply-Basisklasse, Material und Ingredient als Unterklassen, gemeinsame Detail-Seiten, Kauflinks, "Wo verwendet"-Sektion
- `group-session`: GroupSession Content-Typ mit Untertypen, Material-Zuordnung, Supply-Integration
- `blog-content`: Blog Content-Typ mit Untertypen, bewährte Blog-Patterns (Lesezeit, Inhaltsverzeichnis, Related Posts)
- `game-content`: Game Content-Typ mit Untertypen, Spieleranzahl, Spielfläche, Spielregeln
- `event-day-plan`: Zeitslot-basierter Tagesplan in Events, Content-Zuweisung (Games, Sessions), MealPlan-Integration

### Modified Capabilities
- `recipe`: Recipe erbt von Content-Basisklasse, RecipeItem verweist auf Supply/Ingredient, Material-Sektion für Küchengeräte
- `search`: Suche wird auf alle Content-Typen erweitert, Tab-Leiste statt nur Ideas+Recipes, is_standalone_food Flag
- `idea-management`: **BREAKING** — wird aufgelöst zugunsten content-base + group-session + blog-content
- `comments-emotions`: Generische ContentComment und ContentEmotion statt typ-spezifischer Models
- `admin`: Embedding-Viewer, Approval-Queue, EmbeddingFeedback-Ansicht, Supply-Verwaltung
- `packing-list`: PackingItem verweist optional auf Supply (Material/Ingredient) statt nur Freitext
- `meal-plan`: MealItem verweist weiterhin auf Recipe, aber EventDayPlan kann auch Games/Sessions enthalten
- `ingredient-database`: Ingredient wird Unterklasse von Supply, is_standalone_food Flag, Kauflinks
- `ai-features`: KI-Ausfüllhilfe pro Feld im Stepper, KI-Bildgenerierung für alle Content-Typen, Tag-Vorschläge, Supply-Vorschläge
- `event-management`: Neue EventDayPlan-Sektion mit Zeitslots

## Impact

### Backend (Django)
- **Neue Apps**: `content` (Basisklasse), `session`, `blog`, `game`, `supply`
- **Migrierte Apps**: `idea` (wird zu `content`), `recipe` (erbt von Content)
- **Geänderte Apps**: `event` (EventDayPlan), `planner` (PlannerEntry → GroupSession), `packinglist` (Supply-FK), `core` (Search-Service), `profiles` (unverändert)
- **Neue Models**: Content (abstract), GroupSession, Blog, Game, ContentComment, ContentEmotion, ContentView, ContentLink, EmbeddingFeedback, Supply (abstract), Material, EventDaySlot, ApprovalLog
- **Gelöschte Models**: Idea, Comment, Emotion, IdeaView, RecipeComment, RecipeEmotion, RecipeView, MaterialItem, TagSuggestion (in ContentLink integriert)
- **Migrations**: Datenmigration von Idea → GroupSession/Blog, Recipe-Felder vereinheitlichen, MaterialItem → Material-Supply-Zuordnung
- **Pydantic Schemas**: Komplett neue Schema-Hierarchie (ContentBaseOut, GroupSessionOut, BlogOut, GameOut, RecipeOut, SupplyOut, MaterialOut, IngredientOut)

### Frontend (React)
- **Neue Zod Schemas**: content.ts, groupSession.ts, blog.ts, game.ts, supply.ts, material.ts, contentLink.ts
- **Neue Pages**: GameListPage, GameDetailPage, BlogListPage, BlogDetailPage, MaterialListPage, MaterialDetailPage, SupplyDetailPage
- **Geänderte Pages**: SearchPage (Tab-Leiste), IdeaPage → GroupSessionDetailPage, NewIdeaPage → ContentStepperPage, AdminPage (Embedding-Viewer, Approval-Queue)
- **Neue Komponenten**: ContentStepper, InlineEditor, ContentLinkSection, EmbeddingViewer, ApprovalQueue, EventDayPlan, SupplySearch
- **Geänderte Hooks**: ideas.ts → groupSessions.ts, neue Hooks für jeden Content-Typ

### API-Endpunkte
- **Neue**: `/api/sessions/`, `/api/blogs/`, `/api/games/`, `/api/materials/`, `/api/supplies/`, `/api/content-links/`, `/api/content/{id}/emotions/`, `/api/content/{id}/comments/`, `/api/admin/approvals/`, `/api/admin/embeddings/`
- **Geänderte**: `/api/ideas/` → `/api/sessions/`, `/api/search/` (alle Content-Typen), `/api/events/{id}/day-plan/`
- **Entfernte**: `/api/ideas/` (ersetzt durch `/api/sessions/`), separate Comment/Emotion-Endpunkte pro Typ

### Dependencies
- `pgvector` (bereits vorhanden, aber BinaryField → VectorField Migration)
- `django.core.mail` für Approval-E-Mails
- Keine neuen externen Dependencies nötig

### Datenbank
- Neue Tabellen: content_groupsession, content_blog, content_game, content_contentcomment, content_contentemotion, content_contentview, content_contentlink, content_embeddingfeedback, supply_material, event_eventdayslot, content_approvallog
- Migrierte Tabellen: idea_idea → content_groupsession + content_blog (Datenmigration), recipe_recipe (Feld-Mapping)
- Geänderte Tabellen: packinglist_packingitem (Supply-FK), planner_plannerentry (GroupSession-FK statt Idea-FK)
