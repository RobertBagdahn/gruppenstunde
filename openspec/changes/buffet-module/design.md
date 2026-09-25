## Context

### Heutiger Stand
- **Zwei Frühstücks-UIs**:
  - `components/breakfast/BreakfastQuickBuilder.tsx` (386 Zeilen), eingebunden in `MealSlot.tsx:29`
  - 6-Schritt-Assistent `pages/planning/breakfast/*` (~1900 Zeilen), nur per Route erreichbar
- **QuickBuilder-Fehler** (belegt):
  - Standardauswahl über fest verdrahtete IDs `[1]`, `[1, 2]`
  - kcal geschätzt: `550 + 40 × Beläge`
  - `.slice(0, 6)` kürzt die Einträge je Kategorie
  - `quantity = Math.round(g_pro_Person × Personen)` wird mit `measuring_unit_id` der Default-Portion gespeichert
  - Das Backend liest `MealItem.quantity` als **pro Person** und multipliziert mit den Portionen (`cooking_schedule_service.py:423`, `_resolve_ingredient_weight_g` in `meal_item_helpers.py`). Ergebnis: Faktor Personen² und falsche Einheit.
- **Der Assistent speichert korrekt**: Gramm pro Person, Gramm-Einheit, `factor=1` (`BreakfastWizardPage.tsx:141-220`).
- **`wizard-items`** (`planner/api/meal_plan.py:1043`) legt fehlende Portionen mit `_derive_portion_weight_g` an (Fallback 10 g).
- **Katalog** (`supply/api/breakfast_catalog.py`):
  - liest 6 `breakfast-*`-Tags und filtert zusätzlich `is_standalone_food=True`
  - enthält den Debug-Endpunkt ohne Authentifizierung
- **Tag-Modell** `content.Tag`: `name`, `slug`, `parent`, `icon`, `group`, `sort_order`. Die Tags `fruehstueck`/`mittagessen`/`abendessen` existieren, werden aber nicht genutzt (0 Verwendungen).
- **Merge-Logik** liegt direkt in API-Funktionen: `content/api/data_quality.py:535-665` (Rezepte und Zutaten).

### Stakeholder
Tester Peter (Baguettes für den Bundesrat), Robert (Halloween-Fahrt, VIA-Erfahrung mit falschen Mengen).

## Goals / Non-Goals

**Goals:**
- Ein Builder für Frühstück, Mittag, Abend und Snack mit Vorlagen.
- Mengen werden ausschließlich im Backend berechnet und in Gramm/Milliliter pro Person gespeichert.
- Saubere, deduplizierte Rollen-Daten nach freigegebener Tabelle.
- Mengenfehler werden sichtbar, bevor eingekauft wird.

**Non-Goals:**
- Umbau oder Entfernen des 6-Schritt-Assistenten (bleibt, bekommt nur Adapterdaten).
- Frontend-Admin-Oberfläche für Vorlagen (Django-Admin reicht).
- Ungleiche Verteilung innerhalb einer Rolle (z. B. 70 % Gouda / 30 % Salami); vorerst gleichmäßig.
- Allgemeine Zutaten-Dublettenbereinigung außerhalb der Buffet-Rollen.

## Decisions

### D1: Rollen = Tags, Mahlzeit-Bezug = Vorlage
Tags beschreiben nur, *was* ein Lebensmittel auf einem Buffet ist; die Vorlage entscheidet, *welche* Rollen für welche Mahlzeit mit welcher Menge gelten.

*Alternativen*:
- Tags pro Mahlzeit (`lunch-savory` …): Tag-Explosion, Doppelpflege.
- Eigenes Rollen-Modell statt Tags: Die bestehenden Tag-Picker an Zutat und Rezept, `ingredient_tags` im MealItem und die KI-Tagging-Pfade würden nicht wiederverwendet.

```
content.Tag (group="buffet", parent="buffet")      planner.BuffetTemplate
  buffet-bread      Brot & Gebäck                    ├ meal_types: ["lunch","dinner"]
  buffet-fat        Streichfett                      └ BuffetTemplateRole*
  buffet-savory     Belag herzhaft                        role → Tag
  buffet-sweet      Belag süß                             amount_per_person, unit (g|ml)
  buffet-condiment  Soßen & Würze                         enabled_by_default, sort_order
  buffet-fresh      Gemüse & Obst                         default_ingredients M2M
  buffet-cereal     Müsli & Joghurt                       default_recipes M2M
  buffet-drink      Getränke
  buffet-dish       Gerichte
```

