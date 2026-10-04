## Context

`delete_recipe` ruft `recipe.soft_delete()` auf (setzt `deleted_at`). `MealItem.recipe` ist ein FK mit `on_delete=CASCADE`, der Soft-Delete löst ihn also nicht. Die Einkaufsliste filtert gelöschte Rezepte aus, die Plan-Kosten (`cost_eur`, `energy_kcal` an `MealItem`) dagegen nicht. Dadurch laufen Anzeigen auseinander. Bisher gibt es nur einen 409-Fall für aktive Varianten.

## Goals / Non-Goals

**Goals:**
- Ein verwendetes Rezept lässt sich nicht löschen. Der Nutzer erfährt vorab, wo es verwendet wird.
- Kosten, kcal und Einkaufsliste eines Plans bleiben konsistent, auch bei Bestandsdaten.

**Non-Goals:**
- Kein automatisches Entfernen aus Plänen (Entscheidung: blockieren statt kaskadieren).
- Keine Änderung am Löschen von Zutaten.

## Decisions

- **Blockieren mit 409 und Klartext.** Meldung nennt die Zahl der Pläne. Alternative „aus Plänen entfernen“ wurde verworfen, weil dabei fremde Pläne (Kollaboratoren) still verändert würden.
- **Eigener Usage-Endpunkt statt Feld in der Rezept-Detailantwort.** Die Detailantwort wird sehr oft geladen, die Nutzung nur beim Öffnen des Dialogs. Der Endpunkt gibt immer `plan_count` zurück und nur sichtbare Pläne als Liste (Rechteprüfung über die bestehende Plan-Sichtbarkeit), damit keine Namen fremder privater Pläne durchsickern.
- **Verwendung zählt über `MealItem.recipe`, nicht nur über Varianten.** Der bestehende Varianten-Check bleibt als Spezialfall mit derselben 409-Antwort.
- **Defensiver Filter in Berechnung und Kopie.** Wo Plan-Einträge summiert oder kopiert werden, werden Einträge mit `recipe__deleted_at__isnull=False` ausgelassen. Bestandsdaten werden zusätzlich per Command bereinigt (Dry-Run als Standard).

## Risks / Trade-offs

- [Rezept bleibt „hängen“, weil es in einem alten Plan steckt] → Dialog verlinkt die Pläne, der Nutzer entfernt dort den Eintrag. Admins können über das Bereinigungs-Command aufräumen.
- [Race: Rezept wird zwischen Dialog und Klick in einen Plan gelegt] → Backend prüft beim Löschen erneut und antwortet 409; Dialog zeigt die Meldung.
- [Fremde Pläne unsichtbar] → Dialog zeigt dann „und N weitere Pläne anderer Nutzer“.

## Migration Plan

Keine Schemaänderung. Command `cleanup_deleted_recipe_meal_items` zuerst als Dry-Run, Ergebnis prüfen, `--apply` nur nach Freigabe im Prod-Rollout (siehe gebündelter Rollout-Plan).

## Open Questions

Keine.
