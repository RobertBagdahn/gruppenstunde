# Prod-Runbook (gesammelt)

Sammelt alle Prod-Schritte, die bei abgeschlossenen OpenSpec-Changes bewusst auf einen
gemeinsamen Termin verschoben wurden (Entscheidung 26.09.2026). **Jeder Schritt auf Prod
braucht Roberts Freigabe.** Trockenläufe zeigen, Ausgabe prüfen, erst dann Echtläufe.

Management-Befehle auf Prod laufen als Cloud Run Job (Muster:
`gcloud run jobs execute <job> --region europe-west1 --wait`) oder lokal vom jeweiligen
Branch gegen die Prod-Datenbank über den Cloud SQL Auth Proxy. Beim Deploy führt Cloud Build
`manage.py migrate --noinput` automatisch aus (`cloudbuild.yaml`).

## 0. Vorbereitung

- [x] DB-Snapshot der Prod-Datenbank anlegen und Namen hier notieren: Backup `1790661019101` (`inspi-db-west1`, 29.09.2026)
- [x] Freigabe durch Robert für diesen Termin (29.09.2026, Abschnitte 1–4)

## 1. meal-plan-integrity-and-number-formatting — vor dem Deploy

Die Planner-Migration setzt Referenzmahlzeiten auf datumslos und legt zwei Constraints an.
Sie bricht ab, wenn es doppelte reguläre Mahlzeiten (Plan, Tag, Typ) gibt — Cloud Build
stoppt dann vor dem Rollout. Deshalb vorher prüfen:

- [x] Vom Branch aus gegen Prod (nur Bericht, ändert nichts):
      `uv run python manage.py check_meal_integrity`
- [x] Ausgabe prüfen (Prod 29.09.2026: 0 Dubletten, 0 Referenzmahlzeiten mit Datum, 0 außerhalb, 0 ohne Menge):
  - „Doppelte reguläre Mahlzeiten“ **muss 0 sein** — sonst die gelisteten Mahlzeiten vorher
    mit den Verantwortlichen klären und zusammenführen/löschen.
  - „Referenz-Mahlzeiten mit Datum“: werden von der Migration verlustfrei datumslos gesetzt.
  - „Mahlzeiten außerhalb des Planzeitraums“ und „Zutaten-Einträge ohne Menge“: bleiben
    erhalten und erscheinen danach im Plan-Check (keine Aktion vor dem Deploy nötig).

