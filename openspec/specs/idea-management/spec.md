# idea-management Specification

## Purpose

Kern-Content-Management-System der Inspi-Plattform. Verwaltet den gesamten Lebenszyklus von Ideas — den zentralen Inhalts-Entitaeten, die Gruppenleiter erstellen, durchsuchen und teilen. Ideas gibt es in zwei Typen (klassische Idee, Wissensartikel) und unterstuetzen reichhaltige Metadaten wie Tags, Stufen und Materialien. Rezepte sind ein eigenstaendiges Modul (siehe `recipe` Spec).

## Requirements

### Requirement: Inhaltsformat (Markdown)

Das System MUST Markdown als einziges Inhaltsformat fuer alle Freitext-Felder verwenden. HTML ist nicht erlaubt.

#### Scenario: Markdown-Eingabe

- GIVEN ein Benutzer erstellt oder bearbeitet eine Idea
- WHEN der Benutzer die Felder `description`, `summary` oder `summary_long` bearbeitet
- THEN wird ein Markdown-Editor (`MarkdownEditor`-Komponente, basierend auf `@uiw/react-md-editor`) angezeigt
- AND der Editor unterstuetzt GitHub Flavored Markdown (Tabellen, Checklisten, Code-Bloecke, etc.)
- AND der Editor bietet eine Toolbar fuer gaengige Formatierungen (Fett, Kursiv, Listen, Links, Bilder)
- AND der Editor zeigt eine Live-Vorschau des formatierten Textes

#### Scenario: Markdown-Darstellung

- GIVEN eine Idea mit Markdown-Inhalt wird angezeigt
- WHEN die Detail-Seite gerendert wird
- THEN wird der Markdown-Inhalt ueber die `MarkdownRenderer`-Komponente gerendert (basierend auf `react-markdown` + `remark-gfm`)
- AND `dangerouslySetInnerHTML` wird NICHT verwendet (XSS-Schutz)
- AND HTML-Tags im Markdown werden sanitized (`rehype-sanitize`)
- AND die Darstellung verwendet Tailwind Typography-Klassen (`prose`)

#### Scenario: Markdown im Backend

- GIVEN Freitext-Felder in Django-Models (`Idea.description`, `Idea.summary`, `Idea.summary_long`, `Event.description`, `Event.invitation_text`)
- THEN werden diese als Django `TextField` gespeichert
- AND der Inhalt ist Markdown-formatierter Plaintext (kein HTML)
- AND die API gibt den Markdown-Text unveraendert zurueck (kein serverseitiges Rendering)

#### Scenario: HTML-zu-Markdown-Migration (Einmalig)

- GIVEN bestehende Daten enthalten HTML-formatierte Inhalte (aus der frueheren Tiptap-Editor-Aera)
- WHEN das Management-Command `convert_html_to_markdown` ausgefuehrt wird (`uv run python manage.py convert_html_to_markdown`)
- THEN werden alle HTML-Inhalte in den Feldern `description`, `summary`, `summary_long` der Idea-Tabelle zu Markdown konvertiert
- AND die Konvertierung verwendet die `html2text`-Bibliothek
- AND ein `--dry-run`-Flag zeigt die Aenderungen ohne zu speichern

### Requirement: PDF-Export

Das System SHALL einen PDF-Export fuer Idea-Detailseiten bereitstellen.

#### Scenario: PDF herunterladen

- GIVEN ein Benutzer betrachtet eine Idea-Detailseite
- WHEN der Benutzer den "Als PDF herunterladen"-Button klickt
- THEN wird ein PDF-Dokument generiert, das den sichtbaren Seiteninhalt enthaelt
- AND das PDF wird als `{idea-titel}.pdf` heruntergeladen
- AND die Generierung verwendet `jspdf` + `html2canvas` (clientseitig)

#### Scenario: Mehrseitige PDFs

- GIVEN eine Idea mit langem Inhalt
- WHEN der Inhalt laenger als eine DIN-A4-Seite ist
- THEN wird das PDF automatisch auf mehrere Seiten aufgeteilt
- AND Seitenumbrueche werden korrekt behandelt

#### Scenario: PDF-Inhalt

- GIVEN das generierte PDF
- THEN enthaelt es:
  - Titel der Idea
  - Gerenderten Markdown-Inhalt (als formatierter Text)
  - Materialliste oder Zutatenliste (je nach Idea-Typ)
  - Metadaten (Stufen, Schwierigkeit, Dauer, Kosten)
