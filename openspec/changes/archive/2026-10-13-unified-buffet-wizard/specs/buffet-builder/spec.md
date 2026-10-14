## MODIFIED Requirements

### Requirement: Buffet-Katalog nach Rollen
`GET /api/supply/buffet-catalog/?template=<slug>` SHALL für jede Rolle der Vorlage (in deren `sort_order`) einen Eintrag mit `role` (`slug`, `name`, `icon`), `amount_per_person`, `unit`, `enabled_by_default` und `items` liefern. `items` MUST alle für den Nutzer sichtbaren Zutaten und Rezepte mit diesem Rollen-Tag sowie alle sichtbaren, expliziten Standardauswahlen der Vorlagenrolle enthalten, auch wenn ein Standard-Item keinen globalen Rollen-Tag trägt. Sichtbarkeit MUST über `content.services.food_access` geprüft werden; unsichtbare Items MUST entfallen. Jedes Item MUST `kind`, `id`, `name`, `energy_kcal_per_100g`, `price_per_kg`, `weight_per_serving_g` (nur Rezepte), `is_favorite` und `default_selected` enthalten. `is_favorite` MUST ausschließlich die globale Rollen-Tag-Zuordnung ausdrücken. Items MUST alphabetisch sortiert und vollständig geliefert werden. Ohne `template` SHALL der Katalog alle 19 Rollen mit `amount_per_person=null` liefern.

#### Scenario: Katalog kombiniert Favoriten und Vorlagen-Defaults
- **GIVEN** eine sichtbare Zutat trägt den Rollen-Tag `buffet-cheese` und ein weiteres sichtbares Item ist als Vorlagendefault gesetzt, trägt aber keinen globalen Rollen-Tag
- **WHEN** ein Nutzer den Katalog für diese Vorlage abruft
- **THEN** erscheinen beide Items; nur die getaggte Zutat hat `is_favorite=true`
- **THEN** ist nur das als Standard konfigurierte Item `default_selected=true`

#### Scenario: Unsichtbarer Default
- **GIVEN** eine Vorlage hat eine Zutat als Standard gesetzt, die der Nutzer nach `food_access` nicht sehen darf
- **WHEN** der Katalog abgerufen wird
- **THEN** fehlt die Zutat in `items` und kann nicht vorausgewählt oder gespeichert werden

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Katalog abruft
- **THEN** erhält er ausschließlich öffentlich sichtbare Zutaten und Rezepte

#### Scenario: Unbekannte Vorlage
- **WHEN** `template` auf einen nicht existierenden oder inaktiven Slug zeigt
- **THEN** antwortet das System mit 404

#### Scenario: Katalog für belegte Baguettes
- **WHEN** ein angemeldeter Nutzer `GET /api/supply/buffet-catalog/?template=baguettes` aufruft
- **THEN** enthält die Antwort die Rollen „Brot & Gebäck“, „Streichfett“, „Belag herzhaft“, „Soßen & Würze“, „Gemüse & Obst“, „Getränke“ mit `enabled_by_default=true` und „Belag süß“ mit `enabled_by_default=false`
- **THEN** ist „Baguette“ in „Brot & Gebäck“ als `default_selected=true` markiert, wenn es in der Vorlage als Standard hinterlegt ist

#### Scenario: Entwurfs-Zutat für normalen Nutzer
- **WHEN** ein Nicht-Staff-Nutzer den Katalog abruft und eine Zutat mit Rolle im Status `draft` ohne Freigabe für ihn existiert
- **THEN** ist sie nicht in `items` enthalten

#### Scenario: Alkoholische Items sind keine Rollen-Favoriten
- **GIVEN** eine Zutat trägt einen Buffet-Rollen-Tag, wird aber als alkoholisch erkannt
- **WHEN** der Nutzer den Rollen-Katalog für diesen Tag abruft
- **THEN** fehlt die Zutat in der Favoritenliste
- **THEN** kann sie bei passenden übrigen Filtern im Vollsuch-Endpunkt erscheinen

#### Scenario: Unsichtbare Standardauswahl
- **GIVEN** die Vorlage „Belegte Baguettes“ hat „Tomaten“ als Standard, und „Tomaten“ ist ein System-Entwurf
- **WHEN** ein Nicht-Staff-Nutzer den Katalog abruft
- **THEN** fehlt „Tomaten“ in `items` und wird nicht vorausgewählt; für Staff ist es enthalten und vorausgewählt

