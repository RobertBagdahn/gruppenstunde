# shopping-trip-planning Specification

## Purpose
Plant die Einkäufe eines Events: mehrere Einkäufe mit Laden und Zeitpunkt, auf die der Bedarf aller Essenspläne des Events nach Datum verteilt wird. Manuelle Verschiebungen und ein Snapshot pro Einkauf sind möglich.

## Requirements

### Requirement: Einkauf mit Laden und Zeitpunkt
Ein Einkauf SHALL eine Einkaufsliste sein, die einem Event, einem Laden und einem Zeitpunkt (Datum und Uhrzeit, in UTC gespeichert) zugeordnet ist. `POST /api/shopping-events/{event_slug}/trips/` MUST `store_id` und `scheduled_at` verlangen (sonst 422) und die Liste mit dem Namen „<Laden> · <Wochentag> <Datum> <Uhrzeit>“ in der Zeitzone Europe/Berlin anlegen. Der Name SHALL danach änderbar sein.

#### Scenario: Einkauf anlegen
- **GIVEN** ein angemeldeter Event-Verantwortlicher des Events „Sommerlager“
- **WHEN** er einen Einkauf bei „Metro“ für Fr 17.10. 09:00 anlegt
- **THEN** antwortet die API mit 201 und die Liste heißt „Metro · Fr 17.10. 09:00“

#### Scenario: Zeitpunkt fehlt
- **WHEN** der Einkauf ohne `scheduled_at` angelegt wird
- **THEN** antwortet die API mit 422 „Bitte gib an, wann eingekauft wird.“

#### Scenario: Nicht angemeldet
- **WHEN** ein anonymer Client einen Einkauf anlegt
- **THEN** antwortet die API mit 401

### Requirement: Einkäufe eines Events planen
`GET /api/shopping-events/{event_slug}/plan/` SHALL alle Einkäufe des Events chronologisch liefern, mit Laden, Zeitpunkt, Status (`planned` oder `created`) und der Vorschau des zugeordneten Bedarfs. Dazu kommen die Bedarfe, die nicht gedeckt sind, und die Hinweise. Die Seite „Einkäufe planen“ (`/shopping-lists/events/:eventSlug`) MUST ab 320 px ohne horizontales Scrollen bedienbar sein.

#### Scenario: Plan mit drei Einkäufen
- **GIVEN** ein Event mit Einkäufen Fr 09:00, So 10:00 und Di 10:00
- **WHEN** ein Event-Verantwortlicher die Seite öffnet
- **THEN** sieht er die drei Einkäufe in zeitlicher Reihenfolge mit ihren Zutaten und Mengen

#### Scenario: Fremdes Event
- **WHEN** ein angemeldeter Nutzer ohne Zugriff auf das Event den Plan abruft
- **THEN** antwortet die API mit 404

### Requirement: Bedarf aus allen Essensplänen des Events
Der Bedarf SHALL aus allen Essensplänen des Events gebildet werden. Ein Bedarf ist eine Zutat (oder ein Verbrauchsmaterial) mit Menge und Bedarfszeitpunkt, wobei der Bedarfszeitpunkt der Beginn der Mahlzeit ist. Externe Mahlzeiten und Referenzmahlzeiten MUST ausgenommen sein. Die Mengen MUST denselben Regeln folgen wie der Einkaufen-Tab des Plans (Normportionen und Reserve des jeweiligen Plans).

#### Scenario: Zwei Pläne
- **GIVEN** ein Event mit Plan A (Kinder) und Plan B (Leitung), beide brauchen am Sa Mittag Nudeln
- **WHEN** der Einkaufsplan berechnet wird
- **THEN** erscheint im zuständigen Einkauf eine Zeile „Nudeln“ mit der Summe beider Pläne und den Quellen beider Mahlzeiten

#### Scenario: Externe Mahlzeit
- **WHEN** eine Mahlzeit als extern markiert ist
- **THEN** erzeugt sie keinen Bedarf

