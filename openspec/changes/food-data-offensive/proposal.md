## Why

Die Food-Stammdaten waren in großen Teilen unbrauchbar, obwohl viele Einzelanalysen existierten:

- Der REWE-Import (5.690 Zutaten, 05.07.) hat Spalten verschoben: `energy_kcal` enthält kJ, Fett und Kohlenhydrate stehen als `0` in der DB, obwohl Unterwerte (gesättigte Fettsäuren, Zucker) gesetzt sind. Deshalb zeigten 4.563 Zutaten „Zucker > Kohlenhydrate“.
- 98 % der Zutaten hatten kein Embedding. `loaddata` umgeht Signals, die Embedding-Fixture wurde nie geladen, und das Signal hat fehlende Embeddings nur bei Namens-, Beschreibungs- oder Warengruppenänderung nachgerechnet.
- Die Duplikaterkennung verglich nur die 100 *neuesten* Zutaten mit Embedding. Exakte Duplikate wie 34× „Nudeln“ oder 16× „Butter“ blieben unsichtbar.
- Warengruppen waren grob und weitgehend zufällig zugeordnet: „Schokolade Espresso“ → Getränke, Orangensaft → Obst, 1.486 Zutaten in „Konserven & Gläser“.
- Die Arbeit an den Daten erforderte viele Klicks über fünf Tabs. Frontend- und Backend-Filtercodes der Nährwert-Plausibilität passten nicht zusammen.
- Die KI-Services referenzierten `gemini-3.1-flash-lite`, obwohl `gemini_call` global `gemini-3.5-flash-lite` erzwingt. Der Zauberstab-Prompt kannte weder die aktuellen Werte noch Plausibilitätsregeln noch Warengruppen und behauptete ein Search-Grounding, das nicht genutzt wird.
- 97 Test- und Unsinnsrezepte (E2E, „AI Fixture …“) lagen zwischen echten Rezepten.

## What Changes

- **Warengruppen-Katalog v2**: 38 statt 22 Abteilungen im Laden-Rundgang (Obst/Gemüse getrennt, Käse, Wurst, Säfte, Joghurt & Desserts …). Dazu eine Datenmigration `0019_retail_sections_v2` und ein deterministischer Kopfwort-Klassifikator (99,5 % Abdeckung, „Orangen·saft“ → Säfte). Mit `retail_section_source` (rule/ai/manual) werden manuelle Zuordnungen nie überschrieben.
- **Nährwert-Regelwerk**: gemeinsame Plausibilitätsregeln für UI, Reparatur, Qualitäts-Score und KI-Prompts. Deterministische, kostenlose Reparatur: kJ → kcal, Platzhalter-Nullen → unbekannt, Salz ↔ Natrium, Atwater-Energie.
- **Batch-KI-Review**: 15 Zutaten pro Gemini-Aufruf mit aktuellen Werten und Regelbefunden. Konservative Übernahme: plausible Werte bleiben, harte Regeln werden erzwungen, Umbenennen und Löschen erfolgt nur per Freigabe. Ergebnis in `ai_reviewed_at`/`ai_review_verdict`/`ai_review_notes`.
- **Duplikate**: Merge-Service (aus dem Endpoint extrahiert), automatisches Zusammenführen exakter Namensduplikate, Namensvarianten-Gruppen zur manuellen Freigabe, KI-Duplikatverdacht mit Ein-Klick-Merge. Die Embedding-Suche bevorzugt meistgenutzte Zutaten.
- **Embeddings**: Signal rechnet fehlende Embeddings immer nach, dazu kommt ein paralleler Backfill mit Retry.
- **Cockpit** (`/admin/data-quality/cockpit`, Standard-Tab):
  - 6-Schritte-Pipeline mit Kostenanzeige und Fortschritt bei häppchenweisen Läufen,
  - klickbare KPI-Kacheln,
  - Arbeitsliste mit Inline-Edit (Nährwerte, Warengruppe, Preis), markierten Problemfeldern, KI-Vorschlägen per Klick sowie Bulk-Aktionen über „alle N Treffer“,
  - Namensvarianten-Gruppen und Rezept-Aufräumen.
- **Zauberstab**: Prompt überarbeitet, mit aktuellen Werten, Regelbefunden, Warengruppen-Katalog, EU-Kohlenhydratdefinition und Klemmen harter Regeln. Neues Feld Warengruppe im Vergleichsdialog. `ai_create_ingredient` verwendet vorhandene Namen wieder statt Duplikate anzulegen.
- **Modellkonstanten**: Alle Text-Services nutzen `DEFAULT_TEXT_MODEL` (`gemini-3.5-flash-lite`).
- **Rezepte**: Junk-Erkennung und Archivierung (umkehrbar) sowie KI-Kategorisierung (nur ab Sicherheit ≥ 75 %).
- **Migration nach Produktion**: `food_offensive_export` / `food_offensive_apply` übertragen die Ergebnisse slug-basiert, idempotent und ohne erneute KI-Kosten. `food_data_offensive` orchestriert alle Schritte.
- **Qualitäts-Score**: Unplausible Nährwerte zählen nur noch 40 %.

## Capabilities

### New Capabilities
- `food-data-offensive`: Cockpit, Pipeline, Batch-KI-Review, Transfer-Paket.

### Modified Capabilities
- `data-quality-dashboard`: Cockpit als Standard-Tab; Plausibilitätsfilter nutzen die Codes des Regelwerks.
- `retail-section-backfill`: Katalog v2, Klassifikator, Herkunft der Zuordnung.
- `ingredient-embedding`: fehlende Embeddings werden immer nachgerechnet.
- `ingredient-ai-suggest`: überarbeiteter Prompt mit Warengruppe.

## Impact

- Backend: `supply` (Models + 2 Migrationen, Services, API `/api/admin/data-quality/offensive/`, Commands), `recipe/services/recipe_data_offensive.py`, `content/api/data_quality.py` (Merge-Service, Plausibilität, Duplikat-Kandidaten), Modellkonstanten in ~30 Services.
- Frontend-Food: `pages/admin/DataOffensivePage.tsx`, `components/data-offensive/*`, `api/dataOffensive.ts`, `schemas/dataOffensive.ts`, `hooks/useChunkedRunner.ts`, Zauberstab-Dialog.
- Daten: `data/masterdata/supply_retailsection.json` (Katalog v2), `data/food/data_offensive_package.json` (Ergebnis-Paket).
