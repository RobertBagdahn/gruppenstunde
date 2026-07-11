## Context

Heute nutzt `content/services/embedding_service.py` für alle Content-Typen (Ingredient, Recipe, Blog, Game, GroupSession) `text-embedding-004` (768 Dimensionen), primär über Cloud SQL's native `embedding()`-SQL-Funktion (`google_ml_integration`-Extension), mit Fallback auf den Gemini-Python-SDK. Der Embedding-Text für Ingredients (`build_ingredient_embedding_text()`) serialisiert aktuell **alle** Felder (Nährwerte, Scores, Preis, Lagerung, Saison, Tags, Warengruppe) als deutschen Fließtext — deutlich mehr als für reine Zutatenähnlichkeit nötig.

Die Duplikaterkennung existiert bereits produktiv (`content/api/data_quality.py`, `DuplicateDismissal`-Modell, Merge-Workflow, Admin-Dashboard unter `/admin/data-quality`) und arbeitet mit einem rohen Cosine-Distance-Schwellenwert (`threshold=0.05`). Das ticket-bot-Projekt nutzt bereits erfolgreich `gemini-embedding-2` über Vertex AI (`google.genai`-SDK) mit nativer Dimensionsreduktion via `EmbedContentConfig(output_dimensionality=N)` — dieser Pfad ist über Cloud SQL's `embedding()`-Funktion NICHT verfügbar (die SQL-Funktion kennt nur `embedding(model, text)`, ohne Dimensions-Parameter).

`Ingredient` trägt zusätzlich ein totes `search_vector`-Feld (`SearchVectorField`, nie befüllt, kein GIN-Index) als Altlast — vermutlich ursprünglich aus dem generischen `Content`-Pattern übernommen, das `Ingredient` (als eigenständiges Modell) nie genutzt hat.

## Goals / Non-Goals

**Goals:**
- Embedding-Text für Ingredients auf name, description, retail_section reduzieren.
- Experimentell die kürzeste Vektor-Dimension ermitteln, die bei gleicher Ranking-Qualität funktioniert (Top-10-Overlap ggü. 768-dim-Baseline).
- Service-weiten Umstieg von Cloud-SQL/`text-embedding-004` auf Vertex-AI/`gemini-embedding-2` mit nativer Dimensionsreduktion.
- Kalibrierte %-Ähnlichkeit (Sigmoid-Fit auf Ground-Truth-Paaren) statt roher Cosine-Distance in allen Ingredient-Ähnlichkeits-APIs.
- Totes `search_vector`-Feld entfernen; `_text_hash()` reaktivieren.

**Non-Goals:**
- Keine neue Duplikat-Erkennungs-Logik (Merge/Dismiss/Review-Queue) — diese existiert bereits und wird nur auf die neue %-Metrik umgestellt.
- Keine Umstellung der asynchronen `threading.Thread`-Pipeline auf eine Job-Queue.
- Kein neues `EmbeddingFeedback`-UI-Feature für Ingredients — nur Datenmodell-Erweiterung (`content_type`-Choice) als Vorbereitung.
- Keine Rückwärtskompatibilität/Rollback-Pfad für alte 768-dim-Werte.

## Decisions

### 1. Embedding-Text-Reduktion (Ingredient)
`build_ingredient_embedding_text()` wird auf drei Bausteine reduziert: `Zutat: {name}.`, `{description[:2000]}` (falls vorhanden), `Abteilung: {retail_section.name}.` (falls vorhanden). Alle anderen Serialisierungs-Blöcke (Nährwerte, Scores, Preis, Lagerung, Saison, Tags) entfallen. Begründung: Semantische Ähnlichkeit soll ausschließlich auf Bedeutung von Name/Beschreibung/Kategorie beruhen, nicht auf numerischen Attributen, die zwei bedeutungsmäßig verschiedene Zutaten (z. B. unterschiedliche Fleischstücke) künstlich näher zusammenziehen können. Andere Content-Typen (Recipe/Blog/Game/GroupSession) behalten ihre bestehende Textzusammensetzung — nur das Modell/die Dimension ändert sich dort.

