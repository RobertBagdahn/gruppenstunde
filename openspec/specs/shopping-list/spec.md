# shopping-list Specification

## Purpose

This specification defines the shopping list data model, API schemas, permissions, and frontend behavior for collaborative shopping lists. Sharing by invitation link, guests without an account, attribution, claiming, polling and shopping mode are specified in `shopping-list-sharing`; guests are the only exception to the 401/404 rules for anonymous visitors.

## Requirements

### Requirement: Aktive Gewichtsauflösung

Direkt- und Rezeptzutaten SHALL denselben kanonischen Gewichts-Helper verwenden. Soft-gelöschte
Portionen und Packungen sind keine Fallbacks; fehlendes gültiges Gewicht darf nicht als
`measuring_unit.quantity` interpretiert werden. Details zur gemeinsamen Berechnung stehen in
`food-calculation-consistency`.

#### Scenario: Gelöschte Portion wird ignoriert
- **WHEN** die bevorzugte Portion soft-gelöscht ist
- **THEN** verwendet die Einkaufsliste keine gelöschte Portion als Fallback

### Requirement: Direktzutat-Gewicht über kanonischen Helper

Das System SHALL für Direktzutaten (`MealItem.ingredient`) im Shopping Service `_resolve_ingredient_weight_g` aus `planner/services/meal_item_helpers.py` verwenden statt einer eigenen Inline-Berechnung. `measuring_unit.quantity` DARF NICHT als Gewicht verwendet werden.

#### Scenario: Direktzutat mit g-Einheit, korrekte Skalierung

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=180`, `measuring_unit.name="g"`, `factor=1.0`
- **AND** ein Plan mit `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 180 * 1.0 * (10 * 1.1) = 1980g` sein

#### Scenario: Direktzutat mit Portionseinheit

- **GIVEN** ein `MealItem` mit `ingredient`, `quantity=2`, `measuring_unit="Scheibe"`, Portion `weight_g=35g`, `factor=1.0`
- **AND** `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 2 * 35 * 1.0 * 11 = 770g` sein

#### Scenario: Direktzutat mit ml-Einheit und density

- **GIVEN** ein `MealItem` mit `ingredient` (`density=1.03`), `quantity=200`, `measuring_unit.name="ml"`, `factor=1.0`
- **AND** `norm_portions=10`, `reserve_factor=1.1`
- **WHEN** Einkaufsliste generiert wird
- **THEN** SHALL `total_quantity_g = 200 * 1.03 * 1.0 * 11 = 2266g` sein

### Requirement: List schema exposes can_edit and can_delete
The shopping list list item response schema (`ShoppingListOut` in list endpoints) SHALL include `can_edit: bool` and `can_delete: bool` fields resolved server-side based on the user's relationship to the shopping list (owner, collaborator role, staff status).

#### Scenario: Shopping list list includes permission fields
- **WHEN** a client fetches `GET /api/shopping-lists/`
- **THEN** each item in the response MUST include `can_edit` and `can_delete`
- **THEN** `can_edit` SHALL be `true` for lists where the user has editor or admin access
- **THEN** `can_edit` SHALL be `false` for lists where the user only has viewer access or no access

### Requirement: Anzeigemenge aus Gramm und Dichte
`ShoppingListItemOut` und `ShoppingListItemSourceOut` MUST die Anzeigemenge (`quantity`, `unit`) für Einträge mit Zutat immer aus `quantity_g` über `shopping_quantity(quantity_g, ingredient)` ableiten, unabhängig vom gespeicherten Feld `unit`. Nur Freitext-Einträge ohne Zutat DÜRFEN `quantity_g` mit dem gespeicherten `unit` unverändert anzeigen. Eine aus einem Essensplan erzeugte Einkaufsliste MUST für jede Zutat dieselbe Menge und Einheit zeigen wie der Einkaufen-Tab des Plans.

#### Scenario: Honig in der erzeugten Liste
- **GIVEN** ein Essensplan benötigt 273 g „Blütenhonig“ mit Dichte 1,4
- **WHEN** ein angemeldeter Nutzer daraus eine Einkaufsliste erstellt
- **THEN** zeigen Einkaufen-Tab und Liste beide 195 ml

#### Scenario: Freitext-Eintrag
- **WHEN** ein Nutzer den Freitext „Grillkohle“ ohne Zutat mit 3 kg anlegt
- **THEN** zeigt die Liste 3 kg

#### Scenario: Nicht angemeldet
- **WHEN** ein nicht angemeldeter Besucher `GET /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet die API mit HTTP 401 und liefert keine Einträge

