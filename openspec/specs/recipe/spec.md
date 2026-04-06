# recipe Specification

## Purpose

Eigenstaendiges Rezept-Modul der Inspi-Plattform. Rezepte waren urspruenglich ein Typ der Idea (`idea_type=recipe`), sind aber nun ein vollstaendig separates Model mit eigenem Django-App, eigener API und eigenen Schemas. Die Datenstruktur basiert auf dem Idea-Model (gleiche Basis-Felder), ist aber unabhaengig. Rezepte verwalten Zutaten, Naehrwerte, Nutri-Score und regelbasierte Verbesserungsvorschlaege.

## Context

- **Django App**: `recipe`
- **API**: `/api/recipes/`
- **Frontend-Routen**: `/recipes`, `/recipes/:slug` (geplant)
- **Datenstruktur**: Recipe -> RecipeItem -> Ingredient/Portion (Cross-App FK zu `idea` App)
- **Abhaengigkeiten**: Nutzt `idea.Ingredient`, `idea.Portion`, `idea.MeasuringUnit`, `idea.NutritionalTag`, `idea.ScoutLevel`, `idea.Tag` per Cross-App ForeignKey

## Requirements

### Requirement: Recipe CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Rezepte ueber `/api/recipes/` bereitstellen.

#### Scenario: Rezept erstellen (authentifiziert)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer ein gueltiges Rezept per POST `/api/recipes/` einreicht
- THEN wird das Rezept mit Status "draft" erstellt
- AND der Benutzer wird als Autor gesetzt
- AND ein URL-sicherer Slug wird aus dem Titel generiert (via `slugify`, kein Unicode)
- AND bei Slug-Konflikten wird ein numerisches Suffix angehaengt (`-1`, `-2`, etc.)

#### Scenario: Rezept erstellen (nicht authentifiziert)

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer versucht ein Rezept per POST `/api/recipes/` zu erstellen
- THEN gibt das System HTTP 403 Forbidden zurueck

#### Scenario: Rezept per Slug abrufen

- GIVEN ein veroeffentlichtes Rezept mit Slug "kartoffelsuppe"
- WHEN ein beliebiger Benutzer GET `/api/recipes/by-slug/kartoffelsuppe/` aufruft
- THEN werden die vollstaendigen Rezept-Details zurueckgegeben inkl. Tags, Zutaten, Stufen und Autor-Info

#### Scenario: Rezept per ID abrufen

- GIVEN ein veroeffentlichtes Rezept
- WHEN ein beliebiger Benutzer GET `/api/recipes/{id}/` aufruft
- THEN werden die vollstaendigen Rezept-Details zurueckgegeben

#### Scenario: Rezept aktualisieren (nur Autor/Admin)

- GIVEN ein authentifizierter Benutzer, der Autor eines Rezepts ist
- WHEN der Benutzer PATCH `/api/recipes/{id}/` mit partiellen Daten einreicht
- THEN wird das Rezept mit den neuen Daten aktualisiert

#### Scenario: Rezept loeschen (nur Autor/Admin)

- GIVEN ein authentifizierter Benutzer, der Autor eines Rezepts ist
- WHEN der Benutzer DELETE `/api/recipes/{id}/` aufruft
- THEN wird das Rezept aus dem System entfernt

#### Scenario: Unbefugter Bearbeitungsversuch

- GIVEN ein authentifizierter Benutzer, der NICHT der Autor eines Rezepts ist
- WHEN der Benutzer versucht das Rezept zu aendern oder zu loeschen
- THEN gibt das System HTTP 403 Forbidden zurueck

### Requirement: Rezept-Auflistung mit Paginierung

Das System MUST paginierte Rezept-Listen fuer den Listen-Endpunkt zurueckgeben. Standard: `page=1`, `page_size=20`.

#### Scenario: Standard-paginierte Auflistung

- GIVEN veroeffentlichte Rezepte existieren im System
- WHEN ein Benutzer GET `/api/recipes/?page=1&page_size=20` aufruft
- THEN enthaelt die Antwort `{ items, total, page, page_size, total_pages }`
- AND nur veroeffentlichte Rezepte werden fuer Nicht-Admins angezeigt
- AND Admins sehen alle Rezepte

#### Scenario: Gefilterte Auflistung

- GIVEN veroeffentlichte Rezepte mit verschiedenen Tags und Rezepttypen
- WHEN ein Benutzer Filter-Parameter verwendet (z.B. `?recipe_type=warm_meal&difficulty=easy`)
- THEN werden nur passende Rezepte zurueckgegeben
- AND die Antwort ist paginiert

