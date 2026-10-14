# meal-plan-ingredient-quantities Specification

## Purpose
TBD - created by archiving change meal-plan-ingredient-quantities. Update Purpose after archive.
## Requirements
### Requirement: Mengenübersicht je Essensplan
Das System SHALL unter `GET /api/meal-plans/{id}/ingredient-quantities/` alle Zutaten eines Essensplans mit Netto-Gesamtmenge, Gesamtmenge mit Reserve, Anzeigeeinheit und den einzelnen Beiträgen je Mahlzeit-Eintrag liefern. Die Mengen MUST aus derselben Berechnung stammen wie die Einkaufsliste des Plans (effektive Portionen, Faktor, Reserve, Overrides, Ausschlüsse, Varianten). Jeder Beitrag MUST Mahlzeit, Rezept, Menge pro Person (effektiv und original) mit Einheit, Faktor, effektive Portionen, Netto-Gramm sowie `editable` und einen deutschen `not_editable_reason` enthalten. Die Antwort ist ein planbezogenes Aggregat und wird nicht paginiert.

#### Scenario: Sandwich-Zwiebeln je Mahlzeit sichtbar
- **GIVEN** ein Plan mit 20 Personen enthält an drei Abenden das Rezept „Sandwich“ mit 0,25 Stück Zwiebel pro Person (Stück = 150 g)
- **WHEN** ein Nutzer mit Lesezugriff die Mengenübersicht abruft
- **THEN** enthält der Eintrag „Zwiebel“ drei Beiträge mit je 0,25 Stück pro Person, 20 Personen und 750 g netto
- **THEN** beträgt `net_quantity_g` 2250 g und die Anzeige 15 Stück

#### Scenario: Summen entsprechen der Einkaufsliste
- **GIVEN** ein Plan mit Reserve 1,1, einer Mahlzeit mit `override_portions`, einem Faktor 1,5 und einem ausgeschlossenen Override
- **WHEN** Mengenübersicht und transiente Einkaufsliste abgerufen werden
- **THEN** stimmt `total_quantity_g` je Zutat mit `total_quantity_g` der Einkaufsliste überein
- **THEN** stimmt `net_quantity_g` mit `net_quantity_g` der Einkaufsliste überein

#### Scenario: Zutat ohne vertrauenswürdiges Gewicht
- **GIVEN** eine Zutat, deren Portion kein vertrauenswürdiges Gewicht hat
- **WHEN** die Mengenübersicht abgerufen wird
- **THEN** wird die Menge in der Portionseinheit angezeigt und `has_trusted_weight` ist `false`

#### Scenario: Nicht anpassbare Beiträge
- **GIVEN** ein Beitrag stammt aus einer synchronisierten Mahlzeit, einer externen Mahlzeit, einer optionalen Zutat oder einer Austauschgruppe
- **WHEN** die Mengenübersicht abgerufen wird
- **THEN** ist `editable` `false` und `not_editable_reason` nennt den Grund auf Deutsch

#### Scenario: Ohne Anmeldung
- **WHEN** ein nicht angemeldeter Client die Mengenübersicht abruft
- **THEN** antwortet das System mit 401

#### Scenario: Ohne Zugriff auf den Plan
- **WHEN** ein angemeldeter Nutzer ohne Zugriff auf den Plan die Mengenübersicht abruft
- **THEN** antwortet das System mit 403 bzw. 404 wie bei der Einkaufsliste

### Requirement: Einzelne Rezept-Zutat in einer Mahlzeit anpassen
Das System SHALL unter `PUT /api/meal-plans/{id}/meal-items/{item_id}/overrides/{recipe_item_id}/` die Menge pro Person (`quantity_override`) oder den Ausschluss (`excluded`) genau einer Rezept-Zutat eines Mahlzeit-Eintrags setzen und unter `DELETE` auf denselben Pfad zurücksetzen. Andere Overrides desselben Mahlzeit-Eintrags MUST unverändert bleiben. Synchronisierte und externe Mahlzeiten, optionale Zutaten und Austauschgruppen MUST mit 422 bzw. 400 abgelehnt werden. Nur Nutzer mit Bearbeitungsrecht DÜRFEN anpassen.

