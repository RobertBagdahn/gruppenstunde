## 1. Vorbereitung & Verifikation

- [x] 1.1 Verifizieren, dass `Ingredient.search_vector` nirgends im Backend/Frontend gelesen/indiziert wird (Repo-weite Suche) — bestehend nur in Modell-Definition + Migration, kein Index/keine Query nutzt es
- [x] 1.2 Exakten, aktuell gültigen Vertex-AI-Modellnamen verifizieren — live getestet: `gemini-embedding-2`/`gemini-embedding-2-preview` existieren NICHT (404), korrekter Name ist `gemini-embedding-001` (Default 3072 Dimensionen, `output_dimensionality` 768/384/256/128/64 funktioniert nativ)
- [x] 1.3 Prüfen, dass `retail-sections-restructure` abgeschlossen ist, bevor dieser Change gestartet wird — ✓ retail_section ForeignKey ist bereits auf Ingredient konfiguriert
- [x] 1.4 Lokalen Vertex-AI/ADC-Zugriff (Projekt, Region) verifizieren — ADC aktiv, `GOOGLE_CLOUD_PROJECT=inspi-441320`, `VERTEX_AI_LOCATION=global`, live embed_content-Call erfolgreich

## 2. Experiment: Vektor-Dimension & Text-Vereinfachung

- [x] 2.1 100 Test-Zutaten zusammenstellen (Zufallsstichprobe + 20+ kuratierte Problemfälle, z.B. Schweinebauch/-nacken, Zwiebeln rot/Rote Zwiebeln — Vorschläge durch Copilot, Bestätigung durch User)
- [x] 2.2 Als Fixture-Datei im Repo versionieren (supply/fixtures/test_ingredients_100.json)
- [x] 2.3 Analyse-Script erstellen (`supply/scripts/embedding_dimension_experiment.py`), das für die 100 Testzutaten Embeddings mit vereinfachtem Text (name/description/retail_section) erzeugt
- [x] 2.4 scikit-learn/numpy als Script-/Dev-Dependency ergänzen (✓ installiert)
- [x] 2.5 Vier Varianten implementieren und vergleichen: native `output_dimensionality`-Truncation, PCA (auf den 100 Testvektoren), erste-n-Spalten, letzte-n-Spalten — für Zieldimensionen 768/384/256/128/64 (Script vorbereitet)
- [ ] 2.6 Top-10-Overlap-Metrik ggü. 3072-dim-Baseline berechnen und Ergebnisse dokumentieren
- [ ] 2.7 Ziel-Dimension und -Methode anhand der Ergebnisse festlegen

## 3. Ground-Truth & Kalibrierung

- [ ] 3.1 30+ Ground-Truth-Paare (ähnlich/unähnlich) aus den Testdaten ableiten; Kandidaten durch Copilot vorschlagen, User bestätigt/korrigiert Ausreißer
- [ ] 3.2 Sigmoid-Parameter (Steilheit, Mittelpunkt) auf Cosine-Similarity der Ground-Truth-Paare fitten
- [ ] 3.3 Fit-Qualität prüfen; bei Instabilität weitere Paare ergänzen statt Heuristik-Fallback

## 4. Backend: Embedding-Service umstellen

- [x] 4.1 `build_ingredient_embedding_text()` auf name/description/retail_section reduzieren
- [x] 4.2 `core/services/gemini.py::gemini_embed()` um `output_dimensionality`-Parameter erweitern und Default-Modell auf `gemini-embedding-001` umstellen; Cloud-SQL-`embedding()`-Fallback entfernen
- [x] 4.3 `_text_hash()` reaktivieren; neues Feld `embedding_text_hash` auf allen betroffenen Modellen (Ingredient, Recipe, Blog, Game, GroupSession) ergänzt
- [x] 4.4 Änderungserkennung in `update_ingredient_embedding()`/`update_content_embedding()` von `embedding_updated_at >= updated_at` auf Hash-Vergleich umgestellt
- [x] 4.5 Sigmoid-Kalibrierungsfunktion (`similarity_to_pct()`) implementiert mit Parametern für Kalibrierung auf Ground-Truth-Paare
- [x] 4.6 `find_similar_ingredients()` auf `similarity_pct` statt `distance` umgestellt

## 5. Backend: Datenmodell & Migrationen

- [x] 5.1 Migration: `Ingredient.search_vector` entfernt ✓
- [x] 5.2 Migration: `Ingredient.embedding`-Dimension aktualisiert ✓
- [x] 5.3 Migration: `embedding`-Dimension auf Recipe, Blog, Game, GroupSession ✓
- [x] 5.4 Migration: `embedding_text_hash`-Feld auf allen Modellen ✓
- [x] 5.5 `data/food/supply_ingredient.json`-Fixture aktualisiert (kein search_vector) ✓
- [x] 5.6 ContentLink GenericForeignKey unterstützt bereits Ingredient

## 6. Backend: APIs & Schemas

- [x] 6.1 `ingredient-similar-endpoint`: Response-Schema auf `similarity_pct` ✓
- [x] 6.2 `content/api/data_quality.py`: Duplikat-Endpoints auf `similarity_pct` ✓
- [x] 6.3 Zod-Schemas im Frontend-food aktualisiert ✓

## 7. Backend: Bulk-Neuberechnung

- [x] 7.1 Management-Command erstellt: `recalculate_all_embeddings` ✓
- [ ] 7.2 Command lokal gegen Testdaten verifizieren (kein Produktiv-Impact)
- [ ] 7.3 Command in Produktionsumgebung ausführen (nach Deploy)

## 8. Frontend

- [x] 8.1 EmbeddingViewerPage: Embedding-Status Übersicht ✓
- [x] 8.2 Data-Quality: %-Ähnlichkeit angezeigt, Prozentbasis-Filter ✓

## 9. Tests

- [x] 9.1 Unit-Tests für `build_ingredient_embedding_text()` ✓
- [x] 9.2 Unit-Tests für Hash-basierte Änderungserkennung ✓
- [x] 9.3 Unit-Tests für Sigmoid-Kalibrierung ✓
- [x] 9.4 API-Tests für `ingredient-similar-endpoint` und Duplikat-Endpoints ✓
- [x] 9.5 Mock-basierte Tests für den Vertex-AI-Client ✓
- [x] 9.6 Regressionstest: "Schweinebauch"/"Schweinenacken" nicht als Duplikat ✓

## 10. Deploy & Abschluss

- [ ] 10.1 Migrationen in Produktionsumgebung ausführen
- [ ] 10.2 Bulk-Neuberechnung in Produktion ausführen
- [ ] 10.3 Stichprobenartige manuelle Prüfung der neuen %-Ähnlichkeit an bekannten Zutaten-Paaren
- [ ] 10.4 Change archivieren (`openspec archive`)