- AND der PDF-Export-Button wird beim Drucken/PDF-Generieren ausgeblendet

### Requirement: Idea-Typen

Das System SHALL zwei verschiedene Idea-Typen ueber das Feld `idea_type` (TextChoices: `idea`, `knowledge`) unterstuetzen. Beide Typen teilen die gleiche Basis-Datenstruktur (Idea Model), sind gemeinsam suchbar und haben die gleichen Metadaten (Tags, Stufen, Schwierigkeit, etc.). Sie unterscheiden sich nur in der Material-Zuordnung. Rezepte sind ein eigenstaendiges Modul (siehe `recipe` Spec).

#### Scenario: Lern-Idee erstellen

- GIVEN ein Benutzer erstellt eine neue Idea
- WHEN der Benutzer den Typ "idea" waehlt
- THEN wird die Idea mit einer Materialliste (`MaterialItem`-Eintraege) erstellt
- AND der Material-Bereich wird im UI als "Material" beschriftet

#### Scenario: Wissensartikel erstellen

- GIVEN ein Benutzer erstellt eine neue Idea
- WHEN der Benutzer den Typ "knowledge" waehlt
- THEN wird die Idea ohne Materialliste erstellt
- AND der Material-Bereich wird im UI ausgeblendet
- AND das Beschreibungsfeld erlaubt langen Fliesstext

### Requirement: Idea CRUD

Das System MUST vollstaendige CRUD-Operationen fuer Ideas ueber die API unter `/api/ideas/` bereitstellen.

#### Scenario: Idea erstellen (authentifiziert)

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer eine gueltige Idea per POST `/api/ideas/` einreicht
- THEN wird die Idea mit Status "draft" erstellt
- AND der Benutzer wird als Autor gesetzt
- AND ein URL-sicherer Slug wird aus dem Titel generiert (via `slugify`, kein Unicode)
- AND bei Slug-Konflikten wird ein numerisches Suffix angehaengt (`-1`, `-2`, etc.)

#### Scenario: Idea erstellen (nicht authentifiziert)

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer versucht eine Idea per POST `/api/ideas/` zu erstellen
- THEN gibt das System HTTP 401 Unauthorized zurueck

#### Scenario: Idea per Slug abrufen

- GIVEN eine veroeffentlichte Idea mit Slug "nachtwanderung"
- WHEN ein beliebiger Benutzer GET `/api/ideas/by-slug/nachtwanderung` aufruft
- THEN werden die vollstaendigen Idea-Details zurueckgegeben inkl. Tags, Materialien, Stufen und Autor-Info

#### Scenario: Idea aktualisieren (nur Autor)

- GIVEN ein authentifizierter Benutzer, der Autor einer Idea ist
- WHEN der Benutzer PATCH `/api/ideas/{id}/` mit partiellen Daten einreicht
- THEN wird die Idea mit den neuen Daten aktualisiert
- AND der Slug bleibt unveraendert (auch bei Titelaenderung)
- AND alte Slug-Aliase werden gepflegt, falls der Slug manuell geaendert wird

#### Scenario: Idea loeschen (nur Autor)

- GIVEN ein authentifizierter Benutzer, der Autor einer Idea ist
- WHEN der Benutzer DELETE `/api/ideas/{id}/` aufruft
- THEN wird die Idea aus dem System entfernt

#### Scenario: Unbefugter Bearbeitungsversuch

- GIVEN ein authentifizierter Benutzer, der NICHT der Autor einer Idea ist
- WHEN der Benutzer versucht die Idea zu aendern oder zu loeschen
- THEN gibt das System HTTP 403 Forbidden zurueck

### Requirement: Idea-Auflistung mit Paginierung

Das System MUST paginierte Idea-Listen fuer alle Listen-Endpunkte zurueckgeben. Standard: `page=1`, `page_size=20`.

#### Scenario: Standard-paginierte Auflistung

- GIVEN veroeffentlichte Ideas existieren im System
- WHEN ein Benutzer GET `/api/ideas/?page=1&page_size=20` aufruft
- THEN enthaelt die Antwort `{ items, total, page, page_size, total_pages }`
- AND nur veroeffentlichte Ideas werden fuer Nicht-Admins angezeigt

