# Design: Mengenübersicht und planweite Mengenanpassung

## Entscheidungen

1. **Overrides statt neuer Datenstruktur.** Anpassungen werden als `MealItemOverride.quantity_override` (in der Einheit der `RecipeItem.quantity`) bzw. `excluded` gespeichert. Alle Ausgabewege (Einkaufsliste, Kosten, Nährwerte, Cockpit, Zeitplan, PDF) berücksichtigen Overrides bereits über `active_recipe_items`. Einzige Migration: `quantity_override` erhält vier Nachkommastellen, damit kleine Stückmengen pro Person nicht grob gerundet werden.
2. **Eine Rechenquelle.** Aus `generate_shopping_list` wird `collect_ingredient_contributions(meal_plan) -> list[IngredientContribution]` herausgelöst. Jeder Beitrag enthält `ingredient_id`, `meal_item_id`, `recipe_item_id | None`, `meal_id`, `recipe_id | None`, Netto-Gramm, Gramm mit Reserve, Rohmenge/Portionsname für Zutaten ohne vertrauenswürdiges Gewicht sowie die Rechenbestandteile (Menge pro Person, Faktor, effektive Portionen). Einkaufsliste und Mengenübersicht aggregieren darauf; die Summen sind dadurch identisch.
3. **Netto als Bezugsgröße.** Die Übersicht zeigt pro Zutat netto (ohne `reserve_factor`) und mit Reserve. Zielmengen der planweiten Anpassung beziehen sich auf **netto**, weil die Reserve ein Planparameter bleibt. Die UI zeigt die resultierende Menge mit Reserve als Vorschau.
4. **Anteilige Verteilung.** Bei Zielmenge `T` (netto, g) gilt: `fixed` = Summe der nicht anpassbaren Beiträge, `adjustable` = Summe der anpassbaren Beiträge auf Basis der **Originalmengen** (vorhandene Mengen-Overrides werden ersetzt, nicht multipliziert). `ratio = (T − fixed) / adjustable`. Jeder anpassbare Beitrag erhält `quantity_override = round(recipe_item.quantity × ratio, 4)`; entspricht der Wert der Rezeptmenge, wird der Mengen-Override entfernt. Bei Prozentanpassung `p` wird jeder anpassbare Beitrag ausgehend von seiner aktuellen Menge (inklusive bestehender Overrides) mit `1 + p/100` multipliziert; fixe Beiträge bleiben unverändert. Ist `ratio ≤ 0` oder liegt `quantity_override` unter `0.001`, wird mit 422 abgelehnt („Zielmenge zu klein – schließe die Zutat stattdessen in einzelnen Mahlzeiten aus.“).
5. **Was ist anpassbar.** Anpassbar sind Rezept-Zutaten in Mahlzeiten, die nicht `is_synced` und nicht `is_external` sind, und die nicht optional oder Teil einer Austauschgruppe sind (gleiche Regel wie bestehender Override-Endpunkt). Ausgeschlossene Zeilen (`excluded=true`) bleiben ausgeschlossen. Direkte Zutaten-Einträge (`MealItem.ingredient`) zählen planweit als `fixed`; sie werden einzeln über die bestehende MealItem-Mengenbearbeitung geändert. Jede Zeile liefert `editable` und `not_editable_reason`.
6. **Zielmenge in Portionen.** Das Frontend bietet die Einheiten aus den aktiven Portionen der Zutat mit vertrauenswürdigem Gewicht (wie `portion_options` der Einkaufsliste) plus g. Es rechnet in Gramm um und sendet `target_total_g`. Zutaten ohne vertrauenswürdiges Gewicht erlauben nur Prozentanpassung.
7. **Atomarität und Upsert.** Der Anpassungs-Endpunkt läuft in `transaction.atomic()`, aktualisiert je `(meal_item, recipe_item)` per `update_or_create` nur `quantity_override` und lässt andere Overrides des Mahlzeit-Eintrags unangetastet. `reset` setzt `quantity_override = null` und löscht Overrides, die danach weder Menge noch Ausschluss tragen.
8. **Keine Paginierung.** Die Übersicht ist wie die Einkaufsliste ein planbezogenes Aggregat begrenzter Größe (durch `meal-plan-input-guardrails` beschränkte Planlänge). Sie wird unpaginiert geliefert; Suche und Filter erfolgen clientseitig mit URL-State.

## API

### `GET /api/meal-plans/{id}/ingredient-quantities/`

Zugriff wie Einkaufsliste (`_require_access`). Response `list[IngredientQuantityOut]`, sortiert nach Abteilung und Name:

