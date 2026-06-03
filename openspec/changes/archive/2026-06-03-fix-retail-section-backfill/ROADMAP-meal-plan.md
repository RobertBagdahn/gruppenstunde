# Roadmap: Mahlplan-Verbesserungen

> Dies ist ein **Begleitdokument** zur Planung mehrerer zusammenhängender Changes am Essensplan (MealPlan).
> Es ist KEIN formales OpenSpec-Artefakt, sondern hält die explorierte Gesamtinitiative, die Reihenfolge
> und die getroffenen Entscheidungen fest. Jeder Block (B–E) wird per `/opsx-propose` zu einem eigenen,
> vollständigen Change ausgebaut, wenn er angegangen wird.

## Getroffene Grundsatzentscheidungen (aus Explore-Session)

1. **kcal statt kJ**: Speicher bleibt kJ, aber Anzeige UND Regeln/Seeds werden inhaltlich auf kcal umgestellt (Schwellwerte neu definiert, z.B. 8000–11000 kJ → 1900–2600 kcal).
2. **Soll/Ist immer relativ**: Werte werden überall als `Ist / Soll` + %-Balken + Ampel dargestellt. Nackte absolute Zahlen verschwinden zugunsten des Verhältnisses zum Referenzwert.
3. **Eine Soll-Quelle**: Die hardcoded Frontend-Berechnung (`8368 kJ × PAL`) wird abgeschafft. Soll/Ist kommt überall aus der Backend-Rule/DGE-Engine (`evaluate_*_cockpit`).
4. **day_part_factor pro Plan editierbar** (alle Tage gleich) — kein neues Tages-Modell nötig, virtuelle Tage bleiben.
5. **"Extern gegessen"**: Soll wird automatisch = Ist gesetzt (immer 100%/neutral). Der Ist-Wert der externen Mahlzeit zählt in die Tagessumme → braucht eine **manuelle kcal-Eingabe** für die externe Mahlzeit, sonst zählt sie mit 0.
6. **Portionszahl-Override pro Tag/Mahlzeit**: Abweichende Personenzahl gegenüber dem Plan-Default `norm_portions`.

## Reihenfolge & Abhängigkeiten

```
1. fix-retail-section-backfill (D)   ✅ Proposal erstellt — klein, unabhängig
        │
2. kcal-Umstellung (A)               ← rein mechanisch, blockiert sonst Doppelarbeit
        ▼
3. Soll-Band aus Backend (B-Kern)    ← Cockpit liefert min/max-Band raus, 8368 abschaffen
        ▼
4. Konfig-Felder (C)                 ← extern-Flag, Portions-Override, day_part editierbar
        ▼
5. UI-Politur (B-Rest + E)           ← schöne Tabelle, Tag-Auswahl, Gesamt-Toggle, Aktivitäts-Label
```

## Block A — kcal-Umstellung

**Scope**: Anzeige in kcal überall (Item, Meal, Tag, Plan, Rezept, Zutat). Regel-Labels und Seed-`tip_text` auf kcal. Schwellwerte der Seeds inhaltlich auf kcal neu definieren.

**Berührte Stellen** (aus Recherche):
- Frontend: `mealPlan.ts` (`getCoverageStatus`), `MealEventDetailPage.tsx`, `TableView.tsx`, `RecipePreviewDialog.tsx`, `RecipeDetailPage.tsx`, `IngredientDetailPage.tsx`, `IngredientCard.tsx`, `RuleEditDialog.tsx`
- Backend: `seed_rules.py`, `suggestion_service.py`, `improvement_ranking_service.py`, `choices.py` (Labels)
- Entscheidung offen: Konvertierungs-Helper zentralisieren (`kjToKcal`) statt überall `/4.184`.

**Offen**: Werden DB-gespeicherte Rule-Schwellen migriert (kJ→kcal-Werte) oder bleibt Speicher kJ und nur Anzeige/Text kcal? (Antwort war "auch Regeln/Seeds inhaltlich" → Seeds neu in kcal, Bestandsregeln per Migration umrechnen.)

## Block B — Soll/Ist überall, relativ (Herzstück)