#### Scenario: Gefilterte Auflistung

- GIVEN veroeffentlichte Ideas mit verschiedenen Tags und Stufen
- WHEN ein Benutzer GET `/api/ideas/?tags=1,2&scout_levels=3&difficulty=easy` aufruft
- THEN werden nur Ideas zurueckgegeben, die ALLE Tag-Filterkriterien erfuellen (AND-Logik fuer Tags)
- AND Stufen-Filter verwenden OR-Logik (Idea muss mindestens eine der angegebenen Stufen haben)
- AND die Antwort ist paginiert

### Requirement: Idea-Status-Workflow

Das System SHALL einen 4-stufigen Status-Workflow fuer Ideas durchsetzen. Die moeglichen Status-Werte sind: `draft`, `review`, `published`, `archived` (definiert als `StatusChoices` TextChoices).

#### Scenario: Entwurf zu Review einreichen

- GIVEN eine Idea mit Status "draft"
- WHEN der Autor die Idea zur Pruefung einreicht
- THEN aendert sich der Status auf "review"
- AND die Idea erscheint in der Admin-Moderationswarteschlange

#### Scenario: Review freigeben (Admin)

- GIVEN eine Idea mit Status "review"
- WHEN ein Admin die Idea freigibt
- THEN aendert sich der Status auf "published"
- AND die Idea wird in oeffentlichen Listen und der Suche sichtbar

#### Scenario: Review ablehnen (Admin)

- GIVEN eine Idea mit Status "review"
- WHEN ein Admin die Idea ablehnt
- THEN aendert sich der Status zurueck auf "draft"
- AND der Autor wird informiert

#### Scenario: Entwurf direkt veroeffentlichen

- GIVEN eine Idea mit Status "draft"
- WHEN der Autor die Idea direkt veroeffentlicht (ohne Review)
- THEN aendert sich der Status auf "published"
- AND die Idea wird in oeffentlichen Listen und der Suche sichtbar

#### Scenario: Veroeffentlicht zu archiviert

- GIVEN eine Idea mit Status "published"
- WHEN der Autor die Idea archiviert
- THEN aendert sich der Status auf "archived"
- AND die Idea ist nicht mehr in oeffentlichen Listen sichtbar

#### Scenario: Erlaubte Transitionen

- GIVEN die Status-Transition-Matrix
- THEN sind folgende Transitionen erlaubt:
  - `draft` -> `review` (Autor)
  - `draft` -> `published` (Autor)
  - `review` -> `published` (Admin)
  - `review` -> `draft` (Admin, Ablehnung)
  - `published` -> `archived` (Autor oder Admin)
  - `archived` -> `draft` (Autor)

### Requirement: Idea-Metadaten

Das System SHALL reichhaltige Metadaten fuer jede Idea unterstuetzen.

#### Scenario: Kosten-Bewertung

- GIVEN eine Idea wird erstellt oder bearbeitet
- WHEN der Benutzer `costs_rating` setzt
- THEN akzeptiert das System die Werte `free` (0 EUR), `less_1` (< 1 EUR), `1_2` (1-2 EUR), `more_2` (> 2 EUR)
- AND der Wert wird als CharField gespeichert

#### Scenario: Schwierigkeitsbewertung

- GIVEN eine Idea wird erstellt oder bearbeitet
- WHEN der Benutzer `difficulty` setzt
- THEN akzeptiert das System die Werte `easy` (Einfach), `medium` (Mittel), `hard` (Schwer)
- AND der Wert wird als CharField gespeichert

#### Scenario: Zeitschaetzung

- GIVEN eine Idea wird erstellt oder bearbeitet
- WHEN der Benutzer `execution_time` setzt
- THEN akzeptiert das System die Werte `less_30`, `30_60`, `60_90`, `more_90` (in Minuten)
- AND optional kann `preparation_time` gesetzt werden: `none`, `less_15`, `15_30`, `30_60`, `more_60`

#### Scenario: Stufen-Zuweisung

- GIVEN eine Idea wird erstellt oder bearbeitet
- WHEN der Benutzer eine oder mehrere Stufen per `scout_level_ids` zuweist
- THEN wird die Idea mit diesen ScoutLevel-Datensaetzen verknuepft (M2M)
- AND die Idea erscheint in gefilterten Suchen fuer diese Stufen

#### Scenario: Idea-Bild hochladen

