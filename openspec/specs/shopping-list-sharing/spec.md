# shopping-list-sharing Specification

## Purpose

Gemeinsam einkaufen: Eine Einkaufsliste wird per Einladungslink geteilt, Gäste ohne Konto arbeiten mit Namen mit, alle sehen, wer was wann eingetragen und abgehakt hat, Zuständigkeiten vermeiden Doppelkäufe, und Änderungen erscheinen ohne WebSocket. Ergänzt `shopping-list` (Datenmodell, Rechte der Mitglieder) und `shopping-list-views`.

## Requirements

### Requirement: Einladungslink verwalten
Besitzer und Administratoren einer Einkaufsliste SHALL einen Einladungslink erzeugen, erneuern und beenden können. `POST /api/shopping-lists/{id}/share/` MUST den Link einschalten und bei bereits aktivem Link denselben zurückgeben. `POST /api/shopping-lists/{id}/share/regenerate/` MUST einen neuen Token erzeugen und alle Gäste der Liste löschen. `DELETE /api/shopping-lists/{id}/share/` MUST den Token entfernen und alle Gäste löschen. Alle drei Endpunkte MUST für Nutzer ohne Verwaltungsrecht mit 403 (Mitglieder) bzw. 401 (anonym) antworten. Der Token (`share_token`) und die Gästeliste SHALL nur in der Detailantwort für Nutzer mit `can_manage` erscheinen. Die Detailseite SHALL für diese Nutzer einen Teilen-Button und eine Karte „Gemeinsam einkaufen“ mit Link, „Kopieren“, „Teilen“ (Web Share, falls verfügbar), „Neuen Link erzeugen“ und „Teilen beenden“ zeigen; Erneuern und Beenden MUST eine Bestätigung verlangen.

#### Scenario: Link einschalten
- **WHEN** der Besitzer „Einladungslink erstellen“ wählt
- **THEN** erscheint ein Link der Form `/shopping-lists/join/{token}` zum Kopieren
- **AND** ein erneuter Aufruf von `POST …/share/` liefert denselben Token

#### Scenario: Link erneuern
- **GIVEN** der Gast „Anna“ ist über den alten Link beigetreten
- **WHEN** der Besitzer den Link erneuert
- **THEN** funktioniert der alte Link nicht mehr (404) und die Gästeliste ist leer
- **AND** Annas Einträge bleiben erhalten, ihr Name wird entfernt

#### Scenario: Teilen beenden
- **WHEN** der Besitzer „Teilen beenden“ bestätigt
- **THEN** ist `share_token` leer und kein Gast kann die Liste mehr öffnen

#### Scenario: Einzelnen Gast entfernen
- **WHEN** der Besitzer bei „Anna“ „Gast entfernen“ wählt (`DELETE /api/shopping-lists/{id}/guests/{guest_id}/`)
- **THEN** verliert Anna den Zugang, der Link und andere Gäste bleiben gültig

#### Scenario: Bearbeiter verwaltet das Teilen nicht
- **WHEN** ein Mitglied mit Rolle „editor“ `POST …/share/` aufruft
- **THEN** antwortet die API mit 403 und die Detailseite zeigt weder Teilen-Button noch Karte

