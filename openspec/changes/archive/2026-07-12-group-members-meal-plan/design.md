## Context

Der `MealPlan` (`planner/models/meal_plan.py`) hat heute ein manuelles `norm_portions` Integer-Feld (Default: 10). Die `supply/services/norm_person_service.py` berechnet bereits individuelle Norm-Faktoren aus Alter, Geschlecht und PAL (Mifflin-St Jeor → BMR → TDEE → Norm-Faktor relativ zur 15J/m/PAL1.5 Referenzperson). `calculate_group_norm_factor(persons: list[PersonSpec])` summiert diese Faktoren. Es fehlt die Brücke: ein Datenmodell, das Personen einem MealPlan zuweist, und die automatische Ableitung von `norm_portions` aus diesen Personen.

Die DPSG-Stufen sind fest definiert: Wölflinge (7-10), Jungpfadfinder (10-13), Pfadfinder (13-16), Rover (16-21). Die Referenzperson (15 Jahre, männlich, PAL 1.5) entspricht etwa einem Pfadfinder.

Das `event.Person`-Modell hat `gender`, `birthday` und `nutritional_tags` — eine Teilmenge dessen, was der `GroupMember` braucht. Wenn ein Event mit Participants existiert, sollen diese live synchronisiert werden.

## Goals / Non-Goals

**Goals:**
- Neues `MealPlanGroupMember` Model mit Name (optional), Alter (Pflicht), Geschlecht (Default: keine Angabe), NutritionalTags, optionalem Link zu `event.Person`
- `MealPlan.activity_factor` (PAL-Wert, Default 1.5) als globaler PAL pro Plan
- Automatische Neuberechnung von `meal_plan.norm_portions` bei jeder GroupMember-Änderung
- Stufen-Schnellbuttons (Wölflinge/Jungpfadfinder/Pfadfinder/Rover) mit Mengen-Dialog
- Live-Sync mit Event-Participants wenn `meal_plan.event` gesetzt ist
- Nutzung von BookingOptions zur tagesgenauen Präsenzberechnung
- Freitext-Eingabe für Allergien mit NutritionalTag-Autocomplete
- Button in der Header-Leiste des MealPlanDetailPage neben "Essensplan teilen"

**Non-Goals:**
- Keine Änderungen am `event.Person`- oder `event.Participant`-Modell
- Keine Änderungen am Haupt-Frontend (`frontend/`)
- Kein eigenes Berechtigungssystem (== `meal_plan.can_edit`)
- Keine Gruppen-übergreifende Personenverwaltung (Personen leben immer innerhalb eines MealPlans)
- Keine PAL-pro-Person (PAL ist global pro MealPlan)

## Decisions

### D1: Model-Struktur: `MealPlanGroupMember` mit flachem Alter statt `birthday`

Das `event.Person`-Modell nutzt `birthday` (DateField). Für schnelles "Zusammenklicken" ist ein direktes `age`-Feld (IntegerField) praktischer — der Nutzer tippt einfach das Alter ein und muss keinen Geburtstag ausrechnen.

**Alternative**: `birthday` wie bei `Person` speichern und Alter dynamisch berechnen. → Verworfen, weil das Eintippen eines Geburtsdatums umständlicher ist als das Alter.

### D2: Geschlecht als eigenes Choices-Feld mit "keine Angabe"

Das Norm-Person-Service-Enum hat nur `MALE`/`FEMALE`. Der Nutzer soll "keine Angabe" auswählen können. Der Server berechnet dann beide Werte und nimmt den Mittelwert.

```
GroupMemberSchema.gender: "male" | "female" | "no_answer"
→ Server: norm_factor = avg(male_norm, female_norm) bei "no_answer"
```

### D3: Event-Sync-Strategie: POST-basierter Sync statt Polling

Bei Event-verknüpften Plänen wird `GET /api/meal-plans/{id}/` die synced GroupMembers in der Response mitliefern. Ein expliziter `POST /api/meal-plans/{id}/sync-event-participants/` Endpunkt triggert den Sync manuell (und wird auch beim ersten Laden angeboten). Kein automatischer Polling-Mechanismus — der Nutzer entscheidet, wann synchronisiert wird.

Die Event-Sync bildet Participants 1:1 auf GroupMembers ab:
- `name` ← `Participant.scout_name` oder `first_name`
- `age` ← berechnet aus `Participant.birthday`
- `gender` ← `Participant.gender`
- `nutritional_tags` ← `Participant.nutritional_tags`
- `person_id` ← `Participant.person_id`

### D4: Tagesgenaue Präsenz über BookingOption-Zeiträume

BookingOptions haben `start_datetime`/`end_datetime`. Für Event-Sync-GroupMembers wird ein `date_ranges` JSON-Feld gespeichert, das die Präsenz-Tage ableitet. Eine Person ist an Tag X präsent, wenn X innerhalb ihrer BookingOption liegt.

Für die Berechnung der `effective_portions` eines Meals wird `norm_portions` entsprechend der tatsächlich am Meal-Tag anwesenden Personen skaliert.

**Phase 1 (dieser Change)**: Flache Gruppenberechnung — ein `norm_portions`-Wert für den gesamten Plan, der die Summe aller Norm-Faktoren ist (alle Personen zählen für jeden Tag). Der Nutzer sieht die Personenliste und die berechnete Gesamtzahl.