### Requirement: Automatische Zuordnung nach Datum
Jeder Bedarf SHALL dem letzten Einkauf des Events zugeordnet werden, dessen Zeitpunkt vor dem Bedarfszeitpunkt liegt oder auf ihn fällt, sofern keine manuelle Regel greift. Ein Einkauf deckt damit alles ab seinem Zeitpunkt bis zum nächsten Einkauf.

#### Scenario: Frühstück am Einkaufstag
- **GIVEN** Einkäufe Fr 09:00 und Sa 10:00
- **WHEN** das Frühstück am Samstag um 08:00 beginnt
- **THEN** steht sein Bedarf im Einkauf vom Freitag

#### Scenario: Mittagessen am Einkaufstag
- **GIVEN** Einkäufe Fr 09:00 und Sa 10:00
- **WHEN** das Mittagessen am Samstag um 12:30 beginnt
- **THEN** steht sein Bedarf im Einkauf vom Samstag

#### Scenario: Gleicher Zeitpunkt
- **WHEN** ein Einkauf um 12:00 und eine Mahlzeit um 12:00 liegen
- **THEN** gehört der Bedarf der Mahlzeit zu diesem Einkauf

#### Scenario: Zwei Einkäufe zur selben Zeit
- **GIVEN** Metro und Metzger, beide Fr 09:00
- **WHEN** die Zuordnung berechnet wird
- **THEN** geht der Bedarf an den zuerst angelegten der beiden, und das Verschieben zum anderen ist per Regel möglich

### Requirement: Nicht gedeckter Bedarf und Hinweise
Bedarf, der vor dem ersten Einkauf liegt, SHALL als „nicht gedeckt“ mit Zutat, Menge und Mahlzeit erscheinen. Mahlzeiten ohne Startzeit MUST als Hinweis „Mahlzeit ohne Uhrzeit – keinem Einkauf zugeordnet“ erscheinen und keinem Einkauf automatisch zugeordnet werden. Ein Event ohne Einkäufe SHALL den ganzen Bedarf als nicht gedeckt zeigen.

#### Scenario: Bedarf vor dem ersten Einkauf
- **GIVEN** der erste Einkauf ist Sa 10:00
- **WHEN** das Abendessen am Freitag Bedarf hat
- **THEN** steht dieser unter „Nicht gedeckt“ mit dem Hinweis „Vor dem ersten Einkauf“

#### Scenario: Mahlzeit ohne Uhrzeit
- **WHEN** eine Mahlzeit keine Startzeit hat
- **THEN** erscheint der Hinweis mit dem Mahlzeitnamen und ihr Bedarf ist keinem Einkauf zugeordnet

### Requirement: Manuelle Verschiebung als Regel
Nutzer mit Planungsrecht SHALL eine Zutat in einen anderen geplanten Einkauf verschieben können: für alle Mahlzeiten oder für eine bestimmte, ganz oder nur eine Teilmenge (in Gramm, bei Material in Stück). Die Verschiebung MUST als Regel gespeichert werden und SHALL bei späteren Plan- oder Terminänderungen weiter gelten. `DELETE` einer Regel MUST die automatische Zuordnung wiederherstellen.

#### Scenario: Hackfleisch zum Metzger
- **GIVEN** Hackfleisch für alle Mahlzeiten steht automatisch im Einkauf „Rewe Sa“
- **WHEN** der Nutzer „Hackfleisch → Metzger Sa“ wählt
- **THEN** steht das Hackfleisch im Einkauf „Metzger Sa“ und nicht mehr bei Rewe

#### Scenario: Teilmenge verschieben
- **GIVEN** 5 kg Kartoffeln im Einkauf „Rewe So“
- **WHEN** der Nutzer 3 kg in „Metro Fr“ verschiebt
- **THEN** zeigt „Metro Fr“ 3 kg und „Rewe So“ 2 kg

#### Scenario: Regel nach Planänderung
- **GIVEN** eine Regel „Nudeln → Metro Fr“
- **WHEN** im Plan eine weitere Mahlzeit mit Nudeln hinzukommt
- **THEN** stehen auch diese Nudeln in „Metro Fr“

#### Scenario: Regel zurücknehmen
- **WHEN** der Nutzer die Regel löscht
- **THEN** wird die Zutat wieder nach Datum zugeordnet