```
IngredientQuantityOut
  ingredient_id: int
  ingredient_name: str
  ingredient_slug: str
  retail_section: str
  net_quantity_g: float
  total_quantity_g: float          # mit Reserve
  quantity: float                  # Anzeige in `unit` (g oder ml), mit Reserve
  unit: Literal["g", "ml"]
  piece_equivalent: ShoppingPieceEquivalentOut | None
  unit_options: list[{name, weight_g, is_default}]  # vertrauenswürdige Portionen für die Zielmenge
  has_trusted_weight: bool
  is_adjusted: bool                # mind. eine Zeile mit quantity_override oder excluded
  lines: list[IngredientQuantityLineOut]

IngredientQuantityLineOut
  kind: Literal["recipe", "direct"]
  meal_item_id: int
  recipe_item_id: int | None
  meal_id: int
  meal_label: str                  # z. B. "Di, 14.10. · Abendessen"
  date: date
  meal_type: str
  recipe_id: int | None
  recipe_title: str
  quantity_per_person: float       # effektiv (nach Override)
  original_quantity_per_person: float
  unit_label: str                  # Einheit der RecipeItem- bzw. MealItem-Menge
  factor: float
  effective_portions: float
  net_quantity_g: float
  excluded: bool
  is_overridden: bool
  editable: bool
  not_editable_reason: str | None  # deutscher Text
```

### `POST /api/meal-plans/{id}/ingredient-quantities/{ingredient_id}/adjust/`

Bearbeitungsrecht (`_require_edit`). Request `IngredientQuantityAdjustIn`:

```
mode: Literal["target_total", "percent", "reset", "restore"]
target_total_g: float | None   # Pflicht bei target_total, > 0
percent: float | None          # Pflicht bei percent, -90 ≤ p ≤ 200, ≠ 0
restore: list[OverrideQuantitySnapshot]  # Pflicht bei restore (meal_item_id, recipe_item_id, quantity_override | null)
```

Response `IngredientQuantityAdjustOut`: `item: IngredientQuantityOut | None`, `changed_lines: int`, `skipped_lines: int`, `previous: list[OverrideQuantitySnapshot]` (Zustand vor der Änderung, für „Rückgängig“). Fehler: 404 (Plan/Zutat nicht im Plan), 403, 422 (feldbezogen; keine anpassbaren Zeilen; Ziel kleiner als fixer Anteil).

### Einzelzeile

Neuer Endpunkt `PUT /api/meal-plans/{id}/meal-items/{item_id}/overrides/{recipe_item_id}/` mit `MealItemOverrideLineIn` (`quantity_override`, `excluded`) als Upsert einer Zeile; Antwort ist die Override-Liste des Mahlzeit-Eintrags; `DELETE` auf denselben Pfad setzt die Zeile zurück. Validierung wie bestehender PATCH-Endpunkt; zusätzlich 422 für synchronisierte/externe Mahlzeiten.

## Frontend

- `IngredientQuantitiesView.tsx`: `CardTable`/`DataCardRow`, mobil gestapelt; Suche (`?q=`) und Filter „nur angepasste“ (`?adjusted=1`) im URL-State; Abschnitt über `QuerySection` mit Skeleton.
- Zeile pro Zutat: Name, netto/mit Reserve, Badge „angepasst“, Aktion „Gesamtmenge anpassen“ (Dialog mit Zielmenge + Einheit, alternativ Prozent, Vorschau „vorher → nachher“, „Zurücksetzen“).
- Aufgeklappt: Anteile je Mahlzeit, Inline-Mengenfeld (pro Person, Rezepteinheit) mit „Ausschließen“/„Zurücksetzen“; nicht anpassbare Zeilen zeigen den Grund.
- Toasts über `notify`: „Menge gespeichert“ bzw. „Menge zurückgesetzt“, mit Rückgängig (`UNDO_DURATION_MS`) über `mode: "restore"` mit dem gelieferten `previous`.
- Direkte Zutaten-Einträge werden inline über den bestehenden `PATCH …/meal-items/{item_id}/` (`quantity`) geändert.
- MealSlot: Badge „angepasst“ an Rezept-Einträgen mit Overrides, Link auf `?sub=quantities&adjusted=1`.
- Nach Mutation invalidieren: Plan-Detail, Mengenübersicht, Einkaufsliste (transient), Kosten, Nährwerte, Zeitplan.

## Tests

- Backend: Summen der Übersicht = Summen der Einkaufsliste (mit/ohne Reserve, `override_portions`, Faktor, Overrides, Ausschlüsse, Zutaten ohne Gewicht); Zielmenge mit fixem Anteil; Prozent; Reset; synchronisierte/externe/optionale Zeilen übersprungen; Upsert lässt andere Overrides stehen; 403 ohne Bearbeitungsrecht, 401 ohne Login; Ziel kleiner als fixer Anteil → 422.
- Frontend: Zod-Parsing; Anpassungs-Dialog (Einheit → Gramm, Vorschau); Inline-Bearbeitung; Read-only-Zustand; Rückgängig.
