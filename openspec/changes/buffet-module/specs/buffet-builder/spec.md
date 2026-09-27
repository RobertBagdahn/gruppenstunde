## ADDED Requirements

### Requirement: Buffet-Katalog nach Rollen
`GET /api/supply/buffet-catalog/?template=<slug>` SHALL für jede Rolle der Vorlage (in deren `sort_order`) einen Eintrag liefern mit `role` (`slug`, `name`, `icon`), `amount_per_person`, `unit`, `enabled_by_default` und `items`. `items` MUST alle für den Nutzer sichtbaren Zutaten und Rezepte mit diesem Rollen-Tag enthalten (Sichtbarkeit über `content.services.food_access`), jeweils mit `kind` (`ingredient`|`recipe`), `id`, `name`, `energy_kcal_per_100g`, `price_per_kg`, `weight_per_serving_g` (nur Rezepte; `cached_weight_g ÷ max(portions, 1)`) und `default_selected`. Die Items MUST alphabetisch sortiert und nicht gekürzt sein; der Katalog ist nicht paginiert. `default_selected` MUST nur für Items gesetzt sein, die der Nutzer im Katalog sieht; Standardauswahlen der Vorlage, die für ihn unsichtbar sind (z. B. System-Entwürfe für Nicht-Staff), MUST entfallen. Ohne `template` SHALL der Katalog alle neun Rollen mit `amount_per_person=null` liefern.

#### Scenario: Katalog für belegte Baguettes
- **WHEN** ein angemeldeter Nutzer `GET /api/supply/buffet-catalog/?template=baguettes` aufruft
- **THEN** enthält die Antwort die Rollen „Brot & Gebäck“, „Streichfett“, „Belag herzhaft“, „Soßen & Würze“, „Gemüse & Obst“, „Getränke“ mit `enabled_by_default=true` und „Belag süß“ mit `enabled_by_default=false`
- **THEN** ist „Baguette“ in „Brot & Gebäck“ als `default_selected=true` markiert, wenn es in der Vorlage als Standard hinterlegt ist

#### Scenario: Entwurfs-Zutat für normalen Nutzer
- **WHEN** ein Nicht-Staff-Nutzer den Katalog abruft und eine Zutat mit Rolle im Status `draft` ohne Freigabe für ihn existiert
- **THEN** ist sie nicht in `items` enthalten

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Katalog abruft
- **THEN** erhält er nur öffentlich sichtbare Zutaten und Rezepte

#### Scenario: Unsichtbare Standardauswahl
- **GIVEN** die Vorlage „Belegte Baguettes“ hat „Tomaten“ als Standard, und „Tomaten“ ist ein System-Entwurf
- **WHEN** ein Nicht-Staff-Nutzer den Katalog abruft
- **THEN** fehlt „Tomaten“ in `items` und wird nicht vorausgewählt; für Staff ist es enthalten und vorausgewählt

#### Scenario: Fremde private Zutat in der Auswahl
- **WHEN** ein Nutzer beim Speichern die ID einer privaten Zutat eines anderen Nutzers sendet
- **THEN** antwortet das System mit 404 und speichert nichts

#### Scenario: Unbekannte Vorlage
- **WHEN** `template` auf einen nicht existierenden oder inaktiven Slug zeigt
- **THEN** antwortet das System mit 404

### Requirement: Mengenberechnung im Backend
Das System SHALL die Mengen eines Buffets ausschließlich im Backend (`planner/services/buffet_service.py`) berechnen:
- Pro Rolle wird `amount_per_person` gleichmäßig auf die gewählten Items der Rolle verteilt, sofern die Auswahl keinen eigenen `amount_per_person` für die Rolle angibt.
- Zutaten MUST als `MealItem` mit `quantity` = Menge **pro Person**, Einheit „Gramm“ (Rolle mit `unit=g`) bzw. „Milliliter“ (`unit=ml`) und `factor=1.0` gespeichert werden.
- Rezepte MUST als `MealItem` mit `recipe_id` und `factor` = Anteil pro Person ÷ `weight_per_serving_g` des Rezepts gespeichert werden; fehlt das Rezeptgewicht, gilt `factor = 1 / Anzahl gewählter Items der Rolle`.
- Die Personenzahl MUST NOT in `quantity` einfließen; die Skalierung erfolgt wie bei allen Mahlzeit-Einträgen über die effektiven Portionen der Mahlzeit.

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
`POST /api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` SHALL einen Body `BuffetSaveIn { template_id, selections: [{ role_slug, ingredient_id | recipe_id }], role_amounts: { <role_slug>: amount_per_person } | null, dry_run: bool }` annehmen. Die Antwort `BuffetResultOut` MUST je Item Rolle, Name, Menge pro Person, Gesamtmenge, kcal und Kosten sowie Summen (kcal pro Person, Ziel-kcal der Mahlzeit, Kosten pro Person und gesamt) und `warnings` enthalten. Bei `dry_run=true` MUST nichts gespeichert werden. Bei `dry_run=false` MUST das System in einer Transaktion alle `MealItem`s der Mahlzeit mit gesetztem `buffet_role` ersetzen, andere Einträge unverändert lassen und `Meal.buffet_template` setzen. Der Endpunkt MUST Bearbeitungsrecht am Essensplan verlangen. Ausgewählte Zutaten und Rezepte MUST wie beim Anlegen anderer Mahlzeit-Einträge aufgelöst werden (`get_visible_ingredient_or_404`/`get_visible_recipe_or_404` mit `allow_system_draft=True`, Ausnahme „Ingredient reference exceptions“ der `food-access-policy`); private oder geteilte Zutaten und Rezepte anderer Nutzer MUST mit 404 abgelehnt werden.

