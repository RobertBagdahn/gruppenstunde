# Inspi Food – Komplettanalyse, geprüfte Fassung (25.09.2026)

Jede Aussage des ersten Berichts wurde erneut gegen Code, OpenSpec (306 Specs) und die lokalen Daten (Prod-Export) geprüft. Legende:

- **✅ bestätigt**: mit Beleg (Datei:Zeile oder Zahl)
- **✏️ korrigiert**: Aussage war ungenau oder falsch
- **📐 Spec**: bereits spezifiziert; der Vorschlag wird zur Spec-Abweichung bzw. Umsetzungslücke
- **🆕 neu**: bisher nicht spezifiziert, braucht eine OpenSpec-Änderung

---

## 1. Korrekturen am ersten Bericht

| Erste Aussage | Geprüftes Ergebnis |
|---|---|
| „Zwei Frühstücke am 1.1. im Juni-Plan“ | ✏️ #167 ist eine **Referenzmahlzeit** (`is_reference=True`), die entgegen dem Design ein Datum hat (`ref_meal.py:130` legt sie mit `start_datetime=None` an). Nur #168 ist eine echte Mahlzeit außerhalb des Zeitraums. `Meal.save()` prüft die Eindeutigkeit korrekt (`meal_plan.py`, `clean()`). |
| „Vollständig widerspricht ‚Essen reicht nicht‘ (Rechenfehler)“ | ✏️ Kein Rechenfehler. „Vollständig“ = Summe der Tagesanteile ≥ 80 % (`schemas/mealPlan.ts:723`), „Essen reicht nicht“ = kcal je Mahlzeit (`MealSlot.tsx:340`). Zwei Konzepte ohne klare Benennung. |
| „125 g als 130 g angezeigt ist ein Bug“ | ✏️ Spec-konform (`quantity-display-formatting`: 100–999 g auf 10 g runden). Problematisch ist nur, dass auch **definierte** Portionsgewichte („à 125 g“) gerundet werden. Echte Abweichung: Die Spec verlangt 5-g-Schritte ab 10 g; Frontend und Backend runden erst ab 50 g in 5-g-Schritten. |
| „Salz als 968 mg ist falsch“ | ✏️ Spec-konform (< 1 g → mg). Nicht mehr als Fehler geführt. |
| „Frühstücksassistent auf 3 Schritte verkürzen“ | ✏️📐 Einen Ein-Bildschirm-Baukasten gibt es schon (`BreakfastQuickBuilder`, Spec `breakfast-single-screen-builder`). Der 6-Schritt-Assistent lebt parallel als „Expertenmodus“ weiter. Die Spec verlangt den Expertenmodus aber **inline** im Baukasten. |
| „452 Portions-Dubletten“ | ✏️ Nach dem Spec-Schlüssel `(Zutat, Name, Einheit, Menge)` gibt es **0** Dubletten. Die 452 sind Namensvarianten mit gleichem Gewicht („100g“ und „100g Zucker“). |
| „Merge-UI für Zutaten bauen“ | ✏️📐 Existiert (`ingredient-merge-ui`, `content/api/data_quality.py:665`), aber nur paarweise und mit der Logik direkt in der API-Funktion. |
| „Approved-Zutaten darf jeder ändern (gewollt)“ | ✏️ Schwerer: `approved` ist **kein gültiger Zutat-Status** (`supply/choices.py:34`: `draft`, `verified`, `user_content`). Der Zugriffscode prüft trotzdem an 15 Stellen `"approved"` (`content/services/food_access.py:182-260`, `supply/api/ingredients.py:156-270`). Betroffen sind 5 Zeilen, davon 2 Testdaten („LauchTest“, „LauchTest2“). |

---

## 2. Geprüfte Befunde nach Priorität

### P0: Konsistenz und Korrektheit
1. ✅ **Sichtbarkeit:** 222 von 248 freigegebenen Rezepten enthalten Zutaten, die Nicht-Staff nicht sehen darf (469 Entwurfs-Zutaten). Folgen:
   - Zutaten-Links liefern 404 (z. B. Chili con Carne → „Kidneybohnen aus der Dose“).
   - Die Frühstücksauswahl ist für Nutzer leer bzw. nur Butter.
   - Die Suche findet diese Zutaten nicht.
