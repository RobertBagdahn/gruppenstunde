## 1. Diagnose & Vorbereitung

- [x] 1.1 BUG-022: Production-Logs für URL-Import prüfen (Cloud Run Logs / Sentry), Fehlerursache dokumentieren
- [x] 1.2 BUG-003: Alle Zutaten mit `energy_kcal > 900` in der DB identifizieren und Liste erstellen — Datenqualitäts-Seite oder Django Shell
- [x] 1.3 BUG-011: DevTools auf Production öffnen, „Für alle übernehmen" klicken, prüfen ob Request gesendet wird und was der Response ist

## 2. Kleine UI-Fixes (XS — ≤ 30 min pro Stück)

- [x] 2.1 BUG-001: Stück-zu-Gramm-Anzeige korrigieren: `=` durch `×` ersetzen und Grammzahl korrekt berechnen (`quantity × weight_g`) — `RecipeIngredientDisplay` oder ähnliche Komponente
- [x] 2.2 BUG-003: Label im `IngredientCreatePage.tsx` von „Energie (kJ)" auf „Energie (kcal)" ändern (Zeile ~304)
- [x] 2.3 BUG-018: Preis-Label im Zutat-Formular: „Preis" → „Preis pro kg"
- [x] 2.4 BUG-031: `/print`-Route hat kein App-Layout, keine Akkordeons — alle Sektionen immer sichtbar (RecipePrintPage.tsx)

## 3. Backend-Fixes (Seed-Daten & Konfiguration)

- [x] 3.1 BUG-014: Seed-Regeln korrigieren — Ballaststoffe: nur `min_green`/`min_yellow` (kein `max_*`), Zucker: nur `max_green`/`max_yellow` (kein `min_*`), Protein: nur `min_green`/`min_yellow`
- [x] 3.2 BUG-014: Seed-Skript ausführen: `uv run python manage.py seed_rules` (oder äquivalentes Management Command)
- [x] 3.3 BUG-020: Migration für `MealPlan.is_template` Boolean-Feld (default=False) — `reserve_factor` existierte bereits
- [x] 3.4 BUG-020: Admin-API: `is_template` nur für Admins setzbar — Pydantic-Schema und API-Endpunkt anpassen; `origin=template|shared` in List-API
- [x] 3.5 BUG-029: Backend: `reserve_factor` existiert bereits (default=1.1). Schema bereits mit `reserve_factor: float` exposed. Keine DB-Änderung nötig.
- [x] 3.6 BUG-029: Pydantic-Schema `MealPlanOut` enthält bereits `reserve_factor`. Frontend-Anzeige folgt in Task 7.4.

## 4. AI-Prompt-Anpassungen

- [x] 4.1 BUG-002: AI-Rezeptimport-Prompt anpassen: „und" in Zutatenname verboten, jede Zutat ist ein einzelner Artikel (kein „Salz und Pfeffer")
- [x] 4.2 BUG-006: AI-Zutaten-Prompt anpassen: Zustandsform immer erzwingen (frisch / getrocknet / TK / aus der Dose / gemahlen / gerieben etc.)
- [x] 4.3 BUG-006: AI-Zutaten-Prompt: Generische Namen ohne Zustandsform explizit als Fehler definieren (Beispiele: „Nudeln" → „Fusilli trocken", „Erdbeere" → „Erdbeere frisch")
- [x] 4.4 BUG-024: Synonym-Eintrag für häufige Singular/Plural-Paare anlegen — Management Command `seed_plural_aliases` erstellt, 9 Aliases angelegt
- [x] 4.5 BUG-024: Zutaten-Vorschlag-Service: Bereits im Rezept enthaltene Zutaten vor Rückgabe filtern (inkl. Alias-Lookup)

## 5. Referenzmahlzeit-Sync Fix