### Requirement: Beitritt über den Link ohne Konto
Der Beitritt SHALL ohne Anmeldung möglich sein. `GET /api/shopping-lists/shared/{token}/` MUST ohne Login Name, Besitzername und Zähler (`items_count`, `checked_count`) liefern, aber keine Einträge; ein unbekannter oder ungültiger Token MUST 404 mit der Meldung „Dieser Einladungslink ist nicht mehr gültig“ liefern. `POST /api/shopping-lists/shared/{token}/join/` MUST für Anonyme einen Namen verlangen (leer oder nur Leerraum: 422; höchstens 40 Zeichen, mehrfache Leerzeichen werden zusammengezogen), einen Gast anlegen und dessen geheimen `guest_token` zurückgeben. Ein Gerät mit gültigem Gast-Token SHALL seine Identität behalten; ein anderer Name benennt den Gast um. Pro Liste MUST es höchstens 100 Gäste geben (sonst 400). Angemeldete Nutzer SHALL beim Beitritt als Bearbeiter (`editor`) Mitglied werden, ohne Namenseingabe, und die Liste erscheint in ihren Einkaufslisten; Besitzer und bestehende Mitglieder behalten ihre Rolle. Die Beitrittsseite (`/shopping-lists/join/:token`) SHALL Listenname, Einladenden und Fortschritt zeigen, nach dem Namen fragen („Wie heißt du?“) und das Gast-Token im Browser (`localStorage`, je Liste) speichern; Konten und bereits beigetretene Geräte MUST das Formular überspringen.

#### Scenario: Gast tritt bei
- **GIVEN** ein Besucher ohne Konto öffnet den Link
- **WHEN** er „Anna“ eingibt und „Einkaufsliste öffnen“ wählt
- **THEN** öffnet sich die Liste mit dem Hinweis „Du bist als Anna dabei. Alle sehen, was du einträgst und abhakst.“

#### Scenario: Name fehlt
- **WHEN** der Besucher das Formular ohne Namen absendet
- **THEN** erscheint „Bitte gib deinen Namen ein, damit die anderen sehen, wer was abhakt.“ und es wird kein Gast angelegt

#### Scenario: Rückkehrendes Gerät
- **GIVEN** das Gerät ist bereits als „Anna“ beigetreten
- **WHEN** es den Link erneut öffnet
- **THEN** wird kein zweiter Gast angelegt und die Liste öffnet ohne Formular

#### Scenario: Konto öffnet den Link
- **WHEN** ein angemeldeter Nutzer ohne Rolle den Link öffnet
- **THEN** wird er Bearbeiter der Liste und zur Liste weitergeleitet

#### Scenario: Gästelimit
- **GIVEN** die Liste hat 100 Gäste
- **WHEN** ein weiterer Besucher beitreten will
- **THEN** antwortet die API mit 400

#### Scenario: Ungültiger Link
- **WHEN** jemand einen erneuerten oder beendeten Link öffnet
- **THEN** zeigt die Seite „Dieser Einladungslink ist nicht mehr gültig“

### Requirement: Rechte und Zugriff von Gästen
Gäste SHALL über den Header `X-Guest-Token` identifiziert werden; ihr Zugriff MUST nur gelten, solange der Einladungslink der Liste aktiv ist und der Gast zu genau dieser Liste gehört. Gäste SHALL die Liste lesen sowie Einträge anlegen, abhaken, ändern und übernehmen dürfen. Gäste MUST nur Einträge löschen dürfen, die sie selbst angelegt haben und die nicht aus Rezept oder Essensplan stammen (sonst 403). Gäste MUST NICHT umbenennen, löschen, teilen verwalten, den REWE-Export-Token erzeugen oder Mitglieder sehen: die Detailantwort liefert für sie `collaborators=[]`, `guests=[]`, `share_token=null`, `can_manage=false` und `is_owner=false`. Anonyme Anfragen ohne Gast-Token MUST weiterhin 401 liefern, ein unbekanntes oder fremdes Token MUST 404 liefern (kein Hinweis auf die Existenz der Liste). Die Detailantwort SHALL `viewer_guest_id` und `viewer_display_name` für Gäste setzen. Die Oberfläche MUST für Gäste REWE-Export, Küchenbedarf, Mitgliederbereich, Materiallisten-Link und Listen-Löschen ausblenden. Verliert ein Gast den Zugang (Link erneuert oder beendet, Gast entfernt), MUST die Seite „Dein Zugang zur Einkaufsliste wurde beendet“ zeigen und die gespeicherten Zugangsdaten verwerfen.

