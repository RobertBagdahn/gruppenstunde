# Design: portion-picker-with-standard-measures

## Context

Der Zutaten-Editor (`frontend-food/src/components/recipe/InlineIngredientEditor.tsx`) rendert pro Zeile ein natives `<select>` (`min-w-[3.5rem]`, `text-xs`) mit Portionsoptionen. Portionen ohne vertrauenswuerdiges Gewicht (`is_weight_trusted: false`, `weight_status: null`) liefert der Backend-Resolver (`RecipeItemOut.resolve_weight_g`) als `weight_g = 0`. Darueber bricht die Mengen-Mathematik zusammen:

- `normalizeItems`: `portionWeightG = 0` -> Anzeige "= 0 g"
- `handlePortionChange`: `currentGrams = 0` -> neue Menge 0
- `toPersistedRecipeItemQuantity`: `0 / 0 = NaN` (bzw. 0) -> `JSON.stringify` macht daraus `null`/`0`
- PATCH fuehrt zu `NotNullViolation` bzw. Check-Constraint-Violation -> HTTP 500 (produktiv nachgewiesen, Rezepte 204/355)

Zusaetzlich fehlen Standardmengen (EL, TL, Tasse) als Auswahl. Der "Zutat hinzufuegen"-Dialog (`IngredientQuantityDialog.tsx`) nutzt ein shadcn `Select` mit unuebersichtlichen Labels; der Wizard (`WizardStepIngredients`) bettet denselben Inline-Editor ein.

## Goals / Non-Goals

**Goals:**
- Speichern von Portions-/Mengenaenderungen darf nie mehr 500 werfen; Fehler werden sauber mit 422 gemeldet.
- Eine wiederverwendbare `PortionPicker`-Komponente mit gruppierten Abschnitten und zeilenweiser Anzeige "Name + Gewicht" ersetzt das `<select>` im Editor (und damit im Wizard) sowie im Hinzufuegen-Dialog.
- Standardmengen EL, TL, Tasse, Prise, Msp kommen aus einer festen Datenbank - ohne neue Portionen zu persistieren.
- Ehrliche Anzeige "Gewicht unbekannt" statt "= 0 g" bei ungewichteten Portionen.

**Non-Goals:**
- Keine neue DB-Tabelle fuer Standardmengen, keine Daten-Migrationen.
- Keine automatische Gewichts-Bestaetigung fuer untrusted Portionen (bleibt Zutaten-/Verify-Flow).
- Keine Suche im Dropdown (nur Abschnitte, laut Anforderung).

## Decisions

### 1. PortionPicker als Popover-Komponente

Neue Komponente `frontend-food/src/components/recipe/PortionPicker.tsx` nach dem Muster von `IngredientAssignmentDropdown` (Radix-Popover aus dem shadcn-Stack, scrollbar, mobile-faehig ab 320px), ohne Suchfeld.

- Abschnitt **Zutat**: Portionen der Zutat sortiert nach `rank`; Zeile: Portionsname links (`formatPortionOptionLabel`-Semantik), Gewicht rechts (`formatGramsShort`); Kennzeichnung "Gewicht fehlt" bei ungewichtetem Eintrag.
- Abschnitt **Standardmengen**: Katalog-Eintraege mit berechnetem Gramm-Wert und "(ca.)"-Marker, sofern generisch statt dichtebasiert.
- Abschnitt **Gramm**: direkter Gramm-Eintrag (Fallback auf die `g`-Portion bzw. `portion_id=null`).

Verworfene Alternativen: natives `<select>` (Ursache der UX-Probleme, kein Layout moeglich), shadcn `Select` (ohne Abschnitte, mobil schwach), `Command`-Combobox (Suche nicht gewuenscht).

### 2. Standardmengen: feste Daten + eigener Read-Endpoint, keine Persistenz

- Feste Katalogdaten in `backend/supply/data/standard_measures.py` (Key, deutscher Name, Volumen ml bzw. Gramm): `EL` (15 ml), `TL` (5 ml), `Tasse` (200 ml), `Prise` (0,5 g), `Msp` (0,2 g). Vorhandene `MeasuringUnit`-Eintraege (Essloeffel, Teeloeffel) werden referenziert, wo sie existieren.
- Neuer GET-Endpoint `GET /api/ingredients/{slug}/standard-measures/` in `backend/supply/api/ingredients.py` (nach Backend-AGENTS vor parametrisierten Routen registrieren). Response: `list[StandardMeasureOut]` - fixer Referenzkatalog, bewusst ohne Pagination.
- Gewichtsberechnung serverseitig:
  - ml-basierte Mengen: `grams = volume_ml * physical_density`, wobei der DB-Default `physical_density = 1.0` als "nicht explizit gesetzt" gilt; dann generischer Faktor (1 ml ~ 1 g) mit `is_approx=true`.
  - Gramm-basierte Mengen (Prise/Msp): fester Wert aus dem Katalog, `is_approx=true`.
- Auswahl im Picker **persistiert keine neue Portion**: das Item wechselt auf die `g`-Fallback-Portion der Zutat (bzw. `portion_id=null` = Gramm laut Model-Doku) und die Menge wird auf die berechneten Gramm gesetzt.

