# Prod-Runbook (gesammelt)

Sammelt alle Prod-Schritte, die bei abgeschlossenen OpenSpec-Changes bewusst auf einen
gemeinsamen Termin verschoben wurden (Entscheidung 26.09.2026). **Jeder Schritt auf Prod
braucht Roberts Freigabe.** Trockenläufe zeigen, Ausgabe prüfen, erst dann Echtläufe.

Management-Befehle auf Prod laufen als Cloud Run Job (Muster:
`gcloud run jobs execute <job> --region europe-west1 --wait`) oder lokal vom jeweiligen
Branch gegen die Prod-Datenbank über den Cloud SQL Auth Proxy.
Die einzige Prod-Pipeline ist der GitHub-Workflow `.github/workflows/deploy.yml`: Jeder Merge nach
`main` durchläuft zuerst die Release-Checks (Backend, Haupt-Frontend, Food-Frontend, gemockte
Food-E2E-Tests) und wird erst danach gebaut und deployt (Build, Deploy, `inspi-migrate`-Job mit
`manage.py migrate --noinput`, Smoke-Checks); einmalige Einrichtung: `scripts/setup-github-deploy.sh`.
Tofu, `add_users` und `seed_all` bleiben manuell.

## 0. Vorbereitung

- [x] DB-Snapshot der Prod-Datenbank anlegen und Namen hier notieren: Backup `1790661019101` (`inspi-db-west1`, 29.09.2026)
- [x] Freigabe durch Robert für diesen Termin (29.09.2026, Abschnitte 1–4)

## 1. meal-plan-integrity-and-number-formatting — vor dem Deploy

Die Planner-Migration setzt Referenzmahlzeiten auf datumslos und legt zwei Constraints an.
Sie bricht ab, wenn es doppelte reguläre Mahlzeiten (Plan, Tag, Typ) gibt — der
Migrations-Job im Deploy-Workflow schlägt dann fehl. Deshalb vorher prüfen:

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
Der Deploy-Workflow führt sie automatisch aus; sie ist rein additiv und sperrt nichts.

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

- Merge/Push auf `main`: Commit `c82f9503` (`docs(prod): record buffet smoke checks`); Feature-Commit `c2076fdb`, Preflight-Dokumentation `287fb870`, Deployment-Dokumentation `b1e2ab54`.
- Backend: `inspi-backend-00075-t7w`; Migration-Job `inspi-migrate-f8wt5` erfolgreich.
- Food-Frontend: `inspi-frontend-food-00070-qwv`.
- Template-Seed mit `--apply`: 18 Vorlagen angelegt, 3 vorhandene beibehalten; anschließend 21 Standardvorlagen samt Rollen verifiziert.
- Smoke-Checks: Backend-API-Doku, Food-Frontend und Buffet-Suche antworteten mit HTTP 200. `/api/meal-plans/buffet-templates/?meal_type=drinks` liefert `drinks-bar` und `free`; `template=free` liefert 19 Rollen einschließlich `buffet-drink`; eine anonyme Anfrage an den staff-only Datenqualitätsbericht wird mit HTTP 401 abgewiesen.

Die screenshot-bezogenen Favoriten wurden nach einem separaten Prod-Dry-Run mit
`migrate_buffet_roles --apply --mapping-file supply/data/buffet_role_additions_snack_catalog.json`
angewendet: `add: 38`, `übersprungen: 0`; es wurden keine Zutaten/Rezepte erstellt und keine
Dubletten zusammengeführt. Die Zuordnung umfasst Knabbereien (8), Käse (11), Dips (8), Nüsse &
Trockenobst (9) sowie klassische Soßen/Würze (2); Ketchup und Mayonnaise waren bereits als
`buffet-condiment` getaggt. Die angewendete Datei ist im Repository versioniert.

