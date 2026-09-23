## Why

Beim Rezept-Import im KI-Modus werden Zutaten teils falsch oder gar nicht zugeordnet: Die Embedding-Stage liefert unsinnige sichere Treffer („Crushed Ice" → „Sahne mind. 30% Fett", „Lebensmittelfarbe" → „Edelsüß Paprikapulver geräuchert"), „1 Liter Orangensaft" findet „Orangensaft" nicht, und in der Review-Step lassen sich unsichere oder neue Zutaten nicht abschließen: Es fehlen Alternativen-Liste, Mengen-Eingabe und ein prüfbarer Dialog für neue Zutaten. Die Folge ist eine blockierte Rezept-Erstellung („Bitte bestätige alle Zutaten und löse offene Zuordnungen.").

## What Changes

- **Kandidaten immer liefern**: Der `IngredientMatcher` befüllt bei jedem Ergebnis die Top-5-Kandidaten der auslösenden Stage (inkl. `slug`), auch bei sicheren Treffern — bisher nur bei Grey-Zone.
- **Embedding-Stage nur noch als Kandidaten**: Embed-Ergebnisse (pgvector) überschreiten nie mehr den Auto-Match-Threshold, sondern landen ausschließlich als Kandidaten/`needs_review`. Falsche „sichere" Treffer (Konfidenz ~0.5–0.6 auf kaputter Kalibrierung) werden damit unmöglich.
- **Parser-Erweiterung + Matcher-Fallback**: Unit-Liste im rule-based Parser um Liter, Dose, Glas, Tasse, Becher, Packung, Handvoll u. a. erweitern. Zusätzlich strippt der Matcher vor Jaccard/Fuzzy führende „Zahl + Einheit"-Tokens, falls der Parser scheitert → „1 Liter Orangensaft" matcht „Orangensaft".
- **KI-gestützte Mengen-Umrechnung**: Für importierte Angaben mit Einheit (Dose, Glas, Tasse, Liter, …) schätzt Gemini Gramm pro Einheit; die Portionsanzahl wird daraus berechnet (Gramm ÷ Portionsgewicht). Bekannte Einheiten (g/kg/ml, Liter mit Dichte) rechnet das System direkt.
- **Review-Step: einklappbare Kandidatenliste**: Jede Review-Zeile zeigt hinter „Alternativen anzeigen" die Kandidaten 2–5 mit Konfidenz in %. Klick wählt den Kandidaten und öffnet direkt den Mengen-Dialog.
- **Mengen-Dialog in Review-Zeilen**: `IngredientQuantityDialog` (PortionPicker) wird in die Review-Zeile eingebunden → Menge/Portion setzbar, Zeile bestätigbar.
- **Kompletter KI-Dialog für neue Zutaten**: KI-Enrichment füllt Name, Nährwerte, Portion + Portionsgewicht und Menge; der User prüft und bestätigt alles im Dialog, ohne die Review-Step zu verlassen.
- **BREAKING (intern)**: `IngredientMatchCandidateOut` erhält `slug`; Pydantic- und Zod-Schema synchron.

## Capabilities

### New Capabilities
- `ingredient-review-candidates`: Review-Zeilen tragen immer eine wählbare Kandidatenliste (Top 5 inkl. slug, Konfidenz %), einklappbar, Klick öffnet den Mengen-Dialog.
- `ingredient-unit-ai-conversion`: Umrechnung importierter Mengenangaben (Dose, Glas, Tasse, Liter, …) in Gramm per Gemini bzw. direkt (bekannte Einheiten), daraus Portionsanzahl in der Review-Pipeline.

### Modified Capabilities
- `ingredient-matching`: Kandidaten werden bei allen Ergebnissen befüllt (nicht nur Grey-Zone); die Embedding-Stage liefert ausschließlich Kandidaten, nie Auto-Matches; Parser-Unit-Liste erweitert; Matcher strippt führende Mengen-Tokens als Fallback.
- `recipe-ingredient-review`: Zeilen erhalten Mengen-/Portions-Bestätigung über den Mengen-Dialog; neue Zutaten werden über einen vollständigen, KI-geprüften Dialog bestätigt statt einer unvollständigen Inline-Box; Zeilen mit neuen Zutaten sind bestätigbar.

## Impact

- **Backend**
  - `recipe/services/ingredient_matcher.py`: Kandidaten in allen Stage-Ergebnissen (`_stage_jaccard`, `_stage_fuzzy`, `_stage_embedding`), Embed-Stage ohne Auto-Match, Token-Stripping-Fallback, `slug` in `MatchCandidate`.
  - `recipe/services/ingredient_parser.py`: erweiterte `QUANTITY_UNIT_PATTERN`/`UNIT_CANONICAL` (Liter, Dose, Glas, Tasse, Becher, Packung, Handvoll, …).
  - `recipe/services/ingredient_review_service.py`: `quantity`-Vorbefüllung für Grey-Zone-Treffer (via Umrechnung), Einbindung der KI-Mengen-Umrechnung, KI-Draft bleibt vollständig.
  - Neu: Service für KI-Mengen-Umrechnung (z. B. `recipe/services/unit_gram_conversion.py`, Gemini-Call mit Pydantic-Schema, Wiederverwendung der Dichte-/Portionslogik).
  - `recipe/schemas/ingredient_review.py`: `IngredientMatchCandidateOut` + `slug`.
  - **Keine Migrationen** — `slug` ist Bestandteil von `Ingredient`; keine Modelländerungen.
- **Frontend (frontend-food)**
  - `components/recipe/RecipeIngredientReviewStep.tsx`: einklappbare Kandidatenliste, Mengen-Dialog, kompletter KI-Dialog für neue Zutaten (Name, Nährwerte, Portion, Menge).
  - `components/recipe/IngredientQuantityDialog.tsx` (Wiederverwendung), `store/useRecipeIngredientReviewStore.ts` (Confirm-Logik, `isComplete`), `schemas/ingredientReview.ts` (Zod-Sync: `slug` in Candidates).
  - Tests: `EditRecipePage.test.tsx`-Umfeld, neue Tests für Kandidaten-Auswahl und Mengen-Bestätigung.
- **Tests**: Matcher-Unit-Tests (Kandidaten immer, Embed nur Kandidaten, „1 Liter Orangensaft" → „Orangensaft"), Review-Service-Tests, Frontend-Komponententests.
