# Tasks: food-data-offensive

## 1. Backend-Grundlagen
- [x] 1.1 Katalog v2 (`supply/data/retail_sections.py`), Legacy-Aliase, Fixture `supply_retailsection.json`
- [x] 1.2 Migrationen `0016_ingredient_data_review_fields`, `0017_retail_sections_v2`, `0018_unique_system_ingredient_name`
- [x] 1.3 Kopfwort-Klassifikator + `reclassify_retail_sections`; Mapping-Service nutzt Klassifikator
- [x] 1.4 Nährwert-Regelwerk + deterministische Reparatur + `repair_ingredient_nutrition`; Qualitäts-Score berücksichtigt Plausibilität
- [x] 1.5 Batch-KI-Review-Service mit konservativer Übernahmelogik
- [x] 1.6 Merge-Service, exakte Duplikate, Namensvarianten-Gruppen; Embedding-Duplikatsuche nach Nutzung
- [x] 1.7 Embedding-Signal-Fix + paralleler Backfill
- [x] 1.8 Rezept-Junk-Archivierung + KI-Kategorisierung
- [x] 1.9 Orchestrierung `food_data_offensive`, Transfer `food_offensive_export`/`food_offensive_apply`

## 2. KI
- [x] 2.1 Alle Text-Services auf `DEFAULT_TEXT_MODEL` (`gemini-3.5-flash-lite`)
- [x] 2.2 Zauberstab-Prompt überarbeitet (Kontext, Regeln, Warengruppe, Enums, EU-KH)
- [x] 2.3 Gemeinsame `INGREDIENT_DATA_RULES` für Fill-Missing, AI-Create, Batch
- [x] 2.4 `ai_create_ingredient` verwendet vorhandene Namen wieder

## 3. API & Frontend
- [x] 3.1 API `/api/admin/data-quality/offensive/*` (Pydantic) + Zod-Schemas + Hooks
- [x] 3.2 Cockpit: Pipeline, KPIs, Arbeitsliste, Namensvarianten, Rezepte; Standard-Tab
- [x] 3.3 Zauberstab-Dialog zeigt/übernimmt Warengruppe; Plausibilitätsfilter mit Regelwerk-Codes

## 4. Daten & Tests
- [x] 4.1 Lokale Datenoffensive auf DB-Kopie ausgeführt, Paket exportiert, Apply auf frischer Kopie verifiziert
- [x] 4.2 Tests: Klassifikator, Katalog, Mapping, Plausibilität, KI-Übernahme, API, Transfer
- [ ] 4.3 Produktion: `migrate` → `food_offensive_apply --apply` → Embeddings
- [ ] 4.4 Offene Freigaben im Cockpit: 69 Umbenennungen, 82 Duplikatverdachte, 7 Nicht-Zutaten, Namensvarianten
- [ ] 4.5 Folgearbeiten aus design.md D5/D6 (Import-Gate, product_form)
