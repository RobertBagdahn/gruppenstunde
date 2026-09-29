# Prod-Runbook (gesammelt)

Sammelt alle Prod-Schritte, die bei abgeschlossenen OpenSpec-Changes bewusst auf einen
gemeinsamen Termin verschoben wurden (Entscheidung 26.09.2026). **Jeder Schritt auf Prod
braucht Roberts Freigabe.** Trockenläufe zeigen, Ausgabe prüfen, erst dann Echtläufe.

Management-Befehle auf Prod laufen als Cloud Run Job (Muster:
`gcloud run jobs execute <job> --region europe-west1 --wait`) oder lokal vom jeweiligen
Branch gegen die Prod-Datenbank über den Cloud SQL Auth Proxy. Beim Deploy führt Cloud Build
`manage.py migrate --noinput` automatisch aus (`cloudbuild.yaml`).

## 0. Vorbereitung

- [ ] DB-Snapshot der Prod-Datenbank anlegen und Namen hier notieren: `__________`
- [ ] Freigabe durch Robert für diesen Termin

## 1. meal-plan-integrity-and-number-formatting — vor dem Deploy

Die Planner-Migration setzt Referenzmahlzeiten auf datumslos und legt zwei Constraints an.
Sie bricht ab, wenn es doppelte reguläre Mahlzeiten (Plan, Tag, Typ) gibt — Cloud Build
stoppt dann vor dem Rollout. Deshalb vorher prüfen:

- [ ] Vom Branch aus gegen Prod (nur Bericht, ändert nichts):
      `uv run python manage.py check_meal_integrity`
- [ ] Ausgabe prüfen:
  - „Doppelte reguläre Mahlzeiten“ **muss 0 sein** — sonst die gelisteten Mahlzeiten vorher
    mit den Verantwortlichen klären und zusammenführen/löschen.
  - „Referenz-Mahlzeiten mit Datum“: werden von der Migration verlustfrei datumslos gesetzt.
  - „Mahlzeiten außerhalb des Planzeitraums“ und „Zutaten-Einträge ohne Menge“: bleiben
    erhalten und erscheinen danach im Plan-Check (keine Aktion vor dem Deploy nötig).

Lokaler Referenzlauf (28.09.2026): 0 Dubletten, 0 Referenzmahlzeiten mit Datum,
1 Mahlzeit außerhalb des Zeitraums (#168), 1 Eintrag ohne Menge (#149).

## 2. Deploy

- [ ] Deploy auslösen; Cloud Build führt die Migrationen aus:
  - `planner` (Referenzmahlzeiten datumslos, Constraints `meal_reference_without_datetime`,
    `unique_regular_meal_per_day_and_type`)
  - `supply.0020_viscosity_liquid_and_source`, `supply.0021_ingredient_package_suggestion`
  - Migrationen aus `ingredient-status-visibility-unification`
- [ ] Nach dem Deploy erneut `check_meal_integrity` (erwartet: 0 Referenzmahlzeiten mit Datum)

## 3. ingredient-status-visibility-unification — nach dem Deploy

- [ ] Trockenlauf: `uv run python manage.py verify_ingredients_in_approved_recipes`
      (optional `--csv <datei>` für die Lückenliste) — Ausgabe Robert zeigen
- [ ] Erst nach OK: `uv run python manage.py verify_ingredients_in_approved_recipes --apply`
- [ ] Stichprobe: anonym eine verifizierte Zutat aufrufen (HTTP 200, Status `verified`)

## 4. buffet-module — nach dem Deploy

- [ ] `uv run python manage.py seed_buffet_templates`
- [ ] Trockenlauf: `uv run python manage.py migrate_buffet_roles --dry-run` — „manuell prüfen“-Liste
      muss leer sein (lokal: 0 Einträge)
- [ ] Echtlauf: `uv run python manage.py migrate_buffet_roles`
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

## Rollback

- Planner-Constraints: Reverse-Migration entfernt die Constraints; die entfernten Datumswerte
  von Referenzmahlzeiten werden nicht wiederhergestellt (fachlich bedeutungslos).
- Packungsvorschläge: übernommene Packungen sind normale `Package`-Zeilen und lassen sich in der
  Zutatenpflege löschen; Vorschläge selbst ändern keine Daten.
- Im Zweifel: DB-Snapshot aus Schritt 0 zurückspielen.
