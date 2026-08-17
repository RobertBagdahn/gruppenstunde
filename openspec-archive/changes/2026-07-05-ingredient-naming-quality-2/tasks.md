## 1. Dependency & Datenmodell

- [x] 1.1 Stemming-Dependency hinzufügen (`uv add snowballstemmer`), Lockfile aktualisieren
- [x] 1.2 `IngredientAlias.is_generic` (BooleanField, default `False`) im Modell ergänzen (`backend/supply/models/`)
- [x] 1.3 Datencheck-Skript/Shell: bestehende nicht-generische Alias-Duplikate identifizieren und bereinigen
- [x] 1.4 Migration erzeugen: `is_generic` + partielle Unique-Constraint (eindeutig nur bei `is_generic = false`) — `uv run python manage.py makemigrations supply`
- [x] 1.5 `makemigrations --check` (0 Changes) und `migrate` lokal verifizieren

## 2. Backend-Services

- [x] 2.1 `backend/supply/services/term_normalization.py`: `normalize_term(text) -> str` via `snowballstemmer` (deutscher Stemmer); unregelmäßige Plurale über Pflege-Aliase
- [x] 2.2 `backend/supply/services/generic_terms.py`: `get_generic_terms() -> set[str]` (distinct, case-insensitive aus `IngredientAlias.is_generic=True`) und `is_generic_name(name) -> bool`
- [x] 2.3 `fuzzy_match.py` + `recipe/services/ai_ingredients_service.py`: normalisierten Match-Pfad ergänzen (exakter Name/Alias hat Vorrang, Stemming nie alleiniges Merge-Kriterium)
- [x] 2.4 Dedup von KI-Vorschlägen gegen vorhandene Zutaten auf normalisierte Formen erweitern
- [x] 2.5 Seed-/Management-Command für initiale generische Begriffe (Salz, Pfeffer, Nudeln, Wasser, Öl, Mehl)

## 3. Import-Prompt-Konkretisierung

- [x] 3.1 Prompt in `backend/recipe/services/url_import_service.py` anpassen: Salz→Jodsalz, Pfeffer→Schwarzer Pfeffer gemahlen, Wasser konkretisieren; nicht mehr weglassen; jede Zutat einzeln + Zustandsform
- [x] 3.2 Analoge Anpassung in `backend/recipe/services/ai_ingredients_service.py`
- [x] 3.3 Import-Review-Output: `name_warning` pro neuer Zutat befüllen, wenn `is_generic_name` zutrifft

## 4. Schemas (Pydantic + Zod)

- [x] 4.1 `backend/supply/schemas/ingredients.py`: `is_generic` an Alias-Schemas (read/write), `name_warning: str | None` an Create-/Update-Response
- [x] 4.2 `backend/recipe/schemas/`: `name_warning: str | None` an URL-Import-Review-Items
- [x] 4.3 `frontend-food/src/schemas/supply.ts`: Zod 1:1 synchronisieren (`is_generic`, `name_warning`)
- [x] 4.4 Optional: `GET /api/supply/generic-terms/` Endpoint + Hook für Frontend-Hinweise

## 5. Frontend

- [x] 5.1 `CreateIngredientPage.tsx`: „zu generisch"-Warnung anzeigen (nicht blockierend) basierend auf `name_warning`/Begriffsliste
- [x] 5.2 `RecipeImportPage.tsx`: Warnung pro Review-Element + Möglichkeit, konkrete Zutat zu wählen/Namen anzupassen vor Bestätigung (implementiert in `CreateRecipePage.tsx`, da dort der Enhanced-Import mit `created_ingredients`/`name_warning` läuft — `RecipeImportPage.tsx` nutzt den alten Basic-Endpoint ohne diese Felder)
- [x] 5.3 Alias-Verwaltung im Zutaten-Detail um `is_generic`-Toggle erweitern (sofern Alias-UI vorhanden)

## 6. Tests

- [x] 6.1 Modell/Migration: partielle Unique-Constraint (generisch mehrfach erlaubt, nicht-generisch eindeutig)
- [x] 6.2 `term_normalization`: regelmäßige + unregelmäßige Plurale (Zwiebel/Zwiebeln, Apfel/Äpfel), kritisches Wortpaar nicht gemerged (Tomate/Tomatenmark)
- [x] 6.3 `is_generic_name`: Exact-Match, Case/Whitespace, spezifischer Name negativ
- [x] 6.4 Matching/Dedup: Plural wird bestehender Zutat zugeordnet, kein Doppelvorschlag
- [x] 6.5 Import-Service: Salz/Pfeffer konkretisiert, „Salz und Pfeffer" aufgetrennt, generischer Name liefert `name_warning`
- [x] 6.6 API: Create-Response enthält `name_warning` bei generischem Namen, `null` bei spezifischem

## 7. Abschluss

- [x] 7.1 Seed-Command ausführen, Daten verifizieren
- [x] 7.2 Pydantic/Zod-Sync prüfen, keine `any`/`print`/`console.log`
- [x] 7.3 `makemigrations --check` + `showmigrations` grün