### 2. Modellwechsel: Vertex AI / `gemini-embedding-2` statt Cloud-SQL / `text-embedding-004`
**Wichtige Korrektur ggü. ursprünglicher Annahme**: Ein separater Vertex-AI-Client (wie im ticket-bot-Projekt) ist NICHT nötig. `core/services/gemini.py` betreibt bereits einen Vertex-AI-`genai.Client` (`_get_client()`, `vertexai=True`, `project=settings.GOOGLE_CLOUD_PROJECT`, `location=settings.VERTEX_AI_LOCATION`), den auch die bestehende `gemini_embed()`-Funktion nutzt. Der Code-Kommentar in `gemini.py` ("Direct genai.Client usage is not permitted elsewhere") ist eine bestehende Konvention — jede `genai.Client`-Nutzung MUSS über `core/services/gemini.py` laufen, nicht über einen neuen Client in `embedding_service.py`.
Umsetzung: `gemini_embed()` bekommt einen neuen `output_dimensionality: int | None`-Parameter, der an `EmbedContentConfig` durchgereicht wird; der Default-Modellwert wechselt von `text-embedding-004` auf `gemini-embedding-001`. `content/services/embedding_service.py::create_embedding()` ruft direkt `gemini_embed()` auf; der bisherige Cloud-SQL-`embedding()`-Fallback-Pfad entfällt vollständig, da er keine Dimensionskonfiguration unterstützt.
- **Alternative erwogen**: Nur Ingredient umstellen, andere Content-Typen bei `text-embedding-004` belassen. Verworfen, da dies zwei parallele Embedding-Pipelines dauerhaft im Code hält und Content-Linking (`ContentLink`, cross-type Embedding-Vergleiche) sonst Vektoren unterschiedlicher Modelle/Räume vermischen würde.
- **Namens-Risiko (verifiziert, 2026-07-05)**: Live gegen das Projekt `inspi-441320` (`location=global`) getestet — `gemini-embedding-2` und `gemini-embedding-2-preview` existieren NICHT (404 Publisher model not found). Der korrekte, funktionierende Modell-Bezeichner ist `gemini-embedding-001`. Ohne `output_dimensionality`-Config liefert dieses Modell standardmäßig **3072 Dimensionen** (nicht 768 wie `text-embedding-004`).
- **Regions-Risiko (verifiziert)**: `location="global"` funktioniert für `gemini-embedding-001` — kein Regionswechsel nötig.
- **Dimensions-Risiko (verifiziert)**: `output_dimensionality` wurde live für 768/384/256/128/64 getestet — alle fünf Werte werden korrekt zurückgegeben. Native Truncation funktioniert wie erwartet.

### 3. Dimensionsreduktion: natives `output_dimensionality` bevorzugt, Experiment entscheidet endgültige Größe
Ein einmaliges Analyse-Script (`supply/scripts/embedding_dimension_experiment.py`, nicht Teil der Produktiv-Pipeline) vergleicht an 100 Test-Zutaten (Zufallsstichprobe + 20+ kuratierte Problemfälle, real + ggf. konstruiert) vier Varianten:
1. Native Truncation via `output_dimensionality` (Vertex AI SDK).
2. PCA (scikit-learn), gefittet auf denselben 100 Testvektoren (bewusst kein Produktions-Fit — nur Prototyp-Vergleich).
3. Erste n Spalten des vollen Vektors.
4. Letzte n Spalten des vollen Vektors.

Getestete Zieldimensionen: 3072 (nativer Default von `gemini-embedding-001`, dient als Baseline statt der bisher angenommenen 768), 768, 384, 256, 128, 64. Qualitätsmetrik: Top-10-Overlap zwischen Baseline-Ranking (3072-dim) und verkürztem Ranking pro Testzutat, gemittelt über alle 100. Die im Experiment beste Variante/Dimension wird für den Produktiv-Rollout übernommen (Vorzugsweise natives `output_dimensionality`, da es ohne zusätzliche Nachverarbeitung auskommt und bereits live verifiziert wurde).

### 4. Sigmoid-Kalibrierung der %-Ähnlichkeit
Cosine-Similarity (nicht Distance) wird durch eine Sigmoid-Funktion $f(x) = \frac{1}{1 + e^{-k(x - x_0)}}$ auf einen 0–100%-Bereich abgebildet. Parameter $k$ (Steilheit) und $x_0$ (Mittelpunkt) werden per Least-Squares/Optimierung auf 30+ manuell bewerteten Ground-Truth-Paaren (ähnlich=1, unähnlich=0) gefittet. Fällt der Fit instabil aus, werden weitere Paare ergänzt statt auf eine grobe Heuristik auszuweichen (siehe Risks).