#### Scenario: Sortierung

- GIVEN veroeffentlichte Rezepte
- WHEN ein Benutzer `?sort=newest|oldest|most_liked|most_viewed|random` verwendet
- THEN werden die Rezepte entsprechend sortiert

### Requirement: Recipe Model (Datenstruktur)

Das Recipe Model teilt die Basis-Felder mit dem Idea Model, ist aber ein eigenstaendiges Model in der `recipe` Django App.

#### Scenario: Basis-Felder (von Idea uebernommen)

- GIVEN ein Recipe-Datensatz
- THEN hat er folgende Basis-Felder:
  - `title` (CharField, max 255, required)
  - `slug` (SlugField, max 280, unique, auto-generiert)
  - `summary` (TextField, optional)
  - `summary_long` (TextField, optional)
  - `description` (TextField, Markdown-Format)
  - `costs_rating` (CharField, TextChoices: free, less_1, 1_2, more_2)
  - `execution_time` (CharField, TextChoices: less_30, 30_60, 60_90, more_90)
  - `preparation_time` (CharField, TextChoices: none, less_15, 15_30, 30_60, more_60)
  - `difficulty` (CharField, TextChoices: easy, medium, hard)
  - `status` (CharField, TextChoices: draft, published, review, archived)
  - `image` (ImageField, upload_to="recipes/")
  - `like_score` (IntegerField, default 0)
  - `view_count` (IntegerField, default 0)
  - `search_vector` (SearchVectorField, Fulltext-Index)
  - `embedding` (BinaryField, fuer Similarity-Suche)

#### Scenario: Rezept-spezifische Felder

- GIVEN ein Recipe-Datensatz
- THEN hat er zusaetzlich:
  - `recipe_type` (CharField, TextChoices: warm_meal, cold_meal, snack, breakfast, dessert, drink, soup, salad, baking, other)
  - `servings` (IntegerField, default 4, Anzahl der Portionen)

#### Scenario: Relationen

- GIVEN ein Recipe-Datensatz
- THEN hat er folgende Relationen:
  - `scout_levels` (M2M zu `idea.ScoutLevel`, related_name `recipes`)
  - `tags` (M2M zu `idea.Tag`, related_name `recipes`)
  - `authors` (M2M zu User, related_name `authored_recipes`)
  - `nutritional_tags` (M2M zu `idea.NutritionalTag`, related_name `recipes`)
  - `created_by` / `updated_by` (FK zu User, via TimeStampMixin)

### Requirement: RecipeItem (Zutaten-Verwaltung)

Das System SHALL Zutatenlisten fuer Rezepte ueber RecipeItem-Datensaetze verwalten.

#### Scenario: Zutat zu Rezept hinzufuegen

- GIVEN ein Rezept
- WHEN der Autor POST `/api/recipes/{id}/recipe-items/` aufruft
- THEN wird ein RecipeItem erstellt mit:
  - `recipe` (FK zu Recipe, related_name `recipe_items`)
  - `ingredient` (FK zu `idea.Ingredient`, nullable)
  - `portion` (FK zu `idea.Portion`, nullable)
  - `quantity` (FloatField, default 1)
  - `measuring_unit` (FK zu `idea.MeasuringUnit`, nullable)
  - `sort_order` (IntegerField, default 0)
  - `note` (CharField, z.B. "gehackt", "optional")
  - `quantity_type` (CharField: `once` | `per_person`)

#### Scenario: Zutat aktualisieren

- GIVEN ein bestehendes RecipeItem
- WHEN der Autor PATCH `/api/recipes/{id}/recipe-items/{item_id}/` aufruft
- THEN wird das RecipeItem mit den neuen Daten aktualisiert

#### Scenario: Zutat entfernen

- GIVEN ein bestehendes RecipeItem
- WHEN der Autor DELETE `/api/recipes/{id}/recipe-items/{item_id}/` aufruft
- THEN wird das RecipeItem entfernt

#### Scenario: Zutaten auflisten

- GIVEN ein Rezept mit Zutaten
- WHEN GET `/api/recipes/{id}/recipe-items/` aufgerufen wird
- THEN werden alle RecipeItems sortiert nach `sort_order` zurueckgegeben

### Requirement: RecipeHint (Regelbasierte Verbesserungsvorschlaege)

Das System SHALL regelbasierte Rezept-Hinweise ueber RecipeHint-Datensaetze bereitstellen.

#### Scenario: RecipeHint-Felder

