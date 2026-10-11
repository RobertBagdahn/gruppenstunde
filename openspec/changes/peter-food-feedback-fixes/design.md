# Design: Reproduzierbare Peter-Feedback-Fixes

## Entscheidungen

1. **Normalportion-Rang beibehalten:** Bereits vorhandene Rang-1-Portionen bleiben unverändert. Eine neue ausgewählte Portion, die ebenfalls Rang 1 tragen soll, erhält den nächsten freien Rang. Ein verbleibender Constraint-Konflikt (z. B. konkurrierender Schreibzugriff) wird als kontrollierter Konflikt statt HTTP 500 ausgegeben. Der Apply bleibt atomar.
2. **Frühstücks-Extras behalten Portionssemantik:** Der Client behält die ausgewählte Portion und die Eingabemenge zusätzlich zu den für die Frühstückskalkulation benötigten Gramm. Beim Save wird `portion_id` übertragen; Backend und Response verwenden die zugehörige Portionseinheit. Bei Wiederöffnung werden Name, Portion, Einheitenmenge und Grammgewicht wiederhergestellt.
3. **Masseinheiten korrekt formatieren und Portionen sicher wechseln:** Die Tages-/Tabellenansicht verwendet den bestehenden gemeinsamen `MealItemAmountEditor`/`PortionPicker`. Einheitenwechsel dürfen nicht unbeabsichtigt die physische Grammmenge ändern: bei einem reinen Portionswechsel konvertiert der Backend-Endpunkt die Anzahl anhand des bestätigten Gewichts; wird gleichzeitig eine neue Menge gesendet, gilt sie in der gewählten Einheit. Ungültige und fremde Portionen werden abgewiesen.
4. **Eingabetext während Editieren nicht erzwingen:** Mengenfelder halten den noch unvollständigen Eingabetext aus. Vor Bestätigung wird in eine positive Zahl validiert; leere oder 0-Eingaben deaktivieren die Aktion statt den Wert unaufgefordert zurückzusetzen.
5. **Copy-Regression:** Beide Kopierpfade erhalten `quantity`, `measuring_unit`, `portion`, `factor`, `display_name`, Buffet-/Frühstücksmetadaten und individuelle Item-Notiz. Mengen behalten ihre Pro-Person-Semantik.
6. **Item-Notizen auf dem MealItem:** Ein Notizfeld (max. 500 Zeichen, leerer Default) wird am `MealItem` gespeichert. Tages- und Tabellenansicht zeigen und bearbeiten dieselbe Notiz; der Scope umfasst Essensplan-Einträge, aber keine automatische Übernahme in Einkaufslisten oder PDFs. Notizen werden beim Kopieren übernommen.
7. **Stückzahlschätzung nur aus vertrauenswürdigen Daten:** Buffet-Katalogobjekte erhalten optional `piece_weight_g`, berechnet aus einer aktiven stückartigen Portion mit bestätigtem/importiertem Gewicht. Die UI zeigt je ausgewähltem Item eine ungefähre Gesamtstückzahl aus Rollenmenge, Anteil und effektiver Personenzahl. Ohne vertrauenswürdiges Gewicht, bei Rezepten oder ml-Rollen wird keine Zahl angezeigt.

## Daten-/API-Verträge

- `MealItemCreateIn` enthält bereits `portion_id`; `WizardItemsIn` und `WizardItemsBulkIn` verwenden diesen Typ. Die Wizard-Endpunkte müssen den Portionverweis beim Anlegen tatsächlich auflösen, validieren und an `MealItem.portion` setzen.
- Das Frontend-Zod-Schema hat bereits optionales `portion_id`; `WizardItemIn` wird um die nur clientseitig erforderlichen Extra-Auswahldaten erweitert, sofern nötig. API-Pydantic-/Zod-Felder bleiben deckungsgleich.
- Additive Planner-Migration für `MealItem.note` (leerer Default, max. 500 Zeichen). Keine Migration für Stückgewichte, da sie aus aktiven Portionen abgeleitet werden.

## Tests

- Backend Magic-Wand: gewichtete Rang-1-Portion + ausgewählte neue Rang-1-Stückportion; erfolgreicher Apply, eindeutige Ränge und keine 500.
- Backend Frühstücks-Wizard: `portion_id` wird gespeichert; fremde/ungültige Portion bleibt 422 und vorhandene Daten bleiben atomar erhalten; Bulk-Pfad ebenfalls.
- Frontend Frühstück: gespeicherte Extras erscheinen mit Namen und gewählter Portion; Speichern schickt `portion_id` und ausgewählte Menge.
- Frontend Mengen-Dialoge: leeren/0/Dezimalwert eingeben und die Eingabe vor Bestätigung bearbeiten können.
- Meal-Plan Copy: Einzelzutaten mit Portion, Menge/Einheit/Faktor, Metadaten und Item-Notiz behalten diese Werte nach dem Kopieren.
- MealItem-Notiz: Speichern, Lesen, Löschen, Read-only sowie Kopieren testen.
- Stückzahlschätzung: bestätigtes Stückgewicht, Rollenanteil/Personenzahl, fehlendes/nicht vertrauenswürdiges Gewicht und ml-Rolle testen.