#### Scenario: Gast arbeitet mit
- **WHEN** der Gast „Anna“ „Brot“ einträgt und abhakt
- **THEN** antwortet die API jeweils mit 200 und der Eintrag trägt „Anna“ als Urheberin und Abhakerin

#### Scenario: Gast löscht fremden Eintrag
- **WHEN** ein Gast einen Eintrag des Besitzers oder eines anderen Gasts löscht
- **THEN** antwortet die API mit 403 und `can_delete` ist für diesen Eintrag `false`

#### Scenario: Gast löscht eigenen Eintrag
- **WHEN** der Gast einen von ihm angelegten manuellen Eintrag löscht
- **THEN** verschwindet der Eintrag (200)

#### Scenario: Token einer anderen Liste
- **WHEN** ein Gast sein Token an `GET /api/shopping-lists/{andere_id}/` sendet
- **THEN** antwortet die API mit 404

#### Scenario: Zugang entzogen
- **WHEN** der Besitzer den Link erneuert, während der Gast die Liste offen hat
- **THEN** zeigt dessen Seite spätestens nach dem nächsten Abgleich „Dein Zugang zur Einkaufsliste wurde beendet“

#### Scenario: Gast-WebSocket
- **WHEN** ein Gast die Verbindung `ws/shopping-lists/{id}/?guest={token}` öffnet
- **THEN** wird sie bei gültigem Token angenommen, bei fehlendem, ungültigem oder widerrufenem Token mit Code 4403 geschlossen

### Requirement: Herkunft von Einträgen und Häkchen
Jeder Eintrag SHALL festhalten und anzeigen, wer ihn angelegt (`added_by_display_name`, `created_at`) und wer ihn abgehakt hat (`checked_by_display_name`, `checked_at`), sowohl für Konten als auch für Gäste. Die Anzeige MUST Namen und Uhrzeit zeigen („Hinzugefügt von Anna · 14:32 Uhr · Abgehakt von Ben · 14:35 Uhr“; für frühere Tage mit Datum). Namen SHALL über den öffentlichen Anzeigenamen gebildet werden und MUST NIE eine E-Mail-Adresse enthalten. Aus Rezept oder Essensplan erzeugte Einträge ohne Bearbeiter zeigen keine Herkunft. Haken zwei Personen gleichzeitig denselben Eintrag ab, MUST die erste Person als Abhakerin erhalten bleiben; das Entfernen des Hakens löscht Abhaker und Zeitpunkt. Ein `is_checked: null` MUST den Zustand nicht ändern. Die Oberfläche MUST beim Abhaken den Namen des Abhakers erst aus der Serverantwort anzeigen, nicht den eigenen vorab, damit bei „erste Person bleibt“ kein falscher Name aufblitzt.

#### Scenario: Wer und wann
- **GIVEN** Anna trägt „Milch“ um 08:24 ein und Ben hakt sie um 08:31 ab
- **THEN** zeigt die Zeile „Hinzugefügt von Anna · 08:24 Uhr · Abgehakt von Ben · 08:31 Uhr“

#### Scenario: Gleichzeitiges Abhaken
- **WHEN** Anna und Ben denselben Eintrag nacheinander abhaken
- **THEN** bleibt Anna als Abhakerin eingetragen

#### Scenario: Haken entfernen
- **WHEN** der Haken entfernt wird
- **THEN** ist `checked_by_display_name` leer

#### Scenario: Link beendet
- **WHEN** der Besitzer das Teilen beendet
- **THEN** bleiben die Einträge, aber ohne Gastnamen

