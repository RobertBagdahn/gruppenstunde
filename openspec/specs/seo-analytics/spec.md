# seo-analytics Specification

> **⚠️ HINWEIS: Diese Spec referenziert die alte `idea` App-Architektur.**
> Die `idea` App wurde durch die Content/Supply-Architektur ersetzt (siehe `openspec/changes/content-base-refactor/`).
> Mapping: `Idea (idea_type=idea)` → `session.GroupSession`, `Idea (idea_type=knowledge)` → `blog.Blog`, `Idea (idea_type=recipe)` → `recipe.Recipe`.
> Neue Apps: `content`, `supply`, `session`, `blog`, `game`, `recipe`. Die `idea/` App existiert nicht mehr.

## Purpose

Suchmaschinenoptimierung, Meta-Tag-Verwaltung und DSGVO-konforme Analytik für die Inspi-Plattform. Stellt sicher, dass die Plattform von Suchmaschinen auffindbar ist, liefert ansprechende Vorschauen in Social-Media-Shares und verfolgt die Nutzung ohne personenbezogene Daten zu speichern.

## Requirements

### Requirement: SEO-freundliche URLs

Das System MUST slug-basierte, menschenlesbare URLs für alle öffentlichen Inhalte verwenden.

#### Scenario: Idea-URL-Struktur

- GIVEN eine Idea mit Slug "nachtwanderung-im-wald"
- WHEN die Idea veröffentlicht wird
- THEN ist die Idea unter `/idea/nachtwanderung-im-wald` erreichbar (Frontend-Route: `/idea/:slug`)
- AND der Slug ist URL-sicher (Kleinbuchstaben, Bindestriche, keine Sonderzeichen, kein Unicode)

#### Scenario: Event-URL-Struktur

- GIVEN ein Event mit Slug "sommerlager-2025"
- WHEN das Event erstellt wird
- THEN ist das Event über `/events` (Landing-Page) bzw. `/events/app` (Listenseite) und per Slug in der API erreichbar

#### Scenario: Material-URL-Struktur

- GIVEN ein MaterialName mit Slug "holz"
- WHEN ein Benutzer den Material-Katalog aufruft
- THEN ist das Material unter `/material/holz` erreichbar (Frontend-Route: `/material/:slug`)

### Requirement: Dynamische Meta-Tags

Das Frontend MUST dynamische Meta-Tags für SEO und Social-Media-Sharing rendern.

#### Scenario: Idea-Detail Meta-Tags

- GIVEN ein Benutzer oder Crawler ruft eine Idea-Seite auf
- WHEN die Seite gerendert wird
- THEN enthält das HTML `<title>`, `<meta name="description">` und Open-Graph-Tags (`og:title`, `og:description`, `og:image`, `og:url`)
- AND die Tags spiegeln Titel, Zusammenfassung und Bild der Idea wider

#### Scenario: Suchseite Meta-Tags

- GIVEN ein Benutzer ruft die Suchseite auf
- WHEN die Seite gerendert wird
- THEN werden generische Plattform-Meta-Tags angezeigt (z.B. "Ideen für Gruppenstunden entdecken — Inspi")

### Requirement: Sitemap und Robots

Das Backend MUST `sitemap.xml` und `robots.txt` für Suchmaschinen-Crawler bereitstellen.

#### Scenario: Sitemap-Generierung

- GIVEN veröffentlichte Ideas und öffentliche Events im System
- WHEN ein Crawler `/sitemap.xml` anfragt
- THEN wird eine XML-Sitemap zurückgegeben, die alle öffentlichen URLs auflistet
- AND die Sitemap enthält `lastmod`-Daten und Prioritätshinweise

#### Scenario: Robots.txt

- GIVEN ein Crawler fragt `/robots.txt` an
- WHEN die Anfrage verarbeitet wird
- THEN erlaubt die robots.txt das Crawlen öffentlicher Inhalte
- AND verweist auf die Sitemap-URL
- AND verbietet das Crawlen von Admin- (`/admin/`) und API-Endpunkten (`/api/`)

### Requirement: DSGVO-konforme View-Verfolgung

Das System MUST Idea-Views verfolgen, ohne personenbezogene Daten zu speichern. Die Implementierung befindet sich im `ViewService` (`backend/idea/services/view_service.py`).

#### Scenario: View-Erfassung

- GIVEN ein Nicht-Bot-Benutzer betrachtet eine Idea
- WHEN der View per POST `/api/ideas/{id}/view` erfasst wird
- THEN wird die IP-Adresse des Benutzers vor der Speicherung mit SHA-256 gehasht
- AND der Hash wird nur für 24-Stunden-Deduplizierung verwendet
- AND keine Roh-IP-Adressen werden jemals in der Datenbank gespeichert

#### Scenario: Bot-Filterung

- GIVEN eine Anfrage von einem bekannten Bot
- WHEN der View-Endpunkt aufgerufen wird
- THEN wird der View NICHT erfasst
- AND die Erkennung prüft den User-Agent gegen eine Liste von 39 Mustern (u.a. `bot`, `crawl`, `spider`, `googlebot`, `bingbot`, `gptbot`, `chatgpt`, `claudebot`, `python-requests`, `curl`, `wget`)

#### Scenario: View-Deduplizierung

- GIVEN derselbe Benutzer (per gehashter IP + Session-Key) betrachtet dieselbe Idea innerhalb von 24 Stunden
- WHEN der View erfasst wird
- THEN wird nur ein View gezählt
- AND nachfolgende Views innerhalb des Zeitfensters werden ignoriert

### Requirement: Such-Analytik

Das System SHOULD Suchanfragen zur Analyse des Nutzerverhaltens im `SearchLog`-Model protokollieren. Details zur SearchLog-Spezifikation siehe `search/spec.md`.

#### Scenario: Anfrage-Protokollierung

- GIVEN ein Benutzer führt eine Suche durch
- WHEN die Suchanfrage verarbeitet wird
- THEN werden `query`, `results_count`, `session_key`, `ip_hash`, `user` (nullable) und `created_at` gespeichert
- AND keine Benutzer-Identifikation außer der optionalen User-FK wird mit dem Protokolleintrag gespeichert
