# ingredient-similar-endpoint Specification

## Purpose
Defines the public API endpoint that returns the top N most similar ingredients based on pgvector embedding cosine distance.

## ADDED Requirements

### Requirement: Similar ingredients endpoint
Das System SHALL einen öffentlichen Endpoint bereitstellen, der zu einer gegebenen Zutat die ähnlichsten Zutaten basierend auf einer kalibrierten %-Ähnlichkeit der Embeddings zurückgibt.

#### Scenario: Erfolgreiche Ähnlichkeitssuche
- **WHEN** `GET /api/ingredients/{slug}/similar/?limit=10` aufgerufen wird
- **THEN** SHALL die Antwort eine Liste von bis zu 10 ähnlichen Zutaten sein
- **THEN** SHALL jedes Element `{id, name, slug, similarity_pct}` enthalten
- **THEN** SHALL die Liste nach `similarity_pct` absteigend sortiert sein (höchste Ähnlichkeit zuerst)
- **THEN** SHALL die Quell-Zutat selbst nicht in den Ergebnissen sein

#### Scenario: Kein Embedding vorhanden
- **WHEN** die angefragte Zutat kein Embedding hat
- **THEN** SHALL eine leere Liste zurückgegeben werden
- **THEN** SHALL kein Fehler geworfen werden

#### Scenario: Zutat nicht gefunden
- **WHEN** der Slug keiner existierenden Zutat entspricht
- **THEN** SHALL ein 404-Fehler zurückgegeben werden

#### Scenario: Limit-Parameter
- **WHEN** `limit` nicht angegeben wird
- **THEN** SHALL der Default-Wert 10 verwendet werden
- **WHEN** `limit=5` angegeben wird
- **THEN** SHALL maximal 5 Ergebnisse zurückgegeben werden

#### Scenario: Authentifizierung nicht erforderlich
- **WHEN** ein anonymer User den Endpoint aufruft
- **THEN** SHALL die Anfrage erfolgreich sein (öffentlicher Endpoint)

#### Scenario: Visibility-Regeln werden eingehalten
- **WHEN** die Embedding-Suche ähnliche Zutaten findet
- **THEN** SHALL nur Zutaten mit `status=verified` in den Ergebnissen sein (für anonyme User)
- **THEN** SHALL authentifizierte User auch eigene Drafts sehen

### Requirement: Ähnlichkeitsschwelle verhindert falsche Duplikat-Vorschläge

Die embedding-basierte Duplikaterkennung für Zutaten SHALL eine kalibrierte %-Ähnlichkeitsschwelle verwenden, um falsche Positiv-Treffer zu vermeiden. Die Kalibrierung SHALL per Sigmoid-Funktion auf Cosine-Similarity erfolgen, deren Parameter auf mindestens 30 manuell bewerteten Ground-Truth-Paaren (ähnlich/unähnlich) gefittet werden. Verschiedene Fleischstücke (z.B. Schweinebauch vs. Schweinenacken) DÜRFEN NICHT als Duplikate vorgeschlagen werden. Kein Auto-Merge — alle Vorschläge erfordern manuelle Bestätigung.

#### Scenario: Verschiedene Fleischstücke werden nicht zusammengelegt

- **WHEN** die Ähnlichkeitsanalyse ausgeführt wird
- **THEN** erscheinen „Schweinebauch" und „Schweinenacken" NICHT als Duplikat-Vorschlag
- **THEN** erscheinen „Zwiebeln rot" und „Rote Zwiebeln" als Duplikat-Vorschlag (gleiche Zutat, anderer Name)

#### Scenario: Ähnlichkeit wird als Prozentwert angezeigt

- **WHEN** ein Duplikat-Vorschlag in der Datenqualitäts-Ansicht angezeigt wird
- **THEN** SHALL die Ähnlichkeit als kalibrierter Prozentwert (z.B. "97% ähnlich") dargestellt werden, nicht als rohe Cosine-Distance

#### Scenario: Manueller Bestätigungsschritt vor Zusammenführen

- **WHEN** der Nutzer zwei Zutaten zusammenführen möchte
- **THEN** erscheint ein Bestätigungsdialog: „Welche Zutat ist das Hauptrezept, welche wird zusammengeführt?"
- **THEN** erfolgt kein automatisches Zusammenführen ohne Bestätigung

#### Scenario: API-Fehler wird korrekt angezeigt

- **WHEN** der Ähnlichkeits-Endpunkt einen Fehler zurückgibt
- **THEN** zeigt die Datenqualitäts-Seite einen Fehlerstate mit Meldung statt eines leeren weißen Screens

### Requirement: Ähnliche Rezepte in der Datenqualitäts-Ansicht

Das System SHALL auf der Datenqualitäts-Seite eine Ansicht für semantisch ähnliche Rezepte bereitstellen — analog zur bestehenden Ansicht für ähnliche Zutaten.

#### Scenario: Ähnliche Rezepte werden gefunden

- **WHEN** die Ähnlichkeitsanalyse für Rezepte ausgeführt wird
- **THEN** werden Rezeptpaare mit hoher semantischer Ähnlichkeit aufgelistet (z.B. „Nudeln mit Tomatensoße" ≈ „Pasta Bolognese")

#### Scenario: Rezepte zusammenlegen

- **WHEN** der Admin zwei ähnliche Rezepte zusammenlegen möchte
- **THEN** gibt es einen „Zusammenlegen"-Button mit Bestätigungsdialog
- **THEN** der Dialog fragt: welches Rezept ist das Hauptrezept, welches wird als Alias markiert oder gelöscht
