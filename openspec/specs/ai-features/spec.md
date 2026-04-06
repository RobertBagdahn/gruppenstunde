# ai-features Specification

## Purpose

KI-gestuetzte Funktionen mit Google Gemini 2.5 Flash fuer Unterstuetzung bei der Inhaltserstellung, Textverbesserung, automatische Tag-Vorschlaege, Content-Aufbereitung (Freitext zu strukturierter Idea), Embedding-Generierung und Event-Einladungstext-Erstellung. Alle KI-Funktionen sind ueber den `/api/ai/`-Router erreichbar.

## Requirements

### Requirement: KI-Authentifizierung

Das System MUST alle KI-Endpunkte unter `/api/ai/` auf authentifizierte Sessions beschraenken.

#### Scenario: Authentifizierter Zugriff

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer einen `/api/ai/`-Endpunkt aufruft
- THEN wird die Anfrage normal verarbeitet

#### Scenario: Nicht-authentifizierter Zugriff

- GIVEN ein nicht-authentifizierter Benutzer
- WHEN der Benutzer einen `/api/ai/`-Endpunkt aufruft
- THEN wird HTTP 401 Unauthorized zurueckgegeben

### Requirement: KI-Rate-Limiting

Das System MUST KI-Anfragen pro Benutzer begrenzen, um uebermassige Gemini-API-Kosten zu vermeiden.

#### Scenario: Rate-Limit einhalten

- GIVEN ein authentifizierter Benutzer
- WHEN der Benutzer innerhalb einer Stunde mehr als 30 KI-Anfragen stellt
- THEN wird HTTP 429 Too Many Requests zurueckgegeben
- AND die Antwort enthaelt einen `Retry-After`-Header

### Requirement: Textverbesserung

Das System SHALL Benutzern ermoeglichen, bestehenden Text per KI zu verbessern.

#### Scenario: Idea-Beschreibung verbessern

- GIVEN ein authentifizierter Benutzer bearbeitet eine Idea
- WHEN der Benutzer Text und Feldnamen an POST `/api/ai/improve-text/` sendet (Body: `{ text: string, field: string }`)
- THEN gibt die KI eine verbesserte Version des Textes zurueck (Response: `{ improved_text: string }`)
- AND der Originaltext bleibt erhalten bis der Benutzer die Verbesserung annimmt
- AND der verbesserte Text bleibt in der gleichen Sprache (Deutsch)

#### Scenario: KI-Dienst nicht verfuegbar

- GIVEN die Google Gemini API ist nicht erreichbar
- WHEN ein Benutzer Textverbesserung anfragt
- THEN wird HTTP 503 Service Unavailable zurueckgegeben mit `{ detail: "KI-Dienst ist derzeit nicht verfuegbar", code: "AI_UNAVAILABLE" }`
- AND der Originaltext bleibt unveraendert

### Requirement: Tag-Vorschlaege

Das System SHALL relevante Tags fuer Ideas per KI und Tag-Embeddings vorschlagen.

#### Scenario: KI-Tag-Vorschlag

- GIVEN eine Idea mit Titel und Beschreibung
- WHEN der Benutzer Tag-Vorschlaege per POST `/api/ai/suggest-tags/` anfragt (Body: `{ title: string, description: string }`)
- THEN analysiert die KI den Inhalt und gibt vorgeschlagene Tags zurueck (Response: `{ tag_ids: number[], tag_names: string[] }`)
- AND Vorschlaege werden aus der freigegebenen Tag-Liste ausgewaehlt
- AND Vorschlaege werden nach Relevanz per Tag-Embeddings (Kosinus-Aehnlichkeit) sortiert
- AND der Benutzer kann jeden Vorschlag annehmen oder ablehnen

### Requirement: Content-Aufbereitung (Refurbish)

Das System MUST die Umwandlung von unstrukturiertem Freitext in eine strukturierte Idea per KI unterstuetzen.

#### Scenario: Freitext aufbereiten