### Requirement: Einträge ohne Abteilung
Einträge ohne Abteilung MUST in der Einkaufsliste unter einer eigenen Überschrift „Sonstiges“ am Ende erscheinen und DÜRFEN NICHT optisch der ersten Abteilung zugeordnet werden.

#### Scenario: Freitext unter Sonstiges
- **WHEN** eine Liste die Abteilungen „Obst“ und „Gemüse“ sowie den Freitext „2 kg Zimt“ enthält
- **THEN** steht „2 kg Zimt“ unter der Überschrift „Sonstiges“ nach „Gemüse“

### Requirement: Einkaufslisten zeigen erkannte Mengen eindeutig
Wenn ein Einkaufslisteneintrag einer Zutat zugeordnet ist, SHALL die Anzeige eine eindeutige Menge und passende Einheit aus den kanonischen Mengendaten darstellen. Die Portionsbezeichnung SHALL nicht doppelt mit einer zweiten Einheit erscheinen. Einheiten wie Gramm, Stück oder Volumen SHALL der gespeicherten Menge entsprechen.

#### Scenario: Freitext entspricht einer vorhandenen Zutat
- **GIVEN** ein Eintrag enthält „2 kg Zimt“ und eine aktive Zutat „Zimt“ ist vorhanden
- **WHEN** der Einkaufslisten-Eintrag ausgewertet wird
- **THEN** SHALL das System die Zutat nur dann verknüpfen, wenn die Zuordnung eindeutig ist, und Menge sowie Einheit ohne Informationsverlust anzeigen

#### Scenario: Portion mit Mengenanzeige
- **GIVEN** ein Eintrag hat eine Portionsbezeichnung und eine berechnete Menge
- **WHEN** die Einkaufsliste gerendert wird
- **THEN** SHALL die Menge nicht als widersprüchliche Kombination wie „≈ 2,6 1 TL Zimt“ oder „≈ 13,2 g“ hinter „13 g“ erscheinen

#### Scenario: Kein sicherer Zutaten-Match
- **GIVEN** ein Freitext-Eintrag kann mehreren Zutaten zugeordnet werden
- **WHEN** das System keinen eindeutigen Match bestimmen kann
- **THEN** SHALL es den Eintrag als Freitext erhalten und darf keine falsche Zutat automatisch auswählen

#### Scenario: Flüssige Zutat erhält keine Stück-Äquivalenz
- **GIVEN** ein verknüpfter flüssiger Artikel wie Olivenöl hat eine fehlerhafte oder unpassende Stück-Portion
- **WHEN** die Einkaufsliste Mengen-Äquivalenzen berechnet
- **THEN** SHALL sie die Menge über Dichte als ml anzeigen und keine Stück-Äquivalenz ausgeben

### Requirement: Consumables on the shopping list
When creating a shopping list, the system SHALL accept `include_consumables` (default `true`). If true, consumable materials of the source recipes MUST be added as items in a separate section "Verbrauchsmaterial" at the end of the list, with the scaled piece count and no package rounding. Devices MUST never be added.

#### Scenario: Consumables included by default
- **WHEN** a list is created from a plan with 40 required Pappteller
- **THEN** the section "Verbrauchsmaterial" contains "Pappteller 40 Stück"

#### Scenario: Opt-out
- **WHEN** the list is created with `include_consumables=false`
- **THEN** no consumable items are created

#### Scenario: Device not listed
- **WHEN** a recipe needs a Backofen
- **THEN** it is not on the shopping list

#### Scenario: Check off
- **WHEN** a collaborator checks "Pappteller"
- **THEN** it behaves like any other item, with sources listing the recipes

### Requirement: Manuelle Einträge löschen
Die Einkaufsliste SHALL für jeden manuell hinzugefügten Eintrag eine Löschen-Aktion anbieten. Die Aktion MUST `DELETE /api/shopping-lists/{id}/items/{item_id}/` aufrufen und einen Undo-Hinweis zeigen. Aus Rezepten oder Essensplänen erzeugte Einträge SHALL keine Löschen-Aktion haben.

#### Scenario: Manuellen Eintrag löschen
- **WHEN** der Nutzer bei „ZZ-TEST Klebeband“ (manuell hinzugefügt) auf „Eintrag löschen“ klickt
- **THEN** verschwindet der Eintrag sofort aus der Liste, ohne auf die Serverantwort oder ein Neuladen zu warten
- **AND** ein Undo-Hinweis erscheint