### Requirement: Hinweise zu Regeln
Eine Regel, deren Zieleinkauf nach dem Bedarfszeitpunkt liegt, SHALL weiter gelten, aber den Hinweis „Einkauf liegt nach der Mahlzeit“ zeigen. Eine Teilmenge, die größer ist als der aktuelle Bedarf, MUST auf den Bedarf begrenzt und mit einem Hinweis angezeigt werden. Wird der Zieleinkauf gelöscht, MUST die Regel mitgelöscht werden.

#### Scenario: Ziel nach der Mahlzeit
- **WHEN** Milch für das Frühstück am Sa 08:00 per Regel in den Einkauf Sa 10:00 verschoben wird
- **THEN** steht sie dort mit dem Hinweis „Einkauf liegt nach der Mahlzeit“

#### Scenario: Teilmenge zu groß
- **GIVEN** eine Regel „3 kg Kartoffeln → Metro“, der Bedarf sinkt auf 2 kg
- **THEN** zeigt Metro 2 kg mit dem Hinweis „Regel größer als Bedarf“

### Requirement: Einkauf ändern und löschen
Nutzer mit Planungsrecht SHALL Laden, Zeitpunkt und Namen eines Einkaufs ändern können. Bei geplanten Einkäufen MUST danach die Zuordnung neu berechnet werden. Das Löschen eines geplanten Einkaufs SHALL dessen Bedarf automatisch umverteilen. Das Löschen eines erstellten Einkaufs MUST eine Bestätigung verlangen, die die Zahl der abgehakten Einträge nennt.

#### Scenario: Termin verschieben
- **GIVEN** Einkäufe Fr 09:00 und So 10:00
- **WHEN** der zweite Einkauf auf Sa 10:00 verschoben wird
- **THEN** wandert der Bedarf vom Samstagmittag in diesen Einkauf

#### Scenario: Erstellten Einkauf löschen
- **GIVEN** ein erstellter Einkauf mit 12 abgehakten Einträgen
- **WHEN** der Nutzer „Löschen“ wählt
- **THEN** fragt ein Dialog „Einkauf mit 12 abgehakten Einträgen löschen?“

### Requirement: Liste erstellen friert den Einkauf ein
`POST /api/shopping-lists/{id}/materialize/` SHALL die aktuell zugeordneten Bedarfe eines geplanten Einkaufs als Einträge mit Quellen (Rezept, Mahlzeit, Teilmenge) speichern, `materialized_at` setzen und den Status auf `created` stellen. Ein erstellter Einkauf MUST danach nicht mehr durch Plan-, Termin- oder Regeländerungen verändert werden. Ein zweiter Aufruf MUST 409 liefern.

#### Scenario: Liste erstellen
- **WHEN** der Nutzer bei „Metro Fr“ „Liste erstellen“ wählt
- **THEN** enthält die Liste die Einträge der Vorschau und öffnet sich

#### Scenario: Plan ändert sich danach
- **GIVEN** „Metro Fr“ ist erstellt
- **WHEN** im Plan eine Mahlzeit gelöscht wird
- **THEN** bleiben die Einträge von „Metro Fr“ unverändert

#### Scenario: Erstellter Einkauf bleibt Ziel seiner Bedarfe
- **GIVEN** „Metro Fr“ ist erstellt und deckt die Bedarfe Fr–Sa
- **WHEN** ein neuer Einkauf Fr 18:00 angelegt wird
- **THEN** verschieben sich die Bedarfe, die „Metro Fr“ schon enthält, nicht in den neuen Einkauf

### Requirement: Differenz nach Planänderung übernehmen
Bei einem erstellten Einkauf SHALL `GET /api/shopping-lists/{id}/plan-diff/` die Unterschiede zwischen den gespeicherten Einträgen und dem aktuell zugeordneten Bedarf liefern, je Zutat als neu, geändert oder entfallen. `POST …/plan-diff/apply/` MUST nur nicht abgehakte, aus dem Plan erzeugte Einträge anpassen, neue Zeilen anlegen und entfallene, nicht abgehakte Zeilen entfernen. Abgehakte und manuelle Einträge MUST unverändert bleiben.

