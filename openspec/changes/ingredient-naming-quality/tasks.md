## 1. Dependency & Datenmodell

- [ ] 1.1 Stemming-Dependency hinzufügen (`uv add snowballstemmer`), Lockfile aktualisieren
- [ ] 1.2 `IngredientAlias.is_generic` (BooleanField, default `False`) im Modell ergänzen (`backend/supply/models/`)
- [ ] 1.3 Datencheck-Skript/Shell: bestehende nicht-generische Alias-Duplikate identifizieren und bereinigen
- [ ] 1.4 Migration erzeugen: `is_generic` + partielle Unique-Constraint (eindeutig nur bei `is_generic = false`) — `uv run python manage.py makemigrations supply`
- [ ] 1.5 `makemigrations --check` (0 Changes) und `migrate` lokal verifizieren

## 2. Backend-Services

- [ ] 2.1 `backend/supply/services/term_normalization.py`: `normalize_term(text) -> str` via `snowballstemmer` (deutscher Stemmer); unregelmäßige Plurale über Pflege-Aliase
- [ ] 2.2 `backend/supply/services/generic_terms.py`: `get_generic_terms() -> set[str]` (distinct, case-insensitive aus `IngredientAlias.is_generic=True`) und `is_generic_name(name) -> bool`
- [ ] 2.3 `fuzzy_match.py` + `recipe/services/ai_ingredients_service.py`: normalisierten Match-Pfad ergänzen (exakter Name/Alias hat Vorrang, Stemming nie alleiniges Merge-Kriterium)
- [ ] 2.4 Dedup von KI-Vorschlägen gegen vorhandene Zutaten auf normalisierte Formen erweitern
- [ ] 2.5 Seed-/Management-Command für initiale generische Begriffe (Salz, Pfeffer, Nudeln, Wasser, Öl, Mehl)

## 3. Import-Prompt-Konkretisierung

- [ ] 3.1 Prompt in `backend/recipe/services/url_import_service.py` anpassen: Salz→Jodsalz, Pfeffer→Schwarzer Pfeffer gemahlen, Wasser konkretisieren; nicht mehr weglassen; jede Zutat einzeln + Zustandsform
- [ ] 3.2 Analoge Anpassung in `backend/recipe/services/ai_ingredients_service.py`
- [ ] 3.3 Import-Review-Output: `name_warning` pro neuer Zutat befüllen, wenn `is_generic_name` zutrifft

## 4. Schemas (Pydantic + Zod)

- [ ] 4.1 `backend/supply/schemas/ingredients.py`: `is_generic` an Alias-Schemas (read/write), `name_warning: str | None` an Create-/Update-Response
- [ ] 4.2 `backend/recipe/schemas/`: `name_warning: str | None` an URL-Import-Review-Items
- [ ] 4.3 `frontend-food/src/schemas/supply.ts`: Zod 1:1 synchronisieren (`is_generic`, `name_warning`)
- [ ] 4.4 Optional: `GET /api/supply/generic-terms/` Endpoint + Hook für Frontend-Hinweise

## 5. Frontend

- [ ] 5.1 `CreateIngredientPage.tsx`: „zu generisch"-Warnung anzeigen (nicht blockierend) basierend auf `name_warning`/Begriffsliste
- [ ] 5.2 `RecipeImportPage.tsx`: Warnung pro Review-Element + Möglichkeit, konkrete Zutat zu wählen/Namen anzupassen vor Bestätigung
- [ ] 5.3 Alias-Verwaltung im Zutaten-Detail um `is_generic`-Toggle erweitern (sofern Alias-UI vorhanden)

## 6. Tests

- [ ] 6.1 Modell/Migration: partielle Unique-Constraint (generisch mehrfach erlaubt, nicht-generisch eindeutig)
- [ ] 6.2 `term_normalization`: regelmäßige + unregelmäßige Plurale (Zwiebel/Zwiebeln, Apfel/Äpfel), kritisches Wortpaar nicht gemerged (Tomate/Tomatenmark)
- [ ] 6.3 `is_generic_name`: Exact-Match, Case/Whitespace, spezifischer Name negativ
- [ ] 6.4 Matching/Dedup: Plural wird bestehender Zutat zugeordnet, kein Doppelvorschlag
- [ ] 6.5 Import-Service: Salz/Pfeffer konkretisiert, „Salz und Pfeffer" aufgetrennt, generischer Name liefert `name_warning`
- [ ] 6.6 API: Create-Response enthält `name_warning` bei generischem Namen, `null` bei spezifischem

## 7. Abschluss

- [ ] 7.1 Seed-Command ausführen, Daten verifizieren
- [ ] 7.2 Pydantic/Zod-Sync prüfen, keine `any`/`print`/`console.log`
- [ ] 7.3 `makemigrations --check` + `showmigrations` grün