#### Scenario: Fremde private Zutat in der Auswahl
- **WHEN** ein Nutzer beim Speichern die ID einer privaten Zutat eines anderen Nutzers sendet
- **THEN** antwortet das System mit 404 und speichert nichts

### Requirement: Mengenberechnung im Backend
Das System SHALL Buffet-Mengen ausschließlich im Backend (`planner/services/buffet_service.py`) berechnen. `role_amounts[role_slug]` ist die Gesamtmenge der Rolle pro Person. Jedes Item der Rolle hat `share_percent` zwischen 0 und 100; die Shares einer nicht-leeren Rolle MUST zusammen 100 % ergeben. Das Backend MUST `amount_per_person = role_amount × share_percent / 100` berechnen. Zutaten MUST als `MealItem` mit `quantity` gleich Item-Menge pro Person, Einheit Gramm bzw. Milliliter und `factor=1.0` gespeichert werden. Für Rezepte MUST `factor = amount_per_person / weight_per_serving_g` gelten; fehlt das Portionsgewicht, MUST `factor=share_percent/100` als Fallback und eine Warnung zurückgegeben werden. Die Personenzahl MUST NOT in `quantity` einfließen; die Mahlzeit-Portionen skalieren wie bei anderen MealItems. Dasselbe Item MAY in verschiedenen Rollen vorkommen, MUST aber innerhalb jeder einzelnen Rolle eindeutig sein.

#### Scenario: Anteilige Item-Mengen
- **GIVEN** eine Rolle hat 120 g pro Person und zwei Items mit Shares von 25 % und 75 %
- **WHEN** die Vorschau berechnet wird
- **THEN** erhalten die Items 30 g und 90 g pro Person

#### Scenario: Share-Summe ungleich 100
- **WHEN** die Auswahl einer nicht-leeren Rolle Shares mit einer Summe ungleich 100 % sendet
- **THEN** antwortet das Backend mit 422 und speichert nichts

#### Scenario: Gleiche Zutat in verschiedenen Rollen
- **WHEN** eine Zutat sowohl einer Käse- als auch einer herzhaften Belag-Rolle zugeordnet wird
- **THEN** werden zwei getrennte, rollenbezogene MealItems mit den jeweiligen Shares berechnet
- **THEN** verhindert die Eindeutigkeitsprüfung nur eine doppelte Auswahl innerhalb derselben Rolle

#### Scenario: Rezept ohne Portionsgewicht
- **WHEN** ein Rezept-Item kein berechenbares Portionsgewicht hat
- **THEN** wird der Anteil als Fallback über `factor=share_percent/100` abgebildet und eine Mengenwarnung ausgegeben

#### Scenario: Brot für 10 Personen
- **GIVEN** Vorlage „Frühstück“ mit Brot 120 g pro Person, gewählt „Bauernbrot“ und „Brötchen“, Mahlzeit mit 10 Personen
- **WHEN** das Buffet gespeichert wird
- **THEN** entstehen zwei `MealItem`s mit je `quantity=60`, Einheit Gramm, `factor=1.0`
- **THEN** weist die Einkaufsliste insgesamt 1,2 kg Brot aus

#### Scenario: Getränke-Rezept
- **GIVEN** Rolle Getränke 250 ml, gewählt „Kaffee“ (Rezept, 250 g je Portion) und „Kuhmilch 3,5 % Fett“ (Zutat)
- **WHEN** das Buffet gespeichert wird
- **THEN** hat „Kaffee“ `factor=0.5` und „Kuhmilch“ `quantity=125` in Milliliter

### Requirement: Speichern und Vorschau
`POST /api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` SHALL einen typisierten `BuffetSaveIn`-Request mit `template_id`, Items mit `role_slug`/`ingredient_id|recipe_id`/`share_percent`, `role_amounts`, `manual_items_policy=preserve|replace` und `dry_run` annehmen. `BuffetResultOut` MUST pro Item Rolle, Name, Share, Menge pro Person, Gesamtmenge, kcal und Kosten sowie Summen und Warnungen enthalten. Bei `dry_run=true` MUST kein Datenbankzustand geändert werden. Bei `dry_run=false` MUST die bestätigte Vorlage, Rollenbeträge, Item-Shares und Buffet-MealItems in einer Transaktion gespeichert werden. `manual_items_policy=preserve` MUST manuelle Einträge unverändert behalten; `replace` MUST erst nach ausdrücklicher Nutzerwahl alle vorhandenen manuellen Einträge ersetzen. Der Endpunkt MUST weiterhin Plan-Bearbeitungsrechte und die vorhandenen Ingredient-/Recipe-Sichtbarkeitsprüfungen verlangen.

