## Context

Produktion läuft auf einer `db-f1-micro` Cloud-SQL-Instanz (max. ~25 Verbindungen, `CONN_MAX_AGE=60` in `inspi/settings/production.py`, kein PgBouncer/Connection-Pooler). Vier Stellen im Backend starten bei Model-Saves einen Fire-and-Forget-`threading.Thread(daemon=True)` innerhalb von `transaction.on_commit(...)`:

- `supply/signals.py::update_ingredient_embedding_and_score` (Ingredient post_save)
- `recipe/signals.py::update_recipe_embedding` (Recipe post_save)
- `recipe/signals.py::invalidate_recipe_embedding_on_item_change` (RecipeItem post_save/post_delete)
- `recipe/signals.py::update_type_stats_on_recipe_change` (Recipe post_save/post_delete)

Jeder dieser Threads führt eigene ORM-Queries aus (`instance.save()`, `RecipeModel.objects.get(...)`, `recalculate_type_stats(...)`) und öffnet dabei implizit eine neue DB-Connection über Djangos Thread-lokale Connection-Verwaltung. Da `CONN_MAX_AGE=60` gilt, hält jeder Thread seine Connection bis zu 60s offen — unabhängig davon, wie schnell die eigentliche Arbeit erledigt ist. Bei Bulk-Operationen (z.B. AI-Suggest "Alle übernehmen" über mehrere Ingredients) entstehen so kurzfristig deutlich mehr offene Connections als der Worker-Pool allein bräuchte, was den knappen 25-Connection-Slot der `f1-micro`-Instanz überläuft.

Separat dazu: `supply/api/ingredients.py::create_alias` prüft Namens-Duplikate (`filter(...).exists()`) **außerhalb** der `atomic()`/`select_for_update()`-Transaktion, in der der eigentliche Rank berechnet und der Alias gespeichert wird. Es existiert nur ein globaler `UniqueConstraint(Lower("name"), condition=Q(is_generic=False))` — kein Constraint für "gleicher Name, gleiche Zutat", weshalb parallele Requests für dieselbe Zutat unbemerkt Duplikate erzeugen können (kein `IntegrityError`, also kein Trigger für den bestehenden Retry-Mechanismus).

## Goals / Non-Goals

**Goals:**
- Verhindern, dass Background-Threads DB-Connections länger offen halten als für ihre eigentliche Arbeit nötig.
- Einen einzigen, wiederverwendbaren Mechanismus für alle vier Fire-and-Forget-Stellen schaffen, statt vier separate Fixes.
- Die Alias-Race-Condition strukturell schließen: Checks innerhalb der Lock-Transaktion, zusätzlich abgesichert durch einen echten DB-Constraint pro Zutat.
- Bestehende Produktionsdaten vor der Migration bereinigen (Duplikate identifizieren/mergen), damit der neue Constraint überhaupt angewendet werden kann.

**Non-Goals:**
- Kein Wechsel von `threading.Thread` auf eine echte Job-Queue (Celery/RQ/Cloud Tasks) — das bleibt eine mögliche spätere Verbesserung, ist aber nicht Teil dieses Fixes.
- Kein Cloud-SQL-Instanz-Upgrade (`db-f1-micro` bleibt, Fix ist rein code-seitig).
- Keine Änderung an der fachlichen Logik der Embedding-/Quality-Score-/Type-Stats-Berechnung selbst.
- Keine Einführung von Connection-Pooling-Infrastruktur (PgBouncer, Cloud SQL Connector) — das würde das Grundproblem zwar auch lösen, ist aber Infra-Scope und wurde bewusst für später zurückgestellt.

## Decisions

### 1. Zentraler `run_in_background()`-Helper statt vier Einzel-Fixes
Neue Funktion in `core/services/background.py`:

```python
def run_in_background(fn: Callable[[], None]) -> None:
    """Run fn in a daemon thread with its own short-lived DB connection.

    Closes the connection explicitly when fn returns (or raises), instead of
    relying on CONN_MAX_AGE to eventually reclaim it. Must be called from
    within transaction.on_commit(...) if the callback reads data written by
    the just-committed transaction.
    """
    def _wrapper():
        try:
            fn()
        except Exception:
            logging.getLogger(__name__).warning("Background task failed", exc_info=True)
        finally:
            connection.close()

    threading.Thread(target=_wrapper, daemon=True).start()
```

Alle vier bestehenden Stellen rufen `transaction.on_commit(lambda: run_in_background(_do_update))` statt `transaction.on_commit(lambda: threading.Thread(target=_do_update, daemon=True).start())` auf. Die fachliche `_do_update`-Logik selbst bleibt unverändert — nur der Start- und Aufräum-Mechanismus wird zentralisiert.
- **Alternative erwogen**: Jede der vier Stellen individuell mit eigenem `try/finally: connection.close()` patchen. Verworfen, da es die Duplikation (vier fast identische Blöcke) zementiert hätte, statt sie zu beheben, und zukünftige neue Fire-and-Forget-Stellen denselben Fehler wiederholen könnten.

### 2. `connection.close()` statt separatem DB-Alias mit `CONN_MAX_AGE=0`
Ein zweites, nur für Background-Threads genutztes `DATABASES`-Alias mit `CONN_MAX_AGE=0` wurde erwogen, aber verworfen: Es hätte in `DATABASE_ROUTERS` oder manuellem `using(...)` an jeder Signal-Stelle nachgezogen werden müssen und wäre fehleranfälliger (leicht vergessen bei neuen Signal-Handlern) als ein zentraler Helper, der die Connection nach Gebrauch aktiv schließt — unabhängig vom global konfigurierten `CONN_MAX_AGE`.