### D2: Datenmodell
```python
# planner/models/buffet.py
class BuffetTemplate(models.Model):
    name, slug (unique), description, meal_types = JSONField(default=list)  # validiert gegen MealTypeChoices
    is_active = BooleanField(default=True); sort_order = IntegerField(default=0)

class BuffetTemplateRole(models.Model):
    template = FK(BuffetTemplate, CASCADE, related_name="roles")
    role = FK("content.Tag", PROTECT, limit_choices_to={"group": "buffet"})
    amount_per_person = FloatField(validators=[MinValueValidator(0.1)])
    unit = CharField(choices=[("g","g"),("ml","ml")])
    enabled_by_default = BooleanField(default=True); sort_order = IntegerField(default=0)
    default_ingredients = M2M("supply.Ingredient", blank=True)
    default_recipes = M2M("recipe.Recipe", blank=True)
    class Meta: constraints = [UniqueConstraint(fields=["template","role"], name="unique_role_per_buffet_template")]

# planner/models/meal_plan.py
Meal.buffet_template = FK(BuffetTemplate, SET_NULL, null=True, blank=True)
Meal.buffet_role_amounts = JSONField(default=dict, blank=True)   # überschriebene Mengen pro Rolle
MealItem.buffet_role = CharField(max_length=50, blank=True, default="", db_index=True)  # Rollen-Slug
```
`JSONField` für `meal_types` statt `ArrayField`, weil es in SQLite (Tests) und Postgres gleich funktioniert; die Validierung erfolgt in `clean()`.
`buffet_role` als Slug statt FK: Das Feld markiert nur, dass ein Eintrag vom Buffet stammt, und hält die Gruppierung auch dann stabil, wenn sich Tags der Zutat später ändern.

### D3: Mengenlogik nur im Backend (`planner/services/buffet_service.py`)
```
compute_buffet(template, selections, role_amounts, meal) -> BuffetResult
  für jede Rolle r mit ≥ 1 Auswahl:
    amount = role_amounts.get(r) ?? template_role.amount_per_person
    share  = amount / len(auswahl_r)
    Zutat  → MealItem(quantity=share, unit=Gramm|Milliliter, factor=1.0, buffet_role=r)
    Rezept → MealItem(recipe, factor = share / (recipe.cached_weight_g / max(recipe.portions, 1))  (Fallback 1/len), buffet_role=r)
             # cached_weight_g ist das Gesamtgewicht des Rezepts, nicht pro Portion
  Summen: kcal/Person (über _resolve_ingredient_weight_g + energy_kcal bzw. Rezept-Cache × factor),
          Ziel = MEAL_TYPE_DAY_FACTORS[meal.meal_type] × NORM_PERSON_DAILY_KCAL (2335),
          Kosten/Person, Kosten gesamt = × effektive Portionen der Mahlzeit
  warnings = quantity_plausibility.check(items, portions)
```
Die Vorschau (`dry_run`) und das Speichern nutzen denselben Code, deshalb gibt es keine zweite Rechnung im Frontend.
*Alternative*: die Berechnung in `breakfastCalc.ts` wiederverwenden. Verworfen, weil die Rechnung dann in zwei Sprachen gepflegt würde, und genau diese Doppelung hat den heutigen Fehler ermöglicht.

### D4: API
| Methode | Pfad | Request | Response | Auth |
|---|---|---|---|---|
| GET | `/api/meal-plans/buffet-templates/?meal_type=` | – | `list[BuffetTemplateOut]` | keine (auch anonym lesbar) |
| GET | `/api/supply/buffet-catalog/?template=` | – | `BuffetCatalogOut { roles: list[BuffetCatalogRoleOut], gram_unit_id, ml_unit_id }` | optional (Sichtbarkeit) |
| POST | `/api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` | `BuffetSaveIn` | `BuffetResultOut` | `_require_auth` + `_require_edit` (anonym 403, ohne Rolle 404, Betrachter 403); Auswahl über `get_visible_*_or_404(allow_system_draft=True)` |
| GET | `/api/meal-plans/{plan_id}/meals/{meal_id}/buffet/` | – | `BuffetStateOut { template_id, selections, role_amounts }` | `_require_auth` + `_require_access` (anonym 403, ohne Rolle 404) |
| GET | `/api/supply/breakfast-catalog/` | – | `BreakfastCatalogOut` (Adapter, Felder unverändert) | wie bisher |

