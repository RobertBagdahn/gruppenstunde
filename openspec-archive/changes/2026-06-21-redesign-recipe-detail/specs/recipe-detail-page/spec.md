# recipe-detail-page Specification

## MODIFIED Requirements

### Requirement: Rezept-Detailseite zeigt vollständige Analyse (MODIFIED)
Die Rezept-Detailseite SHALL unter `/recipes/:slug` das Rezept in neuer Sektions-Reihenfolge anzeigen: Bild (optional) → Summary → Zutaten → Zubereitung (default geöffnet) → Themen/Allergene → Analyse-Tabs → Rezeptregeln → Ähnliche → Emotionen → Comments. Die Meta-Informationen SHALL als kompakte Inline-Header-Zeile unter dem Titel dargestellt werden. Die Desktop-Sidebar SHALL nur noch PortionScaler + Aktionen enthalten (kein RecipeMetaCard mehr).

#### Scenario: Nutzer öffnet Rezept-Detailseite
- **WHEN** ein Nutzer `/recipes/:slug` aufruft
- **THEN** werden in Reihenfolge angezeigt: Badges + Titel + Meta-Header → Bild (optional) → Summary → Zutaten → Zubereitung → Themen/Allergene → Analyse-Tabs → Rezeptregeln → Ähnliche → ContentLinks → Emotionen → Comments
- **THEN** die Zubereitung ist default aufgeklappt

#### Scenario: NutriScore-Anzeige
- **WHEN** das Rezept einen cached_nutri_class-Wert hat
- **THEN** wird der NutriScore als farbiger Badge im Analyse-Tab "Gesundheit" angezeigt

#### Scenario: Preis-Anzeige
- **WHEN** das Rezept einen cached_price_total-Wert hat
- **THEN** wird der Gesamtpreis im Analyse-Tab "Preis" angezeigt

#### Scenario: Portionen skalieren
- **WHEN** der Nutzer die Portionszahl ändert
- **THEN** werden Zutatenliste und Preise entsprechend umgerechnet

#### Scenario: Mobile Layout
- **WHEN** die Viewport-Breite < 768px ist
- **THEN** wird das Layout gestapelt dargestellt mit konsolidierter Action-Bar am unteren Rand
- **THEN** die Action-Bar enthält alle Aktionen (Einkaufsliste, Portionen, Kochen, Bearbeiten, Löschen, Clonen, Drucken, Teilen) im Overflow-Menü

### Requirement: Bild abschnittsbasiert anzeigen (REMOVED)

Das Titelbild SHALL nur gerendert werden, wenn `recipe.image_url` einen Wert hat. Wenn kein Bild vorhanden ist, SHALL der Hero-Bereich komplett entfallen (kein Container, kein Fallback-Bild).

**Reason**: Ersetzt durch `recipe-detail-reorganized` Requirement "Bild abschnittsbasiert anzeigen"
**Migration**: TitleImageEditor wird nur noch bei image_url gerendert

#### Scenario: Rezept ohne Bild
- **WHEN** ein Nutzer ein Rezept ohne `image_url` öffnet
- **THEN** wird kein Bild-Container gerendert

### Requirement: Ingredient list position on detail page (MODIFIED)
The recipe detail page SHALL display the ingredients section as the first content section directly below the image/summary area, immediately followed by the preparation steps section. The analysis sections SHALL be grouped behind a tab-based analysis section after tags.

#### Scenario: User views recipe detail page
- **WHEN** a user opens a recipe detail page
- **THEN** the ingredients section is displayed directly below the summary
- **THEN** the preparation steps section is displayed directly below the ingredients
- **THEN** analysis tabs appear after nutritional tags (Themen/Allergene)

### Requirement: Single portion scaler location (MODIFIED)
The portion scaler control SHALL exist only in the desktop sidebar and the mobile bottom sheet. The "Skalieren" button (previously in the ingredients header) SHALL be removed — its function is merged into the PortionScaler via a factor quick-select (0.5×, 1.5×, 2×).

#### Scenario: Desktop view
- **WHEN** a user views the recipe on desktop (lg breakpoint)
- **THEN** the portion scaler is visible in the sticky sidebar
- **THEN** no portion scaler or scale button is shown inside the ingredient list
