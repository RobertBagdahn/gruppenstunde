## Context

Zutaten-Stammdaten entstehen über zwei Wege: manuelles Anlegen im Create-Stepper (`frontend-food/src/pages/ingredients/CreateIngredientPage.tsx`) und KI-gestützten URL-Import (`backend/recipe/services/url_import_service.py`, `ai_ingredients_service.py`). Beide Wege erzeugen heute unsaubere Daten:

- Der Import-Prompt (`url_import_service.py:520-530`) lässt Salz/Pfeffer/Wasser **pauschal weg** und verlangt Spezifität nur als Prompt-Anweisung — ohne deterministische Absicherung.
- Generische Namen („Nudeln", „Pfeffer") werden als eigene Zutaten gespeichert; es gibt kein Konzept eines generischen Begriffs.
- `IngredientAlias` ist pro Name eindeutig, sodass derselbe generische Begriff nicht an mehreren Zutaten hängen kann.
- Matching/Dedup (`backend/supply/services/fuzzy_match.py`, `ai_ingredients_service.py:134-166`) erkennt „Zwiebel"/„Zwiebeln" nur zufällig per Substring; es gibt keine Singular/Plural-Normalisierung.

Constraints: Keine Rückwärtskompatibilität nötig (aktive Entwicklung). Pydantic- und Zod-Schemas müssen synchron bleiben. Python-Befehle über `uv run`. PostgreSQL 15 mit `pg_trgm`/pgvector vorhanden. UI-Texte Deutsch, Code Englisch.

## Goals / Non-Goals

**Goals:**
- `IngredientAlias` unterstützt generische, mehrfach verwendbare Aliase über ein `is_generic`-Flag.
- Eine pflegbare Liste generischer Begriffe dient gleichzeitig als Quelle für (a) generische Aliase und (b) die „zu generisch"-Warnung.
- Beim manuellen Anlegen und im Import-Review wird gewarnt, wenn ein Name exakt einem generischen Begriff entspricht.
- Matching und Duplikat-Erkennung sind robust gegen Singular/Plural (inkl. unregelmäßiger deutscher Plurale) via Stemming.
- Der Import-Prompt konkretisiert Salz/Pfeffer/Wasser, statt sie wegzulassen.

**Non-Goals:**
- Keine automatische Rückwärts-Migration bestehender generischer Zutaten in konkrete Zutaten (kann später über die Datenqualitäts-Queue erfolgen).
- Keine harte Blockade beim Anlegen — die „zu generisch"-Erkennung ist eine Warnung, kein Verbot.
- Keine Überarbeitung der allgemeinen Fuzzy-/Embedding-Suche über das Stemming hinaus.
- URL-Import-Fehlermeldungen sind separater Change (`url-import-error-messages`).

## Decisions

### D1: `is_generic`-Flag auf `IngredientAlias` statt eigenem Modell
`IngredientAlias` erhält `is_generic: bool` (default `False`). Die Unique-Constraint auf `name` wird durch eine **partielle** Unique-Constraint ersetzt: eindeutig nur, solange `is_generic = False`. Generische Aliase (`is_generic = True`) dürfen denselben Namen mehrfach (an verschiedenen Ingredients) tragen.

- **Warum**: Minimal-invasiv, nutzt das bestehende Alias-Konzept und die bestehende Matching-Logik (Aliase werden bereits durchsucht in `fuzzy_match.py:28-42`).
- **Alternative (verworfen)**: Eigenes `GenericTerm`-Modell mit M2M — sauberer getrennt, aber größerer Umbau und doppelte Matching-Pfade.

### D2: Liste generischer Begriffe als Single Source of Truth
Die Menge der generischen Begriffe ergibt sich aus allen `IngredientAlias` mit `is_generic = True` (distinct über `name`, case-insensitive). Diese Menge wird sowohl für die Warn-Erkennung (D3) als auch für den konkretisierenden Import-Prompt (D5) genutzt.

- **Warum**: Eine Datenquelle, keine doppelte Pflege. Begriffe können über die normale Alias-Verwaltung gepflegt werden.
- **Seed**: Initiale Begriffe (Salz, Pfeffer, Nudeln, Wasser, Öl, Mehl, …) werden über ein Seed/Management-Command angelegt.

### D3: „Zu generisch"-Erkennung per Exact-Match gegen die Begriffsliste
Ein neuer Service `is_generic_name(name) -> bool` prüft case-insensitive, ob der getrimmte Name exakt einem generischen Begriff entspricht. Backend-seitig in den Create- und Import-Schemas als nicht-blockierendes Warn-Feld (`name_warning: str | None`) zurückgegeben.

- **Warum**: Deterministisch, günstig, vom Nutzer nachvollziehbar; nutzt die gepflegte Liste statt unzuverlässiger Heuristik/KI.
- **Alternative (verworfen)**: Heuristik „fehlende Zustandsform" (sprachlich fehleranfällig) und KI-Klassifikation (teuer).