Schemas in `planner/schemas/buffet.py` und `supply/schemas/buffet_catalog.py`, Zod-Spiegel in `frontend-food/src/schemas/buffet.ts`.

### D5: Adapter für den alten Assistenten
`breakfast_catalog.get_breakfast_catalog` ruft intern `buffet_catalog.items_for_role(user, slug)` auf und bildet die Rollen auf die alten Felder ab (siehe Delta-Spec `breakfast-spread`). Die Filter `recipe_type="drink"` bzw. `recipe_type="breakfast"` für Rezepte bleiben im Adapter erhalten, damit der Assistent exakt dieselbe Datenform bekommt. Die Spec-Texte des Assistenten (`breakfast-drink-recipes`, `breakfast-wizard`), die noch „`breakfast-drink`-Katalog“ nennen, meinen damit fachlich den Getränketeil des Katalogs; sie werden hier nicht umgeschrieben.

### D6: `is_standalone_food` nicht mehr als Katalogfilter
Die Rollen-Tags sind die Kuratierung. Der zusätzliche Filter hat neue Kandidaten (Baguette, Salatgurke …, alle `is_standalone_food=False`) unsichtbar gemacht, ohne dass es jemand bemerkt hat.

### D7: Einheitenschutz in `wizard-items`
Der Block zum automatischen Anlegen von Portionen (`meal_plan.py:1043-1061`) und `_derive_portion_weight_g` werden entfernt. Ist die Einheit nicht Gramm/Milliliter und hat die Zutat keine aktive Portion dieser Einheit, antwortet der Endpunkt mit 422. Der Assistent sendet ausschließlich Gramm und ist deshalb nicht betroffen.

### D8: Plausibilität (`planner/services/quantity_plausibility.py`)
- `check(items, portions) -> list[QuantityWarning]`
- Schwellen als Modulkonstanten: `MAX_GRAMS_PER_PERSON = 1500`, `MAX_PIECES_PER_PERSON = 50`
- „Stückartig“ = Portion mit `is_piece_like_name(name)` (bereits vorhanden in `supply`)
- Aufrufer: `wizard-items` (einzeln und bulk), Buffet-Endpunkt, Mahlzeit-Item-Create/Update, Einkaufslisten-Erzeugung aus Plan
- Warnungen blockieren nie.

### D9: Merge-Services extrahieren
Die Logik aus `content/api/data_quality.py` (`merge_ingredients`, `recipe_merge`) wandert nach `supply/services/ingredient_merge.py` bzw. `recipe/services/recipe_merge.py`. Die API-Funktionen werden zu dünnen Wrappern. `migrate_buffet_roles` nutzt dieselben Services. Ergänzung: Nährwerte werden aus der Quelle übernommen, wenn das Ziel `energy_kcal` in (None, 0) hat (Fall „Brötchen“ mit 0 kcal).

### D10: Zuordnungstabelle (zur Freigabe)

IDs und Namen stammen aus der lokalen DB (Prod-Export vom 25.09.2026). Nutzung: R = RecipeItems, M = MealItems.

**Die Status-Spalte zeigt den Stand vor `ingredient-status-visibility-unification`.** Dessen Befehl `verify_ingredients_in_approved_recipes` verifiziert System-Entwürfe, die in freigegebenen Rezepten stecken. Einige ⚠️-Einträge (z. B. Margarine R4, Kräuterbutter R4, Mayonnaise R2, Tomaten R1) können danach bereits `verified` sein, eventuell weiterhin ohne kcal. `migrate_buffet_roles` wertet Status und kcal deshalb zur Laufzeit aus. Alle Einträge der Tabelle sind System-Zutaten bzw. -Rezepte (`owner=None`); der Befehl prüft das vor jedem Merge.

Legende:
- ✅ `keep`: Rolle setzen
- 🔀 `merge_into`: Dublette zusammenführen
- ➖ `untag`: Rolle entfernen, Datensatz bleibt
- ➕ `add`: bestehenden Datensatz mit Rolle versehen
- ⚠️ manuell prüfen: Nährwerte fehlen oder Status `draft`