#### Scenario: Löschen rückgängig machen
- **GIVEN** „ZZ-TEST Klebeband“ war abgehakt und stand an vierter Stelle
- **WHEN** der Nutzer im Undo-Hinweis „Rückgängig“ wählt
- **THEN** erscheint der Eintrag wieder abgehakt an derselben Stelle

#### Scenario: Löschen schlägt fehl
- **WHEN** das Backend das Löschen ablehnt
- **THEN** erscheint der Eintrag wieder und eine deutsche Fehlermeldung nennt den Grund

#### Scenario: Quelle ist ein Rezept
- **WHEN** ein Eintrag aus einem Rezept erzeugt wurde
- **THEN** zeigt die Zeile keine Löschen-Aktion

#### Scenario: Fehlende Berechtigung
- **WHEN** der Nutzer die Liste nur ansehen darf (Rolle „viewer“)
- **THEN** wird keine Löschen-Aktion angezeigt und das Backend antwortet bei direktem Aufruf mit 403

### Requirement: Einkaufsliste in der Übersicht löschen
Die Übersicht der Einkaufslisten SHALL bei jeder Liste mit `can_delete` eine Löschen-Aktion anbieten. Der Bestätigungsdialog MUST den Namen der Liste nennen. Listen ohne `can_delete` (geteilte Listen anderer Besitzer) SHALL keine Löschen-Aktion zeigen.

#### Scenario: Eigene Liste löschen
- **WHEN** der Besitzer bei „ZZ-TEST Wocheneinkauf“ in der Übersicht „Löschen“ wählt
- **THEN** lautet der Dialogtitel „Einkaufsliste „ZZ-TEST Wocheneinkauf“ löschen?“
- **AND** nach dem Bestätigen verschwindet die Liste aus der Übersicht

#### Scenario: Geteilte Liste
- **WHEN** der Nutzer eine Liste sieht, die ihm nur geteilt wurde
- **THEN** zeigt die Karte keine Löschen-Aktion

### Requirement: Zugriffsfehler ohne Rohtexte und ohne Existenzverrat
Die Einkaufslisten-Seiten SHALL Fehler ausschließlich als deutsche Meldungen zeigen, nie als HTTP-Statustext („API error: 401 Unauthorized“). Anonyme Besucher MUST statt eines Fehlers einen Login-Hinweis mit Anmelde-Aktion erhalten. Das Backend MUST für eine fremde Einkaufsliste bei Lesen, Ändern und Löschen einheitlich 404 liefern; 403 bleibt Mitgliedern ohne das nötige Recht vorbehalten. Die 401-Meldung beim Lesen MUST vom Ansehen sprechen, nicht vom Speichern.

#### Scenario: Anonym aufgerufene Liste
- **WHEN** ein nicht angemeldeter Besucher `/shopping-lists/3` öffnet
- **THEN** erscheint „Melde dich an, um diese Einkaufsliste zu sehen.“ mit „Kostenlos anmelden“
- **AND** die API antwortet mit 401 „Bitte melde dich an, um deine Einkaufslisten zu sehen.“

#### Scenario: Fremde Liste löschen
- **WHEN** ein angemeldeter Nutzer ohne Zugriff `DELETE /api/shopping-lists/{id}/` aufruft
- **THEN** antwortet das Backend mit 404 und die Liste bleibt erhalten

#### Scenario: Fremde Liste öffnen
- **WHEN** ein angemeldeter Nutzer ohne Zugriff die Detailseite einer fremden Liste öffnet
- **THEN** zeigt die Seite „Einkaufsliste nicht gefunden“ ohne englischen Statustext

### Requirement: Einkaufslisten tragen Event, Laden und Zeitpunkt
`ShoppingListOut` und `ShoppingListDetailOut` SHALL `event_id`, `event_slug`, `event_name`, `store` (`{id, name}` oder `null`), `scheduled_at` (UTC oder `null`), `materialized_at` und `trip_status` (`planned`, `created` oder `null` für Listen ohne Event) liefern. Freie Listen MAY ohne Laden und Zeitpunkt bestehen. Die Detailseite SHALL Laden und Zeitpunkt in lokaler Zeit im Kopf zeigen und bei Event-Einkäufen auf „Einkäufe planen“ verlinken.

