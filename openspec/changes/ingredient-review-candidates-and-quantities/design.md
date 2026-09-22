# Design: ingredient-review-candidates-and-quantities

## Context

Der KI-Rezeptimport (`POST /api/recipes/ingredient-review/preview/`) matcht jede extrahierte Zutatenangabe über den `IngredientMatcher` und zeigt die Ergebnisse im Wizard-Schritt „Zutaten prüfen". Drei belegte Probleme blockieren das Anlegen von Rezepten:

1. **Falsche sichere Embedding-Treffer**: Gemessene Cosinus-Similaritäten völlig unverwandter Paare liegen bei 0.55–0.65 („Orangensaft" vs. „Sahne mind. 30% Fett": 0.64). Die Sigmoid-Kalibrierung (Midpoint 0.6) hebt diese auf Konfidenz ≥ 0.5 und überschreitet damit `EMBEDDING_THRESHOLD` — die Stage liefert unsinnige Auto-Matches („Süßigkeiten Weingummi…" → „Nudeln").
2. **Keine Kandidaten bei sicheren Treffern**: `candidates` wird nur bei Grey-Zone-Ergebnissen befüllt (`ingredient_matcher.py`, `_stage_*`-Return-Pfade). Die Review-Step kann daher keine Alternativen anbieten.
3. **Unabschließbare Zeilen**: Review-Zeilen ohne Match oder ohne Menge haben `quantity=null`; `isComplete` verlangt `quantity > 0`, aber die UI hat weder Mengen-Eingabe noch einen vollständigen Dialog für neue Zutaten → „Bitte bestätige alle Zutaten und löse offene Zuordnungen."

Zusätzlich erkennt der Parser Einheiten wie „Liter" nicht, daher matcht „1 Liter Orangensaft" → „Orangensaft" nie automatisch.

## Goals / Non-Goals

**Goals**
- Jede Review-Zeile liefert eine wählbare Kandidatenliste (Top 5, inkl. slug und Konfidenz).
- Embedding-Stage kann nie mehr falsch auto-matten; sie liefert nur Kandidaten.
- „1 Liter Orangensaft" findet „Orangensaft" (Parser-Erweiterung + Matcher-Fallback).
- Importierte Mengen (Dose, Glas, Liter, …) werden zu Portionsanzahlen umgerechnet (direkt oder per KI).
- Jede Zeile ist durch Mengen-Dialog und vollständigen KI-Dialog für neue Zutaten abschließbar.

**Non-Goals**
- **Keine** Regeneration der Zutaten-Embeddings (separater Change; Embeddings bleiben als Kandidatenquelle nutzbar).
- Keine Änderung an `GET /api/ingredients/suggest/` oder der Admin-Duplikatsuche.
- Keine Änderung des finalen Persistenz-Formats (`IngredientReviewRowIn` bleibt unverändert).

## Decisions

### 1. Kandidaten immer liefern (alle Stages)

Alle Stage-Return-Pfade (`_stage_jaccard`, `_stage_fuzzy`, `_stage_embedding`) erhalten die bereits berechnete, absteigend sortierte Kandidatenliste. Auto-Match-Ergebnisse tragen die Top-5-`MatchCandidate`s der entscheidenden Stage; `needs_review`-Ergebnisse wie bisher. `MatchCandidate` bekommt `slug` (aus dem Ingredient-Objekt beim Scoren).

- Alternativen: Kandidaten erst im Review-Service nachladen (separate Queries, inkonsistent zur Stage-Logik) → verworfen.
- API-Auswirkung: `IngredientMatchCandidateOut` (Pydantic) + `candidates` in `IngredientReviewRowOut`; Zod in `frontend-food/src/schemas/ingredientReview.ts` synchron. Kein neuer Endpoint.

### 2. Embedding-Stage nur als Kandidaten

In `_stage_embedding` wird der Auto-Match-Zweig (`confidence >= EMBEDDING_THRESHOLD` → `ingredient_id`) entfernt. Der beste Treffer wird immer als `needs_review=true` mit Top-5-Kandidaten und `matched_via="embed"` zurückgegeben. Damit werden kaputte Kalibrierungen harmlos: Der User wählt aus der Liste oder sucht selbst.

- Alternativen: Threshold anheben (ohne gemessene Ground-Truth weiter raten), Embeddings neu generieren (Scope-Sprengung, Non-Goal) → verworfen.
- Risiko: Echte semantische Treffer („Rinderhack" → „Rindergehacktes") erfordern jetzt einen Klick mehr. → Mit der Kandidatenliste ist das ein Klick auf den richtigen Kandidaten, nicht mehr.

### 3. Parser-Erweiterung + Matcher-Fallback

**Parser** (`ingredient_parser.py`): `QUANTITY_UNIT_PATTERN`/`UNIT_CANONICAL` um `Liter`, `Dose`, `Glas`, `Tasse`, `Becher`, `Packung`, `Päckchen`, `Handvoll`, `Bund`, `Scheibe`, `Zehe`, `Prise`, `Schuss` erweitern. Die bestehende Früh-Return-Regel „aus der Dose" bleibt unverändert (Zustandsform als Identität, keine Menge).

