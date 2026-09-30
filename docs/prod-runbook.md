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
- [x] Echtlauf: `uv run python manage.py migrate_buffet_roles` (nicht nötig: Trockenlauf zeigt 0 Änderungen, Migration war bereits gelaufen)
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

- [ ] Vor dem Deploy: `uv run python manage.py sqlmigrate planner 0008` gegen Prod-Stand prüfen
      (nur `ADD COLUMN … NULL` und `CREATE INDEX`)
- [ ] Deploy: Backend vor Frontend (neue optionale Felder und Parameter sind abwärtskompatibel)
- [ ] Nach dem Deploy, nur lesen: Einzelzutaten im Plan, die vor der Änderung mit der Einheit „Gramm“
      und sehr kleiner Menge gespeichert wurden (wirkten wie „1 g Toastbrot“ statt „1 Scheibe“).
      Ausgabe Robert zeigen; Korrektur nur nach seinem OK und von Hand im Plan:

      ```python
      from planner.models import MealItem
      MealItem.objects.filter(
          ingredient__isnull=False, portion__isnull=True,
          measuring_unit__name__iexact="Gramm", quantity__lte=5,
      ).values_list("id", "meal__meal_plan_id", "ingredient__name", "quantity")
      ```
- [ ] Stichprobe: Einkaufsliste eines Plans mit Honig zeigt dieselbe Menge (ml) wie der Einkaufen-Tab;
      bestehende, schon erzeugte Listen werden beim Lesen korrekt umgerechnet (keine Datenkorrektur nötig)
- [ ] Stichprobe: Rezeptliste „Zufällig“ und „Meiste Likes“ durchblättern (keine doppelten oder
      fehlenden Rezepte), Einkaufslisten-Übersicht „Neueste“ zeigt die zuletzt erzeugte Liste oben

## Rollback

- Planner-Constraints: Reverse-Migration entfernt die Constraints; die entfernten Datumswerte
  von Referenzmahlzeiten werden nicht wiederhergestellt (fachlich bedeutungslos).
- `planner.0008_mealitem_portion`: Reverse-Migration entfernt nur die Spalte `portion_id`; Einträge behalten
  Menge und Einheit (Bedeutung dann wieder wie vor der Änderung).
- Packungsvorschläge: übernommene Packungen sind normale `Package`-Zeilen und lassen sich in der
  Zutatenpflege löschen; Vorschläge selbst ändern keine Daten.
- Im Zweifel: DB-Snapshot aus Schritt 0 zurückspielen.
