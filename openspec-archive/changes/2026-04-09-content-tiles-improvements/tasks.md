## 1. Grid-Layout anpassen

- [x] 1.1 CSS-Grid-Klassen auf allen Content-Listenseiten ändern: `grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5` — Dateien: `RecipeListPage.tsx`, `SessionListPage.tsx`, `GameListPage.tsx`, `BlogListPage.tsx` (oder gemeinsame Wrapper-Komponente identifizieren)
- [x] 1.2 Grid-Gap anpassen falls nötig: bei 5 Spalten eventuell kleinerer Gap (`gap-3` statt `gap-4`)

## 2. RecipeCard erweitern

- [x] 2.1 Nutri-Score Badge hinzufügen (farbig, A-E) — vorhandenes Schema-Feld `cached_nutri_class` nutzen
- [x] 2.2 Rezepttyp-Label hinzufügen (aus `recipe_type`)
- [x] 2.3 Zubereitungszeit als Icon+Text anzeigen (`execution_time`)
- [x] 2.4 Schwierigkeits-Icons anzeigen (`difficulty`)
- [x] 2.5 Kosten-Rating als Euro-Icons anzeigen (`costs_rating`)
- [x] 2.6 Tag-Anzeige erweitern: bis zu 3 Tags als kompakte Chips, „+N" für Rest
- [x] 2.7 Summary als `line-clamp-2` Text unter dem Titel
- [x] 2.8 Titel auf einzeilig mit `truncate` umstellen

## 3. SessionCard erweitern

- [x] 3.1 Dauer als Icon+Text anzeigen (`execution_time`)
- [x] 3.2 Schwierigkeits-Icons anzeigen (`difficulty`)
- [x] 3.3 Scout Level Badges als kompakte farbige Chips (max 2, „+N")
- [x] 3.4 Tag-Anzeige erweitern: bis zu 3 Tags, „+N" für Rest
- [x] 3.5 Summary als `line-clamp-2` Text

## 4. GameCard erweitern

- [x] 4.1 Dauer als Icon+Text anzeigen (`execution_time`)
- [x] 4.2 Schwierigkeits-Icons anzeigen (`difficulty`)
- [x] 4.3 Tag-Anzeige erweitern: bis zu 3 Tags, „+N" für Rest
- [x] 4.4 Summary als `line-clamp-2` Text

## 5. BlogCard erweitern

- [x] 5.1 Lesezeit berechnen und anzeigen: `Math.ceil(description.split(' ').length / 200)` Min., Buch-Icon
- [x] 5.2 Summary als `line-clamp-2` Text unter dem Titel
- [x] 5.3 Tag-Anzeige erweitern: bis zu 3 Tags, „+N" für Rest

## 6. Autor-Position auf Detailseiten

- [x] 6.1 `RecipeDetailPage.tsx`: Autor-Bereich aus oberer Info-Box entfernen und vor Kommentare positionieren
- [x] 6.2 `SessionDetailPage.tsx`: Autor-Bereich nach unten verschieben
- [x] 6.3 `GameDetailPage.tsx`: Autor-Bereich nach unten verschieben
- [x] 6.4 `BlogDetailPage.tsx`: Autor-Bereich nach unten verschieben
- [x] 6.5 Autor-Bereich als wiederverwendbare `ContentAuthorSection` Komponente extrahieren (falls noch nicht vorhanden)

## 7. Responsive Testing

- [x] 7.1 Alle Card-Komponenten auf 320px Mobile testen (1 Spalte, volle Breite)
- [x] 7.2 Alle Card-Komponenten auf 1280px+ Desktop testen (5 Spalten, ca. 220px pro Card)
- [x] 7.3 Truncation und line-clamp prüfen bei verschiedenen Textlängen
