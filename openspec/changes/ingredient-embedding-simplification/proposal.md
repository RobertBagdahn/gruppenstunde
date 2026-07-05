## Why

Die Ingredient-Embeddings sind heute unnötig komplex und schlecht kalibriert: Der Embedding-Text serialisiert **alle** 30+ Felder einer Zutat (Nährwerte, Scores, Preis, Lagerung, Saison, Tags), obwohl der eigentliche Zweck — semantische Zutatenähnlichkeit — nur Name, Beschreibung und Warengruppe braucht. Das Modell (`text-embedding-004`, 768 Dimensionen über Cloud SQL/Gemini-SDK) ist überdimensioniert für diesen schmalen Anwendungsfall, und die Duplikaterkennung (`ingredient-similar-endpoint`) arbeitet mit einem unkalibrierten rohen Cosine-Distance-Schwellenwert (`0.05`) statt einer verständlichen Prozent-Ähnlichkeit — das begünstigt Fehlklassifikationen wie "Schweinebauch" ≈ "Schweinenacken". Zusätzlich existiert auf `Ingredient` ein totes `search_vector`-Feld (nie befüllt, kein Index, keine Query) als Altlast des generischen `Content`-Patterns, das `Ingredient` gar nicht erbt.

Dieser Change vereinfacht den Embedding-Text auf die relevanten Strings, wechselt auf ein Modell mit nativer Dimensionsreduktion (`gemini-embedding-2`/Vertex AI), verkürzt die gespeicherten Vektoren nach experimenteller Validierung, führt eine kalibrierte %-Ähnlichkeitsanzeige ein und entfernt das tote `search_vector`-Feld.

## What Changes

- **Embedding-Text vereinfachen**: `build_ingredient_embedding_text()` reduziert auf `name`, `description`, `Abteilung: {retail_section.name}` — keine Nährwerte/Scores/Preis/Tags mehr im Text.
- **Modellwechsel service-weit**: Ablösung von `text-embedding-004` (Cloud-SQL-`embedding()`-Funktion + Gemini-SDK-Fallback) durch `gemini-embedding-001` via Vertex AI (verifiziert: `gemini-embedding-2`/`gemini-embedding-2-preview` existieren nicht als Modell-IDs im Projekt; nativer Default-Output ist 3072 Dimensionen, per `output_dimensionality` konfigurierbar auf 768/384/256/128/64 — bereits live gegen das Projekt getestet) für **alle** Content-Typen (Ingredient, Recipe, Blog, Game, GroupSession). Nutzt die bereits bestehende Vertex-AI-Client-Infrastruktur in `core/services/gemini.py`. **BREAKING**: Cloud-SQL-natives `embedding()` als Fallback-Pfad entfällt vollständig.
- **Dimensionsreduktion**: Vektorlänge wird experimentell an 100 Test-Zutaten evaluiert (native Truncation via `output_dimensionality` vs. PCA vs. einfaches Slicing der ersten/letzten n Spalten) und danach service-weit auf die validierte Ziel-Dimension umgestellt (Kandidaten: 768/384/256/128/64). **BREAKING**: Vektordimension aller `embedding`-Spalten ändert sich.
- **Bulk-Neuberechnung**: Alle bestehenden Embeddings (Ingredient, Recipe, Blog, Game, GroupSession) werden einmalig per Management-Command auf das neue Modell/Dimension neu berechnet.
- **`search_vector` entfernen**: Feld, Migration-Drop, und alle Restreferenzen im Ingredient-Modell werden entfernt (nach Verifikation, dass es nirgends gelesen wird).
- **`_text_hash()` reaktivieren**: Bestehende, aktuell tote Hash-Funktion wird für Änderungserkennung genutzt statt der fragilen `embedding_updated_at >= updated_at`-Heuristik.
- **Kalibrierte %-Ähnlichkeit**: Sigmoid-Kalibrierung (gefittet auf 30+ manuell bewerteten Ground-Truth-Paaren) rechnet Cosine-Similarity in eine Prozent-Ähnlichkeit um. `ingredient-similar-endpoint` und die Duplikaterkennung im Data-Quality-Dashboard geben `similarity_pct` statt `distance` zurück; der Schwellenwert wird entsprechend auf Prozentbasis umgestellt.
- **Frontend**: `EmbeddingViewerPage` (Admin) zeigt die neue %-Ähnlichkeit an.
- **EmbeddingFeedback-Modell erweitern**: `content_type`-Auswahl um `ingredient` ergänzen (Datenmodell-Vorbereitung; Feature-UI folgt in separatem Change).
- Kein Rollback-Pfad — harter Cutover, alte 768-dim-Werte werden überschrieben.