#### Scenario: Menge in einer Mahlzeit reduzieren
- **GIVEN** ein Mahlzeit-Eintrag „Sandwich“ mit Overrides für Gurke
- **WHEN** ein Bearbeiter für die Zwiebel `quantity_override = 0.1` setzt
- **THEN** wird für die Zwiebel 0,1 Stück pro Person verwendet
- **THEN** bleibt der Override für Gurke bestehen

#### Scenario: Zurücksetzen
- **WHEN** ein Bearbeiter `DELETE` auf die Zwiebel-Zeile sendet
- **THEN** gilt wieder die Rezeptmenge und der Override ist entfernt

#### Scenario: Synchronisierte Mahlzeit
- **WHEN** ein Bearbeiter einen Override für einen Eintrag einer Mahlzeit mit `is_synced=true` setzen will
- **THEN** antwortet das System mit 422 und ändert nichts

#### Scenario: Nur Lesezugriff
- **WHEN** ein Nutzer ohne Bearbeitungsrecht einen Override setzen will
- **THEN** antwortet das System mit 403

### Requirement: Planweite Anpassung einer Zutat
Das System SHALL unter `POST /api/meal-plans/{id}/ingredient-quantities/{ingredient_id}/adjust/` die Menge einer Zutat für den ganzen Plan anpassen. Unterstützte Modi: `target_total` (Netto-Zielmenge in Gramm), `percent` (−90 bis +200, ungleich 0; wirkt auf die aktuelle Menge jedes anpassbaren Beitrags), `reset` und `restore` (setzt die in `previous` einer früheren Antwort gelieferten Mengen wieder, für „Rückgängig“). Die Antwort MUST den vorherigen Zustand der geänderten Beiträge als `previous` enthalten. Die Änderung MUST anteilig auf alle anpassbaren Beiträge verteilt und als `MealItemOverride.quantity_override` gespeichert werden; nicht anpassbare Beiträge und direkte Zutaten-Einträge MUST unverändert bleiben und als fixer Anteil in die Rechnung eingehen. Bei `target_total` MUST die Verteilung auf den Originalmengen basieren, sodass wiederholtes Anwenden dasselbe Ergebnis liefert. Die Operation MUST atomar sein. Ausgeschlossene Beiträge bleiben ausgeschlossen. Das Rezept selbst DARF NICHT geändert werden.

#### Scenario: Zielmenge in Stück
- **GIVEN** die Zwiebel hat im Plan 15 Stück (2250 g) netto aus drei gleichen anpassbaren Beiträgen
- **WHEN** ein Bearbeiter `target_total` mit `target_total_g = 450` (3 Stück) sendet
- **THEN** erhält jeder Beitrag `quantity_override = 0.05` (Stück pro Person, gespeichert mit vier Nachkommastellen)
- **THEN** zeigt die Mengenübersicht 3 Stück netto und die Einkaufsliste die Menge inklusive Reserve auf Basis von 450 g

#### Scenario: Fixer Anteil wird berücksichtigt
- **GIVEN** 300 g Zwiebel stammen aus einer synchronisierten Mahlzeit und 1200 g aus anpassbaren Beiträgen
- **WHEN** ein Bearbeiter die Zielmenge 900 g setzt
- **THEN** werden die anpassbaren Beiträge auf zusammen 600 g skaliert und die synchronisierte Mahlzeit bleibt unverändert

#### Scenario: Ziel kleiner als fixer Anteil
- **WHEN** die Zielmenge kleiner oder gleich dem fixen Anteil ist
- **THEN** antwortet das System mit 422 und ändert nichts

#### Scenario: Prozentuale Anpassung
- **GIVEN** der Salat hat aktuell 4000 g netto, alle Beiträge anpassbar
- **WHEN** ein Bearbeiter `percent = -50` sendet
- **THEN** beträgt die Netto-Gesamtmenge danach etwa 2000 g (Rundung auf vier Nachkommastellen der gespeicherten Menge)

#### Scenario: Rückgängig
- **GIVEN** eine planweite Anpassung lieferte `previous`
- **WHEN** ein Bearbeiter `restore` mit diesem `previous` sendet
- **THEN** entsprechen die Overrides der betroffenen Beiträge wieder dem Zustand vor der Anpassung