- GIVEN ein authentifizierter Benutzer bearbeitet eine Idea
- WHEN der Benutzer ein Bild hochlaedt
- THEN wird das Bild in Google Cloud Storage gespeichert
- AND die `image_url` der Idea wird aktualisiert
- AND erlaubte Formate sind JPEG, PNG und WebP
- AND die maximale Dateigroesse betraegt 5 MB

### Requirement: Material-Verwaltung (MaterialItem)

Das System SHALL Materiallisten fuer Ideas vom Typ `idea` unterstuetzen. Jedes `MaterialItem` verknuepft eine Idea mit einem `MaterialName` und einer optionalen `MeasuringUnit`.

#### Scenario: Material zu Lern-Idee hinzufuegen

- GIVEN eine Idea vom Typ "idea"
- WHEN der Benutzer ein Material mit Menge (`quantity`: CharField), MaterialName-Referenz (`material_name_id`) und optionaler MeasuringUnit-Referenz (`material_unit`) hinzufuegt
- THEN wird das MaterialItem mit der Idea verknuepft (FK `idea`, related_name `materials`)
- AND `quantity_type` wird auf `once` (einmalig) oder `per_person` (pro Person) gesetzt

#### Scenario: MaterialItem-Felder

- GIVEN ein MaterialItem
- THEN hat es die Felder: `idea` (FK), `quantity` (CharField, max 50), `material_name` (FK zu MaterialName, nullable), `material_unit` (FK zu MeasuringUnit, nullable), `quantity_type` (CharField: `once` | `per_person`)

#### Scenario: Wissensbeitrag hat keine Materialliste

- GIVEN eine Idea vom Typ "knowledge"
- WHEN die Idea angezeigt wird
- THEN wird kein Material-Bereich angezeigt
- AND bei der API-Antwort werden MaterialItems ignoriert

### Requirement: Hierarchisches Tag-System

Das System SHALL eine hierarchische Tag-Taxonomie mit Eltern-Kind-Beziehungen unterstuetzen. Tags haben die Felder: `name`, `slug`, `icon`, `sort_order`, `parent` (FK zu sich selbst, nullable).

#### Scenario: Tag-Zuweisung

- GIVEN eine veroeffentlichte Idea
- WHEN der Benutzer Tags aus der freigegebenen Tag-Liste per `tag_ids` zuweist
- THEN wird die Idea mit diesen Tags verknuepft (M2M)
- AND die Idea erscheint in tag-gefilterten Suchen

#### Scenario: Tag-Freigabe-Workflow

- GIVEN ein Benutzer schlaegt einen neuen Tag vor
- WHEN ein Admin den Tag-Vorschlag prueft
- THEN kann der Admin den Tag freigeben, ablehnen oder anpassen
- AND freigegebene Tags stehen allen Benutzern zur Verfuegung

### Requirement: ScoutLevel-Verwaltung

Das System SHALL eine feste Liste von Pfadfinder-Stufen als `ScoutLevel`-Datensaetze bereitstellen. ScoutLevels werden per Seed-Data angelegt und von Admins verwaltet.

#### Scenario: ScoutLevel-Felder

- GIVEN ein ScoutLevel-Datensatz
- THEN hat er die Felder: `name` (CharField, max 100), `sorting` (IntegerField, fuer Reihenfolge), `icon` (CharField, max 100)
- AND ScoutLevels werden nach `sorting` sortiert

#### Scenario: ScoutLevels abrufen

- GIVEN ScoutLevel-Datensaetze im System
- WHEN ein Benutzer GET `/api/ideas/scout-levels/` aufruft
- THEN werden alle ScoutLevels sortiert nach `sorting` zurueckgegeben

### Requirement: NutritionalTag-Verwaltung

Das System SHALL Ernaehrungs-Tags als `NutritionalTag`-Datensaetze bereitstellen, die Personen-Profilen und Rezepten zugeordnet werden koennen.

#### Scenario: NutritionalTag-Felder

- GIVEN ein NutritionalTag-Datensatz
- THEN hat er die Felder: `name` (CharField, max 255), `name_opposite` (CharField, Gegenteil-Name), `description` (CharField), `rank` (IntegerField, fuer Sortierung), `is_dangerous` (BooleanField, kennzeichnet Allergien)
- AND NutritionalTags werden nach `rank, name` sortiert