## Capabilities

### New Capabilities
(keine)

### Modified Capabilities
- `ingredient-embedding`: Embedding-Text-Inhalt (nur name/description/retail_section statt aller Felder), Modell (`gemini-embedding-2` statt `text-embedding-004`), Dimension (validierte Ziel-Dimension statt fix 768), Entfernung von `search_vector`, Hash-basierte Änderungserkennung.
- `ingredient-similar-endpoint`: Response-Format wechselt von `distance` zu kalibriertem `similarity_pct`; Schwellenwert-Parameter wird auf Prozentbasis umgestellt.
- `content-base`: Service-weite Embedding-Pipeline (`Embedding Generation Pipeline`) wechselt Modell/Client (Vertex AI statt Cloud-SQL/Gemini-SDK) und Dimension für alle Content-Typen; `EmbeddingFeedback`-Modell um `ingredient` als möglichen `content_type` erweitert.

## Impact

- **Backend-Apps**: `supply` (Migration: `search_vector` entfernen, `embedding`-Dimension ändern auf `Ingredient`), `content` (`services/embedding_service.py` — Modellwechsel, Vertex-AI-Client, Sigmoid-Kalibrierung; `models/data_quality.py`/`api/data_quality.py` — `similarity_pct`; `models/links.py` — `EmbeddingFeedback.content_type`-Choices), `recipe`/`blog`/`game`/`session` (Migration: `embedding`-Dimension ändern).
- **Schemas**: Pydantic-Schemas für `ingredient-similar-endpoint` und Data-Quality-Duplikat-Responses (`distance` → `similarity_pct`); korrespondierende Zod-Schemas im Frontend.
- **Frontend-Pages**: `frontend/src/pages/admin/EmbeddingViewerPage.tsx` (neue %-Anzeige), Data-Quality-Duplikaterkennung-Ansicht (`frontend-food`).
- **Migrationen**: Django-Migration zum Entfernen von `search_vector` (Ingredient); Migration zur Dimensionsänderung von `embedding` auf allen fünf Modellen (Ingredient, Recipe, Blog, Game, GroupSession); Management-Command für Bulk-Neuberechnung aller Embeddings.
- **Neue Dependency**: `google.genai`-SDK-Nutzung für Vertex AI (bereits im ticket-bot-Projekt etabliert); für das Analyse-Script `scikit-learn`/`numpy` (nur Script-/Dev-Kontext, keine Produktiv-Dependency).
- **Reihenfolge-Abhängigkeit**: Sollte nach Abschluss von `retail-sections-restructure` umgesetzt werden, da sich `retail_section.name`-Werte dort ändern und den Embedding-Text beeinflussen.
- **Explizit außerhalb des Scopes**: Automatisierte Duplikat-Erkennung/-Merge-Logik selbst (Admin-Review-Queue, Merge-Workflow, Dismiss) bleibt unverändert — diese existiert bereits vollständig (`content/api/data_quality.py`, `DuplicateDismissal`-Modell) und wird nur auf die neue %-Metrik umgestellt, nicht funktional erweitert. Async-Threading-Pipeline (`threading.Thread` statt Queue) bleibt unverändert.
