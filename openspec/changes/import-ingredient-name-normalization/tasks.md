## 1. Normalisierung

- [x] 1.1 Reine Funktion `normalize_ingredient_name` (Plural-Klammern, Größen-Adjektive, `Größe X`, Kopf-Split) mit Tabellentests, inkl. `Prise(n) Salz`, `große Ei(er), Größe L`, `Mineralwasser mit Kohlensäure`, `Kokosmilch` (kein Kürzen)
- [x] 1.2 In `IngredientMatcher._match_core` vor Stufe 1 einbinden, Rohname und Notiz erhalten, `BARE_UNIT_STRIP_PATTERN` und `QUANTITY_UNIT_STRIP_PATTERN` um Plural-Klammern erweitern

## 2. Matching

- [x] 2.1 Kopfnomen-Stufe nach Stufe 1: exakter Name/Alias des Kopfs, Ergebnis `needs_review=True`, `matched_via="head"`, Notiz mit Zusatz
- [x] 2.2 Kandidatenvergleich: Klammer-Zusätze entfernen, vorhandene Plural-Logik (`ingredient-plural-matching`) wiederverwenden
- [x] 2.3 Hinweistexte nach Trefferstärke (`FUZZY_THRESHOLD`), Text in `_fuzzy_result` korrigieren

## 3. Review-Service und Wizard

- [x] 3.1 `ingredient_review_service.py`: `is_new` nur ohne Voll-/Kopf-Treffer und ohne Kandidaten ≥ Grauzone
- [x] 3.2 Frontend: nach Auswahl einer Alternative das Formular „Neue Zutat prüfen“ ausblenden (Rezept-Wizard Zutaten-Review)
- [x] 3.3 Zod-/Pydantic-Schemas auf neue `matched_via`-Werte prüfen und synchron halten

## 4. Daten

- [x] 4.1 Alias-Seed `Ei`, `Eier` → `Hühnerei (Größe M)` im Command `consolidate_egg_ingredients` (Dry-Run als Standard)
- [x] 4.2 Merge der vier Ei-Dubletten (`Eier (Größe M)`, `Hühnereier Größe M`, `Hühnerei`, `Hühnereier`) in `Hühnerei (Größe M)` im selben Command (`merge_ingredient`), Dry-Run listet betroffene Rezept- und Planeinträge, `--apply` nur nach OK im Prod-Rollout

## 5. Abschluss

- [x] 5.1 Regressionstest mit den drei Produktivtest-Zeilen über `preview_recipe_ingredients`
- [ ] 5.2 `uv run pytest backend/recipe`, Frontend-Typecheck, Lint und Tests; Chefkoch-Import manuell erneut prüfen