**Phase 2 (Folge-Change)**: Tagesgenaue Portionen über `Meal.override_portions`. Die Event-Sync-Daten mit BookingOption-Zeiträumen werden bereits im Model gespeichert, aber die UI und Berechnung folgen später.

### D5: PAL als `MealPlan.activity_factor`

`MealPlan` bekommt ein `activity_factor` FloatField (Default: 1.5). Alle GroupMembers eines Plans nutzen diesen PAL-Wert. Der Wert wird im SettingsPanel editierbar sein (Dropdown: 1.2 / 1.5 / 1.75 / 2.0).

### D6: Automatische `norm_portions`-Überschreibung

Sobald mindestens ein `GroupMember` existiert, wird `norm_portions` ausschließlich aus `calculate_group_norm_factor(group_members)` abgeleitet. Der vorherige manuelle Wert wird ignoriert. Beim Löschen aller GroupMembers fällt `norm_portions` auf den letzten manuellen Wert zurück (in `previous_norm_portions` gespeichert).

### D7: Stufen-Schnellbuttons — Default-Werte

| Stufe | Label | Default-Alter | Altersspanne |
|-------|-------|---------------|-------------|
| Wölflinge | "Wölflinge" | 8 | 7–10 |
| Jungpfadfinder | "Jungpfadfinder" | 11 | 10–13 |
| Pfadfinder | "Pfadfinder" | 14 | 13–16 |
| Rover | "Rover" | 18 | 16–21 |

Jeder Button öffnet einen Mini-Dialog mit Anzahl-Eingabe (1–50). Geschlecht immer "keine Angabe" beim Schnell-Hinzufügen. Pro Klick werden N Personen mit dem Default-Alter und "keine Angabe" angelegt.

### D8: UI-Struktur

```
MealEventDetailPage Header
├── Essensplan teilen (Share2 Icon) ← bestehend
├── Gruppe (Users Icon) ← NEU — toggled GroupMemberPanel
└── Einstellungen (Settings Icon) ← bestehend

GroupMemberPanel (unter dem Header, wie Share-Panel und Settings-Panel):
├── "Schnell hinzufügen"-Sektion mit Stufen-Buttons
│   └── [🐺 Wölflinge] → QuickAddDialog (Anzahl)
│   └── [🌿 Jupfi] → QuickAddDialog (Anzahl)
│   └── [🧭 Pfadfinder] → QuickAddDialog (Anzahl)
│   └── [🏕️ Rover] → QuickAddDialog (Anzahl)
├── "Person hinzufügen"-Formular
│   ├── Name (Text, optional)
│   ├── Alter (Number, Pflicht)
│   ├── Geschlecht (Select: m/w/k.A., Default k.A.)
│   └── Besonderheiten (Autocomplete-Textfeld mit NutritionalTag-Vorschlägen)
├── Personenliste (CardTable mit DataCardRows)
│   └── Pro Person: Name, Alter, Geschlecht, Tags, Löschen-Button
└── Event-Sync-Bereich (nur sichtbar wenn meal_plan.event gesetzt)
    ├── "Aus Event synchronisieren"-Button
    └── Info: "X Teilnehmer aus Event übernommen"

SettingsPanel (bestehend, aktualisiert):
├── Norm-Personen: 10 → 4.2 (berechnet aus 5 Personen)
└── PAL (activity_factor): 1.5 [Dropdown]
```

### D9: NutritionalTag-Autocomplete

Der User tippt Freitext (z.B. "nuss") → Autocomplete zeigt passende NutritionalTags aus dem Backend. Ausgewählte Tags werden als Badges unter dem Eingabefeld angezeigt. Keine Tag-Neuerstellung — nur Auswahl aus bestehenden Tags. Endpunkt existiert bereits unter `/api/nutritional-tags/`.

## Risks / Trade-offs

**[Risk] `norm_portions` wird Float, ist aber IntegerField** → `norm_portions` muss zu `FloatField` geändert werden, da Gruppensummen selten ganzzahlig sind (z.B. 4.2 Norm-Personen). Bestehende Integer-Portionen-Logik in `Meal.effective_portions` (Property, kein DB-Feld) muss das verarbeiten können.

**[Risk] Event-Sync überschreibt manuelle GroupMembers** → Sync ist explizit nutzergesteuert (Button). Nach Sync sind alle vorherigen manuellen GroupMembers überschrieben. Lösung: Warn-Dialog vor Sync mit Info "Bestehende Gruppenmitglieder werden durch Event-Teilnehmer ersetzt".

**[Risk] Performance bei großen Gruppen (50+ Personen)** → `calculate_group_norm_factor` iteriert einmal über alle Personen (O(n) mit simpler Arithmetik). Kein Performance-Risiko. GroupMember-Speicherung pro Person (1 DB-Row pro Person) auch bei 100 Personen kein Problem.

**[Risk] Event ohne BookingOptions hat keine Zeitraum-Infos** → Fallback: alle Participants gelten für alle Tage des MealPlans. Der Sync-Endpunkt prüft auf BookingOptions und generiert `date_ranges` nur wenn vorhanden.

## Open Questions

- Keine — alle Entscheidungen sind getroffen.
