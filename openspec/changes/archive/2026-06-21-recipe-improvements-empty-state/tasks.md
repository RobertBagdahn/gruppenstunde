## 1. Backend: Pydantic-Schema erweitern

- [x] 1.1 In `backend/recipe/schemas/nutrition.py`: `ImprovementListOut` um Feld `is_applicable: bool` erweitern (Default `True` für Rückwärtskompatibilität)
- [x] 1.2 Sicherstellen, dass das `message`-Feld in `ImprovementListOut` immer befüllt ist, wenn `items` leer ist (kein leerer String als Default für diesen Fall)

## 2. Backend: Service-Logik erweitern

- [x] 2.1 In `backend/recipe/services/improvement_ranking_service.py`: Funktion `compute_improvement_ranking()` erweitern — nach dem bestehenden `all_good`-Zweig einen neuen Zweig für `items == [] und not all_good` einführen
- [x] 2.2 Klassifikations-Hilfsfunktion `_classify_empty_reason()` implementieren, die folgende drei Fälle unterscheidet und `(is_applicable, message)` zurückgibt:
  - Rezepttyp nicht anwendbar (alle gecachten Nährwerte ≤ 0 UND keine Regeln)
  - Fehlende Nährwertdaten (Nährwerte ≤ 0, aber Typ prinzipiell auswertbar)
  - Nichts Umsetzbares (Daten vorhanden, aber kein Kandidat mit `class_improvement > 0`)
- [x] 2.3 Deutsche Nachrichtenkonstanten für die drei Leer-Fälle als Modul-Konstanten definieren (analog zu `ALL_GOOD_MESSAGE`)
- [x] 2.4 Rückgabe-Dict von `compute_improvement_ranking()` um `is_applicable` erweitern (auch für den `all_good`-Zweig: `is_applicable=True`)

## 3. Backend: Tests

- [x] 3.1 In `backend/recipe/tests/test_improvement_ranking.py`: Test für Getränk-Rezept mit allen Nährwerten 0 — erwartet `is_applicable=False` und befülltes `message`
- [x] 3.2 Test für Rezept mit Nährwertdaten aber 0 Kandidaten mit `class_improvement > 0` — erwartet `is_applicable=True` und „nichts Umsetzbares"-Nachricht
- [x] 3.3 Test für `all_good`-Fall — erwartet `is_applicable=True`
- [x] 3.4 Test für normalen Fall mit Items — erwartet `is_applicable=True` und `message=""`
- [x] 3.5 Tests ausführen: `cd backend && uv run pytest recipe/tests/test_improvement_ranking.py -xvs`

## 4. Frontend: Zod-Schema synchronisieren

- [x] 4.1 In `frontend-food/src/schemas/recipe.ts`: `ImprovementListOut`-Schema um Feld `is_applicable: z.boolean()` erweitern

## 5. Frontend: Komponente erweitern

- [x] 5.1 In `frontend-food/src/components/recipe/RecipeImprovements.tsx`: Den stillen `if (error || !data) return null` (Zeile 49) durch eine Fehlerkarte ersetzen — Text: „Verbesserungsvorschläge konnten nicht geladen werden.", mit Retry-Button (`refetch` aus `useRecipeImprovements`)
- [x] 5.2 Neuen 4. Render-Zweig nach dem `all_good`-Zweig einfügen: `!data.is_applicable || data.items.length === 0` → neutrale Info-Karte
- [x] 5.3 Neutrale Info-Karte implementieren: `bg-muted/40 border border-border rounded-xl p-4`, Lucide `Info`-Icon links, `data.message` als Text rechts daneben
- [x] 5.4 Fallback für `message`: Falls `data.message` leer ist (sollte nicht vorkommen), generischen Text „Keine Verbesserungsvorschläge verfügbar." anzeigen

## 6. Manuelle Verifikation

- [ ] 6.1 Getränk-Rezept im Browser öffnen (`/recipes/<slug>` eines Getränks) → Gesundheits-Tab → Verbesserungsvorschläge zeigt neutrale Info-Karte mit Erklärung
- [ ] 6.2 Rezept mit Nutri-A öffnen → grüne Erfolgskarte wird angezeigt
- [ ] 6.3 Rezept mit echten Verbesserungen öffnen → Verbesserungskarten werden wie bisher angezeigt
- [ ] 6.4 API-Fehler simulieren (z.B. im DevTools Network-Tab blockieren) → Fehlerkarte wird angezeigt, kein leerer Bereich

<!-- Manuelle Verifikation durch den Nutzer im Browser -->