### 3. Alias-Fix: Checks in die Transaktion verschieben + echter Per-Zutat-Constraint
`create_alias()` wird so umgebaut, dass die Duplikat-Prüfungen (Name pro Zutat) **innerhalb** des bestehenden `with transaction.atomic(): ... select_for_update()`-Blocks laufen, direkt vor dem `alias.save()`. Zusätzlich wird ein neuer `UniqueConstraint(Lower("name"), ingredient)` auf `IngredientAlias` eingeführt (siehe Spec `ingredient-generic-aliases`), der als letzte Verteidigungslinie greift, falls die Applikationslogik durch einen Bug oder einen zweiten Code-Pfad umgangen wird. Der bestehende `except IntegrityError`-Retry-Block wird erweitert, um auch diesen neuen Constraint-Namen zu erkennen und in eine 409-Antwort zu übersetzen.
- **Alternative erwogen**: Nur auf `get_or_create()` mit `IntegrityError`-Handling setzen, ohne die expliziten Checks vorher. Verworfen, da die aktuellen Checks bereits differenzierte Fehlermeldungen liefern (unterschiedlich für "gleiche Zutat" vs. "andere Zutat, nicht generisch") und dieses Verhalten erhalten bleiben soll.

### 4. Daten-Cleanup vor Migration
Da der neue `UniqueConstraint` in Produktionsdaten (laut Report: Duplikate bereits beobachtet) fehlschlagen kann, wird vor der Migration ein einmaliges Management-Command (`supply/management/commands/dedupe_ingredient_aliases.py`) ausgeführt, das bestehende Duplikate (gleiche Zutat, gleicher Name case-insensitive) identifiziert und den jüngeren Eintrag löscht (der ältere/erste bleibt als kanonischer Alias erhalten). Das Command läuft mit `--dry-run`-Option zur Vorab-Kontrolle.

### 5. `rank`-Default entfernen
`AliasCreateIn.rank: int | None = None` (statt `= 1`) im Pydantic-Schema; `create_alias()` berechnet den Rank immer serverseitig aus den bestehenden Rängen, wenn kein expliziter Wert übergeben wurde. Das entfernte harte Default `1` verhinderte bisher, dass die erste Retry-Iteration den unnötigen Write+Rollback überspringt.

## Risks / Trade-offs

- **[Risk]** `connection.close()` am Thread-Ende schließt auch dann, wenn der Thread von einer noch laufenden verschachtelten Operation genutzt wird → **Mitigation**: `run_in_background()` kapselt die gesamte Thread-Laufzeit in `_wrapper()`; es gibt keine verschachtelten Background-Threads in den vier betroffenen Stellen (verifiziert durch Code-Review).
- **[Risk]** Daten-Cleanup-Command löscht möglicherweise einen Alias, der referenziert wird (z.B. in Such-Historie oder Import-Konkretisierung, falls dort per Alias-ID statt Name referenziert wird) → **Mitigation**: Vor dem produktiven Lauf wird geprüft, ob `IngredientAlias` per Foreign Key von anderen Modellen referenziert wird; falls ja, Merge-Strategie statt reinem Löschen.
- **[Trade-off]** Der neue Per-Zutat-Constraint löst das Grundproblem der Connection-Erschöpfung nicht — das bleibt bewusst außerhalb des Scopes (siehe Non-Goals); dieser Change behebt nur das akute Production-Incident-Muster, nicht die grundsätzliche Fire-and-Forget-Architektur.
- **[Risk]** Falls weitere Background-Thread-Stellen im Code existieren, die hier nicht erfasst wurden, bleibt das Connection-Problem dort bestehen → **Mitigation**: Vor Task-Abschluss wird repo-weit nach `threading.Thread(target=` gesucht, um sicherzustellen, dass alle vier bekannten Stellen (und keine weiteren) erfasst sind.

## Migration Plan

1. `core/services/background.py::run_in_background()` implementieren.
2. Alle vier Signal-Stellen (`supply/signals.py`, `recipe/signals.py` x3) auf den neuen Helper umstellen.
3. Concurrency-Tests für den Helper schreiben (Connection wird nach Thread-Ende nicht mehr offengehalten).
4. `dedupe_ingredient_aliases`-Management-Command implementieren, lokal gegen eine Kopie der Produktionsdaten (oder Staging) mit `--dry-run` prüfen.
5. Duplikate in Produktion bereinigen (Command ohne `--dry-run` ausführen).
6. Migration für `UniqueConstraint(Lower("name"), ingredient)` erstellen und anwenden.
7. `create_alias()` umbauen: Checks in die Transaktion verschieben, `IntegrityError`-Handling um neuen Constraint-Namen erweitern.
8. `AliasCreateIn.rank`-Default entfernen, Frontend-Zod-Schema synchron halten.
9. Concurrency-Test für die Alias-Race-Condition (paralleles Anlegen desselben Namens für dieselbe Zutat) schreiben.
10. Deploy nach Review.

Kein Rollback-Pfad für die Migration vorgesehen (Constraint kann bei Bedarf per Folge-Migration wieder entfernt werden, falls unerwartete Probleme auftreten); der `run_in_background()`-Helper ist rückwärtskompatibel und risikoarm rückgängig zu machen (einfacher Code-Revert).

## Open Questions

- Wird `IngredientAlias` von einem anderen Modell per Foreign Key referenziert (relevant für die Cleanup-Strategie in Schritt 4/5)? Muss vor der Implementierung verifiziert werden.