- GIVEN ein authentifizierter Benutzer mit unstrukturiertem Rohtext (z.B. Notizen von einer Gruppenstunde)
- WHEN der Benutzer den Text an POST `/api/ai/refurbish/` sendet (Body: `{ raw_text: string }`)
- THEN extrahiert und generiert die KI strukturierte Felder:
  - `title`, `summary`, `summary_long`, `description`
  - `idea_type` (default: "idea")
  - `costs_rating`, `execution_time`, `preparation_time`, `difficulty`
  - `suggested_tag_ids`, `suggested_tag_names`, `suggested_tags`
  - `suggested_scout_level_ids`
  - `suggested_materials` (Array mit `{ quantity, material_name, material_unit, quantity_type }`)
- AND das Ergebnis wird als strukturiertes JSON zurueckgegeben
- AND der Benutzer kann vor dem Speichern pruefen und bearbeiten

#### Scenario: Aufbereitung mit unzureichendem Input

- GIVEN minimaler oder sehr kurzer Eingabetext (weniger als 20 Zeichen)
- WHEN der Benutzer ihn zur Aufbereitung einreicht
- THEN generiert die KI was moeglich ist und laesst unsichere Felder leer
- AND der Benutzer wird aufgefordert fehlende Informationen zu ergaenzen

### Requirement: Embedding-Generierung

Das System SHALL Vektor-Embeddings fuer Ideas und Tags per Googles text-embedding-004-Modell generieren. Die Embedding-Generierung erfolgt asynchron nach dem Speichern, um die API-Antwortzeit nicht zu beeintraechtigen.

#### Scenario: Idea-Embedding erstellen

- GIVEN eine Idea mit Titel und Beschreibung
- WHEN die Idea gespeichert oder aktualisiert wird
- THEN wird ein 768-dimensionales Embedding aus dem kombinierten Text generiert
- AND das Embedding wird im `embedding`-Feld der Idea gespeichert (derzeit als BinaryField, geplant: pgvector VectorField)
- AND die Embedding-Generierung SHOULD asynchron erfolgen und die API-Antwort nicht blockieren

#### Scenario: Tag-Embedding erstellen

- GIVEN ein neuer oder aktualisierter Tag
- WHEN der Tag gespeichert wird
- THEN wird ein 768-dimensionales Embedding aus Tag-Name und -Beschreibung generiert
- AND das Embedding wird fuer semantische Tag-Vorschlaege verwendet

### Requirement: KI-Event-Einladungstext

Das System SHALL Einladungstexte fuer Events per KI generieren.

#### Scenario: Event-Einladung generieren

- GIVEN ein Event mit Name, Beschreibung, Daten und Buchungsoptionen
- WHEN der Organisator einen KI-generierten Einladungstext per POST `/api/events/generate-invitation/` anfragt
- THEN generiert die KI eine freundliche, informative Einladung auf Deutsch
- AND der Text enthaelt Event-Details, Daten und Registrierungsinformationen
- AND die Antwort hat das Format `{ invitation_text: string }`

### Requirement: KI-gestuetzter Idea-Erstellungs-Assistent

Das Frontend SHALL einen 3-Schritt KI-unterstuetzten Idea-Erstellungsfluss bereitstellen.

#### Scenario: Schritt 1 — Frei beschreiben

- GIVEN ein authentifizierter Benutzer auf der CreateHubPage (`/create`)
- WHEN der Benutzer zum "Aufbereiten"-Flow navigiert (Route: `/create/refurbish`)
- THEN wird ein Freitext-Eingabefeld praesentiert
- AND der Benutzer kann unstrukturierten Inhalt einfuegen oder eintippen

#### Scenario: Schritt 2 — KI strukturiert Inhalt

- GIVEN der Benutzer hat Freitext in Schritt 1 eingereicht
- WHEN die KI den Text ueber den Refurbish-Endpunkt verarbeitet
- THEN wird eine strukturierte Idea-Vorschau mit allen extrahierten Feldern angezeigt
- AND der Benutzer kann jedes Feld bearbeiten

#### Scenario: Schritt 3 — Pruefen und speichern

- GIVEN der Benutzer hat die strukturierte Idea geprueft
- WHEN der Benutzer bestaetigt und speichert
- THEN wird die Idea als Entwurf erstellt (Status "draft")
- AND der Benutzer wird zur Idea-Detailseite weitergeleitet