#### Scenario: Wiederholtes Setzen der Zielmenge
- **WHEN** ein Bearbeiter zweimal hintereinander dieselbe Zielmenge setzt
- **THEN** sind die Overrides nach dem zweiten Aufruf identisch mit denen nach dem ersten

#### Scenario: Zurücksetzen
- **WHEN** ein Bearbeiter `reset` sendet
- **THEN** sind alle `quantity_override`-Werte dieser Zutat im Plan entfernt
- **THEN** bleiben Ausschlüsse (`excluded=true`) bestehen

#### Scenario: Keine anpassbaren Beiträge
- **WHEN** alle Beiträge der Zutat nicht anpassbar sind
- **THEN** antwortet das System mit 422 „Diese Zutat kann im Plan nicht angepasst werden.“

#### Scenario: Ohne Bearbeitungsrecht oder Anmeldung
- **WHEN** ein Nutzer ohne Bearbeitungsrecht die Anpassung sendet
- **THEN** antwortet das System mit 403
- **WHEN** ein nicht angemeldeter Client die Anpassung sendet
- **THEN** antwortet das System mit 401

### Requirement: Mengenansicht im Food-Frontend
Das Food-Frontend SHALL im Essensplan im Reiter Einkauf einen Unterreiter „Mengen“ (`/meal-plans/{id}/shopping?sub=quantities`) anbieten. Die Ansicht MUST jede Zutat mit Netto- und Gesamtmenge mit Reserve, Badge „angepasst“ und aufklappbaren Beiträgen je Mahlzeit zeigen, mobil ab 320 px gestapelt. Bearbeiter MÜSSEN Mengen pro Person einzeln ändern, ausschließen und zurücksetzen sowie über „Gesamtmenge anpassen“ eine Zielmenge (Gramm oder Portion der Zutat) oder Prozentänderung mit Vorschau „vorher → nachher“ setzen können. Suche und Filter „nur angepasste“ MÜSSEN im URL-State stehen. Nach einer planweiten Anpassung SHALL ein Toast „Menge gespeichert“ mit „Rückgängig“ erscheinen. Ohne Bearbeitungsrecht ist die Ansicht nur lesbar.

#### Scenario: Peter reduziert Zwiebeln für den Wochenplan
- **GIVEN** Peter ist Bearbeiter des Plans
- **WHEN** er unter „Mengen“ bei Zwiebel „Gesamtmenge anpassen“ wählt, „3 Stück“ eingibt und speichert
- **THEN** zeigt die Ansicht 3 Stück netto und alle betroffenen Beiträge als „angepasst“
- **THEN** zeigen Einkaufsliste, Kosten und Zubereitungs-Zeitplan die reduzierte Menge ohne Neuladen der Seite

#### Scenario: Nicht anpassbarer Beitrag
- **WHEN** ein Beitrag `editable=false` hat
- **THEN** ist das Mengenfeld deaktiviert und der Grund wird angezeigt

#### Scenario: Nur Lesezugriff
- **WHEN** ein Nutzer ohne Bearbeitungsrecht die Ansicht öffnet
- **THEN** sieht er alle Mengen, aber keine Bearbeitungsaktionen

#### Scenario: Rückgängig
- **WHEN** der Nutzer nach einer planweiten Anpassung im Toast „Rückgängig“ wählt
- **THEN** werden die vorherigen Overrides der betroffenen Beiträge wiederhergestellt

### Requirement: Kennzeichnung angepasster Mengen
Rezept-Einträge mit mindestens einem Mengen-Override oder Ausschluss SHALL im MealSlot und im Zubereitungs-Zeitplan als „angepasst“ gekennzeichnet werden. Im Zeitplan MUST die betroffene Zutat mit der angepassten Menge und dem Hinweis „angepasst“ erscheinen.

#### Scenario: Angepasster Eintrag im MealSlot
- **GIVEN** ein Sandwich-Eintrag hat einen Override für Zwiebel
- **WHEN** der Nutzer die Tagesansicht öffnet
- **THEN** trägt der Eintrag ein Badge „angepasst“, das zur Mengenansicht der Zutat führt
