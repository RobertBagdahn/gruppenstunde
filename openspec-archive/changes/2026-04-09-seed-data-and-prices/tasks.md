## 1. Seed-Daten Zutaten

- [x] 1.1 Management Command erstellen: `backend/recipe/management/commands/seed_data.py` (oder `backend/supply/management/commands/seed_data.py`) — Grundgerüst mit `get_or_create` Pattern
- [x] 1.2 Zutatendaten definieren: ~50 Basis-Zutaten als Python-Dicts mit allen Nährwertfeldern (`energy_kj`, `protein_g`, `fat_g`, `fat_sat_g`, `carbohydrate_g`, `sugar_g`, `fibre_g`, `salt_g`), `price_per_kg`, `nutri_score`, `nutri_class`, `status=verified`
- [x] 1.3 MeasuringUnits erstellen: Grundeinheiten (Gramm, Kilogramm, Milliliter, Liter, Stück, Teelöffel, Esslöffel, Tasse, Prise) — `get_or_create`
- [x] 1.4 Portionen pro Zutat erstellen: Mindestens 1 Standard-Portion pro Zutat mit `weight_g` und `measuring_unit`
- [x] 1.5 RetailSections erstellen: Basis-Abteilungen (Obst & Gemüse, Milchprodukte, Fleisch, Backwaren, Gewürze, Getränke, Tiefkühl, Konserven) — `get_or_create`
- [x] 1.6 NutritionalTags erstellen: Basis-Tags (vegan, vegetarisch, laktosefrei, glutenfrei, nussfrei) und Zutaten zuordnen

## 2. Seed-Daten Rezepte

- [x] 2.1 Tags erstellen: Themen-Tags (Lagerfeuer, Wanderproviant, Gruppenkochen, Schnell & Einfach, Gesund, etc.) — `get_or_create`
- [x] 2.2 ScoutLevels erstellen: Falls noch nicht vorhanden — `get_or_create`
- [x] 2.3 Mindestens 10 Rezepte definieren mit deutschen Titeln, Zusammenfassungen, Beschreibungen — alle mit korrekten Umlauten, `servings=1`, `status=approved`
- [x] 2.4 RecipeItems pro Rezept erstellen: Verknüpfung mit Seed-Zutaten, korrekte Mengen für 1 Portion
- [x] 2.5 `recalculate_recipe_cache` für alle Seed-Rezepte aufrufen (Nährwerte, Nutri-Score, Preis cachen)
- [x] 2.6 Rezepttyp-Abdeckung sicherstellen: min. 2 Frühstück, 3 Warmgericht, 2 Kaltgericht, 1 Dessert, 1 Snack, 1 Getränk

## 3. Preise pflegen

- [x] 3.1 `price_per_kg` für alle 50 Seed-Zutaten mit realistischen Durchschnittspreisen befüllen (deutsche Supermarktpreise 2024/2025)
- [x] 3.2 Preise verifizieren: Stichproben mit tatsächlichen Supermarkt-Preisen vergleichen

## 4. Umlaut-Korrektur

- [x] 4.1 Frontend durchsuchen: Alle `.tsx` und `.ts` Dateien nach deutschen String-Literals mit `ae`/`oe`/`ue` durchsuchen und korrigieren — nur in Strings, nicht in Variablennamen
- [x] 4.2 Backend durchsuchen: Alle `.py` Dateien nach deutschen String-Literals mit `ae`/`oe`/`ue` durchsuchen und korrigieren
- [x] 4.3 Seed-Daten: Alle Texte in den Seed-Daten auf korrekte Umlaute prüfen
- [x] 4.4 False-Positive-Check: Sicherstellen dass englische Wörter (queue, true, blue, etc.) nicht fälschlich geändert werden

## 5. Essensplan-Links

- [x] 5.1 Rezept-Links: In der Essensplan-Darstellung Rezeptnamen als `<Link>` zu `/recipes/{slug}` rendern — Datei: Essensplan-Komponente identifizieren und anpassen
- [x] 5.2 Zutaten-Links: Bei aufgeklapptem Rezept im Essensplan Zutatennamen als Links rendern (sofern Zutaten-Detailseite existiert)
- [x] 5.3 Fallback: Zutaten ohne Detailseite als normalen Text anzeigen (nicht als Link)

## 6. Tests

- [x] 6.1 Seed-Command testen: `uv run python manage.py seed_data` ausführen — keine Fehler, alle Daten erstellt
- [x] 6.2 Idempotenz testen: Command zweimal ausführen — keine Duplikate
- [x] 6.3 Cache-Berechnung prüfen: Alle Seed-Rezepte haben `cached_energy_kj`, `cached_nutri_class`, `cached_price_total` befüllt
- [x] 6.4 Umlaut-Grep: Nach verbleibenden falschen Umlauten in deutschen Texten suchen