#### Scenario: Event-Einkauf
- **WHEN** ein Mitglied die Liste „Rewe · Sa 10:00“ abruft
- **THEN** enthält die Antwort `event_slug`, `store.name = "Rewe"` und `scheduled_at`

#### Scenario: Freie Liste
- **WHEN** eine freie Liste abgerufen wird
- **THEN** sind `event_id`, `store` und `scheduled_at` `null`

#### Scenario: Nicht angemeldet ohne Gast-Token
- **WHEN** ein anonymer Client die Liste ohne Gast-Token abruft
- **THEN** antwortet die API mit 401

### Requirement: Geplanter Einkauf zeigt Vorschau statt Einträgen
Für einen Event-Einkauf mit `trip_status = planned` SHALL die Detailseite die live berechnete Vorschau mit dem Hinweis „Vorschau – wird mit „Liste erstellen“ festgehalten“ und der Aktion „Liste erstellen“ zeigen (nur mit Planungsrecht). Abhaken, Übernehmen und der Einkaufsmodus MUST erst nach dem Erstellen verfügbar sein. Manuelle Einträge MAY schon vorher hinzugefügt werden und bleiben beim Erstellen erhalten.

#### Scenario: Geplanter Einkauf
- **WHEN** ein Event-Verantwortlicher einen geplanten Einkauf öffnet
- **THEN** sieht er die Vorschau und „Liste erstellen“, aber keine Checkboxen

#### Scenario: Manueller Eintrag vorab
- **GIVEN** im geplanten Einkauf steht der manuelle Eintrag „Grillkohle“
- **WHEN** die Liste erstellt wird
- **THEN** enthält sie die Einträge der Vorschau und „Grillkohle“

### Requirement: Rezept-Einkauf mit Laden und Zeitpunkt
`POST /api/shopping-lists/from-recipe/{recipe_id}/` SHALL `portions`, `include_consumables` und entweder `store_id` mit `scheduled_at` (neue Liste ohne Event) oder `shopping_list_id` (bestehende Liste) verlangen; fehlt beides, MUST die API 422 liefern. Die Einträge MUST ihre Rezeptquelle mit Portionen tragen. Die Rezeptseite SHALL den Dialog „Einkaufen“ mit beiden Wegen anbieten.

#### Scenario: Neuer Rezept-Einkauf
- **WHEN** ein angemeldeter Nutzer „Stockbrot“ für 12 Portionen mit „Rewe“ und Do 16:00 einkauft
- **THEN** entsteht die Liste „Rewe · Do 16:00“ ohne Event mit den Zutaten für 12 Portionen

#### Scenario: Weder Laden noch Liste
- **WHEN** weder `store_id` noch `shopping_list_id` gesendet wird
- **THEN** antwortet die API mit 422 „Bitte wähle einen Laden und einen Zeitpunkt oder eine bestehende Liste.“

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Client ein Rezept einkauft
- **THEN** antwortet die API mit 401

### Requirement: Rezept zu einer bestehenden Liste hinzufügen
Mit `shopping_list_id` SHALL das Rezept einer bestehenden Liste hinzugefügt werden, auf die der Nutzer Bearbeitungsrecht hat. Gleiche Zutaten MUST mit vorhandenen, nicht abgehakten Einträgen zu einer Zeile zusammengeführt werden, und die Quelle wird ergänzt. Abgehakte Einträge MUST unverändert bleiben, und für sie entsteht eine neue Zeile. Erstellte Event-Einkäufe MUST abgelehnt werden (409 „Rezepte kommen bei Events über den Essensplan“).

#### Scenario: Zweites Rezept
- **GIVEN** die Liste enthält 500 g Mehl aus „Stockbrot“, nicht abgehakt
- **WHEN** „Waffeln“ mit 300 g Mehl hinzugefügt wird
- **THEN** zeigt die Liste eine Zeile „Mehl 800 g“ mit beiden Rezepten als Quelle

#### Scenario: Bereits gekauft
- **GIVEN** „Mehl 500 g“ ist abgehakt
- **WHEN** „Waffeln“ mit 300 g Mehl hinzugefügt wird
- **THEN** bleibt die abgehakte Zeile, und eine neue Zeile „Mehl 300 g“ entsteht

#### Scenario: Ohne Bearbeitungsrecht
- **WHEN** ein Betrachter der Liste ein Rezept hinzufügt
- **THEN** antwortet die API mit 403