- GIVEN ein RecipeHint-Datensatz
- THEN hat er die Felder:
  - `name` (CharField)
  - `description` (TextField)
  - `parameter` (CharField, TextChoices: energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g)
  - `min_value` / `max_value` (FloatField, nullable)
  - `min_max` (CharField: min, max, range)
  - `hint_level` (CharField: info, warning, error)
  - `recipe_type` (CharField, optional, filtert nach Rezepttyp)
  - `recipe_objective` (CharField: health, taste, cost, fulfillment)

#### Scenario: Rezept-Hinweise abrufen

- GIVEN ein Rezept mit Zutaten
- WHEN GET `/api/recipes/{id}/recipe-hints/?recipe_objective=health` aufgerufen wird
- THEN werden alle zutreffenden RecipeHint-Regeln gegen die aggregierten Naehrwerte des Rezepts geprueft
- AND nur Hinweise, deren Schwellenwerte ueber- oder unterschritten werden, werden zurueckgegeben

### Requirement: Rezept-Checks (4-Dimensionen-Bewertung)

Das System SHALL eine 4-dimensionale Bewertung fuer Rezepte bereitstellen.

#### Scenario: Rezept-Checks abrufen

- GIVEN ein Rezept mit Zutaten
- WHEN GET `/api/recipes/{id}/recipe-checks/` aufgerufen wird
- THEN werden 4 Bewertungen zurueckgegeben:
  1. **Saettigung** (Energie vs. Zielwert ~2500 kJ pro Mahlzeit)
  2. **Preis** (geschaetzte Kosten aus Zutatpreisen)
  3. **Gesundheit** (Nutri-Score basiert)
  4. **Geschmack** (Platzhalter)
- AND jede Bewertung hat: `label`, `value`, `color` (green/orange/red/gray), `score`

### Requirement: Nutri-Score

Das System SHALL den Nutri-Score fuer Rezepte berechnen koennen.

#### Scenario: Nutri-Score abrufen

- GIVEN ein Rezept mit Zutaten, deren Zutaten Naehrwertdaten haben
- WHEN GET `/api/recipes/{id}/nutri-score/` aufgerufen wird
- THEN werden die aggregierten Naehrwerte aller Zutaten berechnet
- AND der Nutri-Score (A-E) wird nach dem offiziellen franzoesischen Algorithmus berechnet
- AND die Antwort enthaelt: `negative_points`, `positive_points`, `total_points`, `nutri_class`, `nutri_label`, `details`

### Requirement: Kommentare

Das System SHALL Kommentare fuer Rezepte mit Moderation unterstuetzen.

#### Scenario: Kommentar erstellen (authentifiziert)

- GIVEN ein authentifizierter Benutzer
- WHEN POST `/api/recipes/{id}/comments/` mit Text aufgerufen wird
- THEN wird der Kommentar mit Status "approved" erstellt
- AND der Benutzer wird als Autor gesetzt

#### Scenario: Kommentar erstellen (anonym)

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN POST `/api/recipes/{id}/comments/` mit Text und optionalem `author_name` aufgerufen wird
- THEN wird der Kommentar mit Status "pending" erstellt
- AND der Kommentar muss von einem Admin freigegeben werden

#### Scenario: Kommentare auflisten

- GIVEN ein Rezept mit freigegebenen Kommentaren
- WHEN GET `/api/recipes/{id}/comments/` aufgerufen wird
- THEN werden nur Kommentare mit Status "approved" zurueckgegeben

### Requirement: Emotionen/Reaktionen

Das System SHALL Emotions-Reaktionen fuer Rezepte unterstuetzen (anonym moeglich).

#### Scenario: Emotion setzen/toggeln

- GIVEN ein Benutzer (authentifiziert oder anonym)
- WHEN POST `/api/recipes/{id}/emotions/` mit `emotion_type` aufgerufen wird
- THEN wird die Emotion gesetzt oder getoggelt (gleiche Emotion = entfernen, andere Emotion = aendern)
- AND der `like_score` des Rezepts wird neu berechnet

#### Scenario: Like-Score-Berechnung

- GIVEN ein Rezept mit Emotions-Reaktionen
- WHEN der `like_score` berechnet wird
- THEN gilt: `like_score = count(in_love) + count(happy) - count(disappointed)`
- AND `complex`-Reaktionen werden nicht einbezogen

### Requirement: Bild-Upload

Das System SHALL Bildupload fuer Rezepte unterstuetzen.

#### Scenario: Bild hochladen

- GIVEN ein authentifizierter Autor eines Rezepts
- WHEN POST `/api/recipes/{id}/image/` mit Bilddatei aufgerufen wird
- THEN wird das Bild gespeichert
- AND die `image_url` wird in der Antwort zurueckgegeben