#### Scenario: NutritionalTags abrufen

- GIVEN NutritionalTag-Datensaetze im System
- WHEN ein Benutzer GET `/api/ideas/nutritional-tags/` aufruft
- THEN werden alle NutritionalTags sortiert zurueckgegeben

### Requirement: MaterialName-Katalog

Das System SHALL einen Katalog von Materialnamen als `MaterialName`-Datensaetze bereitstellen, die in MaterialItems referenziert werden.

#### Scenario: MaterialName-Felder

- GIVEN ein MaterialName-Datensatz
- THEN hat er die Felder: `name` (CharField, max 255), `slug` (SlugField, unique, auto-generiert), `description` (TextField), `default_unit` (FK zu MeasuringUnit, nullable)

#### Scenario: MaterialName-Detailansicht

- GIVEN ein MaterialName mit verknuepften Ideas
- WHEN ein Benutzer GET `/api/materials/{slug}/` aufruft
- THEN werden der MaterialName mit `name`, `slug`, `description`, `default_unit` und einer Liste verknuepfter Ideas zurueckgegeben

#### Scenario: MaterialName-Liste (paginiert)

- GIVEN MaterialName-Datensaetze im System
- WHEN ein Benutzer GET `/api/materials/?page=1&page_size=20` aufruft
- THEN werden MaterialNames paginiert zurueckgegeben

### Requirement: MeasuringUnit-Katalog

Das System SHALL einen Katalog von Masseinheiten als `MeasuringUnit`-Datensaetze bereitstellen. Masseinheiten werden von Admins verwaltet.

#### Scenario: MeasuringUnit-Felder

- GIVEN ein MeasuringUnit-Datensatz
- THEN hat er die Felder: `name` (CharField, max 255), `description` (CharField), `quantity` (FloatField), `unit` (CharField: `ml` fuer Milliliter, `g` fuer Gramm)

### Requirement: Like- und View-Tracking

Das System SHALL die Beliebtheit von Ideas ueber Like-Scores und View-Zaehler verfolgen.

#### Scenario: View-Zaehlung (DSGVO-konform)

- GIVEN ein Benutzer sieht sich eine Idea-Detailseite an
- WHEN der View per POST `/api/ideas/{id}/view` erfasst wird
- THEN wird der View nur gezaehlt, wenn der Benutzer kein Bot ist
- AND die IP-Adresse wird mit SHA-256 gehasht fuer 24h-Deduplizierung
- AND keine Roh-IP-Adressen werden gespeichert

#### Scenario: Like-Score-Berechnung

- GIVEN eine Idea mit Emotions-Reaktionen
- WHEN der `like_score` berechnet wird
- THEN gilt die Formel: `like_score = count(in_love) + count(happy) - count(disappointed)`
- AND `complex`-Reaktionen werden nicht in die Berechnung einbezogen

### Requirement: Slug-Aliase

Das System SHALL Slug-Aliase pflegen, damit alte URLs nach Slug-Aenderungen weiterhin funktionieren.

#### Scenario: Slug-Alias bei manueller Aenderung

- GIVEN eine Idea mit Slug "alte-nachtwanderung"
- WHEN der Slug manuell auf "nachtwanderung-im-wald" geaendert wird
- THEN wird "alte-nachtwanderung" als Alias gespeichert
- AND GET `/api/ideas/by-slug/alte-nachtwanderung` leitet auf die Idea weiter

## Planned Features

Die folgenden Features sind geplant, aber noch nicht implementiert:

### Planned: Hierarchische Tag-Filterung

- Derzeit filtert die Suche nur nach direkt zugewiesenen Tags.
- Geplant: Wenn nach einem Eltern-Tag gefiltert wird, sollen auch Ideas mit Kind-Tags einbezogen werden.

### Planned: SlugAlias-Model

- Derzeit existiert kein `SlugAlias`-Model im Code.
- Geplant: Model `SlugAlias(idea: FK, slug: CharField, created_at)` fuer die Verwaltung alter Slugs.

### Planned: Migration Embedding von BinaryField zu pgvector VectorField

- Derzeit werden Embeddings als `BinaryField` gespeichert und in Python deserialisiert.
- Geplant: Migration zu `pgvector.django.VectorField(dimensions=768)` fuer datenbankseitige Kosinus-Aehnlichkeits-Berechnung und Indizierung.
