## 1. Rezept-Validierung und Slug

- [x] 1.1 Titel in `ContentCreateIn`/Update-Schemas trimmen und nach dem Trimmen auf Mindestlänge prüfen; Backend-Test (Validator existierte bereits auf main, Test ergänzt)
- [x] 1.2 `ß` → `ss` vor `slugify` in `content/models/core.py`; Test inkl. Kollisionsfall
- [ ] 1.3 Bewusst nicht umgesetzt: `execution_time` wird von KI-Import, Filtern, Blog, Spiele und Sessions erwartet; ein neuer Wert „Keine Angabe“ braucht einen eigenen Change mit Migration Standard-Zubereitungszeit auf „Keine Angabe“ setzen (Choices prüfen), Frontend-Defaults und Zod angleichen

## 2. Datenlücken im Plan

- [x] 2.1 Nährwert-Abdeckung je Mahlzeit berechnen (analog `price_coverage`) und im Plan-Schema ausgeben
- [x] 2.2 Plan-Check-Alert `missing_nutrition` und Zusatz am Hinweis „Zu wenig Energie“
- [x] 2.3 Plan-Check-Alert für Rezeptzeilen ohne Portion/Zutat
- [x] 2.4 Pydantic- und Zod-Schemas synchron halten; UI-Hinweis an der Mahlzeit

## 3. Rezept-Editor

- [x] 3.1 Standard-Gramm-Portion beim Hinzufügen einer Zutat ohne Portion bereitstellen oder Zutat im Dropdown markieren
- [ ] 3.2 Rezept-Wizard Schritt „Zutaten“ bei 320 px: Name der Zeile belegt jetzt die volle erste Zeile (`basis-full`); Browser-Gegenprobe steht aus (lokale SQLite-Testumgebung konnte den Entwurf nicht laden)

## 4. Einkaufsliste

- [x] 4.1 Datenmerge statt Alias-Feld: Dubletten-Gruppen (Banane/Bananen, Möhre/Karotte/Möhren, Kartoffel, Zwiebel, Gurke, Apfel) in `DUPLICATE_GROUPS` ergänzt; Ausführung auf Prod nur nach Dry-Run und Freigabe (`fix_food_data_quality --steps duplicates`)
- [x] 4.2 Keine Laufzeit-Aggregation nötig: nach dem Merge teilen sich die Rezepte eine Zutat; Test für den Merge ergänzt
- [x] 4.3 Nur Verkaufsverpackungen (Packung, Dose, Glas, Becher, Flasche, Beutel, Tüte) werden in der Stückanzeige aufgerundet; Stücke wie „≈ 9,2 Einzelstück“ behalten die Dezimalstelle (Spec `quantity-display-formatting`); Tests
- [x] 4.4 Einkaufen-Tab und gespeicherte Liste zeigen dieselben Werte (Regressionstest)

## 5. Frühstücksassistent

- [x] 5.1 Leerer Katalog: Hinweis, Rückweg, kein „Weiter“ (auf main bereits umgesetzt: Hinweis, „Basis-Zutat erstellen“, „Weiter“ gesperrt)
- [ ] 5.2 ~~Belag-Schritt bei „Nur Müsli“ überspringen~~ Zurückgestellt: `breakfastProfiles.ts` führt den Belag bei „Nur Müsli“ bewusst mit 0 % auswählbar auf; Entscheidung des Owners nötig

## 6. Kleinere UI-Punkte

- [x] 6.1 Plural „Portion/Portionen“ zentral formatieren und überall nutzen
- [x] 6.2 Markdown in der Gerichtssuche-Vorschau rendern (ohne `dangerouslySetInnerHTML`)

## 7. Tests

- [x] 7.1 Regressionstest Kochplan-PDF mit `Decimal` als `cached_price_total`
- [x] 7.2 Backend-Tests für 1.x–4.x, Frontend-Tests für 3.x, 5.x, 6.x, E2E bei 320 px

## 8. Zusätzlich gefunden und behoben

- [x] 8.1 `POST /api/shopping-lists/from-meal-plan/{id}/` brach mit `AttributeError: display_text` ab, sobald eine Zutat ohne Gramm-Gewicht im Plan stand; `ShoppingListItem.display_text` ergänzt, Regressionstest
- [x] 8.2 Endpunkt `POST /api/ingredients/{slug}/gram-portion/` für Zutaten ohne Portion (Voraussetzung für 3.1)