**Brot & Gebäck (`buffet-bread`)**

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ✅ | 7328 | Bauernbrot | verified | – | Alias „Mischbrot“ ergänzen |
| ✅ | 139 | Brötchen | verified | R1 | Ziel; kcal 0 → aus 7333 übernehmen |
| 🔀→139 | 7333 | Brötchen (ganzes) | verified | – | Portionen wandern mit |
| 🔀→139 | 7332 | Brötchen (halbes) | verified | – | Portion „halbes Brötchen“ bleibt an 139 |
| ✅ | 138 | Vollkornbrot geschnitten | verified | R19 | Ziel |
| 🔀→138 | 294 | Brot (Vollkorn) | verified | R3 | |
| ✅ | 7331 | Körnerbrot | verified | – | |
| ✅ | 7330 | Stuten | verified | – | |
| ✅ | 7329 | Toastbrot | verified | – | |
| ➖ | 4666 | Vollkorn-Toast | draft | – | ohne Nährwerte |
| ➕ | 142 | Baguette | verified | 1 | für Baguette-Vorlage (Standard) |
| ➕ | 305 | Tortilla-Wraps | verified | R1 | Ziel |
| 🔀→305 | 140 | Wraps | verified | – | kcal 0 |
| ➕ | 144 | Knäckebrot | verified | – | |
| ➕ Rezept | 370 | Protein-Zwiebelbrötchen | approved | M1 | bisher „warm“ |
| ➕ Rezept | 373 | Quark-Hafer-Brötchen | approved | – | bisher „warm“ |
| ➕ Rezept | 413 | Schokobrötchen mit Tangzhong | approved | – | bisher „warm“ |

**Streichfett (`buffet-fat`)**

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ✅ | 94 | Deutsche Markenbutter | verified | R20 | Standard |
| ✅ ⚠️ | 1875 | Margarine | draft | R4 | Nährwerte ergänzen, verifizieren |
| 🔀→1875 | 5041 | Pflanzenmargarine | draft | – | |
| 🔀→1875 | 5116 | Sonnenblumenmargarine | draft | – | |
| 🔀→1875 | 4292 | Bio-Margarine | draft | – | |
| ➖ | 3296 | Halbfettmargarine | draft | – | andere kcal, kein Buffet-Standard |
| ➖ | 5498 | Leichtmargarine | draft | – | |
| ➖ | 5948 | Leichtmargarine Extra Fit | draft | – | |
| ➕ ⚠️ | 2860 | Kräuterbutter | draft | R4 | für Baguettes; Nährwerte fehlen |

**Belag herzhaft (`buffet-savory`)**

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ✅ | 105 | Gouda | verified | R6 | Standard |
| ✅ | 7341 | Edamer | verified | R3 | |
| ✅ | 107 | Emmentaler Hartkäse | verified | R11 | |
| ✅ | 7343 | Putenbrust (Aufschnitt) | verified | – | |
| ✅ | 7342 | Schinken (gekocht) | verified | – | Standard |
| ✅ | 115 | Salami italienische Art | verified | R1 | |
| ✅ | 7337 | Leberwurst | verified | – | |
| ➕ | 3 | Frischkäse Doppelrahmstufe | verified | R3 | |
| ➕ | 5 | Mozzarella aus Kuhmilch | verified | R4 | Baguette Caprese |
| ➕ | 87 | Thunfisch (Dose) | verified | – | |
| ➕ ⚠️ | 323 | Hummus | draft | – | Nährwerte fehlen |

**Belag süß (`buffet-sweet`)**

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ✅ | 7335 | Marmelade | verified | – | Ziel, Standard |
| 🔀→7335 | 7339 | Marmelade Erdbeere | verified | – | |
| ✅ | 160 | Blütenhonig | verified | R7 | |
| ✅ | 7334 | Nutella | verified | – | |
| ✅ | 181 | Erdnussbutter | verified | R2 | bisher Topping |

**Soßen & Würze (`buffet-condiment`)**, neu

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ➕ | 176 | mittelscharfer Senf | verified | R7 | |
| ➕ | 177 | Tomaten-Ketchup | verified | R11 | |
| ➕ ⚠️ | 6674 | Mayonnaise | draft | R2 | verifizieren |