### D4: Singular/Plural-Normalisierung via `snowballstemmer`
Neue Utility `normalize_term(text) -> str` auf Basis von `snowballstemmer` (deutscher Stemmer). Matching (`ai_ingredients_service`) und Duplikat-Erkennung vergleichen normalisierte Formen zusätzlich zum bestehenden exakten/Alias-Match. Unregelmäßige Fälle (z.B. „Apfel"/„Äpfel"), die der Stemmer nicht abdeckt, werden über manuell gepflegte Aliase ergänzt.

- **Warum**: leichtgewichtig, reines Python, schnell integriert; deckt regelmäßige Plurale gut ab.
- **Trade-off**: Neue Dependency; Stemming kann übergeneralisieren (siehe Risiken).

### D5: Import-Prompt konkretisiert Grundzutaten
Der Prompt in `url_import_service.py` (und analog `ai_ingredients_service.py`) wird geändert: Salz/Pfeffer/Wasser werden **nicht mehr weggelassen**, sondern konkretisiert importiert („Salz" → „Jodsalz", „Pfeffer" → „Schwarzer Pfeffer gemahlen", „Wasser" → „Leitungswasser"). Jede Zutat einzeln, keine „und"-Verbindungen, immer mit Zustandsform.

- **Warum**: Stakeholder will diese Zutaten in Nährwert- und Einkaufsplanung sehen.

### Betroffene Dateien
- Backend: `backend/supply/models/ingredient.py` (oder Alias-Modul) — `IngredientAlias.is_generic`, partielle Unique-Constraint; neue Migration `supply`.
- Backend: `backend/supply/services/` — neue `term_normalization.py` (`normalize_term`) und `generic_terms.py` (`is_generic_name`, `get_generic_terms`).
- Backend: `backend/supply/services/fuzzy_match.py`, `backend/recipe/services/ai_ingredients_service.py` — normalisiertes Matching/Dedup.
- Backend: `backend/recipe/services/url_import_service.py` — Prompt-Anpassung (D5) + Warn-Auswertung im Review-Output.
- Backend: `backend/supply/schemas/ingredients.py`, `backend/recipe/schemas/` — `is_generic` an Alias-Schemas, `name_warning` an Create-/Suggest-/Import-Response.
- Backend: Seed/Management-Command für initiale generische Begriffe.
- Frontend: `frontend-food/src/schemas/supply.ts` (Zod-Sync), `frontend-food/src/pages/ingredients/CreateIngredientPage.tsx` (Warnung), `frontend-food/src/pages/recipes/RecipeImportPage.tsx` (Warnung im Review).

### API-Änderungen
- Create/Update Ingredient-Responses und URL-Import-Review-Items enthalten zusätzlich `name_warning: str | None` (deutscher Text, z.B. „‚Nudeln' ist zu generisch — bitte konkretisieren, z.B. ‚Fusilli trocken'.").
- Alias-Schemas (Create/Read) enthalten `is_generic: bool`.
- Kein neuer Endpoint zwingend nötig; optional `GET /api/supply/generic-terms/` zum Abruf der Begriffsliste für Frontend-Hinweise.

## Risks / Trade-offs

- **Stemming übergeneralisiert** (z.B. „Tomate"/„Tomatenmark" könnten kollidieren) → Stemming nur als **zusätzlicher** Match-Pfad, nie als alleiniges Kriterium; exakter Name/Alias hat Vorrang. Tests mit kritischen Wortpaaren.
- **Partielle Unique-Constraint** auf bestehenden Daten → Vor der Migration prüfen, dass keine nicht-generischen Alias-Duplikate existieren; Migration ggf. mit Datenbereinigungsschritt.
- **Neue Dependency (Stemming)** erhöht Build-Größe → akzeptabel; reine Python-Lib, keine nativen Extras nötig (Snowball via NLTK oder `snowballstemmer`).
- **Begriffsliste unvollständig** → Warnung greift nur für gepflegte Begriffe; Liste über Alias-Verwaltung erweiterbar, keine Fehlfunktion bei Lücken.
- **Import konkretisiert falsch** (z.B. immer „Jodsalz") → bewusste Default-Konkretisierung; Nutzer kann im Review korrigieren.

## Migration Plan

1. Dependency hinzufügen (`uv add <stemming-lib>`), Lockfile aktualisieren.
2. Datencheck: nicht-generische Alias-Duplikate identifizieren und bereinigen.
3. Migration `supply`: `is_generic` hinzufügen, alte Unique-Constraint durch partielle Constraint ersetzt — `uv run python manage.py makemigrations supply` + `migrate`.
4. Seed-Command für initiale generische Begriffe ausführen.
5. Backend-Services + Schemas, dann Zod-Schemas synchronisieren, dann Frontend-Warnungen.
6. Rollback: Migration rückwärts (Flag entfernen, alte Unique-Constraint wiederherstellen — nur möglich, solange keine generischen Duplikate angelegt wurden; daher Rollback früh).

## Open Questions

- (geklärt) „Wasser" wird konkretisiert zu „Leitungswasser" und importiert.
- (geklärt) Stemming-Lib: `snowballstemmer`, unregelmäßige Fälle über Pflege-Aliase.