### 5. `search_vector`-Entfernung
Vor dem Feld-Drop wird per Repo-weiter Suche verifiziert, dass `Ingredient.search_vector` nirgends gelesen wird (kein GIN-Index, keine `SearchQuery`-Nutzung im Ingredient-Kontext). Danach: Migration entfernt das Feld; Fixture `data/food/supply_ingredient.json` wird im gleichen Zug aktualisiert (Feld aus den Fixture-Einträgen entfernt).

### 6. `_text_hash()`-Reaktivierung
Statt `embedding_updated_at >= updated_at` (fragil: jedes Feld-Update auf dem Modell kann fälschlich einen Regenerierungs-Skip auslösen oder verhindern) wird der SHA-256-Hash des Embedding-Texts in einem neuen Feld (`embedding_text_hash`, `CharField`) gespeichert. Ein Update generiert nur dann ein neues Embedding, wenn sich der Hash ändert.

## Risks / Trade-offs

- **[Risk]** PCA auf nur 100 Testvektoren ist statistisch überangepasst (Rang-Limit, keine Generalisierung auf die ~5700 Produktiv-Zutaten) → **Mitigation**: PCA dient nur dem Variantenvergleich im Experiment; für den Produktiv-Rollout wird bevorzugt native Truncation verwendet, die kein Fitting benötigt.
- **[Risk]** Sigmoid-Fit mit nur 30 Paaren kann instabil sein (Overfitting an wenige Datenpunkte) → **Mitigation**: Bei instabilem Fit werden mehr Ground-Truth-Paare gesammelt, bevor der Cutover erfolgt (kein automatischer Fallback auf grobe Heuristik).
- **[Risk]** `gemini-embedding-2` vs. `gemini-embedding-001`-Namensdrift könnte zu Laufzeitfehlern führen → **Mitigation**: Vor Implementierung wird der exakte, aktuell gültige Modell-Bezeichner in der Ziel-Region via Vertex-AI-Modellkatalog verifiziert.
- **[Risk]** Kein Rollback-Pfad bedeutet: Wenn die neue Konfiguration in Produktion schlechter performt als erwartet, müssen alle betroffenen Embeddings erneut neu berechnet werden (Zeit/Kosten) → **Mitigation**: Bewusst akzeptiertes Trade-off laut Anforderung; Experiment-Phase vor dem Cutover soll dieses Risiko minimieren.
- **[Risk]** Retail-Section-Umbenennungen aus `retail-sections-restructure` würden Embedding-Text erneut verändern, falls beide Changes parallel laufen → **Mitigation**: Dieser Change wird bewusst NACH Abschluss von `retail-sections-restructure` eingeplant.
- **[Trade-off]** Entfernen des Cloud-SQL-Fallback-Pfads erhöht die Abhängigkeit von Vertex-AI-Verfügbarkeit/ADC-Konfiguration in allen Umgebungen (lokal + Cloud Run) — akzeptiert, da der Fallback ohnehin nie die benötigte Dimensionskonfiguration unterstützt hätte.

## Migration Plan

1. Verifikation: `search_vector`-Nutzung gegenprüfen, `gemini-embedding-2`-Modellname in Vertex AI verifizieren.
2. Analyse-Script erstellen und Experiment an 100 Testdaten durchführen (isoliert, keine Produktivdaten verändert); Ergebnis: gewählte Dimension + Methode.
3. Ground-Truth-Paare (30+) sammeln und bewerten; Sigmoid-Parameter fitten.
4. Code ändern: `build_ingredient_embedding_text()`, `create_embedding()` (Vertex-AI-Client), Modelle (Dimension, `search_vector`-Drop, `embedding_text_hash`), API-Responses (`similarity_pct`), Frontend (`EmbeddingViewerPage`).
5. Migrationen erstellen und lokal testen.
6. Bulk-Neuberechnung aller Embeddings (Ingredient, Recipe, Blog, Game, GroupSession) per Management-Command.
7. Deploy — kein Rollback vorgesehen; bei Problemen erneuter Bulk-Recompute nach Fix.

## Open Questions

- Exakter Vertex-AI-Modellname/-Version zum Implementierungszeitpunkt (siehe Risk).
- Finale Ziel-Dimension steht erst nach dem Experiment fest (siehe Decision 3).