**Matcher** (`ingredient_matcher.py`): Neue `_strip_quantity_unit(raw)`-Helferfunktion, die vor Jaccard/Fuzzy ein führendes `Zahl + Einheit`-Token (gleiche Unit-Liste) oder eine führende nackte Zahl entfernt, wenn der Parser nicht sauber gesplittet hat. Gestrippte Menge/Einheit landen in `technical_details` (`parsed_quantity`, `parsed_unit`).

- Alternativen: Nur Parser erweitern (bricht bei „etwas 1 Liter …" und anderen Parser-Ausfällen), nur Matcher-Fallback (Parser bleibt inkonsistent) → beide kombiniert, wie im Proposal festgelegt.

### 4. Mengen-Umrechnung (direkt + KI)

Neuer Service `backend/recipe/services/unit_gram_conversion.py`:

```
convert_quantity_to_portions(quantity, unit, ingredient, user)
  ├─ unit ∈ {g, kg, ml, l}  → gram = quantity * factor (l: Dichte, sonst 1000 g/l)
  ├─ unit ∈ {EL, TL, Tasse, …} → über vorhandene Standard-Maß-/Dichte-Logik
  ├─ sonst (Dose, Glas, Becher, Packung, Handvoll) → Gemini-Estimator
  │     prompt: "Wie viele Gramm wiegt 1 <unit> von <Ingredient-Name>?"
  │     (Structured Output, gleiches Muster wie ingredient_enrichment)
  └─ portions = gram / resolve_trusted_weight(rank1_portion), gerundet 2 Dezimalen
```

Gemini-Ausfall → `quantity=1` zurück (Spec: fallback to 1). Aufruf nur für Zeilen, die einen Match oder eine Kandidatenauswahl haben; Preview-Request bleibt pro Rezept (ein Batch-Call pro unklarer Einheit, nicht pro Zeile).

- Alternativen: Nur direkte Umrechnung (Dose/Glas blieben unaufgelöst), nur KI (Latenz/Kosten auch für triviale g/ml) → hybrid, wie vom User entschieden.
- API-Auswirkung: keine neuen Endpoints; `IngredientReviewRowOut.quantity`/`suggested_quantity` werden im Review-Service befüllt (Grey-Zone eingeschlossen).

### 5. Review-Step: Kandidatenliste + Mengen-Dialog + KI-Dialog für neue Zutaten

**Frontend** (`frontend-food/src/components/recipe/RecipeIngredientReviewStep.tsx`):

- Unter „Vorgeschlagene Zutat": einklappbarer Abschnitt „Alternativen anzeigen" — Kandidaten als Buttons (Name + Konfidenz in %), exklusive des aktuell gewählten. Klick → `updateRow` setzt `selected_ingredient_id/name/slug`, leert `selected_portion`, öffnet `IngredientQuantityDialog`.
- `IngredientQuantityDialog` (existiert, inkl. PortionPicker) wird pro Zeile eingebunden; Prefill von `suggested_quantity`, sonst 1. Bestätigung setzt `selected_portion` + `quantity` im Store.
- Neue Zutaten: Die bestehende Inline-Box wird durch einen vollständigen Dialog ersetzt: KI-Draft (Name, Nährwerte, Portion + Gewicht, Menge) wird angezeigt und editierbar; „Bestätigen" setzt `new_ingredient_draft` + `selected_portion` + `quantity` → Zeile ist bestätigbar. Persistenz unverändert über `getFinalizedRows`/`IngredientReviewRowIn` (atomic im `create_recipe`-Endpoint, `recipes.py:695` ff.).
- Store (`useRecipeIngredientReviewStore.ts`): `isComplete` unverändert, aber Zeilen erreichen es jetzt über den Dialog.

- API-Auswirkung: kein neuer Endpoint; `slug` in Candidates ist die einzige Schema-Erweiterung (Pydantic `IngredientMatchCandidateOut` + Zod).

## Risks / Trade-offs

- [Gemini-Latenz bei Mengen-Umrechnung] → Batch-Call pro Preview-Request, Caching im Request, Fallback `quantity=1`; Preview läuft bereits asynchron in der Wizard-Analyse.
- [Embedding-Stage liefert nun häufiger `needs_review`] → Kandidatenliste macht das erträglich; False-Positives (schlimmer als False-Negatives) werden eliminiert.
- [„Dose" als Unit bricht „Tomaten aus der Dose"] → Früh-Return-Regel bleibt; Tests decken beide Fälle ab.
- [Parser-Erweiterung ändert bestehende Split-Ergebnisse] → Bestehende Parser-Tests laufen mit; neue Scenarios ergänzen („1 Liter Orangensaft", „1 Dose Ananas").
- [Zod/Pydantic-Drift bei `slug`] → Beide Schemas in einem Task ändern; Frontend-Tests referenzieren `slug`.

## Migration Plan

- Keine Datenbank-Migrationen (nur Schema-Serialsierung + Service-Logik).
- Deploy: Backend + frontend-food zusammen (Preview-Response enthält `slug`; altes Frontend ignoriert unbekannte Felder).
- Rollback: Revert beider Deploys; `slug`-Feld ist additiv.

## Open Questions

- Sollen Kandidaten die KI-Mengen-Umrechnung auch für Kandidaten-Vorschläge (nicht nur den Top-Treffer) vorbereiten? Vorerst: ja, identische Logik pro gewählter Zutat.
- Batch-Größe für Gemini-Umrechnungs-Calls (pro Request max. N Einheiten) — Default 10, bei Überschreitung direkte Fallbacks.