### Requirement: KI-Autovervollstaendigung fuer Zutaten

Das System SHALL KI-gestuetzte Vorschlaege beim Anlegen und Bearbeiten von Zutaten ueber Google Gemini Flash bereitstellen. Die Vorschlaege erfolgen schrittweise in 6 Phasen, jeweils ueber einen eigenen Endpunkt.

#### Scenario: Schritt 1 — Basis-Info

- GIVEN eine Zutat mit Name
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/basic/` aufruft
- THEN schlaegt die KI vor:
  - `name` — Korrigierter/standardisierter Name
  - `description` — Kurzbeschreibung der Zutat
  - `retail_section` — Passende Supermarkt-Abteilung (RetailSection)
- AND der Benutzer kann jeden Vorschlag annehmen oder ablehnen

#### Scenario: Schritt 2 — Physikalische Eigenschaften

- GIVEN eine Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/physical/` aufruft
- THEN schlaegt die KI vor:
  - `physical_density` — Dichte
  - `physical_viscosity` — solid oder beverage
  - `durability_in_days` — Haltbarkeit in Tagen
  - `max_storage_temperature` — Max. Lagertemperatur

#### Scenario: Schritt 3 — Allergene/Unvertraeglichkeiten

- GIVEN eine Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/tags/` aufruft
- THEN schlaegt die KI passende NutritionalTags vor (z.B. "Enthaelt Gluten", "Enthaelt Laktose")
- AND die Vorschlaege werden aus der bestehenden NutritionalTag-Liste ausgewaehlt

#### Scenario: Schritt 4 — Scores

- GIVEN eine Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/scores/` aufruft
- THEN schlaegt die KI vor:
  - `child_score` (1-10) — Kinderfreundlichkeit
  - `scout_score` (1-10) — Pfadfindereignung
  - `environmental_score` (1-10) — Umweltfreundlichkeit
  - `nova_score` (1-4) — NOVA-Verarbeitungsgrad

#### Scenario: Schritt 5 — Rezept-Info

- GIVEN eine Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/recipe-info/` aufruft
- THEN schlaegt die KI vor:
  - Standard-Rezeptgewicht (typische Portion)
  - Ob Rohverzehr moeglich ist

#### Scenario: Schritt 6 — Naehrwerte

- GIVEN eine Zutat
- WHEN der Benutzer POST `/api/ingredients/{slug}/ai/nutrition/` aufruft
- THEN schlaegt die KI alle Naehrwerte pro 100g vor:
  - energy_kj, protein_g, fat_g, fat_sat_g, carbohydrate_g, sugar_g, fibre_g, salt_g, sodium_mg, fructose_g, lactose_g
  - fruit_factor (0.0-1.0)
- AND die Werte werden validiert (keine negativen Werte, plausible Bereiche)

#### Scenario: KI-Implementierung

- GIVEN die KI-Autovervollstaendigung
- THEN gilt:
  - Pydantic-Modelle definieren die erwartete Antwortstruktur pro Schritt
  - Gemini Flash generiert die Vorschlaege
  - Antworten werden gegen das Pydantic-Schema validiert
  - Vorschlaege werden dem User praesentiert (nicht automatisch uebernommen)
  - Service: `ingredient_ai.py` mit Funktion `get_suggestions(step: str, ingredient_slug: str) -> dict`

## Planned Features

Die folgenden Features sind geplant, aber noch nicht implementiert:

### Planned: Rate-Limiting fuer KI-Endpunkte

- Derzeit existiert kein Rate-Limiting fuer die KI-Endpunkte. Jeder authentifizierte Benutzer kann unbegrenzt viele Anfragen senden.
- Geplant: Middleware oder Decorator-basiertes Rate-Limiting mit 30 Anfragen pro Stunde pro Benutzer.

### Planned: Authentifizierung fuer KI-Endpunkte

- Derzeit haben die AI-Endpunkte im Code keine Auth-Dekoratoren — sie sind oeffentlich zugaenglich.
- Geplant: Alle `/api/ai/`-Endpunkte erfordern authentifizierte Sessions.