### Requirement: Zuständigkeit „Ich hole das“
Jeder Eintrag SHALL von genau einer Person übernommen werden können, damit niemand doppelt kauft. `PATCH …/items/{item_id}/` mit `claimed=true` MUST die handelnde Person (Konto oder Gast) als Zuständige eintragen; ist der Eintrag bereits von jemand anderem übernommen, MUST die API 409 „Diesen Eintrag hat schon jemand übernommen“ liefern, bei erneutem Übernehmen durch dieselbe Person 200. `claimed=false` MUST die Zuständigkeit lösen, aber nur durch die zuständige Person oder Besitzer/Administratoren; andere erhalten 403. Die Antwort SHALL `claimed_by_display_name` und `claimed_by_me` (je Betrachter) enthalten. Offene Einträge zeigen „Ich hole das“, eigene „Du holst das · Freigeben“, fremde „<Name> holt das“; abgehakte Einträge zeigen keine Zuständigkeit.

#### Scenario: Eintrag übernehmen
- **WHEN** Anna bei „Käse“ „Ich hole das“ wählt
- **THEN** zeigen alle „Anna holt das“

#### Scenario: Bereits übernommen
- **WHEN** Ben bei „Käse“ übernehmen will
- **THEN** antwortet die API mit 409

#### Scenario: Fremde Zuständigkeit lösen
- **WHEN** Ben die Zuständigkeit von Anna löst
- **THEN** antwortet die API mit 403; der Besitzer darf sie lösen

### Requirement: Aktualisierung ohne WebSocket
Die Liste SHALL sich ohne WebSocket aktuell halten, weil Produktion (gunicorn/WSGI) keinen WebSocket-Endpunkt bereitstellt. `GET /api/shopping-lists/{id}/pulse/` MUST einen Änderungsstempel (`stamp`) liefern, der sich bei jeder Änderung an Einträgen, Häkchen, Mitgliedern, Gästen oder der Liste ändert und mit nur einer Aggregatabfrage berechnet wird; dasselbe Feld `stamp` MUST in der Detailantwort stehen. Die Detailseite SHALL den Stempel alle 5 Sekunden abrufen; ändert sich 2 Minuten lang nichts, MUST der Takt auf 15 Sekunden sinken und bei jeder Änderung (auch der eigenen) oder beim Zurückkehren in den Tab wieder auf 5 Sekunden steigen. Bei offenem WebSocket gelten 20 Sekunden, Hintergrund-Tabs pausieren, beim Zurückkehren erfolgt sofort ein Abgleich und die Liste nur neu laden, wenn der Stempel abweicht. Antwortet der Abgleich mit 404 oder 401, MUST die Liste neu geladen werden, damit der Zugangsverlust sichtbar wird. Der Abruf MUST für Mitglieder und Gäste gelten.

#### Scenario: Änderung eines anderen
- **GIVEN** Peter hat die Liste offen und kein WebSocket
- **WHEN** Anna „Käse“ einträgt
- **THEN** erscheint der Eintrag bei Peter spätestens nach etwa 5 Sekunden

#### Scenario: Keine Änderung
- **WHEN** sich nichts ändert
- **THEN** wird nur der Stempel abgerufen, nicht die ganze Liste

#### Scenario: Ruhige Liste
- **WHEN** 2 Minuten lang nichts geändert wurde
- **THEN** fragt die Seite nur noch alle 15 Sekunden ab
- **AND** nach der nächsten Änderung oder beim Zurückkehren in den Tab wieder alle 5 Sekunden

#### Scenario: Eigene Änderung
- **WHEN** der Nutzer selbst einen Eintrag ändert
- **THEN** löst der folgende Abgleich keinen zusätzlichen Listenabruf aus

### Requirement: Einkaufsmodus
Die Detailseite SHALL einen Einkaufsmodus bieten (Korb-Button im Kopfband, `aria-pressed`), der pro Gerät gespeichert wird (`localStorage`-Schlüssel `inspi.shopping.shopMode`). Im Einkaufsmodus MUST die Liste nur die Einträge mit großen Bedienflächen zeigen: Checkbox mindestens 56 px, Eintragsnamen in der größeren Schriftstufe. Teilen-Karte, Teilen-Button, Löschen-Button, Gast-Banner, Quellen-Hinweis, Mengenwarnungen, „Alle Rezepte anzeigen“, Materiallisten-Link, Gesamtpreis, REWE-Export, Küchenbedarf, Mitgliederbereich und die Herkunftszeile unter den Einträgen MUST ausgeblendet sein; Zuständigkeit und Abhaken bleiben bedienbar.