2. ✅ **Status-Modell kaputt:** `approved` wird im Code gelesen, ist aber keine gültige Wahl; `user_content` ist gültig, wird aber nirgends gesetzt. Folge: Die Regel „öffentliche Nutzer-Zutaten sichtbar“ (`public_q … status="approved"`) kann nie greifen.
3. ✅ **Toter Parallelcode für Sichtbarkeit:** `_can_view_ingredient_breakfast`, `_get_visible_ingredients_for_breakfast_qs` (`supply/api/ingredients.py:201-280`) und `_can_view_recipe_breakfast` bzw. `_get_visible_recipes_for_breakfast_qs` (`recipe/api/recipes.py:128-217`) werden nur noch von Tests genutzt und widersprechen `food_access` (nur `approved`, ohne `verified`).
4. ✅ **Frühstückskatalog leer** (Tags ohne Zuordnung, 2 Tags fehlten). Lokal behoben; auf Prod offen.
5. ✅ **Kalorienziel doppelt:** `MealPlanBudgetCockpit.tsx:206` zeigt fest „Ziel: 2.000“. Spec `meal-plan-soll-ist-band` schreibt 2335 kcal (Norm-Person) als **einzigen** Bezug vor.
6. ✅ **Referenzmahlzeit mit Datum** (#167) erscheint in der Tagesansicht als eigener Tag. Die Plan-API liefert Referenz- und reguläre Mahlzeiten gemischt; es fehlt ein Constraint „Referenz ⇒ kein Datum“.
7. ✅ **Mahlzeit außerhalb des Planzeitraums** (#168). Spec `meal-plan-contiguity` verzichtet bewusst auf Prüfungen bei Mahlzeiten-CRUD (wegen teurer Abfragen). Eine Bereichsprüfung gegen den ohnehin geladenen Plan kostet aber keine Abfrage.
8. ✅ **Essens-Eintrag ohne Menge:** `MealItemCreateIn.quantity` und `RefMealItemIn.quantity` sind `float | None` (`planner/schemas/meal_plan.py:243/868`). Folge: 0 kcal und 0 € ohne Hinweis.
9. ✅ **Zutaten-Dubletten:** 204 Zutaten in 24 Namensgruppen. 106 sind ungenutzt, 95 Verwendungen stammen aus den 21 Test-Kopien „Holländische Käsenudeln“ (angelegt 6.–8.9. von User 6). Ursache: frühere Importläufe legten Zutaten neu an statt vorhandene zu verwenden.
10. ✅ **Test-Altlasten:** 95 Test-Rezepte (e2e-, ai-fixture-, roundtrip-, zz-ai-probe-, neues-rezept-), 3 E2E-Pläne. Staff sieht davon 22 unter „Verifizierte Rezepte“ (270 statt 248).

### P1: Daten
11. ✅ **Abteilungen:**
    - Die DB hat 12 von 22 Katalog-Abteilungen nicht (u. a. Fisch, Gekühlt, Süßwaren, Salzige Snacks, Kaffee und Tee, TK-Varianten); 4 Alt-Abteilungen sind noch aktiv.
    - „Konserven & Gläser“ ist Sammelbecken (1486 Zutaten, darunter 430 Süßwaren).
    - Die Keyword-Zuordnung (`retail_section_mapping._match_keywords`) ist **selbst fehlerhaft**: „Brechbohnen (Glas)“ → Milchprodukte, „Chips Paprika“ → Gemüse, „Blätterteig“ → Milchprodukte, „Amaretto-Eier“ → Milchprodukte. Ein blindes Umsortieren (3292 Zutaten) ist deshalb **nicht** vertretbar.
12. ✅ **Nur 700 von 5918 Zutaten sind im Einsatz** (echte Rezepte und Pläne). Davon haben 93 keine Abteilung, 95 keinen Preis und 41 keine kcal; 568 sind Entwürfe. Das ist die relevante Prüfmenge.
13. ✅ **Portionsnamen uneinheitlich** (452 gleichgewichtige Namensvarianten; nur 8 davon in Rezepten, 38 Rezeptzeilen). Beispiele: Salz „Prise“ = 1 g neben „1 Prise Salz“ = 0,3 g; Olivenöl „Stück“ (Einheit Esslöffel).
14. ✅ **Unplausible Portionsgewichte:** lokal bereinigt (siehe Abschnitt 5). 2 genutzte Fälle bleiben zur manuellen Prüfung: „Speisesalz ohne Jod / Prise“ = 5 g und „Bandnudeln / 1 Portion trocken (100g)“ = 125 g.
15. ✅ **Warme Frühstücksgerichte falsch getaggt:** `tag_breakfast_prod` nimmt alle Rezepte vom Typ „breakfast“, auch „Schokocreme Brot“ und „Erdbeermarmeladen Brot“. Extras enthalten nur Avocado.

### P1: Rezept-Erstellung
16. ✅ Ohne KI kein Rezept (`WizardStepMethod.tsx:41`: leere Eingabe wird abgelehnt).
17. ✅ Prüfschritt zeigt Rohtexte („5 1 Portion trocken (100g) / 100.0 Gramm / Spaghetti“); die Inline-Autovervollständigung wirkt wie eine andere Zutat („Salz⟨ und Pfeffer⟩“); „… neu anlegen“ erscheint vor den Suchtreffern.
18. ✅ Wizard-Zustand geht beim Neuladen verloren (in 3 Testläufen reproduziert).
19. ✅ „Rezept fertiggestellt!“ und „KI ist gerade überlastet“ erscheinen gleichzeitig.
20. ✅ `/edit` hat keine Zutaten; Tags zeigen interne Slugs (`breakfast-base` …).

### P1: Frühstück
21. ✅ **Vorlagen wirkungslos:**
    - `BreakfastWizardPage.tsx:114` gibt der alphabetisch ersten Zutat 100 %.
    - „Für Erwachsene“ ist funktional gleich „Klassisch“ (nur `children` ändert die Grammzahl).
    - „Rein pflanzlich“ schließt „Hafermilch Kakao“ aus (Filter auf „milch“), lässt aber Nutella zu.
22. ✅ Pluralbildung kaputt („150 gen“, „Teelöffelen“); der Energie-Check ignoriert Milch und Getränke.

### P2: Einheitlichkeit von Zahlen und Text
23. ✅ **Drei Formatierungswege:**
    - Backend-Strings: `shopping_service.py:386` „ca. 64.7 TL“ mit Punkt; `supply/utils.format_weight` ohne Leerzeichen („70g“), Bankers-Rounding bei 1–49 g.
    - Frontend `utils/formatWeight.ts` mit Leerzeichen („70 g“).
    - 145 lokale `toFixed()`-Aufrufe in `.tsx`, 6 lokale Kopien von `formatPrice`/`formatNumber`; „0.47 €/P.“ (`MealSlot.tsx:319`); „EUR“ in `IngredientDetailPage.tsx:1304`.
24. ✅ **Plural:** `ListPageHero.tsx:64` pluralisiert nur das Standard-Label („270 Rezept“, „5918 Zutat“, „17 Plan“).

### P2: Layout
25. ✅📐 **Icons:** 60 Dateien nutzen Material Symbols, auch für Aktionen (`close` 17×, `edit`, `delete`, `add`, `save`). Das verstößt gegen die Spec `food-design-system` („Lucide MUST für Buttons/Aktionen“).
26. ✅📐 **Tokens:** 711 hartcodierte Tailwind-Palettenfarben (laut `frontend-food/AGENTS.md` verboten), 333 freie Schriftgrößen (`text-[10px]` 73×, `text-[11px]` 66×, `text-[9px]` 4×), 7 Radius-Varianten (`rounded-xl` 462×, `rounded-lg` 435×, `rounded` 218× …).
27. ✅ **Mobile, Essensplan-Kopf:** Titel verdrängt, Druck-Button und Tab „Kochen“ abgeschnitten. Unten liegen zwei feste Leisten (~140 px). Die Zutaten der Rezeptdetailseite beginnen unterhalb von Bild-Upload und 9 Metadatenfeldern.
28. ✅ Klickflächen < 32 px: 51 (Desktop) bzw. 23 (Mobile) auf der Rezeptliste; Rezeptkarten ungleich hoch; kaputte Bilder zeigen Alt-Text.

### P2: Rechte und Sicherheit
29. ✅ `/api/supply/breakfast-catalog/debug/` ohne Anmeldung erreichbar (`breakfast_catalog.py:21`).
30. ✅ `/api/auth/me/` antwortet anonym mit 403 (Konsolenfehler auf jeder Seite).
31. ✅ Essenspläne: vollständig geschützt (28 Mutationen mit `_require_edit`, Löschen und Mitglieder mit `_require_admin`, `ref_meal` durchgängig mit `edit=True`).

---

## 3. Vorschläge neu bewertet (Einheitlichkeit als Leitlinie)

Leitprinzip: **eine Quelle je Konzept.** Fast alle Probleme entstehen durch zwei parallele Wege (zwei Status-Welten, zwei Sichtbarkeitsmodelle, zwei Frühstücks-UIs, drei Formatierer, zwei Icon-Systeme, zwei kcal-Ziele).

| # | Vorschlag | Status | Begründung und Einheitlichkeit |
|---|---|---|---|
| 1 | **Ein Status-Modell für Zutaten:** `draft`/`verified` (plus `user_content` nur, falls wirklich genutzt). Alle `"approved"`-Prüfungen für Zutaten entfernen; Recipe-Status bleibt `approved`. DB-`CheckConstraint` auf die Choices. | 🆕 | Behebt Befund 2 und macht die Rechte nachvollziehbar. |
| 2 | **Ein Sichtbarkeitsmodell:** nur `content/services/food_access`; toten Frühstücks-Parallelcode samt Tests löschen. | 🆕 (Vereinfachung) | Befund 3. |
| 3 | **Transitive Lesesichtbarkeit:** Eine Zutat in einem freigegebenen Rezept ist lesbar (analog `transitive_visibility` für Rezepte in geteilten Plänen). | 🆕 | Behebt Befund 1 sofort, ohne 469 Zutaten ungeprüft zu verifizieren. |
| 4 | **Ein Frühstücks-UI:** `BreakfastQuickBuilder` bleibt; der 6-Schritt-Assistent entfällt, der Expertenmodus kommt als Inline-Bereich (wie in der Spec). Die unverlinkte Route `/meal-plans/:id/breakfast/wizard` entfernen. | 📐 | Spec `breakfast-single-screen-builder`; spart ~1900 Zeilen. |
| 5 | **Vorlagen mit echter Wirkung:** gleichmäßige Verteilung über kuratierte Top-N statt „erste Zutat 100 %“; Filter über Nährwert-Tags (vegan/vegetarisch) statt Namensteile. | 🆕 | Befund 21; nutzt vorhandene `NutritionalTag`s. |
| 6 | **Ein kcal-Ziel:** fest verdrahtete „2.000“ durch die Norm-Person ersetzen. | 📐 | Spec `meal-plan-soll-ist-band`. |
| 7 | **Begriffe trennen:** „Vollständig“ → „Alle Mahlzeiten geplant“; kcal-Status nur als „Energie ok / zu wenig“. | 🆕 (klein) | Befund aus Korrektur 2. |
| 8 | **Integrität der Mahlzeiten in der DB:** `CheckConstraint(is_reference ⇒ start_datetime IS NULL)`; `UniqueConstraint(meal_plan, date, meal_type)` für reguläre Nicht-Snack-Mahlzeiten (heute nur in `clean()`, umgehbar per `bulk_create`/`update`); Bereichsprüfung gegen die Plan-Felder ohne Zusatzabfrage; Plan-API liefert Referenzmahlzeiten getrennt. | 🆕, verträglich mit `meal-plan-contiguity` | Befunde 6 und 7. |
| 9 | **Mengen-Pflicht:** `quantity: float = Field(gt=0)` für Zutaten-Items bzw. Default-Portion. | 🆕 | Befund 8. |
| 10 | **Eine Formatierungsquelle:** Das Backend liefert **Zahlen** (Menge, Portionsname, Gramm), das Frontend formatiert zentral in `lib/format.ts` (`formatNumber`, `formatEuro`, `formatWeight`, `formatCount`, `plural`) über `Intl.NumberFormat('de-DE')` und `Intl.PluralRules`. ESLint-Regel gegen `toFixed` in `.tsx`. Backend-`format_weight` nur noch für die PDF-Ausgabe, mit identischen Regeln und Tests. | 📐 | Spec `quantity-display-formatting` verlangt Konsistenz zwischen Front- und Backend; heute weichen beide ab (Befund 23). |
| 11 | **Rundungsregel angleichen:** Die Spec-Stufen umsetzen (5 g ab 10 g) oder die Spec an den Code anpassen, **aber einheitlich**. Definierte Portionsgewichte („à 125 g“) nie runden. | 📐 und 🆕 (Ausnahme) | Korrektur 3. |
| 12 | **Mengen pro Person** mit Personen-Umschalter per URL-State; Editor und Detailseite nutzen dieselbe Umrechnung. | 📐 `recipe-portion-normalization` | F1 zeigt, wie fehleranfällig zwei Normierungsstellen sind. |
| 13 | **Ein Rezept-Editor:** Wizard, `/edit` und Zutaten-Editiermodus zusammenführen. | 🆕 (größer) | Befund 20; entfernt doppelte Speicherpfade. |
| 14 | **KI optional:** „Manuell beginnen“ in Schritt 1. | 🆕 | Befund 16. |
| 15 | **Wizard-Entwurf persistieren** (serverseitiger Entwurf, das Rezept existiert ab Schritt 3 ohnehin). | 🆕 | Befund 18. |
| 16 | **Prüfschritt verständlich:** Portion als „5 × Portion trocken (100 g) = 500 g“; Autovervollständigung als Dropdown statt Ghost-Text; „neu anlegen“ erst nach geladenen Treffern. | 🆕 | Befund 17. |
| 17 | **Portionsnamen normalisieren** (Zutatenname und redundante Gewichtsangabe entfernen: „100g Zucker“ → „100 g“), danach greift die bestehende Dedup-Regel der Spec automatisch. | 📐 `portion-data-integrity` | Einheitlich mit dem Spec-Schlüssel statt neuer „gleiches Gewicht“-Regel. |
| 18 | **Standardmaße nur aus dem Katalog** (EL/TL/Tasse × Dichte), keine zutatspezifischen EL-Portionen mehr. | 📐 `standard-measure-catalog` | Verhindert Klassen wie „EL = 100 g“. |
| 19 | **Plausibilität beim Speichern** (Grenzen wie in `fix_implausible_portions`) statt nachträglicher Reparatur. | 🆕 | Eine Regel-Registry für Befehl und Validator. |
| 20 | **Reparaturbefehle konsolidieren:** 16 `repair_*`/`cleanup_*`/`fix_*`-Befehle in `portion_integrity --check/--apply` mit Regel-Registry. | 🆕 (Vereinfachung) | Auch der neue `fix_implausible_portions` gehört dort hinein. |
| 21 | **Merge als Service** (`supply/services/ingredient_merge.py`) aus `content/api/data_quality.py:665` extrahieren; API und Stapel-Befehl nutzen denselben Code. | 📐 `ingredient-merge-ui` | Voraussetzung für die Dubletten-Reparatur. |
| 22 | **Abteilungen:** 12 fehlende Katalog-Abteilungen anlegen; Keyword-Mapping reparieren (Vorrang: Gebinde wie Glas/Dose → Konserven; Produktart wie Chips/Schokolade vor Geschmack wie Paprika/Kräuter); Zuordnung nur als Vorschlag mit Staff-Prüfung, beginnend bei den 700 genutzten Zutaten. Abteilung wird Pflichtfeld. | 📐 `retail-section-backfill` plus 🆕 Regeländerung | Befund 11. |
| 23 | **Einkaufsliste in kaufbaren Einheiten:** Stück und Packungen ganzzahlig aufrunden, Flüssigkeiten in Litern, Rest als Reserve anzeigen. | 🆕 (die Anzeige existiert: `shopping-list-package-display`) | Befund 23. |
| 24 | **Frühstücks-Tagging über die Admin-UI** statt Namens-Heuristik; Seed nur zur Erstbefüllung; Warnung bei leerem Katalog. | 🆕 | Befunde 4 und 15. |
| 25 | **Test-Daten-Hygiene:** E2E gegen eigene DB oder mit Teardown; Befehl `purge_test_content --dry-run`. | 🆕 | Befund 10. |
| 26 | **Nur Lucide:** Material Symbols in 60 Dateien ersetzen; Icon-Schrift entfernen. | 📐 (Spec erlaubt Material nur illustrativ, die Umsetzung verletzt das) | Einfacher, als die Ausnahme zu pflegen. |
| 27 | **Tokens durchsetzen:** 5 Schriftstufen (12/14/16/20/28), 2 Radien (Controls 8 px, Karten 12 px), semantische Farben; ESLint-Regel gegen `text-[..]`, Palettenfarben und freie `rounded`-Varianten. | 📐 `food-design-system` | Befund 26. |
| 28 | **Listen als Tabellen** mit festen Spalten, `tabular-nums`, Zahlen rechtsbündig (Rezept-Zutaten, Einkauf, Kosten). | 📐 („Card-basiertes Tabellen-Pattern“) | Befund 28, Wunsch „schön untereinander“. |
| 29 | **Rezeptdetail:** Titel → Personen → Zutaten → Zubereitung → Nährwerte/Kosten → Metadaten; Bild-Upload nur im Editor. | 🆕 | Befund 27. |
| 30 | **Mobiler Plan-Kopf:** Titel eigene Zeile, Aktionen im „⋯“-Menü, nur eine feste Leiste unten. | 🆕 | Befund 27. |
| 31 | **Gleich hohe Rezeptkarten** (`line-clamp-2`, feste Fußzeile), Bild-Fallback bei 404. | 🆕 | Befund 28. |
| 32 | **Filter als Drawer**, aktive Filter als Chips; Staff-Liste „Verifiziert“ zeigt nur `approved`. | 🆕 | Befund 10. |
| 33 | **Debug-Endpunkt entfernen; `/auth/me/` anonym 200/`null`.** | 🆕 (klein) | Befunde 29 und 30. |
| 34 | **Fehlermeldungen:** `HttpError`-Detail im Toast; `IntegrityError` → 409 mit deutscher Meldung. | 🆕 | Aus F3 („API error“). |
| 35 | **Seitentitel pro Route**, eine `h1` je Seite. | 🆕 (klein) | Crawl. |
| 36 | **Plan-Check erweitern:** Typ passt nicht zur Mahlzeit, fehlende Menge, außerhalb des Zeitraums. | 📐 `meal-planner-actionable-alerts` | Einheitlich im vorhandenen Plan-Check statt neuer Warnungen. |
| 37 | Allergien der Gruppe, Reste-Planung, CSV/Markdown-Export, Plan mit Datumsverschiebung duplizieren. | 🆕 (Erweiterungen) | Vorhandene Bausteine: Gruppenmitglieder, Vorlagen, `meal-plan-duplicate`. |

**Verworfen:** „Zutaten-EL-Portionen per Dichte korrigieren“ (ersetzt durch 18), „Portionen nach gleichem Gewicht deduplizieren“ (ersetzt durch 17), „Keyword-Remap aller 3292 Zutaten“ (ersetzt durch 22).

---

## 4. Datenreparatur-Plan (Reihenfolge ist wichtig)

Grundregeln:
- Immer erst **Trockenlauf**, dann `--apply`.
- **Nur Soft-Delete** – `MealItem.ingredient` ist `CASCADE`, ein hartes Löschen einer Zutat löscht Einträge in Essensplänen still mit.
- Referenzierte Portionen nie im Gewicht ändern (Rezeptmengen können bereits kompensiert sein).
- Vorher einen Prod-Dump erstellen.

| Schritt | Was | Werkzeug | Umfang (lokal) | Risiko |
|---|---|---|---|---|
| 1 | Frühstücks-Tags setzen | `tag_breakfast_prod` (Trockenlauf jetzt korrekt) | 38 Zuordnungen | niedrig, additiv; vorher die Warm-Regel korrigieren (Brote ausschließen) |
| 2 | Unplausible, ungenutzte Portionen und Dubletten-Abteilungen | `fix_implausible_portions` | 2 Gewichte, 15 Soft-Deletes, 4 Abteilungen | niedrig; bereits lokal angewendet und idempotent |
| 3 | Test-Altlasten entfernen | neuer `purge_test_content` (Slug-Muster plus E2E-Pläne, Trockenlauf) | 95 Rezepte, 3 Pläne, 2 Test-Zutaten | niedrig; die Muster vorher auf Prod sichten |
| 4 | Ungenutzte Zutaten-Dubletten | Soft-Delete, wenn **keine** RecipeItem-, MealItem-, ShoppingListItem-, Alias- oder Package-Referenz besteht | nach Schritt 3 ≥ 106 | niedrig |
| 5 | Genutzte Zutaten-Dubletten | Stapel-Merge über den extrahierten Merge-Service; Ziel: die verifizierte bzw. älteste Zutat | Rest der 204 | mittel; Vorschau pro Gruppe |
| 6 | Ungültiger Status `approved` | → `verified` (echte Zutaten) bzw. löschen („LauchTest*“); danach der Constraint | 5 | niedrig |
| 7 | Referenzmahlzeit mit Datum | `start/end_datetime = NULL` für `is_reference=True`; danach der Constraint | 1 | niedrig |
| 8 | Mahlzeiten außerhalb des Zeitraums | nur melden (an den Plan-Eigentümer), nicht löschen | 1 | – |
| 9 | Portionsnamen normalisieren | Regel aus Vorschlag 17, danach der Dedup nach Spec-Schlüssel (RecipeItems umhängen, gleiches Gewicht) | 452 Varianten, 38 Rezeptzeilen | niedrig (gleiche Grammzahl) |
| 10 | Sichtbarkeit | Vorschlag 3 im Code; zusätzlich eine Prüfliste „Entwurf in freigegebenem Rezept“, nach Nutzung sortiert | 469 Zutaten | – |
| 11 | Abteilungen | 12 Katalog-Abteilungen anlegen; KI- bzw. Keyword-Vorschlag mit Staff-Freigabe, zuerst die 93 genutzten ohne Abteilung, dann die übrigen der 700 | 700 | mittel; kein blinder Massen-Remap |
| 12 | Preise und kcal | Prüfliste für die genutzten Zutaten (vorhandene `ai-price-approval`) | 95 Preise, 41 kcal | niedrig |
| 13 | Rezept-Plausibilität | Prüfliste (> 900 g bzw. < 150 g pro Portion bei Hauptgerichten; viele sind Test-Kopien und fallen mit Schritt 3 weg) | 4 und 39 | – |
| 14 | Referenzierte Problem-Portionen | manuell: „Speisesalz ohne Jod / Prise“ = 5 g → 0,4 g prüfen; „Bandnudeln / 1 Portion trocken (100g)“ in „(125g)“ umbenennen (nur der Name, keine Mengenänderung) | 2 | – |

Die Schritte 1–2 sind startklar (Befehle vorhanden und getestet). Für die Schritte 3–7 und 9 sind kleine, getestete Befehle nötig, die ich bei Bedarf schreibe.

---

## 5. Bereits behoben (erster Durchlauf, unverändert gültig)

- **F1 (kritisch):** KI-Rezept für N Personen wurde mit N-fachen Mengen gespeichert → `RecipeWizard.tsx` normiert auf eine Portion; E2E geprüft (500 g für 4 Personen → 125 g pro Person).
- **F2 (kritisch):** Mengen-Dialog im Prüfschritt nutzte die Portionen der vorherigen Zutat → `RecipeIngredientReviewStep.tsx`; Regressionstest.
- **F3 (hoch):** HTTP 500 durch einen veralteten KI-Entwurf und doppelte Aliase → Store sendet den Entwurf nur bei bestätigter Entwurfs-Portion; Backend überspringt vergebene Aliase; Tests.
- **F5:** `tag_breakfast_prod --dry-run` schrieb Tags → transaktionaler Trockenlauf.
- **F6:** neuer Befehl `fix_implausible_portions` mit Tests; lokal angewendet.

Tests: Frontend 476/476, Backend `supply` und `recipe` grün, TypeScript und ESLint sauber.

---

## 6. Entscheidungen (25.09.2026)

**Umsetzung:** je Themenpaket ein OpenSpec-Change (Proposal, Design, Tasks) → Freigabe → Umsetzung mit Tests. Reihenfolge: Datenmodell/Status → Integrität → Format → Editor → Layout.
**Prod-Daten:** Claude führt die Befehle aus, sobald der Proxy-Zugriff freigegeben ist – jeden Trockenlauf zeigen, vor jedem `--apply` auf OK warten, vorher Backup.

| Thema | Entscheidung |
|---|---|
| Zutat-Status | nur `draft` + `verified`; `approved`-Prüfungen entfernen, 5 Zeilen migrieren (LauchTest* löschen), CheckConstraint; `user_content` entfällt |
| Sichtbarkeit | alle 469 Entwurfs-Zutaten in freigegebenen Rezepten sofort auf `verified` setzen |
| Frühstück-UI | nur `BreakfastQuickBuilder`, Expertenmodus inline; 6-Schritt-Assistent und unverlinkte Route entfernen |
| kcal-Ziel | überall Norm-Person 2335, hartcodierte 2.000 entfernen |
| Mahlzeiten-Integrität | CheckConstraint „Referenz ⇒ kein Datum“, UniqueConstraint (Plan, Tag, Typ) außer Snack, Bereichsprüfung ohne Zusatzabfrage, Referenzmahlzeiten getrennt in der API |
| Menge | `quantity > 0` Pflicht für Zutaten-Einträge |
| Begriffe | „Alle Mahlzeiten geplant / Teilweise geplant“ und „Energie ok / Zu wenig Energie“ |
| Plan-Check | + Rezepttyp passt nicht, + fehlende Menge/0 kcal, + außerhalb Zeitraum/Lücken, + Sortierung nach Uhrzeit |
| Formatierung | Backend liefert Zahlen, Frontend formatiert zentral in `lib/format.ts` (Intl de-DE); ESLint gegen `toFixed` in `.tsx`; Backend-Format nur für PDF mit gleichen Regeln |
| Rundung | Spec an Code anpassen (1–49 g: 1 g, 50–99 g: 5 g, 100–999 g: 10 g), Bankers-Rounding im Backend korrigieren |
| Portionsgewichte | Definitionen („à 125 g“) nie runden |
| Plural | zentrale `plural()`-Funktion im Frontend |
| Rezept-Editor | ein Editor für Neu und Bearbeiten, Detailseite nur Ansicht |
| KI optional | „Manuell anlegen“ zusätzlich zu „Mit KI importieren“ |
| Wizard-Entwurf | KI-Ergebnis sofort als Server-Entwurf (draft) mit Prüfzeilen |
| Prüfschritt | lesbare Mengen, Dropdown statt Ghost-Text, „Neu anlegen“ erst nach Treffern, Neue-Zutat-Formular ausblenden + erklärender Knopf |
| Portionsnamen | normalisieren, danach Spec-Dedup (452 Varianten, 38 Rezeptzeilen) |
| Standardmaße | nur noch aus dem Katalog |
| Plausibilität | beim Speichern blockieren (gleiche Regelliste wie der Befehl) |
| Reparaturbefehle | ein Befehl `portion_integrity` mit Regel-Registry |
| Testdaten | löschen (`purge_test_content`) und E2E künftig mit eigener DB/Teardown |
| Zutaten-Dubletten | ungenutzte soft-delete, genutzte per Stapel-Merge (Merge-Service extrahieren) |
| Abteilungen | automatisch per KI umsortieren (alle Zutaten, ohne Einzelfreigabe) auf den 22er-Katalog |
| Frühstücks-Tags | per KI-Skript klassifizieren (Basis, Belag, Fett, Extra, Getränk, warm) |
| Icons | nur Lucide, Icon-Schrift entfernen, Spec/AGENTS.md anpassen |
| Tokens | 5 Schriftgrößen, 2 Radien, semantische Farben + ESLint-Regel |
| Listen | Tabelle mit festen Spalten, `tabular-nums`, Zusatzinfos aufklappbar |
| Rezeptdetail | Kochen zuerst; Bild-Upload nur im Editor; eine Aktionsleiste auf Mobile |
| Mobiler Plan-Kopf | Titelzeile + ⋯-Menü, Kennzahlen-Chips, Segment-Tabs |
| Rezeptliste | gleich hohe Karten, Bild-Fallback, Filter-Drawer + Chips, „Verifiziert“ = nur freigegeben |
| Einkauf | kaufbare Einheiten aufgerundet, Flüssigkeiten in Litern, Überschuss als Reserve |
| Kleinkram | Debug-Endpunkt entfernen, `/auth/me` anonym 200/null, echte Fehlermeldungen, Seitentitel pro Route |
| Erweiterungen | Allergien der Gruppe, Reste-Planung, Export CSV/Markdown, Plan mit Datumsverschiebung duplizieren |

**Hinweis zu zwei riskanteren Entscheidungen:**
- *469 Zutaten sofort verifizieren:* Vorher die Datenlücken der betroffenen Zutaten (ohne kcal/Preis/Abteilung) automatisch füllen oder als Liste ausgeben, damit „verifiziert“ nicht leere Werte bestätigt.
- *KI-Umsortierung aller Abteilungen:* In Stapeln mit Trockenlauf-Protokoll (alt → neu), gleiche Prompt-/Modellversion für alle, Konfidenz speichern; bei niedriger Konfidenz Abteilung „Sonstiges“ statt Raten. Kosten vorab schätzen.
