## Context

Die Rezept-Detailseite aggregiert Preise, Energie und Nährwerte über alle `RecipeItem`-Einträge eines Rezepts. Dabei werden auch Austausch-Alternativen (`exchange_position > 0`) mitgezählt, obwohl sie keine zusätzlichen Lebensmittel sind — sie ersetzen die primäre Zutat (`exchange_position = 0`). Das führt zu aufgeblähten Gesamtwerten (z.B. 2674 kcal statt realistischen ~1300 kcal).

Drei Funktionen im Backend sind betroffen:

| Funktion | Datei | Zeile | Nutzung |
|----------|-------|-------|---------|
| `get_recipe_nutrition_breakdown` | `recipe/api/nutrition.py` | 103 | Nutrition-API-Endpunkt |
| `get_recipe_nutritional_values` | `recipe/services/recipe_checks.py` | 43 | Nährwert-Cache-Berechnung |
| `recalculate_recipe_cache` | `recipe/services/recipe_checks.py` | 376 | Preis-Cache-Berechnung |

Die Delta-Logik im `variant_service.py` (für MealPlan-Varianten) geht implizit davon aus, dass der Cache nur die "Default"-Items enthält (`exchange_position=0` + alle Optionalen + alle Normalen). Da der Cache aktuell aber **alle** Items summiert (inkl. Alternativen), stimmt auch die Varianten-Kalkulation nicht — Alternativen werden doppelt gezählt. Die Cache-Korrektur behebt beide Probleme gleichzeitig.

## Goals / Non-Goals

**Goals:**
- Nutrition-API rendert korrekte Gesamtwerte (ohne Austausch-Alternativen)
- Rezept-Cache (`cached_price_total`, `cached_energy_total_kcal`) enthält nur Default-Items
- Varianten-Kalkulation (`compute_variant_cost`/`compute_variant_energy`) wird durch Cache-Korrektur automatisch korrekt
- Optionale Zutaten werden immer inkludiert

**Non-Goals:**
- Keine Schema-Änderungen (Pydantic/Zod bleiben identisch)
- Keine neuen API-Endpunkte
- Keine Datenbank-Migrationen
- Keine Frontend-Änderungen
- Keine Änderung an Shopping-List-Service (arbeitet über `active_ids`)

## Decisions

### Entscheidung 1: Query-Filter statt Python-Filter

`.exclude()` im Query ist effizienter als `continue` in der Loop, weil weniger Objekte vom ORM geladen werden.

```python
# Neu
RecipeItem.objects.filter(recipe=recipe).exclude(
    exchange_group__isnull=False, exchange_position__gt=0
)

# Gleichbedeutend, aber lesbarer mit Q:
from django.db.models import Q

RecipeItem.objects.filter(
    recipe=recipe,
).exclude(
    Q(exchange_group__isnull=False) & Q(exchange_position__gt=0)
)
```

### Entscheidung 2: Kein Helfer/Service — minimaler, lokaler Fix

Da die Filter-Logik nur 3 Stellen betrifft und die Bedingung trivial ist (`exchange_group IS NOT NULL AND exchange_position > 0` → ausschließen), wird kein gemeinsamer Helfer eingeführt. Der `.exclude()`-Aufruf ist selbsterklärend genug.

Falls dieselbe Logik an weiteren Stellen benötigt wird, kann später ein `RecipeItem.objects.for_aggregation(recipe)` QuerySet-Extraktor gebaut werden.

### Entscheidung 3: Varianten-Delta bleibt unverändert

`_compute_delta` in `variant_service.py` wurde bereits korrekt implementiert:
- Default (für Exchange-Gruppen): `exchange_position=0` Member
- Active: Member aus `active_ids`
- Delta = Active − Default

Nach der Cache-Korrektur (Cache = Default-Set) funktioniert die Formel `base + delta` korrekt, ohne dass Code geändert werden muss.

```
Cache-Korrektur macht Delta-Logik automatisch korrekt:

    Vorher:  Cache = [A0, A1, A2] + [normals] + [optionals]
             Delta = selected - A0
             Result = [A0, A1, A2] + [normals] + [optionals] + selected - A0
                    = selected + [A1, A2] + [normals] + [optionals]  ← FEHLER: A1, A2 bleiben

    Nachher: Cache = [A0] + [normals] + [optionals]  ← nur Default
             Delta = selected - A0
             Result = [A0] + [normals] + [optionals] + selected - A0
                    = selected + [normals] + [optionals]  ← KORREKT
```

### Entscheidung 4: Direkter `.exclude()` statt Manager/QuerySet-Methode

Es wird kein benutzerdefinierter Model-Manager oder eine QuerySet-Methode eingeführt. Der `.exclude()` ist an den drei Stellen direkt im Code lesbar. Das hält den Fix minimal und vermeidet Abstraktion, die nur 3× verwendet wird.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Cache-Korrektur ändert `cached_price_total` für alle Rezepte mit Austausch-Alternativen | Das ist beabsichtigt — die alten Werte waren falsch. Alle Rezepte werden beim nächsten Signal (oder manuellem `recalculate_all`) korrigiert. |
| `cached_energy_total_kcal` sinkt, was Normportion-Warnung beeinflusst | Auch das ist beabsichtigt — die Warnung war wegen Doppelzählung zu hoch. |
| Bestehende MealPlans mit aktiven Varianten zeigen andere Preise | Nach Cache-Neuberechnung + API-Neuberechnung stimmen die Preise. War vorher falsch. |
