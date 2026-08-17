## ADDED Requirements

### Requirement: Rezept-PDF-Export
Der Server SHALL GET /api/recipes/{slug}/export/pdf/ bereitstellen, das eine PDF-Datei des Rezepts mit WeasyPrint generiert. Das PDF SHALL Zutatenliste, Zubereitungsschritte, Nährwerte und Allergen-Hinweise enthalten. Portionsangaben SHALL auf Standard- servings skaliert sein.

#### Scenario: Erfolgreicher Rezept-PDF-Export
- **WHEN** ein authentifizierter Nutzer den Endpunkt für ein gültiges Rezept aufruft
- **THEN** die Response SHALL `Content-Type: application/pdf` und `Content-Disposition: inline; filename="{slug}-rezept.pdf"` haben
- **THEN** das PDF SHALL Rezept-Titel, Bild (falls vorhanden), Beschreibung, Zutatenliste mit Mengen, Zubereitungsschritte, Nährwert-Übersicht und Allergen-Hinweise enthalten

#### Scenario: Zutatenliste mit Mengen
- **WHEN** das PDF ein Rezept mit RecipeItems rendert
- **THEN** die Zutatenliste SHALL jeden Eintrag auflisten mit: Zutat-Name, Menge + Einheit (z. B. „Tomaten — 500 g"), optionaler Notiz
- **THEN** Mengen SHALL auf die Standard-Servings des Rezepts normiert sein

#### Scenario: Zubereitungsschritte
- **WHEN** das Rezept eine recipe.steps (Markdown) hat
- **THEN** die Schritte SHALL formatiert als nummerierte Liste im PDF erscheinen

#### Scenario: Nährwert-Übersicht
- **WHEN** das Rezept `cached_*`-Felder hat
- **THEN** eine Tabelle SHALL Energie (kcal), Eiweiß (g), Fett (g), Kohlenhydrate (g), Zucker (g), Ballaststoffe (g), Salz (g) pro 100g und pro Portion anzeigen

#### Scenario: Allergen-Hinweise
- **WHEN** das Rezept Zutaten mit NutritionalTags (Allergenen) hat
- **THEN** das PDF SHALL eine Zeile „Enthält: Gluten, Laktose, ..." anzeigen
- **THEN** bei keinen Allergenen SHALL „Keine kennzeichnungspflichtigen Allergene" erscheinen

#### Scenario: Rezept nicht gefunden
- **WHEN** der Slug auf kein Rezept verweist
- **THEN** das System SHALL HTTP 404 mit „Rezept nicht gefunden" zurückgeben

#### Scenario: Nicht authentifiziert
- **WHEN** ein nicht authentifizierter Nutzer den Endpunkt aufruft
- **THEN** das System SHALL HTTP 403 mit „Anmeldung erforderlich" zurückgeben