**Gemüse & Obst (`buffet-fresh`)**

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ✅ | 65 | frische Avocado | verified | R3 | nur noch hier, nicht mehr Topping |
| ➕ | 299 | Salatgurke | verified | R6 | Standard |
| ➕ ⚠️ | 6925 | Tomaten | draft | R1 | Ziel, verifizieren; Standard |
| 🔀→6925 | 7041 | Tomate frisch | draft | – | |
| ➕ | 293 | Gemüsepaprika rot | verified | R28 | |
| ➕ | 30 | Eisbergsalat | verified | R7 | |
| ➕ | 34 | Radieschen | verified | – | |
| ➕ | 41 | Karotte | verified | R2 | |
| ➕ | 57 | frischer Apfel | verified | R8 | Standard |
| ➕ | 58 | frische Banane | verified | R6 | |
| ➕ | 59 | Birne | verified | R2 | |
| ➖ Rezept | 208 | Frühstücksgemüse für VIA24 | approved | – | eventspezifisch |

**Müsli & Joghurt (`buffet-cereal`)**, neu

| Aktion | ID | Name | Status | Nutzung | Hinweis |
|---|---|---|---|---|---|
| ➕ | 184 | Haferflocken | verified | R4 | |
| ➕ | 306 | Müsli (Basis) | verified | – | |
| ➕ | 98 | Naturjoghurt 3,5 % Fett | verified | R3 | |
| ➕ | 101 | Quark (Magerquark) | verified | – | |
| ➕ ⚠️ | 598 | Cornflakes | draft | – | Nährwerte fehlen |

**Getränke (`buffet-drink`)**

| Aktion | ID | Name | Typ | Hinweis |
|---|---|---|---|---|
| ✅ | 112, 288, 7344 | Haferdrink natur, Kuhmilch 3,5 % Fett, Milch (laktosefrei) | Zutat | |
| ✅ | 7346, 7347, 7345 | Saft (Apfel), Saft (Multivitamin), Saft (Orange) | Zutat | |
| ✅ | 436, 437, 438 | Kaffee, Kakao, Tee | Rezept | Standard: Kaffee, Tee |
| ✅ | 108, 109 | Tasse Kaffee mit Hafermilch, Hafermilch Kakao | Rezept | |
| ✅ | 146, 415 | Apfelzimttee, Apfel-Zimt Getränk | Rezept | ⚠️ inhaltlich prüfen, ob Dublette |
| ✅ | 156, 136, 152, 149, 145 | Ingwertee mit Zitronen, Krümeltee, Marrokantischer Minzetee, Ostfriesentee, Waldbeeretee | Rezept | |
| ✅ | 153 | Tschai einfach/günstig | Rezept | Ziel |
| 🔀→153 | 155, 215 | Tschai einfach/günstig | Rezept | |
| 🔀→183 | 191 | Glas Apfelsaft | Rezept | |
| ➖ | 183, 193 | Glas Apfelsaft, Glas Orangensaft | Rezept | doppelt zu den Saft-Zutaten |
| ➖ | 147, 148, 144, 141, 133 | Bergwasser, Brackwasser, Moorhexentrank, Waldschorle, Wüstenlimo (alle VIA24) | Rezept | eventspezifisch |

**Gerichte (`buffet-dish`)**, bisher `breakfast-warm-meal`

| Aktion | ID | Name | Hinweis |
|---|---|---|---|
| ✅ | 439, 440, 441 | Rührei, Omelett, Gekochte Eier | |
| ✅ | 423, 54, 347 | Porridge, Overnight Oats, Erdnussbutter-Bananen Baked Oats | |
| ✅ | 51, 178 | Müsli mit frischem Obst, Schokomüsli | |
| ➖ | 189, 107, 171, 182, 187, 185, 83, 195 | Bionella Brot, Erdbeermameladen Brot, Erdnussbutterbrot, Heidelbeerebrot, Keksaufstrichbrot, Sauerkirsch Brot, Schokocreme Brot, VIArine mit Brot | Brot + Belag gehört ins Buffet selbst |
| → Brot | 370, 373, 413 | siehe Brot & Gebäck | |

**Standardauswahl der Vorlagen** (Seed, von Staff änderbar):

| Vorlage | Standard |
|---|---|
| Frühstück | Bauernbrot, Brötchen; Butter; Gouda, Schinken; Marmelade; Salatgurke, frischer Apfel; Kaffee, Tee |
| Belegte Baguettes | Baguette; Butter; Gouda, Schinken, Mozzarella; Senf; Salatgurke, Tomaten, Eisbergsalat; Saft (Apfel) |
| Abendbrot | Bauernbrot, Vollkornbrot geschnitten; Butter; Gouda, Salami, Frischkäse; Salatgurke, Tomaten, Paprika; Tee |

## Abhängigkeit