#### Scenario: Vorschau ohne Speichern
- **WHEN** der Wizard bei Auswahl- oder Slider-Änderungen `dry_run=true` sendet
- **THEN** erhält er Mengen, kcal, Kosten und Warnungen, während alle gespeicherten MealItems unverändert bleiben

#### Scenario: Manuelle Items erhalten
- **GIVEN** eine Mahlzeit enthält manuelle Einträge und der Nutzer wählt „Manuelle Einträge beibehalten“
- **WHEN** das Buffet gespeichert wird
- **THEN** bleiben manuelle Einträge unverändert und nur bisherige Buffet-Items werden ersetzt

#### Scenario: Manuelle Items ersetzen
- **GIVEN** eine Mahlzeit enthält manuelle Einträge und der Nutzer wählt „Manuelle Einträge ersetzen“
- **WHEN** das Buffet gespeichert wird
- **THEN** werden manuelle und bisherige Buffet-Items in einer Transaktion durch die neue Auswahl ersetzt

#### Scenario: Wiederherstellung nach erneutem Öffnen
- **GIVEN** ein Buffet wurde mit Preset, Mengen, Item-Auswahl und Shares gespeichert
- **WHEN** derselbe Wizard erneut geöffnet wird
- **THEN** sind Preset, Items, Rollenbeträge und Item-Shares wiederhergestellt

#### Scenario: Fremdes privates Item
- **WHEN** ein Nutzer beim Speichern die ID einer privaten Zutat oder eines privaten Rezepts eines anderen Nutzers sendet
- **THEN** antwortet das System mit 404 und speichert nichts

#### Scenario: Erneutes Speichern ersetzt nur Buffet-Einträge
- **GIVEN** eine Mahlzeit enthält Buffet-Einträge und ein manuell hinzugefügtes Rezept „Obstsalat“
- **WHEN** das Buffet mit geänderter Auswahl gespeichert wird
- **THEN** sind die alten Buffet-Einträge durch die neuen ersetzt und „Obstsalat“ ist unverändert vorhanden

#### Scenario: Auswahl ohne Rollen-Tag
- **GIVEN** eine Zutat ist für den Nutzer sichtbar und die angegebene Rolle kommt in der Vorlage vor
- **WHEN** die Auswahl gespeichert wird und die Zutat den Rollen-Tag nicht trägt
- **THEN** akzeptiert das System die Auswahl und speichert `buffet_role` mit der gewählten Rolle

#### Scenario: Rolle nicht in Vorlage
- **WHEN** eine Auswahl eine Rolle enthält, die nicht zur ausgewählten Vorlage gehört
- **THEN** antwortet das System mit 422 und speichert nichts

#### Scenario: Doppelte Auswahl
- **WHEN** dieselbe Zutat oder dasselbe Rezept mehrfach in einer Vorlage ausgewählt wird
- **THEN** antwortet das System mit 422 und speichert nichts

#### Scenario: Fremde private Zutat in der Auswahl
- **WHEN** ein Nutzer beim Speichern die ID einer privaten Zutat eines anderen Nutzers sendet
- **THEN** antwortet das System mit 404 und speichert nichts

#### Scenario: Unvollständige Kalkulationsdaten
- **GIVEN** ein sichtbares gewähltes Item hat keinen kcal-Wert, Preis oder ein Rezept kein verwendbares Portionsgewicht
- **WHEN** der Nutzer das Buffet vorschaut oder speichert
- **THEN** enthält die Antwort eine verständliche Warnung für die fehlenden Daten und bricht nicht allein deshalb ab

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Katalog abruft
- **THEN** erhält er nur öffentlich sichtbare Zutaten und Rezepte

#### Scenario: Nur Leserecht
- **WHEN** ein Nutzer mit Rolle „Betrachter“ am Essensplan den Endpunkt aufruft
- **THEN** antwortet das System mit 403