### Requirement: Bot-Schutz bei Erstellung

Das System SHALL Honeypot- und Timing-basierte Bot-Erkennung bei der Rezept-Erstellung verwenden.

#### Scenario: Honeypot-Feld

- GIVEN ein Bot fuellt das versteckte `website`-Feld aus
- WHEN POST `/api/recipes/` aufgerufen wird
- THEN gibt das System HTTP 400 zurueck

#### Scenario: Timing-Check

- GIVEN ein Bot sendet das Formular innerhalb von 5 Sekunden ab
- WHEN POST `/api/recipes/` mit `form_loaded_at` aufgerufen wird und die Zeit < 5 Sekunden ist
- THEN gibt das System HTTP 400 zurueck

## API-Endpunkte

```
# Recipe CRUD
GET    /api/recipes/                        -> Paginierte Liste (filterbar)
GET    /api/recipes/{id}/                    -> Detail per ID
GET    /api/recipes/by-slug/{slug}/          -> Detail per Slug (SEO)
POST   /api/recipes/                         -> Erstellen (auth)
PATCH  /api/recipes/{id}/                    -> Aktualisieren (auth, eigene oder admin)
DELETE /api/recipes/{id}/                    -> Loeschen (auth, eigene oder admin)

# Recipe Items (Zutaten)
GET    /api/recipes/{id}/recipe-items/       -> Zutaten auflisten
POST   /api/recipes/{id}/recipe-items/       -> Zutat hinzufuegen
PATCH  /api/recipes/{id}/recipe-items/{iid}/ -> Zutat aktualisieren
DELETE /api/recipes/{id}/recipe-items/{iid}/ -> Zutat entfernen

# Feedback
GET    /api/recipes/{id}/comments/           -> Freigegebene Kommentare
POST   /api/recipes/{id}/comments/           -> Kommentar erstellen
POST   /api/recipes/{id}/emotions/           -> Emotion setzen/toggeln

# Analyse
GET    /api/recipes/{id}/recipe-checks/      -> 4-Dimensionen-Bewertung
GET    /api/recipes/{id}/recipe-hints/       -> Regelbasierte Hinweise
GET    /api/recipes/{id}/nutri-score/        -> Detaillierter Nutri-Score

# Bild
POST   /api/recipes/{id}/image/              -> Bild hochladen
```

## Filter-Parameter

```
?q=suchbegriff          # Volltextsuche (Titel, Summary, Description)
?recipe_type=warm_meal   # Nach Rezepttyp filtern
?scout_level_ids=1,2     # Nach Stufen filtern
?tag_slugs=lager,kochen  # Nach Tags filtern
?difficulty=easy          # Nach Schwierigkeit filtern
?costs_rating=less_1      # Nach Kosten filtern
?execution_time=30_60     # Nach Zubereitungszeit filtern
?sort=newest|oldest|most_liked|most_viewed|random
?page=1&page_size=20
```

## Django App Struktur

```
recipe/
  __init__.py
  apps.py              <- AppConfig (name="recipe")
  choices.py           <- Eigene TextChoices (RecipeStatusChoices, RecipeTypeChoices, DifficultyChoices, etc.)
  models.py            <- Recipe, RecipeItem, RecipeHint, RecipeComment, RecipeEmotion, RecipeView
  schemas.py           <- Pydantic Schemas (RecipeListOut, RecipeDetailOut, RecipeCreateIn, etc.)
  api.py               <- Django Ninja Router (tags=["recipes"])
  admin.py             <- Admin-Registrierungen mit RecipeItem-Inline
  migrations/
```

## Cross-App Abhaengigkeiten

- `recipe.Recipe.scout_levels` -> M2M zu `idea.ScoutLevel`
- `recipe.Recipe.tags` -> M2M zu `idea.Tag`
- `recipe.Recipe.nutritional_tags` -> M2M zu `idea.NutritionalTag`
- `recipe.RecipeItem.portion` -> FK zu `idea.Portion`
- `recipe.RecipeItem.ingredient` -> FK zu `idea.Ingredient`
- `recipe.RecipeItem.measuring_unit` -> FK zu `idea.MeasuringUnit`
- `planner.MealItem.recipe` -> FK zu `recipe.Recipe`
- `idea.services.recipe_checks` -> importiert `recipe.RecipeItem`, `recipe.RecipeHint`
- `idea.services.shopping_service` -> importiert `recipe.RecipeItem`
- `idea.services.hint_service` -> Typ-Hinweise auf `recipe.Recipe`