Reihenfolge: `ingredient-status-visibility-unification` (ISVU) → `portion-superseded-versions` (liefert `Portion.objects.active()` für die Katalog-Portionen) → dieser Change. Abgleich mit ISVU:

| Thema | ISVU | Dieser Change |
|---|---|---|
| Sichtbarkeit Katalog | `visible_ingredient_queryset` einheitlich | nutzt es unverändert; kein eigener Filter außer Rollen-Tag |
| System-Entwürfe per ID | Ausnahme „Ingredient reference exceptions“ für MealItems und Frühstücks-Builder | Buffet-Speichern nutzt `allow_system_draft=True`; Delta-Spec benennt den Builder um |
| Status | nur `draft`/`verified`, Verifizieren nur Staff über `set_ingredient_status` | `migrate_buffet_roles` ändert keinen Status, berichtet nur |
| Bearbeitungsrecht | verifiziert nur Staff; Entwürfe Owner/Creator/Editoren | Rollen-Tags zusätzlich nur Staff (auch an eigenen Entwürfen) |
| Debug-Endpunkt, tote Helfer | entfernt | nichts mehr zu tun |
| `breakfast_catalog.py` | Debug entfernt, Katalog über Policy | wird zum Adapter umgebaut (auf ISVU-Stand aufbauen) |
| `supply/tests/test_breakfast_wizard_visibility.py` | reduziert auf Katalog-Tests | Katalog-Tests auf Adapter umstellen |
| Seeds | grep nach `approved`/`user_content` | `seed_breakfast_catalog.py`/`tag_breakfast_prod.py` werden gelöscht |
| Merge | nicht betroffen | Merge-Services extrahiert; Status des Ziels bleibt, Quelle wird entfernt |

## Risks / Trade-offs

- [Prod-IDs weichen von lokal ab] → Adressierung über ID **und** Name, Abweichungen werden übersprungen und gemeldet (Spec `buffet-data-cleanup`); Dry-Run auf Prod vor dem Echtlauf.
- [Draft-Zutaten mit Rolle sind für Nutzer unsichtbar (Audit-Befund 1)] → ⚠️-Einträge erscheinen in der Zusammenfassung „manuell prüfen“; der Katalog bleibt funktionsfähig, weil jede Rolle mindestens einen verifizierten Eintrag hat (Ausnahme Soßen & Würze: Senf und Ketchup sind verifiziert).
- [Merge löscht Rezepte, die in fremden Plänen stecken] → Merge hängt MealItems um; betroffene Rezepte (Tschai, Glas Apfelsaft) haben 0 MealItems.
- [Gleichverteilung in einer Rolle passt nicht immer] → Menge pro Rolle ist anpassbar; ungleiche Verteilung ist Non-Goal, der Assistent kann das weiterhin.
- [Entfernen des automatischen Portion-Anlegens bricht unbekannte Aufrufer] → 422 mit klarer Meldung; Tests für den Assistenten-Pfad (Gramm) sichern ab.
- [`Meal.buffet_template` bei gelöschter Vorlage] → `SET_NULL`; Items behalten `buffet_role`, der Builder öffnet dann mit der ersten passenden Vorlage.

## Migration Plan

1. Schema-Migration `planner` (BuffetTemplate, BuffetTemplateRole, Meal-/MealItem-Felder).
2. Datenmigration `content`: Rollen-Tags und Eltern-Tag `buffet` anlegen (idempotent).
3. Deployment Backend und Frontend.
4. `uv run python manage.py seed_buffet_templates`.
5. `uv run python manage.py migrate_buffet_roles --dry-run` auf Prod → Ausgabe prüfen → Echtlauf.
6. ⚠️-Liste manuell abarbeiten (Nährwerte, Verifizierung).

**Rollback**: Die Frontend-Rückkehr zum alten Builder ist nicht vorgesehen (Builder ist fehlerhaft). Die Datenmigration ist nicht automatisch umkehrbar; deshalb vor Schritt 5 einen DB-Snapshot ziehen.

## Open Questions

- Sind „Apfelzimttee“ (146) und „Apfel-Zimt Getränk“ (415) inhaltlich dasselbe? Falls ja, vor dem Echtlauf als `merge_into` eintragen.
- Soll „Snack“ eine eigene Vorlage bekommen (z. B. Wanderproviant: Brot, Belag herzhaft, Obst, Müsliriegel)? Vorerst nein.
