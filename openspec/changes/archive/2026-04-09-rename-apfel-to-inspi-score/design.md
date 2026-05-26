## Context

Das aktuelle Rezept-Bewertungssystem heißt "Apfel Score" / "Apple Rating" und nutzt grüne Apfel-Emojis (🍏) als visuelle Indikatoren für eine 1-5 Skala in vier Dimensionen (Preis, Gesundheit, Sättigung, Geschmack). Die Berechnungslogik im Backend-Service (`apple_rating_service.py`) ist ausgereift und funktioniert korrekt.

Das Problem: Der Name "Apfel" und das Apple-Emoji haben keinen Bezug zur Marke "Inspi". Die Plattform hat ein gut etabliertes Maskottchen (den Inspi-Kopf), das bereits als Favicon dient und überall in der UI präsent ist.

Betroffene Dateien:
- **Backend**: `backend/recipe/services/apple_rating_service.py`, `backend/recipe/schemas/nutrition.py`, `backend/recipe/api/nutrition.py`, `backend/recipe/tests/test_apple_rating.py`
- **Frontend**: `frontend/src/components/recipe/AppleRating.tsx`, `frontend/src/schemas/recipe.ts`, `frontend/src/api/recipes.ts`, `frontend/src/pages/recipes/RecipeDetailPage.tsx`

## Goals / Non-Goals

**Goals:**
- Alle Referenzen von "Apple Rating" / "Apfel Score" zu "Inspi Score" umbenennen (Code, Dateinamen, API-Routen)
- Apfel-Emoji (🍏) durch den Inspi-Kopf (favicon.png) als Bewertungssymbol ersetzen
- Pydantic- und Zod-Schemas synchron umbenennen
- Bestehende Tests unter neuem Namen beibehalten

**Non-Goals:**
- Keine Änderung der Berechnungslogik (die vier Dimensionen und ihre Formeln bleiben identisch)
- Keine Änderung der Nutri-Score-Verbesserungsvorschläge (NutriImprovementCards)
- Kein neues favicon erstellen — das bestehende `favicon.png` wird weiterverwendet
- Keine Änderung des Referenzwert-Vergleich-Systems

## Decisions

### 1. Favicon als `<img>` statt Emoji

**Entscheidung**: Das Apfel-Emoji (`🍏` / `○`) wird durch `<img src="/images/favicon.png">` ersetzt. Gefüllte Inspi-Köpfe zeigen den Score, leere werden als graue, halb-transparente Variante mit CSS (`opacity-25 grayscale`) dargestellt.

**Alternativen**:
- *SVG-Icon inline*: Würde kleinere Bundle-Größe ermöglichen, erfordert aber das Erstellen einer SVG-Version des Inspi-Kopfes. Das favicon.png existiert bereits und ist klein genug.
- *CSS-Masken/Clip-Path*: Zu komplex für ein einfaches Rebranding.

**Begründung**: Die einfachste Lösung mit sofort sichtbarem Ergebnis. Das favicon.png ist bereits im Public-Verzeichnis verfügbar und wird vom Browser gecached.

### 2. Durchgehende Umbenennung aller Bezeichner

**Entscheidung**: Alle Bezeichner werden konsistent umbenannt:

| Vorher | Nachher |
|--------|---------|
| `apple_rating_service.py` | `inspi_score_service.py` |
| `calculate_apple_rating()` | `calculate_inspi_score()` |
| `AppleRatingOut` | `InspiScoreOut` |
| `AppleRatingDimensionOut` | `InspiScoreDimensionOut` |
| `AppleRatingSchema` | `InspiScoreSchema` |
| `AppleRatingDimensionSchema` | `InspiScoreDimensionSchema` |
| `useAppleRating()` | `useInspiScore()` |
| `AppleRating.tsx` | `InspiScore.tsx` |
| `GET /{id}/apple-rating/` | `GET /{id}/inspi-score/` |
| `test_apple_rating.py` | `test_inspi_score.py` |

**Begründung**: Da keine Rückwärtskompatibilität nötig ist, wird alles sauber auf einmal umbenannt.

### 3. API-Endpunkt-Änderung

**Entscheidung**: `GET /api/recipes/{recipe_id}/apple-rating/` wird zu `GET /api/recipes/{recipe_id}/inspi-score/`.

| Methode | Alter Pfad | Neuer Pfad | Response Schema |
|---------|-----------|------------|-----------------|
| GET | `/{recipe_id}/apple-rating/` | `/{recipe_id}/inspi-score/` | `InspiScoreOut` |

Das Response-Format bleibt identisch — nur der Endpunkt-Name und Schema-Klasse ändern sich.

**Begründung**: Kein Redirect nötig, da keine externen Konsumenten und keine Rückwärtskompatibilität erforderlich.

### 4. Keine Datenbank-Migrationen

**Entscheidung**: Es werden keine Migrationen erstellt. Das Apple-Rating-System nutzt keine eigenen Datenbank-Modelle — es berechnet Scores on-the-fly aus bestehenden `cached_*` Feldern des Recipe-Models.

## Risks / Trade-offs

- **[Bildqualität bei kleiner Darstellung]** → Das favicon.png wird als ~18px Icon dargestellt. Bei dieser Größe könnte das Bild unscharf wirken. Mitigation: CSS `image-rendering: auto` und Prüfung der visuellen Qualität bei verschiedenen Größen. Falls nötig, kann später eine optimierte kleine Version erstellt werden.
- **[Cache-Invalidierung Frontend]** → Der TanStack Query Cache-Key ändert sich mit dem neuen Endpunkt-Pfad. Mitigation: Kein Problem, da beide Caches (alt und neu) nicht gleichzeitig existieren werden — es ist ein einmaliger Deploy.
- **[OpenSpec Spec-Name]** → Die bestehende Spec heißt `recipe-apple-rating`. Sie wird via Delta-Spec modifiziert, aber der Ordnername bleibt bestehen. Bei Archivierung wird die Spec aktualisiert.