#### Scenario: Vorschau ohne Speichern
- **WHEN** der Builder bei jeder Auswahländerung `dry_run=true` sendet
- **THEN** erhält er Mengen, kcal pro Person im Verhältnis zum Ziel und Kosten, und die Mahlzeit bleibt unverändert

#### Scenario: Erneutes Speichern ersetzt nur Buffet-Einträge
- **GIVEN** eine Mahlzeit enthält Buffet-Einträge und ein manuell hinzugefügtes Rezept „Obstsalat“
- **WHEN** das Buffet mit geänderter Auswahl gespeichert wird
- **THEN** sind die alten Buffet-Einträge durch die neuen ersetzt und „Obstsalat“ ist unverändert vorhanden

#### Scenario: Auswahl außerhalb der Rolle
- **WHEN** eine Auswahl eine Zutat enthält, die den angegebenen Rollen-Tag nicht trägt
- **THEN** antwortet das System mit 422

#### Scenario: Nicht angemeldeter Nutzer
- **WHEN** ein nicht angemeldeter Nutzer den Endpunkt aufruft
- **THEN** antwortet das System mit 403 („Sitzung nicht gefunden“) und speichert nichts

#### Scenario: Nur Leserecht
- **WHEN** ein Nutzer mit Rolle „Betrachter“ am Essensplan den Endpunkt aufruft
- **THEN** antwortet das System mit 403

#### Scenario: Kein Zugriff auf den Plan
- **WHEN** ein angemeldeter Nutzer ohne Rolle am Essensplan den Endpunkt aufruft
- **THEN** antwortet das System mit 404

### Requirement: Builder-Oberfläche für alle Mahlzeiten
Der MealSlot SHALL für jeden Mahlzeitentyp außer `drinks` die Aktion „Buffet zusammenstellen“ anbieten. Der Builder SHALL:
- die Vorlage nach Mahlzeitentyp vorauswählen (erste passende nach `sort_order`) und einen Vorlagenwechsel erlauben,
- je aktiver Rolle eine Sektion mit allen Items als Auswahl-Chips zeigen (Suche ab mehr als 8 Items), inaktive Rollen einklappbar,
- die Menge pro Person je Rolle anpassbar machen,
- die Vorschau des Backends (kcal pro Person vs. Ziel, Kosten pro Person und gesamt, Warnungen) live anzeigen,
- beim erneuten Öffnen die gespeicherte Vorlage und Auswahl der Mahlzeit wiederherstellen,
- ab 320 px Breite bedienbar sein.

#### Scenario: Baguettes zum Mittagessen
- **WHEN** ein Nutzer im Mittagessen-Slot „Buffet zusammenstellen“ öffnet
- **THEN** ist die Vorlage „Belegte Baguettes“ vorausgewählt und die Rolle „Belag süß“ ist eingeklappt und leer

#### Scenario: Wiederherstellung
- **GIVEN** ein Frühstück wurde mit dem Builder gespeichert
- **WHEN** der Nutzer den Builder erneut öffnet
- **THEN** sind Vorlage, Auswahl und angepasste Mengen wie gespeichert gesetzt

#### Scenario: Keine fest verdrahteten IDs
- **WHEN** eine Vorlage keine Standardauswahl für eine Rolle hat
- **THEN** ist in dieser Rolle nichts vorausgewählt