Der **Default-Mapping-Apply** wurde nicht ausgeführt: dessen Dry-Run zeigte 0 geplante Änderungen
und 8 veraltete, übersprungene Zeilen. Diese Fälle und die weiteren Dubletten-Kandidaten bleiben
ungeändert und benötigen eine aktualisierte Zuordnung sowie einen neuen Dry-Run vor einem
separaten Apply. Drei alte Frühstücks-Tags bleiben ebenfalls auf den oben genannten Items.
Die Proposal-UI führt selbst keine Katalogänderungen aus.

## 8. food-frontend-bugs — Datenkorrekturen nach dem Deploy

Der Code-Fix enthält keine Migration. Die folgenden Befehle laufen erst nach dem Deploy, zuerst
als Dry-Run; `--apply` nur nach Roberts ausdrücklichem OK, jeweils mit DB-Snapshot aus Schritt 0.

- [ ] Warengruppen (Walnüsse unter „Fleisch“, Honig unter „Gewürze“ …):
      `uv run python manage.py reclassify_retail_sections` (Dry-Run, zeigt Übergänge), danach
      `fix_implausible_portions` (Dry-Run) für doppelte Warengruppen. Manuelle Zuordnungen bleiben unberührt.
- [ ] Absurde Einkaufsmengen („66 kg Haferflocken“, „1 g Würstchen“): Ursache sind Altdaten aus dem Import
      (Portionen mit 1 g, skalierte Rezeptmengen). Reihenfolge, jeweils Dry-Run zuerst:
      `replace_untrusted_piece_portions`, danach `fix_recipe_quantities`.
      Danach in den betroffenen Listen die neuen Mengen-Warnungen (Einkaufsliste öffnen) prüfen.
- [ ] Schwierigkeit und Dauer (206/211 „Einfach“): `enrich_recipe_metadata_rules --all --only-defaults --dry-run`
      (Regeln nutzen Zutaten + Arbeitsschritte; `--only-defaults` fasst nur Rezepte an, die noch auf
      „Einfach“ und „< 30 Min“ stehen). Ausgabe zeigen; die Schätzung ist grob, ohne `--dry-run` nur nach OK.
- [ ] Stichprobe: Plan „Sifü-Planungstreffen“ → Kosten & Budget: „Pro Person“ liegt bei rund Gesamtkosten / Personen.

## Rollback

- Planner-Constraints: Reverse-Migration entfernt die Constraints; die entfernten Datumswerte
  von Referenzmahlzeiten werden nicht wiederhergestellt (fachlich bedeutungslos).
- `planner.0008_mealitem_portion`: Reverse-Migration entfernt nur die Spalte `portion_id`; Einträge behalten
  Menge und Einheit (Bedeutung dann wieder wie vor der Änderung).
- Packungsvorschläge: übernommene Packungen sind normale `Package`-Zeilen und lassen sich in der
  Zutatenpflege löschen; Vorschläge selbst ändern keine Daten.
- Im Zweifel: DB-Snapshot aus Schritt 0 zurückspielen.

## 8. food-data-quality-fixes — nach dem Deploy

Command `fix_food_data_quality` (idempotent, Standard ist Dry-Run). Schritte: `water`, `duplicates`,
`prices`, `nutrition`, `publish`. Auswahl mit `--steps`. Schreibfreier Dry-Run gegen Prod am 03.10.2026
(Cloud SQL Proxy, nichts geändert):