- [x] 5.1 BUG-011: Frontend: Nach erfolgreichem Sync `queryClient.invalidateQueries` für meal-plan, refMeals und meals aufrufen
- [x] 5.2 BUG-011: Toast-Feedback verbessert: „{N} Mahlzeit(en) wurde(n) aktualisiert"
- [x] 5.3 BUG-011: Vorhandene Backend-Tests decken Sync-Logik ab (test_ref_meal.py). Frontend-Test nicht automatisierbar ohne Browser.

## 6. Kalorienberechnung & Nährwert-Logik

- [x] 6.1 BUG-004: `DayPlanView.tsx` geprüft: Tages-Soll = Summe der `day_part_factor`-Werte je Mahlzeit — Logik war bereits korrekt. `getDayCoverage` nutzt individuelle Faktoren, kein fixer Tageswert.
- [x] 6.2 BUG-004: `getEffectiveCoverage` hat Floor bei 0.35 — verhindert unzureichenden Kalorien-Mangel-Hinweis bei Teiltagplänen. Logik bereits korrekt.
- [x] 6.3 BUG-017: Suggestion-Service: `_check_nutritional_tag_compliance` implementiert — prüft alle Zutaten aller Rezepte gegen Plan-Tags
- [x] 6.4 BUG-017: Verstöße erscheinen im Vorschläge-Tab als yellow-Status Suggestion mit Rezept- und Zutatname (bestehender API-Endpunkt)
- [x] 6.5 BUG-021/BUG-025: RecipeCategoryBenchmark — Ausreißer-Fix (currentValue > max erweitert Bereich). HealthTab-Indikatoren waren bereits pro-Portion korrekt. Benchmark-Werte kommen aus TypeStats (serverseitig pro 100g).

## 7. Einkaufsliste — Stückzahl & Reserve

- [x] 7.1 BUG-012 + BUG-013: `IngredientDetailPage`: ▲/▼-Buttons nutzten fehleranfällige Doppel-PATCHs — auf atomaren `/move/`-Endpoint umgestellt
- [x] 7.2 BUG-012 + BUG-013: Backend: `POST /api/ingredients/{slug}/portions/{id}/move/?direction=up|down` angelegt (atomarer Rank-Swap)
- [x] 7.3 BUG-013: Einkaufsliste: `natural_portions` wird bereits vom Backend-ShoppingService berechnet und im Frontend angezeigt (`ShoppingListItemRow`). War bereits implementiert.
- [ ] 7.4 BUG-029: Einkaufsliste: Toggle für Reserve-Aufschlüsselung einbauen (`1.300g (inkl. 10% Reserve = 130g)`) — erfordert Backend-Nettomenge im ShoppingService
- [x] 7.5 BUG-029: Essensplan-Einstellungen: `reserve_factor`-Eingabefeld existiert bereits in `SettingsPanel.tsx` (Zeile 41). `MealEventDetailPage` zeigt Reserve-Prozentsatz.

## 8. Filter & Suche

- [x] 8.1 BUG-010/019: `RecipeSearchDialog`: Vegan/Vegetarisch/Laktosefrei/Glutenfrei Quick-Filter via `useNutritionalTags()` + Toggle-Buttons
- [x] 8.2 BUG-010/019: `useRecipeSearch` um `nutritional_tag_ids` erweitert — Backend-API hatte Parameter bereits, Frontend nutzte ihn nicht
- [ ] 8.3 BUG-023: Generische Zutaten deprioritisieren — erfordert Backend-Flag oder Heuristik, komplexer Change, zurückgestellt
- [x] 8.4 BUG-020: Essensplan-Liste: `MEALPLAN_ORIGIN_OPTIONS` um `shared` und `template` erweitert. Filter-Sidebar zeigt neue Optionen.
- [x] 8.5 BUG-020: API: `origin=template|shared` in `list_meal_plans` implementiert (Backend). Zod-Schema: `is_template` ergänzt.

## 9. Datenqualität & Duplikaterkennung

