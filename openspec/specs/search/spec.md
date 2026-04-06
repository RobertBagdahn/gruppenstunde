# search Specification

## Purpose

Hybrides Suchsystem, das PostgreSQL-Volltextsuche, Trigramm-Aehnlichkeit, tag-basierte Filterung und Vektor-Embeddings fuer semantische Aehnlichkeit kombiniert. Liefert schnelle, relevante Ergebnisse zum Entdecken von Ideas mit Unterstuetzung fuer facettierte Filter, Autocomplete und aehnliche Idea-Vorschlaege.

## Requirements

### Requirement: Hybride Suche

Das System MUST eine hybride Suche implementieren, die mehrere Suchstrategien fuer optimale Ergebnis-Relevanz kombiniert.

#### Scenario: Textsuche mit Volltext und Trigramm

- GIVEN veroeffentlichte Ideas in der Datenbank mit befuellten SearchVector-Feldern
- WHEN ein Benutzer eine Suchanfrage per GET `/api/ideas/search/?q=nachtwanderung` absendet
- THEN wird PostgreSQL `SearchVector` + `SearchRank` fuer Volltext-Matching verwendet (Titel mit Gewicht A, Zusammenfassung mit Gewicht B, config="german")
- AND `pg_trgm` Trigramm-Aehnlichkeit wird fuer unscharfes Matching verwendet (Maximum aus Titel- und Zusammenfassungs-Trigramm)
- AND Ergebnisse werden nach `search_rank` (absteigend), dann `trigram_score` (absteigend), dann `like_score` (absteigend) sortiert
- AND Ergebnisse werden einbezogen wenn `search_rank > 0.01` ODER `trigram_score > 0.1`
- AND die Antwortzeit MUST unter 200ms liegen (bei bis zu 50.000 veroeffentlichten Ideas)

#### Scenario: Leere Suchanfrage

- GIVEN kein Suchparameter angegeben
- WHEN ein Benutzer GET `/api/ideas/` aufruft
- THEN werden alle veroeffentlichten Ideas in Standard-Reihenfolge zurueckgegeben (neueste zuerst)
- AND die Ergebnisse sind paginiert (Standard: `page=1`, `page_size=20`)

#### Scenario: Keine Ergebnisse gefunden

- GIVEN eine Suchanfrage ohne passende Ideas
- WHEN die Suche ausgefuehrt wird
- THEN wird ein leeres paginiertes Ergebnis zurueckgegeben `{ items: [], total: 0, page: 1, page_size: 20, total_pages: 0 }`

### Requirement: Facettierte Filterung

Das System MUST kombinierbare Filter unterstuetzen, die zusammen mit der Textsuche angewendet werden koennen.

#### Scenario: Nach Tags filtern (AND-Logik)

- GIVEN veroeffentlichte Ideas mit zugewiesenen Tags
- WHEN der Benutzer mit `tag_slugs=outdoor,spiel` (kommagetrennte Tag-Slugs) filtert
- THEN werden nur Ideas zurueckgegeben, die ALLE angegebenen Tags haben (AND-Logik)
- AND die Begruendung: Eine Idea kann viele Tags haben, der Benutzer will die Schnittmenge eingrenzen

#### Scenario: Nach Stufe filtern (OR-Logik)

- GIVEN veroeffentlichte Ideas mit zugewiesenen Stufen
- WHEN der Benutzer mit `scout_level_ids=1,2` filtert
- THEN werden Ideas zurueckgegeben, die mindestens eine der angegebenen Stufen haben (OR-Logik)
- AND die Begruendung: Ein Gruppenleiter betreut typischerweise eine Stufe, sucht aber eventuell fuer benachbarte Altersgruppen

#### Scenario: Nach Schwierigkeit filtern

- GIVEN veroeffentlichte Ideas mit Schwierigkeitsbewertungen
- WHEN der Benutzer mit `difficulty=easy` filtert
- THEN werden nur Ideas mit der Schwierigkeit `easy` zurueckgegeben

#### Scenario: Nach Idea-Typ filtern

- GIVEN veroeffentlichte Ideas verschiedener Typen
- WHEN der Benutzer mit `idea_type=recipe` filtert
- THEN werden nur Ideas vom Typ "recipe" zurueckgegeben
- AND `idea_type` akzeptiert kommagetrennte Werte fuer Multi-Typ-Filter: `idea_type=idea,recipe`

#### Scenario: Nach Kosten filtern

- GIVEN veroeffentlichte Ideas mit Kostenbewertungen
- WHEN der Benutzer mit `costs_rating=free` filtert
- THEN werden nur Ideas mit der Kostenbewertung `free` zurueckgegeben

#### Scenario: Nach Ausfuehrungszeit filtern

- GIVEN veroeffentlichte Ideas mit Zeitschaetzungen
- WHEN der Benutzer mit `execution_time=30_60` filtert
- THEN werden nur Ideas mit der entsprechenden Zeitschaetzung zurueckgegeben

#### Scenario: Kombinierte Filter und Suche