- [x] `uv run python manage.py fix_food_data_quality` — Ausgabe Robert zeigen. Erwartung (03.10.2026):
  - Wasser ohne Preis: 4 (Gewürzgurkenwasser #7021, Gurkenwasser #6947, Heißes Wasser #6775, Nudelkochwasser #7178)
  - Duplikate: „Basilikum, trocken“ #6648 und „Getrockneter Basilikum“ #7265 → „Basilikum, getrocknet“ #6875
  - Preise: „Berglinsen (getrocknet)“ #7525 → 4,00 €/kg (wie die übrigen getrockneten Linsen)
  - Nährwerte: 22 Zutaten (Basilikum und Gemahlene Vanille mit Referenzwerten; sonst Kohlenhydrate ohne
    Ballaststoffe, wo Makrosumme > 100 g und die Energie zu den Netto-Kohlenhydraten passt)
  - Entwürfe in Rezepten: 45 System-Entwürfe, 43 freigabefähig; „Balsamico“ #7583 und
    „Kartoffelpüree-Pulver“ #4653 bleiben Entwurf (offene KI-Umbenennung, im Cockpit entscheiden)
- [x] Erst nach OK: `uv run python manage.py fix_food_data_quality --apply` (03.10.2026, Snapshot `1791047902632`, eine Transaktion; Zahlen wie erwartet)
- [x] Danach erneut ohne `--apply`: alle Zähler 0; es bleiben die 2 Entwürfe mit offener Umbenennung

Hinweis zum Audit: Die „Kalorien passen nicht zu den Makros“-Funde (z. B. Flohsamenschalen 186 kcal) entstehen,
wenn man nur 4/4/9 kcal/g rechnet. Ballaststoffe zählen mit 2 kcal/g; das Regelwerk
(`nutrition_plausibility.atwater_kcal`) tut das bereits, deshalb sind diese Werte korrekt und bleiben unverändert.

## 9. meal-suggestion-panel — Migration und Einzelzutaten-Backfill

Migration `planner.0012_mealplan_suggestion_context` (fünf optionale Kontextfelder am Essensplan, nur additive Spalten) lief mit dem Deploy vom 04.10.2026. Der Backfill setzt `is_standalone_food` für Obst, Gemüse, Wasser/Erfrischung und Milch/Pflanzendrinks (kuratierte Regeln in `supply/services/standalone_food.py`, nur verifizierte Zutaten).

- [x] Dry-run gegen Prod (04.10.2026, Cloud SQL Proxy, nichts geändert): `uv run python manage.py backfill_standalone_food` — 61 Zutaten (20 Obst, 26 Gemüse, 12 Milch/Pflanzendrinks, 3 Wasser)
- [x] Nach OK: `uv run python manage.py backfill_standalone_food --apply` (04.10.2026, Snapshot `1791106629796`); erneuter Dry-run: 0 offen
- [x] Abdeckungsbericht (nur lesend): `uv run python manage.py report_suggestion_coverage --output <datei>`; Stand 04.10.2026 siehe `openspec/changes/meal-suggestion-panel/coverage-prod-2026-10-04.md`
- Rollback: Die Spalten sind additiv und harmlos. Den Backfill macht `UPDATE supply_ingredient SET is_standalone_food = false` für die 61 betroffenen Zutaten (oder der Snapshot) rückgängig.

## 10. normalize-recipe-portions — Datenkorrektur 11.10.2026

- [x] Backup vorher: `1791730971806` (`inspi-db-west1`, 11.10.2026 15:02 UTC, „before normalize_recipe_servings 2026-10-11“)
- [x] Dry-Run auf Prod (`gcloud run jobs execute inspi-migrate --args=manage.py,normalize_recipe_servings`): 3 Rezepte mit `portions > 1`
- [x] Freigabe durch Robert, dann Echtlauf:
      `gcloud run jobs execute inspi-migrate --region europe-west1 --wait --args="^;^manage.py;normalize_recipe_servings;--ids;458,472,504;--apply"`
  - 458 Tortellini alla Panna → nur `portions=1` (keine Zutaten)
  - 472 Holländische Käsenudeln mit Gouda → nur `portions=1` (Mengen bereits pro Person)
  - 504 Herzhafte Linsensuppe → Gesamtmenge für 4, Mengen ÷ 4
- [x] Kontrolllauf: 0 aktive Rezepte mit `portions > 1`
- [x] Embedding für Rezept 504 gezielt neu erzeugt (Cloud Run Job `inspi-migrate`, `update_content_embedding(..., force=True)`, 768 Dimensionen; 11.10.2026)
- [x] Vor DB-Constraint erneut geprüft: 6 soft-gelöschte Rezepte (`469, 470, 471, 473, 474, 496`) standen weiter auf `portions=4`; frisches Backup `1791754370157` (`inspi-db-west1`, 11.10.2026 21:32 UTC)
- [x] Nach Freigabe soft-gelöschte Rezepte normalisiert (Cloud Run Job `inspi-migrate`, 11.10.2026): `469, 470, 473, 496` Gesamtmengen ÷ 4, `471, 474` bereits pro Person; `source_servings=4` für die vier geteilten Mengen
- [x] Kontrolllauf über `Recipe._base_manager`: 0 Zeilen mit `portions > 1`; alle sechs bleiben soft-gelöscht
- [ ] Folge-Change: DB-Constraint `portions = 1` und Entfernen der Divisionen durch `recipe.portions`

## 11. food-data-offensive — Ergebnis-Paket übertragen (offen)

Das Paket `data_offensive_package.json` liegt bewusst **nicht** im Repository: Es enthält die korrigierten
Zutatenfelder, Merges, Löschungen, archivierten Rezepte und Rezeptkategorien des Datenstands, auf dem die
Datenoffensive lief, und kann mehrere MB groß werden. Es wird für den Prod-Termin frisch erzeugt
(Tasks 4.3–4.5 in `openspec/changes/food-data-offensive/tasks.md`). Der Standardpfad
`backend/data/food/data_offensive_package.json` steht in `.gitignore`.

- [ ] Export auf dem Rechner mit der Datenbank, in der die Datenoffensive gelaufen ist (nur lesend):
      `uv run python manage.py food_offensive_export` (schreibt den Standardpfad; anderer Ort mit
      `--output <datei>`, Zeitraum für Merges/Löschungen/Archivierungen mit `--since YYYY-MM-DD`,
      Standard `2026-09-25`). Die Ausgabe nennt die Anzahl Zutaten, Merges, Löschungen, archivierten
      Rezepte und Rezeptkategorien — hier notieren.
- [ ] Ablage: Die Datei bleibt lokal beim Ausführenden. Muss sie weitergegeben oder aufbewahrt werden,
      dann nur in einem privaten Speicher (nicht im öffentlichen Medien-Bucket, nicht in Git); Dateiname
      mit Datum, z. B. `data_offensive_package-2026-10-11.json`.
- [ ] DB-Snapshot der Prod-Datenbank anlegen und Namen hier notieren.
- [ ] Prod-Migrationen sind eingespielt (`migrate`, legt den Warengruppen-Katalog v2 an).
- [ ] Dry-Run vom Branch gegen Prod über den Cloud SQL Auth Proxy (ändert nichts):
      `uv run python manage.py food_offensive_apply --input <datei>`; Zahlen mit dem Export vergleichen
      („nicht gefunden“ sollte 0 sein).
- [ ] Freigabe durch Robert, dann Echtlauf: `uv run python manage.py food_offensive_apply --input <datei> --apply`
      (idempotent, keine KI-Kosten; ein zweiter Dry-Run zeigt danach keine Änderungen mehr).
- [ ] Embeddings nachziehen: `uv run python manage.py food_data_offensive --apply --steps embeddings`
      (≈ 0,15 € für alle Zutaten).
- Rollback: DB-Snapshot.

## meal-plan-ingredient-quantities — Datenkorrektur Zwiebel/Eisbergsalat (12.10.2026)

Freigabe durch Robert am 12.10.2026. Snapshot vorher: Backup `1791780970242` (`inspi-db-west1`).
Ausgeführt lokal gegen Prod über den Cloud SQL Proxy, erst als Trockenlauf (Transaktion zurückgerollt), dann mit `APPLY=1`.

- [x] Rezeptmengen pro Person: #528 Sweet Onion Sauce Zwiebel 2 → 0,5; #523 BBQ Jackfruit Burger Zwiebel 1 → 0,25;
      #340 Caesar Diät Wrap Eisbergsalat 1 → 0,3 (45 g); #529 Baguette Teriyaki Eisbergsalat 0,5 → 0,2 (30 g)
- [x] Eisbergsalat (#30): neue Portion „Kopf“ 550 g (bestätigt, Rang 1); „1 Stück (150g)“ bleibt für bestehende Rezepte, Rang 3
- [x] Zutaten zusammengeführt (`merge_ingredient`): „Zwiebel“ (#7599) und „Speisezwiebel gelb“ (#7527) → „Speisezwiebel“ (#38);
      Normalportion von #38 jetzt „mittelgroße Zwiebel“ (80 g); falsche Aliase „Gemüsezwiebel(n)“ an #38 entfernt
- [x] 90 Rezept-Caches neu berechnet
- [x] Ergebnis Plan „Bundesrat 2026“ (#18): Zwiebeln 11,1 kg (zwei Zutaten) → 3,6 kg; Eisbergsalat 2,6 kg („17,5 Stück“) → 1,05 kg (≈ 1,9 Köpfe)

## recipe-materials-consumables — Material statt Equipment (offen)

Noch nichts auf Prod ausgeführt. Jeder Schritt nur nach Freigabe durch Robert; erst Trockenlauf, dann Echtlauf.

- [ ] DB-Snapshot der Prod-Datenbank anlegen und Namen hier notieren (Rollback nur per Snapshot, die Migration entfernt `Equipment`).
- [ ] Deploy mit den Migrationen `supply 0024–0026`, `recipe 0016` und `shopping 0004`: Schema-Felder, Equipment → Material
      (`is_consumable=false`, Rezeptzuordnung Menge 1), Textmengen der Rezept-Materialien → Zahl. Die Migration gibt
      Mengen ohne Zahl aus (auf 1 gesetzt) — Liste hier notieren und prüfen.
- [ ] Seed-Katalog: Trockenlauf `uv run python manage.py seed_materials`, nach Freigabe `--apply` (idempotent).
- [ ] Danach prüfen: Material-Seite, ein Rezept mit Gerät/Verbrauchsmaterial, Einkaufsliste mit Abschnitt „Verbrauchsmaterial“.

## recipe-quantity-outlier-checks — Statistik und täglicher Job (12.10.2026)

- [x] Tofu (gezielt, `-target`, Plan: 4 neu, 0 geändert, 0 gelöscht): `cloudscheduler.googleapis.com`,
      Service-Account `management-scheduler`, Rolle `run.jobsExecutorWithOverrides` auf Job `inspi-migrate`,
      Scheduler `ingredient-quantity-stats` (täglich 03:30 Europe/Berlin) ruft `inspi-migrate` mit
      `manage.py recalculate_ingredient_quantity_stats` auf. Der Job erhält bei jedem Deploy das aktuelle Image.
- [x] Nach Deploy (`f223e015`): erster Lauf `gcloud scheduler jobs run ingredient-quantity-stats --location europe-west1` → Ausführung `inspi-migrate-qbp2d`, „Mengenstatistik für 565 Zutaten berechnet.“
- [x] Bericht `check_recipe_quantities` auf Prod (READ-ONLY-Session, 12.10.2026): 10 auffällige Mengen, 1 ungeteilte Zeile (#530 Apfelringe), 46 unbestätigte 150-g-Stückportionen, 51 Alias-Konflikte
- [x] Korrekturliste `docs/korrekturliste-mengenpruefung-2026-10-12.md`, Gruppen A, B, C von Robert freigegeben (12.10.2026).
      Snapshot vorher: Backup `1791835375183`. Trockenlauf (zurückgerollt) und Echtlauf lokal gegen Prod über den Cloud SQL Proxy.
  - A: 6 Rezeptzeilen (#327, #99, #432, #530) korrigiert, #412 Torte alle 9 Zeilen ÷ 3 (jetzt 107 g, 518 kcal pro Stück); Caches neu berechnet
  - B: 5 Portionen bestätigt, 41 in „Portion (150 g)“ umbenannt und bestätigt, 16 neue Standardportionen (Stück/Stange/Knolle/Kopf/Schale);
    bei 5 Zutaten gab es die Stück-Portion schon (Ingwer 10 g, Möhre 100 g, Karotte 80 g, Aubergine 250 g, Gemüsezwiebel 150 g)
  - C: 41 Zutaten zusammengeführt (`merge_ingredient`), Alias „Rapsöl“ an Speiseöl vorab und 10 falsche Aliase danach entfernt
  - Statistik neu (545 Zutaten). Bericht danach: 3 auffällige Mengen (#394 und #387 bewusst unverändert, neu #385), 1 ungeteilte Zeile (#530 Äpfel, gewollt), 0 Stückportionen, 0 Alias-Konflikte
  - Kontrolle: keine aktiven Quell-Zutaten, keine Rezeptzeile auf gelöschter Zutat; Plan „Bundesrat 2026“ unverändert (Speisezwiebel 3,6 kg, Eisbergsalat 1,05 kg)
- [x] #385 Kartoffel-Limetten-Curry nach Freigabe: Gemüsebrühe-Konzentrat 15 TL (75 g) → 1 TL (5 g) pro Person (Snapshot `1791836328962`); jetzt 624 g / 634 kcal pro Person, keine Auffälligkeit mehr

## recipe-to-meal-plan, meal-plan-input-guardrails, shopping-list-source-freshness (14.10.2026)

Keine Schema-Migration in diesen Changes; die Migrationen von `recipe-materials-consumables` (siehe oben) sind separat.
Alle Schritte hier sind **lesend**; es gibt in diesen Changes kein `--apply`. Erst nach dem Deploy des Branches, damit die
Commands im Image vorhanden sind. Aufruf als Cloud Run Job:
`gcloud run jobs execute inspi-migrate --region europe-west1 --wait --args="manage.py,<command>"`.

- [ ] Dichte-Bericht (Haferdrink „1 Liter à 980 ml“): `report_volume_portion_density` listet Volumen-Portionen, deren
      `weight_g` um mehr als 1 % von Volumen × Dichte abweicht. Ausgabe prüfen; Korrekturen als A/B/C-Vorschläge an Peter,
      Änderungen nur nach Roberts Freigabe (Peters Plandaten nicht still ändern).
- [ ] Grenzwert-Bericht: `report_meal_plan_bounds` listet Pläne, Mahlzeiten und Einträge außerhalb der neuen Wertebereiche
      (Reserve 1,0–2,0, PAL 1,0–2,5, Tagesanteile 0–1 mit Summe ≤ 1,5, Normportionen ≤ 1000, Override 1–1000,
      Menge ≤ 100 000 g, Planlänge ≤ 60 Tage, ≤ 500 Mahlzeiten). Berechnungen begrenzen diese Werte zur Laufzeit; der
      Bericht ändert nichts. Auffälligkeiten an Robert melden, Korrektur nur nach Freigabe.
- [ ] Nach dem Deploy prüfen: Rezept → „Zum Essensplan“, Omnibar-Vorschau („Rezept ansehen“, Zutaten mit Mengen),
      Buffet-Suche „Zwiebel“ (Treffer mit Badge „Zutat zum Kochen“), Einkaufsliste mit Hinweis „Essensplan wurde seit
      Erstellung geändert“ nach einer Planänderung.
- Rollback: Code-Rollback über das vorherige Image; es gibt keine Datenänderung.