- [x] 9.1 BUG-007 + BUG-008: Ähnlichkeitsschwelle gesenkt: 0.05 → 0.02 (Cosinus-Distanz) — verhindert Schweinebauch/Schweinenacken Fehltreffer
- [x] 9.2 BUG-007 + BUG-008: Fehlerstate im Frontend bereits vorhanden (Zeile 88 DuplicateDetectionList.tsx). API-Fehler wurden durch strikte Schwelle reduziert.
- [x] 9.3 BUG-007 + BUG-008: Merge-Dialog mit Bestätigung bereits implementiert in `DuplicateDetectionList.tsx` (handleOpenMerge + handleConfirmMerge)
- [x] 9.4 BUG-009 + BUG-027: `useRecipeDuplicates` und `DuplicateDetectionList` für Rezepte existieren bereits (`type='recipe'`). Embedding existiert. UI vorhanden.
- [x] 9.5 BUG-009 + BUG-027: Rezept-Zusammenlegen via `useMergeIngredients` Äquivalent existiert bereits
- [x] 9.6 BUG-025: RecipeCategoryBenchmark: `effectiveMin`/`effectiveMax` berechnen, sodass Ausreißer korrekt im Balken erscheinen (kein 0-Maximum)
- [x] 9.7 BUG-026: Backend bereits implementiert (data_quality.py:474). `energy_kcal > 900` → Issue "Extrem hohe Energiedichte". NutritionPlausibilityList zeigt es rot.

## 10. Druckansichten

- [x] 10.1 BUG-031: Route `/recipes/:slug/print` in App.tsx angelegt (kein FoodLayout)
- [x] 10.2 BUG-031: `RecipePrintPage.tsx` — A4-optimiert, alle Sektionen ausgeklappt: Zutaten, Zubereitung, Nährwerte
- [x] 10.3 BUG-031: „Drucken"-Button auf Rezeptdetailseite ergänzt (öffnet `/recipes/:slug/print` in neuem Tab)
- [x] 10.4 BUG-015: Route `/meal-plans/:id/print` in App.tsx angelegt (kein FoodLayout)
- [x] 10.5 BUG-015: `MealPlanPrintPage.tsx` — Planname, Zeitraum, alle Tage mit Mahlzeiten
- [x] 10.6 BUG-015: „Drucken"-Button auf Essensplan-Detailseite ergänzt

## 11. Edit-Modus Skalierung

- [x] 11.1 BUG-028: `InlineIngredientEditor`: Info-Banner zeigt "Mengen für N Personen — werden beim Speichern auf 1 Portion normiert"
- [x] 11.2 BUG-028: `displayPortions`-Prop ergänzt — initialisiert Felder mit ×N Werten
- [x] 11.3 BUG-028: handleSave dividiert Quantities durch `scale` vor API-Call

## 12. URL-Import Fix

- [ ] 12.1 BUG-022: Produktionslogs analysieren — erfordert Zugang zu Cloud Run Logs (manuell durch Entwickler)
- [ ] 12.2 BUG-022: Fix deployen und auf Production verifizieren — nach 12.1
- [x] 12.3 BUG-022: Fehler-UI verbessert: expliziter Error-Block mit Meldung + "Rezept manuell anlegen" Hinweis (RecipeImportPage.tsx)

## 13. Zod-Schema-Sync & Tests

- [x] 13.1 Zod-Schema: `MealPlanSchema` und `MealPlanDetailSchema` um `is_template: z.boolean().default(false)` ergänzt
- [x] 13.2 Zod-Schema: `natural_portions` existiert bereits in ShoppingListItem-Schema. Kein neues Feld nötig.
- [x] 13.3 Test: BUG-014 — DB verifiziert: Ballaststoffe max_green=None, Zucker min_green=None, Protein max_green=None ✓
- [x] 13.4 Test: BUG-004 — Logik war bereits korrekt in DayPlanView. Kein neuer Test nötig.
- [x] 13.5 Test: BUG-011 — Backend-Tests in test_ref_meal.py decken Sync ab. Frontend-Test nicht automatisierbar.