- GIVEN veroeffentlichte Ideas
- WHEN der Benutzer mit `q=kochen&tag_slugs=outdoor&idea_type=recipe&scout_level_ids=2` sucht
- THEN werden alle Filter als UND-Bedingungen angewendet
- AND die Textsuche wird innerhalb des gefilterten Sets angewendet
- AND die Ergebnisse sind paginiert

#### Scenario: Sortieroptionen

- GIVEN Suchergebnisse
- WHEN der Benutzer `sort=` Parameter setzt
- THEN werden die Ergebnisse nach dem gewaehlten Kriterium sortiert:
  - `relevant` (Standard bei Textsuche): Nach Such-Relevanz
  - `newest`: Nach Erstellungsdatum absteigend
  - `oldest`: Nach Erstellungsdatum aufsteigend
  - `most_liked`: Nach `like_score` absteigend
  - `random`: Zufaellige Reihenfolge

### Requirement: Such-Autocomplete

Das System SHALL Autocomplete-Vorschlaege fuer das Suchfeld bereitstellen.

#### Scenario: Autocomplete-Anfrage

- GIVEN veroeffentlichte Ideas im System
- WHEN der Benutzer mindestens 2 Zeichen im Suchfeld eingibt
- THEN liefert GET `/api/ideas/autocomplete/?q=nach` passende Idea-Titel
- AND die Antwort enthaelt maximal 8 Vorschlaege mit den Feldern `{ id, title, slug, summary }`
- AND die Antwortzeit MUST unter 100ms liegen (bei bis zu 50.000 Ideas)

### Requirement: Aehnliche Ideas

Das System SHALL aehnliche Ideas basierend auf Vektor-Embeddings mit Tag-Ueberlappungs-Fallback vorschlagen.

#### Scenario: Aehnliche Ideas per Embeddings

- GIVEN eine Idea mit berechnetem Embedding (768-dimensionaler Vektor, derzeit als BinaryField gespeichert und in Python deserialisiert)
- WHEN der Benutzer die Idea-Detailseite betrachtet
- THEN liefert GET `/api/ideas/{id}/similar/` bis zu 6 aehnliche Ideas
- AND die Aehnlichkeit wird per Kosinus-Aehnlichkeit auf den Embedding-Vektoren berechnet

#### Scenario: Aehnliche Ideas Fallback (kein Embedding)

- GIVEN eine Idea ohne berechnetes Embedding
- WHEN aehnliche Ideas angefragt werden
- THEN faellt das System auf Tag-Ueberlappungs-Aehnlichkeit zurueck
- AND gibt Ideas zurueck, die die meisten Tags mit der aktuellen Idea teilen

### Requirement: URL-gesteuerter Such-Zustand

Das Frontend MUST den gesamten Such- und Filter-Zustand mit URL-Query-Parametern synchronisieren. Die Zustandsverwaltung erfolgt ueber den `useIdeaStore` (Zustand).

#### Scenario: Lesezeichen-faehige Suche

- GIVEN ein Benutzer fuehrt eine gefilterte Suche durch
- WHEN die Suchergebnisse angezeigt werden
- THEN enthaelt die URL alle aktiven Filter als Query-Parameter (z.B. `?q=lager&tag_slugs=outdoor&page=2`)
- AND Standard-Werte (`sort=newest`, `page=1`) werden NICHT in die URL geschrieben
- AND das Teilen oder Bookmarken dieser URL reproduziert exakt die gleichen Suchergebnisse

#### Scenario: Browser-Zurueck-Navigation

- GIVEN ein Benutzer, der von den Suchergebnissen zu einer Idea-Detailseite navigiert ist
- WHEN der Benutzer den Browser-Zurueck-Button klickt
- THEN wird der vorherige Suchzustand (Anfrage, Filter, Seite) aus der URL wiederhergestellt

#### Scenario: Filter-Aenderung zuruecksetzt Seite

- GIVEN der useIdeaStore verwaltet den Suchzustand
- WHEN sich ein Filterwert aendert (ausser `page` selbst)
- THEN wird die Seite automatisch auf 1 zurueckgesetzt
- AND die URL-Query-Parameter werden sofort aktualisiert

### Requirement: Such-Analytik

Das System SHOULD Suchanfragen fuer Analysezwecke im `SearchLog`-Model protokollieren.

#### Scenario: Suchanfragen-Protokollierung

- GIVEN ein Benutzer fuehrt eine Suche durch
- WHEN die Suchanfrage ausgefuehrt wird
- THEN werden folgende Felder im SearchLog gespeichert:
  - `query` (CharField, max 500): Der Suchbegriff
  - `results_count` (IntegerField): Anzahl der Ergebnisse
  - `session_key` (CharField, max 40): Session-Identifikator
  - `ip_hash` (CharField, max 64): Gehashte IP-Adresse
  - `user` (FK, nullable): Authentifizierter Benutzer oder null
  - `created_at` (DateTimeField): Zeitstempel
- AND keine Roh-IP-Adressen oder sonstigen personenbezogenen Daten werden gespeichert