#### Scenario: Kein Zugriff auf den Plan
- **WHEN** ein angemeldeter Nutzer ohne Rolle am Essensplan den Endpunkt aufruft
- **THEN** antwortet das System mit 404

### Requirement: Builder-Oberfläche für alle Mahlzeiten
Der MealSlot SHALL für jeden MealType einen einheitlichen Buffet-Assistenten-Einstieg anbieten. Buffet- und Frühstücks-Wizard SHALL gemeinsame Progress-, Zurück/Weiter-, Abschluss- und mobile Layout-Patterns nutzen. Für generische Buffet-MealTypes zeigt Schritt 1 bis zu sechs hervorgehobene Presets nach `meal_type` sowie `free` als separate, stets sichtbare Kachel; zusätzliche aktive Vorlagen bleiben unter „Weitere Vorlagen“ auswählbar. Für Frühstück SHALL der bestehende mehrstufige Slider-Assistent die fünf bestätigten Profile anbieten. Nach Wahl eines Presets MUST die vollständig vorausgewählte Konfiguration in Rolle/Item-Schritten bearbeitbar sein: Nutzende können sichtbare Zutaten/Rezepte auswählen, entfernen und durchsuchen, die Gesamtmenge je Rolle und Item-Shares anpassen sowie Nährwert-/Kosten-/Mengenwarnungen in einem Abschluss-Schritt prüfen. Nicht-Staff dürfen globale Rollen und Preset-Definitionen nicht ändern. Beim Speichern ist eine Auswahl zum Erhalten oder Ersetzen manueller Einträge erforderlich. Nach Wiederöffnung wird die gespeicherte Konfiguration geladen. Alle Schritte MUST ab 320 px bedienbar sein.

#### Scenario: Frühstückseinstieg im MealSlot
- **WHEN** ein Nutzer den Assistenten in einem Frühstücks-MealSlot öffnet
- **THEN** wird der vorhandene Frühstückswizard im direkten Meal-Modus geöffnet
- **THEN** bleibt der Referenzmahlzeiten-Wizard separat erreichbar

#### Scenario: Getränke-MealSlot
- **WHEN** ein Nutzer den Assistenten in einem `drinks`-MealSlot öffnet
- **THEN** werden „Hausfahrt mit Säften“, „Lager mit Zitronentee“ sowie das separate „Freie Buffet“ angeboten

#### Scenario: Snack-Preset
- **WHEN** ein Nutzer den Assistenten für `snack` öffnet
- **THEN** werden Snackplatte, Käseplatte, Salzgebäck & Chips, Nachos, Süßes Buffet und Obst & Nüsse hervorgehoben
- **THEN** steht „Freies Buffet“ zusätzlich als eigene Kachel bereit

#### Scenario: Preset ist vorausgefüllt und bearbeitbar
- **WHEN** ein Nutzer ein Preset auswählt
- **THEN** sind passende Standard-Items und Mengen vorausgewählt
- **THEN** können Auswahl, einzelne Shares und Rollen-Gesamtmengen vor dem Speichern angepasst werden

#### Scenario: Andere MealType-Vorlage bleibt erreichbar
- **GIVEN** es gibt eine aktive Vorlage für einen anderen Mahlzeitentyp
- **WHEN** der Nutzer „Weitere Vorlagen“ öffnet
- **THEN** kann er die Vorlage weiterhin auswählen

#### Scenario: Wizard bleibt auf 320 px bedienbar
- **WHEN** der Wizard bei 320 px Viewport-Breite geöffnet wird
- **THEN** sind Preset-Karten, Slider, Suche und Wizard-Navigation ohne horizontales Scrollen bedienbar

#### Scenario: Baguettes zum Mittagessen
- **WHEN** ein Nutzer im Mittagessen-Slot den Builder öffnet
- **THEN** ist „Belegte Baguettes“ vorausgewählt, sofern verfügbar, und „Belag süß“ ist entsprechend der Vorlage eingeklappt und leer

#### Scenario: Fallback bei fehlender Mahlzeitvorlage
- **GIVEN** es gibt keine typspezifische Vorlage für `snack`, aber die universelle Vorlage `free` ist vorhanden
- **WHEN** der Nutzer den Builder für einen Snack-Slot öffnet
- **THEN** wird `free` ausgewählt und der Builder verlässt den Ladezustand

