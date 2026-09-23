# Tasks: ingredient-review-candidates-and-quantities

## 1. Backend: Matcher-Kandidaten & Embedding-Stage

- [x] 1.1 `MatchCandidate` um `slug: str` erweitern; in allen Stage-Scoring-Schleifen (`_get_candidates_ordered`, Trigram-, Embedding-Query) den Slug mitschleppen
- [x] 1.2 Alle Stage-Ergebnisse (`_stage_jaccard`, `_stage_fuzzy`, `_stage_embedding`, inkl. Auto-Match-Pfade) mit Top-5-`candidates` der entscheidenden Stage befüllen
- [x] 1.3 `_stage_embedding`: Auto-Match-Zweig entfernen — bester Treffer immer als `needs_review=true` mit Top-5-Kandidaten und `matched_via="embed"` zurückgeben
- [x] 1.4 Tests: Kandidaten bei sicherem Fuzzy-Match vorhanden; Embedding-Stage liefert nie `ingredient_id`; Embed-Kandidaten tragen Konfidenz und slug

## 2. Backend: Parser-Erweiterung & Matcher-Fallback

- [x] 2.1 `QUANTITY_UNIT_PATTERN`/`UNIT_CANONICAL` in `ingredient_parser.py` um Liter, Dose, Glas, Tasse, Becher, Packung, Päckchen, Handvoll, Bund, Scheibe, Zehe, Prise, Schuss erweitern („1 Liter Orangensaft" → quantity=1, unit=Liter, name=Orangensaft)
- [x] 2.2 `_strip_quantity_unit()`-Helfer in `ingredient_matcher.py`: führende `Zahl + Einheit`-Tokens bzw. nackte Zahl vor Jaccard/Fuzzy entfernen, wenn der Parser nicht sauber gesplittet hat; Stripped-Werte in `technical_details` (`parsed_quantity`, `parsed_unit`)
- [x] 2.3 Tests: Parser-Scenarios („1 Liter Orangensaft", „1 Dose Ananas", „Tomaten aus der Dose" bleibt Identität); Matcher-Fallback („1 Liter Orangensaft" → „Orangensaft", „2 Fladenbrot" → „Fladenbrot")

## 3. Backend: KI-Mengen-Umrechnung

- [x] 3.1 Neuen Service `unit_gram_conversion.py` anlegen: direkte Umrechnung für g/kg/ml/l (Liter mit Dichte, sonst 1000 g/l), Standard-Maße über vorhandene Dichte-/Standard-Measure-Logik
- [x] 3.2 Gemini-Estimator für Container-Einheiten (Dose, Glas, Becher, Packung, Handvoll): Structured Output „Gramm pro Einheit", Pydantic-Schema, Ausfall → `quantity=1`
- [x] 3.3 Portionsanzahl = Gramm ÷ `resolve_trusted_weight(rank1_portion)`, Rundung auf 2 Dezimalen, > 0
- [x] 3.4 Tests: g direkt, Liter mit/ohne Dichte, Gemini-Fallback auf 1, Portionsrundung

## 4. Backend: Review-Service & Schemas

- [x] 4.1 `recipe/schemas/ingredient_review.py`: `IngredientMatchCandidateOut` um `slug` erweitern
- [x] 4.2 `ingredient_review_service.py`: `quantity`/`suggested_quantity` für Grey-Zone- und Match-Zeilen befüllen (via `unit_gram_conversion`), wenn Menge+Einheit geparst und Portion existiert
- [x] 4.3 `temporary_draft` vollständig erweitern (Menge aus Conversion ergänzen), damit der neue Zutaten-Dialog komplett prüfbar ist
- [x] 4.4 Backend-Tests: Preview-Response enthält Kandidaten mit slug; Grey-Zone-Zeile mit konvertierter Menge; neue Zutat-Draft vollständig

## 5. Frontend: Schema-Sync

- [x] 5.1 `frontend-food/src/schemas/ingredientReview.ts`: Zod-Schema um `slug` in Candidates erweitern (Pydantic-Sync)
- [x] 5.2 Store `useRecipeIngredientReviewStore.ts`: keine Logik-Änderung nötig, aber sicherstellen, dass `selected_portion`/`quantity` über Dialog-Aktionen gesetzt werden können

## 6. Frontend: Review-Step UI

- [x] 6.1 Einklappbarer Abschnitt „Alternativen anzeigen" in `RecipeIngredientReviewStep.tsx`: Kandidaten als Buttons (Name + Konfidenz %), exklusive des aktuell gewählten; Klick → Zutat setzen, Portion leeren, `IngredientQuantityDialog` öffnen
- [x] 6.2 `IngredientQuantityDialog` in Review-Zeilen integrieren: Prefill `suggested_quantity` (sonst 1), Bestätigung setzt `selected_portion` + `quantity` im Store
- [x] 6.3 Vollständigen KI-Dialog für neue Zutaten: Name, Nährwerte, Portion + Portionsgewicht, Menge editierbar; „Bestätigen" markiert Zeile als bestätigbar (ersetzt unvollständige Inline-Box)
- [x] 6.4 Frontend-Tests: Kandidatenliste sichtbar/einklappbar, Kandidaten-Klick öffnet Dialog, Menge setzt Zeile auf bestätigbar, neuer Zutaten-Dialog komplett und bestätigbar

## 7. Verifikation

- [x] 7.1 `uv run python manage.py makemigrations --check` (keine neuen Migrationen erwartet)
- [x] 7.2 `uv run pytest` (Backend)
- [x] 7.3 Frontend-Lint/Typecheck + relevante Komponenten-Tests in `frontend-food`
- [x] 7.4 Manueller Durchlauf: Rezept mit „1 Liter Orangensaft", „Crushed Ice", „Lebensmittelfarbe" importieren — alle Zeilen bestätigbar bis zum Speichern