### 3. 0/NaN-Schutz und Fallback-Menge 1

- `toPersistedRecipeItemQuantity`: Ergebnis-Guard - nicht-finite oder <= 0-Werte werden nie gesendet; fallback Menge 1 (greift nur, wenn die Berechnung 0/NaN ergeben haette; normale Eingaben bleiben unberuehrt).
- `handlePortionChange`: bei unbekannten aktuellen Gramm (`currentGrams <= 0`) neue Menge = **1 Portion** (metrische Direktportion -> deren Gramm, sonst 1) statt 0.
- Pydantic v2 lehnt `NaN` im JSON bereits per Validation ab (`allow_inf_nan=False` Standard) - zusaetzlich expliziter Guard im Endpoint.

### 4. Backend: 422 statt 500 im PATCH

`backend/recipe/api/items.py` -> `update_recipe_item`: nach dem bestehenden `quantity is None`-Guard (Commit `cc776a6`, noch nicht deployed) zusaetzlich: `quantity <= 0` -> `HttpError(422, "Menge muss größer als 0 sein.")`. Der DB-Check-Constraint bleibt als letzte Sicherung, wird aber nicht mehr ausgeloest.

### 5. Anzeige "Gewicht unbekannt"

In der Editor-Zeile (`IngredientRow`) ersetzt bei unbekanntem Gewicht ein Warn-Icon mit Text "Gewicht unbekannt" die Anzeige "= 0 g". Der bestehende rote Hinweis "Gewicht bestaetigen" (bei `is_weight_trusted === false`) bleibt als Aktion erhalten.

### 6. Schema-Sync

Neu: Pydantic `StandardMeasureOut` in `backend/supply/schemas/ingredients.py` und passendes Zod-Schema in `frontend-food/src/schemas/supply.ts`. Bestehende Portion-Schemas bleiben unveraendert. Migrations-Check bleibt sauber (`makemigrations --check`).

### 7. Stueck-artige Portionen: backend-autoritatives `is_piece_like`

Portionen wie "kleine (50g)" tragen die Maßeinheit "Gramm", sind aber stueck-artig — der Editor wuerde Menge 1 als 1 g interpretieren (Bug-Report aus Produktion). Das Backend klassifiziert bereits per `supply/services/portion_resolution.py::is_piece_like_name`; diese Klassifikation wird jetzt als Feld `is_piece_like` ueber `PortionOut` (supply) und den Dict-Pfad von `RecipeItemOut.resolve_ingredient_portions` (recipe) ausgeliefert. Das Frontend verlässt sich ausschliesslich auf dieses Flag (`isDirectMetricPortion`/`portionDisplayLabel` piece-aware) statt eigene Namens-Heuristiken zu pflegen — gleiches Muster wie beim backend-autoritativen Gewicht. Folge: Stueck-Portionen werden als Anzahl gezaehlt (1 = 1 Stueck), Gramm-Erhalt greift nur bei bekanntem Gewicht.

### 8. Caching: `index.html` mit `no-cache`

nginx lieferte `index.html` ohne `Cache-Control`, wodurch Deploys bei Nutzern via Heuristik-Cache verzoegert ankamen. `nginx.conf.template` sendet fuer `index.html` jetzt `Cache-Control: no-cache` (nur Hashed-Assets bleiben `immutable`).

## Risks / Trade-offs

- ["ca."-Gramm werden als exakte Grammmenge gespeichert] -> Nutzer sieht im Picker "(ca.)", nach Auswahl steht die Zahl editierbar im Feld; Toast kann auf Naeherung hinweisen.
- [Standardmengen-Auswahl ohne `g`-Portion der Zutat] -> Fallback `portion_id=null` (Gramm-Interpretation laut Model-Help-Text), Berechnung bleibt korrekt.
- [Fallback-Menge 1 koennte falsche Daten legitimieren] -> Guard greift nur bei 0/NaN-Ergebnis; Backend-422 bleibt letztes Netz.
- [Pydantic/Zod-Katalog duplizierbar] -> beide Files im selben Change, Tests decken die Sync ab (contractSchemas-Muster).

## Migration Plan

1. Backend + Frontend implementieren; Tests: `uv run pytest backend/recipe backend/supply`, frontend-food `vitest` fuer Picker/Guards.
2. `uv run python manage.py makemigrations --check` (erwartet: keine Aenderungen).
3. Deploy Backend (`inspi-backend`) und food-Frontend (`inspi-frontend-food`) per Deploy-Skill (Cloud Build, `--image` + `--region`, danach `gcloud run services update-traffic --to-latest`); Achtung: Traffic-Update nicht vergessen.
4. Rollback: neue Revisionen sind rueckwaertskompatibel (keine DB-Aenderung); bei Bedarf aeltere Revision wieder auf Traffic setzen.

## Open Questions

- Sollen "Becher"/"Glas" spaeter ergaenzt werden? (Katalog ist eine Datenliste, trivial erweiterbar.)
- Soll der Abschnitt "Gramm" bei bereits metrischer Menge entfallen? (Vorlaeufig immer zeigen, harmlos.)