#### Scenario: Keine Vorlage verfügbar
- **GIVEN** die Vorlagenabfrage war erfolgreich, liefert aber keine passende oder universelle Vorlage
- **WHEN** der Nutzer den Builder öffnet
- **THEN** erscheint ein verständlicher Leerzustand statt eines dauerhaften Ladetextes

#### Scenario: Vorlagenabfrage fehlgeschlagen
- **WHEN** das Laden der Vorlagen oder des Katalogs fehlschlägt
- **THEN** zeigt der Builder einen Fehlerzustand mit einer Retry-Aktion statt eines endlosen Ladezustands

#### Scenario: Freie Auswahl suchen und hinzufügen
- **GIVEN** eine aktive Rolle und sichtbare Items ohne Rollen-Tag
- **WHEN** der Nutzer einen passenden Suchbegriff eingibt und ein Ergebnis auswählt
- **THEN** wird das Item dieser Rolle zugeordnet, als eigene Auswahl markiert und in der Backend-Vorschau berücksichtigt

#### Scenario: Suche bleibt immer sichtbar
- **WHEN** eine Rollen-Sektion mit null bis acht Favoriten angezeigt wird
- **THEN** bleibt das Suchfeld „Weitere hinzufügen…“ sichtbar

#### Scenario: Getränke-Mahlzeit
- **WHEN** ein Nutzer im `drinks`-Slot den Builder öffnet
- **THEN** kann er ein Getränkebuffet oder das Freie Buffet mit der Rolle Getränke bearbeiten

#### Scenario: Frühstück bleibt eigener Modus
- **GIVEN** der Mahlzeitentyp ist `breakfast` und die Vorlage `breakfast` ist verfügbar
- **WHEN** der Nutzer den Builder öffnet
- **THEN** wird der eigenständige Frühstücksmodus mit der Vorlage `breakfast` vorausgewählt
- **THEN** wird „Freies Buffet“ nicht anstelle des Frühstücksmodus vorausgewählt

#### Scenario: Referenzmahlzeiten-Frühstücks-Wizard bleibt separat
- **WHEN** der Nutzer den bestehenden Frühstücks-Wizard für Referenzmahlzeiten öffnet
- **THEN** erscheint weiterhin dessen spezifischer Wizard und nicht der generische Buffet-Builder

#### Scenario: Weitere Vorlagen über Mahlzeitgrenzen hinweg
- **GIVEN** ein Nutzer bearbeitet ein Mittagessen und es existiert die Vorlage `cheese-platter` für Snacks
- **WHEN** der Nutzer die Vorlagenauswahl öffnet
- **THEN** findet er die Käseplatte unter „Alle Vorlagen“ und kann sie wählen

#### Scenario: Suchfilter und leere Treffer
- **WHEN** der Nutzer die Suche nutzt
- **THEN** kann er zwischen allen Items, Zutaten und Rezepten filtern sowie bei Rezepten optional den Rezepttyp auswählen
- **THEN** kann er Nicht-Standalone-Zutaten einblenden und alkoholische Treffer ausblenden; beide Filter starten ausgeschaltet
- **THEN** zeigt die Suche bei null Treffern „Nichts gefunden“ und einen Hinweis zum Erweitern der Filter

#### Scenario: Suchergebnisliste auf Mobilgeräten
- **WHEN** die Buffet-Suche auf einem Viewport ab 320 px Treffer zeigt
- **THEN** werden Ergebnisse als sichtbare Liste innerhalb des Dialogs dargestellt und nicht in einem abgeschnittenen Dropdown

#### Scenario: Wiederherstellung freier Items
- **GIVEN** ein Buffet wurde mit einem Item ohne Rollen-Tag gespeichert
- **WHEN** der Nutzer den Builder erneut öffnet
- **THEN** sind Vorlage, Auswahl, Name, Art und Mengenänderungen wiederhergestellt

#### Scenario: Keine fest verdrahteten IDs
- **WHEN** eine Vorlage keine Standardauswahl für eine Rolle hat
- **THEN** ist in dieser Rolle nichts vorausgewählt

#### Scenario: Wiederherstellung
- **GIVEN** ein Frühstück wurde mit dem Builder gespeichert
- **WHEN** der Nutzer den Builder erneut öffnet
- **THEN** sind Vorlage, Auswahl und angepasste Mengen wie gespeichert gesetzt
