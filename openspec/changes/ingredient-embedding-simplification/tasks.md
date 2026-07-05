## 1. Vorbereitung & Verifikation

- [x] 1.1 Verifizieren, dass `Ingredient.search_vector` nirgends im Backend/Frontend gelesen/indiziert wird (Repo-weite Suche) — bestehend nur in Modell-Definition + Migration, kein Index/keine Query nutzt es
- [x] 1.2 Exakten, aktuell gültigen Vertex-AI-Modellnamen verifizieren — live getestet: `gemini-embedding-2`/`gemini-embedding-2-preview` existieren NICHT (404), korrekter Name ist `gemini-embedding-001` (Default 3072 Dimensionen, `output_dimensionality` 768/384/256/128/64 funktioniert nativ)
- [ ] 1.3 Prüfen, dass `retail-sections-restructure` abgeschlossen ist, bevor dieser Change gestartet wird — **BLOCKIERT: Change ist noch in Bearbeitung (0/16 Tasks laut `openspec list`)**
- [x] 1.4 Lokalen Vertex-AI/ADC-Zugriff (Projekt, Region) verifizieren — ADC aktiv, `GOOGLE_CLOUD_PROJECT=inspi-441320`, `VERTEX_AI_LOCATION=global`, live embed_content-Call erfolgreich

## 2. Experiment: Vektor-Dimension & Text-Vereinfachung

- [ ] 2.1 100 Test-Zutaten zusammenstellen (Zufallsstichprobe + 20+ kuratierte Problemfälle, z.B. Schweinebauch/-nacken, Zwiebeln rot/Rote Zwiebeln — Vorschläge durch Copilot, Bestätigung durch User)
- [ ] 2.2 Als Fixture-Datei im Repo versionieren
- [ ] 2.3 Analyse-Script erstellen (`supply/scripts/embedding_dimension_experiment.py`), das für die 100 Testzutaten Embeddings mit vereinfachtem Text (name/description/retail_section) erzeugt
- [ ] 2.4 scikit-learn/numpy als Script-/Dev-Dependency ergänzen
- [ ] 2.5 Vier Varianten implementieren und vergleichen: native `output_dimensionality`-Truncation, PCA (auf den 100 Testvektoren), erste-n-Spalten, letzte-n-Spalten — für Zieldimensionen 768/384/256/128/64 (Baseline: nativer 3072-dim-Vektor von `gemini-embedding-001`)
- [ ] 2.6 Top-10-Overlap-Metrik ggü. 3072-dim-Baseline berechnen und Ergebnisse dokumentieren
- [ ] 2.7 Ziel-Dimension und -Methode anhand der Ergebnisse festlegen

## 3. Ground-Truth & Kalibrierung

- [ ] 3.1 30+ Ground-Truth-Paare (ähnlich/unähnlich) aus den Testdaten ableiten; Kandidaten durch Copilot vorschlagen, User bestätigt/korrigiert Ausreißer
- [ ] 3.2 Sigmoid-Parameter (Steilheit, Mittelpunkt) auf Cosine-Similarity der Ground-Truth-Paare fitten
- [ ] 3.3 Fit-Qualität prüfen; bei Instabilität weitere Paare ergänzen statt Heuristik-Fallback

## 4. Backend: Embedding-Service umstellen

- [ ] 4.1 `build_ingredient_embedding_text()` auf name/description/retail_section reduzieren
- [ ] 4.2 `core/services/gemini.py::gemini_embed()` um `output_dimensionality`-Parameter erweitern (an `EmbedContentConfig` durchreichen) und Default-Modell auf `gemini-embedding-2` umstellen; `content/services/embedding_service.py::create_embedding()` ruft `gemini_embed()` direkt auf, Cloud-SQL-`embedding()`-Fallback entfernen
- [ ] 4.3 `_text_hash()` reaktivieren; neues Feld `embedding_text_hash` auf allen betroffenen Modellen (Ingredient, Recipe, Blog, Game, GroupSession) ergänzen
- [ ] 4.4 Änderungserkennung in `update_ingredient_embedding()`/`update_content_embedding()` von `embedding_updated_at >= updated_at` auf Hash-Vergleich umstellen
- [ ] 4.5 Sigmoid-Kalibrierungsfunktion (`similarity_to_pct()`) implementieren und in `embedding_service.py` bereitstellen
- [ ] 4.6 `find_similar_ingredients()` auf `similarity_pct` statt `distance` umstellen

## 5. Backend: Datenmodell & Migrationen

- [ ] 5.1 Migration: `Ingredient.search_vector` entfernen
- [ ] 5.2 Migration: `Ingredient.embedding`-Dimension auf validierte Ziel-Dimension ändern
- [ ] 5.3 Migration: `embedding`-Dimension auf Recipe, Blog, Game, GroupSession ändern
- [ ] 5.4 Migration: `embedding_text_hash`-Feld auf allen betroffenen Modellen ergänzen
- [ ] 5.5 `data/food/supply_ingredient.json`-Fixture aktualisieren (Feld `search_vector` entfernen)
- [ ] 5.6 `EmbeddingFeedback`-Modell: `content_type`-Choices um `ingredient` erweitern (Migration)

## 6. Backend: APIs & Schemas

- [ ] 6.1 `ingredient-similar-endpoint`: Response-Schema von `distance` auf `similarity_pct` umstellen (Pydantic)
- [ ] 6.2 `content/api/data_quality.py`: Duplikat-Endpoints (`/ingredients/duplicates/`) auf `similarity_pct`/`similarity_threshold_pct` umstellen
- [ ] 6.3 Entsprechende Zod-Schemas im Frontend synchron anpassen

## 7. Backend: Bulk-Neuberechnung

- [ ] 7.1 Management-Command für Bulk-Neuberechnung aller Embeddings (Ingredient, Recipe, Blog, Game, GroupSession) erstellen
- [ ] 7.2 Command lokal gegen Testdaten verifizieren (kein Produktiv-Impact)
- [ ] 7.3 Command in Produktionsumgebung ausführen (nach Deploy)

## 8. Frontend

- [ ] 8.1 `EmbeddingViewerPage.tsx`: %-Ähnlichkeit statt roher Distanz anzeigen
- [ ] 8.2 Data-Quality-Duplikaterkennung-Ansicht (`frontend-food`): %-Ähnlichkeit anzeigen, Schwellenwert-Filter auf Prozentbasis umstellen

## 9. Tests

- [ ] 9.1 Unit-Tests für `build_ingredient_embedding_text()` (nur relevante Felder im Text)
- [ ] 9.2 Unit-Tests für Hash-basierte Änderungserkennung (`_text_hash`/`embedding_text_hash`)
- [ ] 9.3 Unit-Tests für Sigmoid-Kalibrierung (`similarity_to_pct()`) gegen bekannte Ground-Truth-Paare
- [ ] 9.4 API-Tests für `ingredient-similar-endpoint` und Duplikat-Endpoints mit `similarity_pct`
- [ ] 9.5 Mock-basierte Tests für den Vertex-AI-Client (kein echter API-Call in CI)
- [ ] 9.6 Regressionstest: "Schweinebauch"/"Schweinenacken" erscheinen nicht als Duplikat-Vorschlag

## 10. Deploy & Abschluss

- [ ] 10.1 Migrationen in Produktionsumgebung ausführen
- [ ] 10.2 Bulk-Neuberechnung in Produktion ausführen
- [ ] 10.3 Stichprobenartige manuelle Prüfung der neuen %-Ähnlichkeit an bekannten Zutaten-Paaren
- [ ] 10.4 Change archivieren (`openspec archive`)
