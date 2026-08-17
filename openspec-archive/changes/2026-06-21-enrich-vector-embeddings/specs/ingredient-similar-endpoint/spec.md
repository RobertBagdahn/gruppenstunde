# ingredient-similar-endpoint Specification

## Purpose
Defines the public API endpoint that returns the top N most similar ingredients based on pgvector embedding cosine distance.

## ADDED Requirements

### Requirement: Similar ingredients endpoint
Das System SHALL einen öffentlichen Endpoint bereitstellen, der zu einer gegebenen Zutat die ähnlichsten Zutaten basierend auf Embedding-Cosine-Distance zurückgibt.

#### Scenario: Erfolgreiche Ähnlichkeitssuche
- **WHEN** `GET /api/ingredients/{slug}/similar/?limit=10` aufgerufen wird
- **THEN** SHALL die Antwort eine Liste von bis zu 10 ähnlichen Zutaten sein
- **THEN** SHALL jedes Element `{id, name, slug, distance}` enthalten
- **THEN** SHALL die Liste nach `distance` aufsteigend sortiert sein (niedrigste Distanz = ähnlichste)
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