#### Scenario: Mehr Bedarf
- **GIVEN** im erstellten Einkauf stehen 2 kg Nudeln, nicht abgehakt
- **WHEN** der Plan auf 3 kg steigt und der Nutzer „Änderungen übernehmen“ wählt
- **THEN** zeigt der Eintrag 3 kg

#### Scenario: Abgehakter Eintrag
- **GIVEN** 2 kg Nudeln sind abgehakt
- **WHEN** der Plan auf 3 kg steigt
- **THEN** zeigt die Differenz „+1 kg Nudeln – bereits gekauft: 2 kg“, und „Übernehmen“ legt eine neue Zeile mit 1 kg an

#### Scenario: Keine Änderung
- **WHEN** sich der Plan seit der Erstellung nicht geändert hat
- **THEN** ist die Differenz leer und kein Hinweis erscheint

### Requirement: Planungsrecht des Event-Teams
Einkäufe eines Events SHALL von Event-Verantwortlichen (Ersteller, `responsible_persons`, Staff) und von Bearbeitern (Besitzer, Admin oder Editor) eines Essensplans des Events geplant werden. Betrachter eines Plans MUST den Einkaufsplan nur lesen dürfen. Alle anderen MUST 404 erhalten. Das Event-Team MUST auf jeden Einkauf des Events Zugriff haben wie ein Admin der Liste, ohne Einladung.

#### Scenario: Editor des Plans
- **GIVEN** Anna ist Editorin von Plan A des Events
- **WHEN** sie einen Einkauf anlegt
- **THEN** antwortet die API mit 201

#### Scenario: Betrachter des Plans
- **WHEN** ein Betrachter des Plans einen Einkauf anlegen will
- **THEN** antwortet die API mit 403, das Lesen des Einkaufsplans ist erlaubt

#### Scenario: Eingeladener Mitkäufer
- **GIVEN** Ben ist nur zur Liste „Rewe Sa“ eingeladen
- **WHEN** er den Einkaufsplan des Events abruft
- **THEN** antwortet die API mit 404, „Rewe Sa“ kann er weiterhin öffnen

### Requirement: Einkäufe im Essensplan markieren
Die Tagesansicht des Essensplans SHALL die Einkäufe des Events chronologisch zwischen den Mahlzeiten anzeigen, mit Laden und Uhrzeit. Nutzer mit Planungsrecht SHALL dort einen Einkauf einfügen (Laden und Uhrzeit, der Tag ist vorbelegt) und den Zeitpunkt eines geplanten Einkaufs ändern können. Ohne verknüpftes Event MUST stattdessen „Event verknüpfen, um Einkäufe zu planen“ erscheinen.

#### Scenario: Einkauf zwischen Frühstück und Mittag
- **GIVEN** ein Einkauf Sa 10:00
- **WHEN** der Nutzer den Samstag im Essensplan ansieht
- **THEN** steht „Einkauf Rewe · 10:00“ zwischen Frühstück und Mittagessen

#### Scenario: Einkauf im Plan einfügen
- **WHEN** der Nutzer am Sonntag „Einkauf einfügen“ wählt, „Rewe“ und 11:00 angibt
- **THEN** wird der Einkauf angelegt und erscheint im Plan und auf der Seite „Einkäufe planen“

### Requirement: Einkaufen-Tab führt zur Einkaufsplanung
Der Einkaufen-Tab des Essensplans SHALL den Gesamtbedarf des Plans wie bisher zeigen, aber keine Liste mehr direkt erstellen. Er MUST bei einem verknüpften Event auf „Einkäufe planen“ verlinken und ohne Event den Dialog „Event verknüpfen“ anbieten.

#### Scenario: Plan mit Event
- **WHEN** der Nutzer im Einkaufen-Tab „Einkäufe planen“ wählt
- **THEN** öffnet sich `/shopping-lists/events/<eventSlug>`

#### Scenario: Plan ohne Event
- **WHEN** der Plan kein Event hat
- **THEN** zeigt der Tab „Für Einkäufe braucht der Plan ein Event“ mit der Aktion „Event verknüpfen“