**Scope**:
- Backend-Cockpit (`_evaluate_rules`) gibt zusätzlich das **Soll-Band** raus: `min_green`, `max_green`, abgeleiteter `target_mid`. Heute nur `current_value` + `status`.
- Frontend: wiederverwendbare `SollIstBar`-Komponente (Ist/Soll + %-Balken + Ampel) für Item · Meal · Tag · Plan.
- `getCoverageStatus`/8368-Logik entfernen.
- Preis ebenfalls als Soll/Ist (Soll aus Budget-Regel `price_total`).
- Nährwerte-Tab: Tag-Auswahl (Bar7 — einzelner Tag) **und** Gesamt-Plan-Toggle.

**Berührte Stellen**:
- Backend: `nutrition_aggregation.py` (`_evaluate_rules`, `_build_dashboard`), `planner/schemas/meal_plan.py` (Cockpit-Out erweitern), `planner/api/meal_plan.py`
- Frontend: neue `SollIstBar`, `NutritionView`, `TableView`, `MealSlot`, `CostDashboard`
- Schema-Sync: Pydantic Cockpit-Out ↔ Zod

## Block C — Konfigurierbarkeit (Datenmodell)

**Scope** (neue Felder + Migrationen):
- `MealPlan`: editierbare `day_part_factors` (pro Plan; heute fix `MEAL_TYPE_DAY_FACTORS`). Evtl. als JSON-Feld oder eigene Tabelle.
- `MealPlan`: globales "Soll-Essen" einstellbar (Klärung nötig: meint vermutlich Default-DGE-Profil/Person für den Plan).
- `Meal`: `is_external` (bool) + `external_energy_kcal` (manueller Ist-Wert für externe Mahlzeit).
- `Meal`: `portions_override` (abweichende Personenzahl). Geht in `scaling_factor` ein.
- Effekt auf alle Berechnungen: Kosten, Nährwerte, Einkaufsliste.

**Berührte Stellen**:
- Backend: `planner/models/meal_plan.py` (+Migrationen), `scaling_factor`-Property, `nutrition_aggregation.py`, `shopping_service.py`, `cost_summary`
- Frontend: `SettingsPanel`, `MealSlot` (Item-/Meal-Editor)

**Offen**:
- "Soll-Essen global einstellen" exakt definieren (DGE-Profil? Personentyp? Default-Portionen?).
- day_part_factors: JSON-Feld vs. relationale Tabelle.

## Block E — UI-Politur

**Scope**:
- Mahlplan-Tabelle optisch schöner + mehr Infos (Soll/Ist pro Zelle, Tagessummen-Zeile/Spalte).
- "PAL 1.6" / "Aktivitätsfaktor (PAL)" → "Aktivität: leicht / mittel / schwer" (Mapping PAL-Wert → Label).
- Weitere dezente, relative Hinweise statt absoluter Zahlen.

**Berührte Stellen**: `MealEventDetailPage.tsx` (Header `PAL`-Anzeige, `SettingsPanel`), `TableView.tsx`, `NormPortionSimulatorPage.tsx` (PAL-Labels).

## 10+ Zusatzideen (Backlog, nicht eingeplant)

1. Abwechslungs-Check (Rezept/Zutat-Wiederholung warnen) — `suggestion_service` "duplicates" ausbauen
2. Restverwertung halber Zutaten für Folgemahlzeit
3. Ernährungsfilter pro Plan (vegetarisch/vegan/laktosefrei) — färbt unpassende Rezepte
4. Saison-/Wetter-Tagestipp (warm/kalt)
5. Zubereitungsaufwand-Balken (Zeit/Schwierigkeit) pro Mahlzeit
6. Kochdienst/Verantwortlich pro Mahlzeit zuweisbar
7. Tages-/Mahlzeit-Vorlagen (RefMeal auf Tagesebene erweitern) + in andere Pläne ziehen
8. Drag&Drop von Mahlzeiten zwischen Tagen
9. Einkaufsliste nach Einkaufstag/Geschäft splitten (frisch spät / trocken früh)
10. Budget-Ampel pro Tag schon während der Planung ("noch X € übrig heute")
11. Trinkmengen/Wasser mitplanen (Lager)
12. Reserve sichtbar machen ("10% Reserve ≈ 1 Person extra")
