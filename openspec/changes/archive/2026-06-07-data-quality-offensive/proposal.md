## Why

Mit hunderten Rezepten und tausenden Zutaten in der Datenbank wird die Datenqualität zum kritischen Faktor. Fehlende Preise, inkonsistente Nährwerte, Duplikate und unvollständige Metadaten untergraben die Nützlichkeit aller Food-Features — von der Nährwertberechnung über Einkaufslisten bis zur Speiseplanung. Die bestehende AI-Infrastruktur (Gemini Embeddings, Content AI Services) bietet die technische Grundlage für eine halbautomatische Qualitätsoffensive. Jetzt ist der richtige Zeitpunkt, weil die pgvector-Migration ohnehin ansteht und das Embedding-System auf Zutaten ausgeweitet werden soll.

## What Changes

- **pgvector-Migration**: Embedding-Feld von BinaryField auf pgvector VectorField(768) migrieren — für Content-Typen und Zutaten
- **Embedding für Zutaten**: Bei jedem Save automatisch Embedding generieren (via `text-embedding-004`), analog zum bestehenden Content-System
- **Datenqualität-Dashboard** (nur Staff): Neuer Menüpunkt mit Unterbereichen für Zutaten und Rezepte, jeweils mit Kategorien wie Preisanalyse, Duplikaterkennung, Datenvollständigkeit, Nährwert-Plausibilität, fehlende Klassifikation, Cache-Staleness, Metadaten-Check
- **Preisanalyse**: Statistische Ausreißererkennung bei `price_per_kg`, Liste auffälliger Preise, Batch-AI-Neubewertung (Checkbox-Auswahl → Gemini → Review-Tabelle → Apply), manuelle Überschreibung
- **Duplikaterkennung**: Cosine-Similarity über pgvector-Embeddings, konfigurierbarer Threshold-Slider in der UI, Merge-Workflow (Zutat B durch A ersetzen, alten Namen als Alias behalten), sowohl für Zutaten als auch Rezepte
- **Datenqualitäts-Score**: 0-100 Score pro Zutat/Rezept basierend auf Feld-Vollständigkeit, sichtbar für alle auf der Detailseite
- **Impact-Analyse**: Anzeige, wie viele Rezepte/Speisepläne eine Zutat referenzieren
- **Änderungshistorie**: Field-Level Audit-Log für Zutaten und Rezepte (wer hat wann welches Feld geändert)
- **Datenverteilungen** (öffentlich): Interaktive Charts mit Recharts — Kostenverteilung, Kalorienverteilung, Energiedichte-Topliste, Makronährstoff-Scatter (farbkodiert nach vegan/vegetarisch), Nutri-Score-Verteilung — filterbar und mit Tooltips

## Capabilities

### New Capabilities

- `data-quality-dashboard`: Staff-only dashboard mit Zutaten- und Rezept-Qualitätskategorien (Preisanalyse, Duplikate, Vollständigkeit, Plausibilität, fehlende Klassifikation, Metadaten, Cache-Staleness) und Qualitätstrend-Chart
- `ingredient-embedding`: Embedding-Generierung für Zutaten bei jedem Save, pgvector-Speicherung, embedding-basierte Duplikaterkennung mit konfigurierbarem Threshold
- `data-quality-score`: 0-100 Datenqualitäts-Score pro Zutat und Rezept, berechnet aus Feld-Vollständigkeit, sichtbar für alle Nutzer auf den Detailseiten
- `price-analysis`: Statistische Ausreißererkennung für `price_per_kg`, Batch-AI-Preisbewertung via Gemini, Review-Apply-Workflow
- `data-distribution-charts`: Öffentliche interaktive Datenverteilungs-Charts (Kosten, Kalorien, Nährwerte) mit Recharts, filterbar nach vegan/vegetarisch, RetailSection, Status
- `change-audit-log`: Field-Level Audit-Log für Ingredient- und Recipe-Änderungen (wer, wann, welches Feld, alter/neuer Wert)

### Modified Capabilities

- `ingredient-database`: Neue Felder: `embedding` (pgvector VectorField 768), `search_vector` (SearchVectorField), `quality_score` (IntegerField 0-100), `quality_score_updated_at` (DateTimeField). Embedding wird bei jedem Save automatisch generiert.
- `recipe`: `embedding`-Feld von BinaryField auf pgvector VectorField(768) migriert. Neue Felder: `quality_score`, `quality_score_updated_at`. Neuer Endpoint für embedding-basierte Duplikatsuche.
- `food-admin`: Neuer Navigationspunkt "Datenqualität" mit Unterpunkten "Zutaten" und "Rezepte", jeweils mit den oben genannten Kategorien als Tabs/Accordions.
- `ai-features`: Neuer Batch-AI-Workflow für Preisbewertung: POST-Endpoint für Batch-Preisvorschläge, GET-Endpoint für Review-Ergebnisse, PATCH-Endpoint zum Anwenden.

## Impact

- **Backend Apps**: `supply` (Ingredient-Model + API), `recipe` (Recipe-Model + API), `content` (Embedding-Service, pgvector-Migration, Audit-Log)
- **Datenbank**: pgvector-Extension aktivieren, Migration BinaryField → VectorField(768) für Content- und Ingredient-Modelle, neue AuditLog-Tabelle, neue Indizes (IVFFlat/HNSW für VectorField)
- **Frontend-Food**: Neue Pages/Components unter `pages/admin/DataQualityPage.tsx`, `components/data-quality/` (PriceAnalysis, DuplicateDetection, CompletenessGrid, DistributionCharts etc.), neue API-Hooks, neue Zod-Schemas, neue Routen
- **Abhängigkeiten**: pgvector Django-Field (z.B. `django-pgvector`), keine neuen Frontend-Abhängigkeiten (Recharts bereits installiert)
- **Breaking Changes**: Keine — bestehende API-Endpunkte bleiben kompatibel, neue Felder sind nullable mit Defaults. Das `generate_embeddings` Management-Kommando muss für Zutaten erweitert werden.
