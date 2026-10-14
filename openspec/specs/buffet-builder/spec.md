# buffet-builder Specification

## Purpose
TBD - created by archiving change buffet-module. Update Purpose after archive.
## Requirements
### Requirement: Buffet-Katalog nach Rollen
`GET /api/supply/buffet-catalog/?template=<slug>` SHALL für jede Rolle der Vorlage (in deren `sort_order`) einen Eintrag liefern mit `role` (`slug`, `name`, `icon`), `amount_per_person`, `unit`, `enabled_by_default` und `items`. `items` MUST alle für den Nutzer sichtbaren nicht-alkoholischen Zutaten und Rezepte mit diesem Rollen-Tag enthalten (Sichtbarkeit über `content.services.food_access`), jeweils mit `kind` (`ingredient`|`recipe`), `id`, `name`, `energy_kcal_per_100g`, `price_per_kg`, `weight_per_serving_g` (nur Rezepte; `cached_weight_g ÷ max(portions, 1)`) und `default_selected`. Alkoholische Zutaten und Rezepte DÜRFEN unabhängig von bestehenden Tags nicht in der Rollen-Favoritenliste vorkommen; sie können abhängig von den Suchfiltern über den separaten Vollsuch-Endpunkt erscheinen. Die Items MUST alphabetisch sortiert und nicht gekürzt sein; der Katalog ist nicht paginiert. `default_selected` MUST nur für Items gesetzt sein, die der Nutzer im Katalog sieht; Standardauswahlen der Vorlage, die für ihn unsichtbar sind (z. B. System-Entwürfe für Nicht-Staff), MUST entfallen. Ohne `template` SHALL der Katalog alle 19 Buffet-Rollen mit `amount_per_person=null` liefern. Rollen-Katalogeinträge bleiben die Favoritenliste; freie Treffer werden über den separaten Suchendpunkt geliefert.

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
`POST /api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` SHALL einen Body `BuffetSaveIn { template_id, selections: [{ role_slug, ingredient_id | recipe_id }], role_amounts: { <role_slug>: amount_per_person } | null, dry_run: bool }` annehmen. Die Antwort `BuffetResultOut` MUST je Item Rolle, Name, Menge pro Person, Gesamtmenge, kcal und Kosten sowie Summen (kcal pro Person, Ziel-kcal der Mahlzeit, Kosten pro Person und gesamt) und `warnings` enthalten. Bei `dry_run=true` MUST nichts gespeichert werden. Bei `dry_run=false` MUST das System in einer Transaktion alle `MealItem`s der Mahlzeit mit gesetztem `buffet_role` ersetzen, andere Einträge unverändert lassen und `Meal.buffet_template` setzen. Der Endpunkt MUST Bearbeitungsrecht am Essensplan verlangen. Ausgewählte Zutaten und Rezepte MUST wie beim Anlegen anderer Mahlzeit-Einträge aufgelöst werden (`get_visible_ingredient_or_404`/`get_visible_recipe_or_404` mit `allow_system_draft=True`, Ausnahme „Ingredient reference exceptions“ der `food-access-policy`); private oder geteilte Zutaten und Rezepte anderer Nutzer MUST mit 404 abgelehnt werden. Die Rolle MUSS in der gewählten Vorlage vorkommen; das Item MUSS NICHT den Rollen-Tag tragen. Doppelte Item-IDs innerhalb einer Auswahl MUST mit 422 abgelehnt werden. Fehlende kcal-, Preis- oder Rezeptgewichtsdaten SHALL über `warnings` kenntlich sein und MUST NOT allein das Speichern verhindern. Kalkulationsfelder, die sich mangels Quelldaten nicht bestimmen lassen, SHALL `null` bleiben und MUST NOT als erfundener Nullwert ausgegeben werden. Die kcal-Summe SHALL `null` sein, wenn mindestens ein ausgewähltes Item keinen berechenbaren Brennwert hat; die Kostensumme SHALL `null` sein, wenn mindestens ein ausgewähltes Item keinen Preis hat. Die Summen DÜRFEN unvollständige Teilsummen nicht als vollständig darstellen. `GET /api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` SHALL für gespeicherte Selektionen zusätzlich `name`, `kind`, `energy_kcal_per_100g`, `price_per_kg` und `weight_per_serving_g` (nur bei Rezepten) liefern; diese Felder müssen auf die aktuelle Sichtbarkeit geprüft und aus den referenzierten Items bezogen werden.

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
Der MealSlot SHALL für jeden Mahlzeitentyp einschließlich `drinks` die Aktion „Buffet zusammenstellen“ anbieten, wenn mindestens eine passende oder universelle Vorlage verfügbar ist. Der Builder SHALL eine passende Vorlage vorauswählen und, wenn keine passende Vorlage vorhanden ist, `free` als Fallback verwenden; falls keine Vorlage geladen werden kann, SHALL er einen sichtbaren Leerzustand statt eines endlosen Ladezustands darstellen. Frühstück SHALL als eigener Modus mit der bestehenden Vorlage `breakfast` erhalten und in Frühstücks-Slots bevorzugt vorausgewählt werden; der Modus DARF NICHT durch `free` ersetzt werden. Der Builder SHALL Vorlagenwechsel erlauben, passende Vorlagen bevorzugt und weitere Vorlagen aller Mahlzeittypen gruppiert unter „Alle Vorlagen“ zusätzlich auffindbar machen. Je aktiver Rolle SHALL er Favoriten-Chips und eine immer sichtbare Suche „Weitere hinzufügen…“ anzeigen. Die Suche SHALL mit `meal_type`, `role`, Item-Art, optionalem Rezepttyp sowie den Filtern „Auch Backzutaten & Gewürze“ (standardmäßig aus) und „Alkoholische Treffer ausblenden“ (standardmäßig aus) gegen den Suchendpunkt laufen. Die Suche SHALL nach mindestens zwei Zeichen mit 250-ms-Debounce starten. Suchergebnisse SHALL Zutat/Rezept, kcal und Preis kenntlich machen; hinzugefügte Nicht-Favoriten sowie eigene sichtbare Items SHALL als eigene Auswahl markiert werden. Ergebnisse SHALL als vollständige Liste im Dialog, nicht als abgeschnittenes Dropdown, dargestellt werden. Bei null Treffern SHALL „Nichts gefunden“ samt Hinweis auf Erweiterungsfilter erscheinen. Inaktive Rollen bleiben einklappbar; Mengen pro Rolle sind anpassbar. Die Vorschau des Backends (kcal pro Person vs. Ziel, Kosten pro Person und gesamt, Warnungen) SHALL live angezeigt werden. Bei Fehlern SHALL die Oberfläche eine deutsche Fehlermeldung und Retry-Aktion zeigen. Beim erneuten Öffnen SHALL gespeicherte Vorlage, Items mit Name/Art/Kalkulationsdaten und angepasste Mengen wiederhergestellt werden. Die Oberfläche SHALL ab 320 px bedienbar sein.

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