#### Scenario: Modus einschalten
- **WHEN** der Nutzer den Korb-Button wählt
- **THEN** verschwinden die Verwaltungsbereiche und die Einträge erscheinen mit großen Checkboxen

#### Scenario: Modus bleibt erhalten
- **WHEN** der Nutzer die Seite neu lädt
- **THEN** bleibt der Einkaufsmodus aktiv

#### Scenario: Modus beenden
- **WHEN** der Nutzer den Korb-Button erneut wählt
- **THEN** erscheint die volle Ansicht

### Requirement: Eingabevalidierung der Einkaufsliste
Die API SHALL Namen und Felder serverseitig begrenzen, damit keine 500-Fehler entstehen. Eintragsname: 1–255 Zeichen und nicht nur Leerraum (sonst 422); Einheit höchstens 20, Notiz höchstens 500 Zeichen; Listenname 1–255 Zeichen. Bei `PATCH` auf Liste oder Eintrag MUST ein ausdrückliches `null` Pflichtfelder (Name, Menge, Einheit, `is_checked`) unverändert lassen; nur `retail_section_id` darf auf `null` gesetzt werden. Namen SHALL vor dem Speichern getrimmt werden.

#### Scenario: Name null
- **WHEN** `PATCH …/` mit `{"name": null}` gesendet wird
- **THEN** antwortet die API mit 200 und der Name bleibt unverändert

#### Scenario: Leerer oder zu langer Name
- **WHEN** ein Eintrag mit leerem, nur aus Leerzeichen bestehendem oder 256 Zeichen langem Namen angelegt wird
- **THEN** antwortet die API mit 422

#### Scenario: Abhaken bleibt
- **GIVEN** ein abgehakter Eintrag
- **WHEN** `PATCH` mit `{"is_checked": null, "note": "fein"}` gesendet wird
- **THEN** ist der Eintrag weiterhin abgehakt und die Notiz gesetzt

### Requirement: Löschrecht je Eintrag aus der API
Jeder Eintrag der Detailantwort SHALL `can_delete` tragen, serverseitig je Betrachter aufgelöst; das Frontend MUST die Löschen-Aktion allein daraus ableiten. `can_delete` ist `true` für Bearbeiter-Rechte bei manuellen Einträgen (ohne Quelle aus Rezept oder Essensplan), für Gäste zusätzlich nur bei selbst angelegten Einträgen, sonst `false`.

#### Scenario: Erzeugter Eintrag
- **WHEN** ein Eintrag aus einem Rezept stammt
- **THEN** ist `can_delete` für alle `false`

#### Scenario: Fremder manueller Eintrag für Gast
- **WHEN** ein Gast einen manuellen Eintrag des Besitzers betrachtet
- **THEN** ist `can_delete` `false`

### Requirement: Geheime Tokens nur für Berechtigte
Das geheime Gast-Token (`ShoppingListGuest.token`) und der Einladungs-Token (`ShoppingList.share_token`) SHALL nie in API-Antworten an Gäste oder in Gästelisten erscheinen; die Gästeliste der Verwaltung enthält nur `id`, `name` und `created_at`. Der Token darf nur in der Detailantwort für Nutzer mit `can_manage` und im Beitritts-Antwortkörper für den beitretenden Gast selbst erscheinen.

#### Scenario: Gästeliste ohne Token
- **WHEN** der Besitzer die Detailantwort liest
- **THEN** enthalten die Gäste nur `id`, `name` und `created_at`