Lokaler Referenzlauf (28.09.2026): 0 Dubletten, 0 Referenzmahlzeiten mit Datum,
1 Mahlzeit außerhalb des Zeitraums (#168), 1 Eintrag ohne Menge (#149).

## 2. Deploy

- [x] Deploy (29.09.2026, Commit `84230790`, manuell: Images per `gcloud builds submit` in europe-west1, `inspi-backend-00070-8kb`, Job `inspi-migrate`, `inspi-frontend-food-00064-jdz`; Rollback-Revisionen `inspi-backend-00069-x8w`, `inspi-frontend-food-00063-qr8`). Hinweis: Der Trigger `GruppenstundeDeployMain` scheitert seit 27.09. beim Image-Push und deployt nicht. Migrationen:
  - `planner` (Referenzmahlzeiten datumslos, Constraints `meal_reference_without_datetime`,
    `unique_regular_meal_per_day_and_type`)
  - `supply.0020_viscosity_liquid_and_source`, `supply.0021_ingredient_package_suggestion`
  - Migrationen aus `ingredient-status-visibility-unification`
- [x] Nach dem Deploy erneut `check_meal_integrity` (alles 0, keine offenen Migrationen)

## 3. ingredient-status-visibility-unification — nach dem Deploy

- [x] Trockenlauf: `uv run python manage.py verify_ingredients_in_approved_recipes`
      (optional `--csv <datei>` für die Lückenliste) — Ausgabe Robert zeigen
      (29.09.2026: nur noch 1 Zutat offen, „Tomate“ #7586, Daten vollständig)
- [x] Erst nach OK: `uv run python manage.py verify_ingredients_in_approved_recipes --apply`
      (29.09.2026: 1 verifiziert, danach 0 offen)
- [x] Stichprobe: „Tomate“ #7586 hat Status `verified`

## 4. buffet-module — nach dem Deploy

- [x] `uv run python manage.py seed_buffet_templates` (nicht nötig: Vorlagen `breakfast`, `baguettes`, `supper` existieren auf Prod bereits)
- [x] Trockenlauf: `uv run python manage.py migrate_buffet_roles --dry-run` — „manuell prüfen“-Liste
      muss leer sein (Prod 29.09.2026: 0 Änderungen, „manuell prüfen“ leer nach Verifizierung der Tomate)
- [x] Echtlauf nur mit ausdrücklichem `--apply`: `uv run python manage.py migrate_buffet_roles --apply` (nicht nötig: Trockenlauf zeigte 0 Änderungen, Migration war bereits gelaufen; ohne `--apply` ist der Command schreibfrei)
- [ ] Optional von Hand: alte Rollen-Tags an drei Einträgen umstellen — breakfast-base an „Erdnussmus fein“ (#663),
      breakfast-topping an „Edamer“ (#7616), breakfast-drink an Rezept „Tschai einfach/günstig“ (#155).
      8 übersprungene Fälle betreffen gelöschte/zusammengeführte Einträge (kein Handlungsbedarf).
- [ ] Peter bitten, die Baguette-Planung für den Bundesrat mit der Vorlage „Belegte Baguettes“
      zu testen

## 5. meal-plan-integrity-and-number-formatting — Packungsvorschläge (nach dem Deploy)

Erst nach dem Deploy, im Datencockpit, Tab **„Packungen“** (nur Staff):

- [ ] Kostenanzeige prüfen (Anzahl Zutaten ohne Standardpackung, KI-Aufrufe, geschätzte Kosten;
      15 Zutaten je Aufruf)
- [ ] „Packungen vorschlagen“ starten; der Lauf speichert nur Vorschläge, ändert nichts
- [ ] Vorschläge sichten (Filter Konfidenz/Warengruppe), unplausible bearbeiten oder verwerfen
- [ ] „Alle mit Konfidenz ≥ 80 % übernehmen“ bzw. einzeln freigeben — legt `Package(rank=1)` an und
      setzt Aggregatzustand/Dichte nur, wo sie nicht manuell gepflegt sind
- [ ] Stichprobe: Einkaufsliste eines Plans zeigt „… · 2 × 500-g-Packung“ und Flüssigkeiten in Litern

Datenhinweise aus der lokalen Prüfung (vor der Freigabe ansehen):
- Einige Zutaten sind als flüssig gepflegt, obwohl sie nach Gewicht gekauft werden
  (z. B. Blütenhonig → erscheint in Litern). Aggregatzustand korrigieren.
- Portionsnamen wie „100 ml“ ergeben unschöne Stückangaben („≈ 36,5 100 ml“).

## 6. food-audit-bugfixes — vor und nach dem Deploy

Enthält die Migration `planner.0008_mealitem_portion` (nullable Spalte `portion_id`, kein Backfill).
Cloud Build führt sie beim Deploy automatisch aus; sie ist rein additiv und sperrt nichts.

- [x] Vor dem Deploy: `uv run python manage.py sqlmigrate planner 0008` geprüft
      (nur `ADD COLUMN … NULL` und `CREATE INDEX`)
- [x] Deploy: 2026-10-01, Commit `70409580`; Backend `inspi-backend-00072-zmg`, Migration-Job
      `inspi-migrate-bbw22`, Food-Frontend `inspi-frontend-food-00066-w2m`.
      Das Haupt-Frontend (`inspi-frontend-00015-f96`) wurde ebenfalls aktualisiert.
- [ ] Nach dem Deploy, nur lesen: Einzelzutaten im Plan, die vor der Änderung mit der Einheit „Gramm"
      und sehr kleiner Menge gespeichert wurden (wirkten wie „1 g Toastbrot“ statt „1 Scheibe“).
      Ausgabe Robert zeigen; Korrektur nur nach seinem OK und von Hand im Plan:

      ```python
      from planner.models import MealItem
      MealItem.objects.filter(
          ingredient__isnull=False, portion__isnull=True,
          measuring_unit__name__iexact="Gramm", quantity__lte=5,
      ).values_list("id", "meal__meal_plan_id", "ingredient__name", "quantity")
      ```
- [x] Stichprobe: Produktions-Endpunkte Backend, Haupt- und Food-Frontend antworten mit HTTP 200.
- [ ] Stichprobe: Einkaufsliste eines Plans mit Honig zeigt dieselbe Menge (ml) wie der Einkaufen-Tab;
      bestehende, schon erzeugte Listen werden beim Lesen korrekt umgerechnet (keine Datenkorrektur nötig)
- [ ] Stichprobe: Rezeptliste „Zufällig“ und „Meiste Likes“ durchblättern (keine doppelten oder
      fehlenden Rezepte), Einkaufslisten-Übersicht „Neueste“ zeigt die zuletzt erzeugte Liste oben

## 7. buffet-free-selection — deployed

Die Bestandsaufnahme `docs/buffet-expansion-strategy.md` ist auf den 03.10.2026 datiert und
liegt damit nach dem im Runbook dokumentierten Systemdatum 01.10.2026. Dubletten-Kandidaten
außerhalb der freigegebenen Mapping-Tabelle bleiben ungeprüfte Vorschläge und werden nicht
automatisch zusammengeführt. Als Wiederherstellungspunkt lag der Prod-Snapshot
`1791007426360` vor.

### Preflight

Für Commit `c2076fdb` wurde ein Prod-Preflight in einer äußeren Rollback-Transaktion ausgeführt;
keine der simulierten Änderungen wurde persistiert.

- 0/10 neue Buffet-Rollen waren vorhanden; Migration simulierte 10 Anlegungen.
- `migrate_buffet_roles --dry-run`: 0 geplante Änderungen, keine manuelle Prüfliste. 8 veraltete
  Mapping-Zeilen wurden übersprungen: Ziele 6925 (Zutat 7041 „Tomate frisch“) und 153 (Rezepte
  155/215 „Tschai einfach/günstig“) fehlen; Quelle 191 „Glas Apfelsaft“ ist gelöscht und nicht mit
  183 verknüpft; Quellen 7341 „Edamer“, 6925 „Tomaten“, 58 „frische Banane“ und Rezept 153
  „Tschai einfach/günstig“ sind gelöscht.
- Drei alte Frühstücks-Tag-Träger bleiben unverändert: `breakfast-base` auf Zutat 663
  „Erdnussmus fein“, `breakfast-topping` auf Zutat 7616 „Edamer“ und `breakfast-drink` auf Rezept
  155 „Tschai einfach/günstig“.
- `seed_buffet_templates --dry-run`: 18 neue Vorlagen, 3 vorhandene, 0 fehlende Abhängigkeiten.

### Deployment und Seed

- Merge/Push auf `main`: Commit `b1e2ab54` (`docs(prod): record buffet deployment`); Feature-Commit `c2076fdb`, Preflight-Dokumentation `287fb870`.
- Backend: `inspi-backend-00075-t7w`; Migration-Job `inspi-migrate-f8wt5` erfolgreich.
- Food-Frontend: `inspi-frontend-food-00070-qwv`.
- Template-Seed mit `--apply`: 18 Vorlagen angelegt, 3 vorhandene beibehalten; anschließend 21 Standardvorlagen samt Rollen verifiziert.
- Smoke-Checks: Backend-API-Doku, Food-Frontend und Buffet-Suche antworteten mit HTTP 200. `/api/meal-plans/buffet-templates/?meal_type=drinks` liefert `drinks-bar` und `free`; `template=free` liefert 19 Rollen einschließlich `buffet-drink`; eine anonyme Anfrage an den staff-only Datenqualitätsbericht wird mit HTTP 401 abgewiesen.

`migrate_buffet_roles --apply` wurde **nicht** ausgeführt: Der Dry-Run zeigte 0 geplante Änderungen und 8 übersprungene veraltete Zeilen. Diese Einträge sowie die weiteren Dubletten-Kandidaten bleiben ungeändert und benötigen eine aktualisierte Zuordnung sowie einen neuen Dry-Run vor einem separaten Mapping-Apply. Die Proposal-UI führt selbst keine Katalogänderungen aus.

## Rollback

- Planner-Constraints: Reverse-Migration entfernt die Constraints; die entfernten Datumswerte
  von Referenzmahlzeiten werden nicht wiederhergestellt (fachlich bedeutungslos).
- `planner.0008_mealitem_portion`: Reverse-Migration entfernt nur die Spalte `portion_id`; Einträge behalten
  Menge und Einheit (Bedeutung dann wieder wie vor der Änderung).
- Packungsvorschläge: übernommene Packungen sind normale `Package`-Zeilen und lassen sich in der
  Zutatenpflege löschen; Vorschläge selbst ändern keine Daten.
- Im Zweifel: DB-Snapshot aus Schritt 0 zurückspielen.
