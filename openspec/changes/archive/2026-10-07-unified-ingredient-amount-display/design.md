## Context

Das Datenmodell trägt Portion und Einheit schon: `MealItem.quantity`, `measuring_unit`, `portion` (mit Portion ist `quantity` eine Anzahl pro Person, sonst eine Menge in der Einheit). Die Add-API nimmt `portion_id` und `measuring_unit_id`. `MealItemUpdateIn` kennt nur `factor`, `quantity`, `servings`. Anzeige: `formatItemPortion` (Tabellenansicht), `formatPortion` inline in `MealSlot.tsx` und eine Inline-Variante in `RefMealEditorPage.tsx` wissen nichts von vorgewogenen Portionen („EL 15 g": Einheit Gramm, `weight_g=15`). Rezeptseiten nutzen `lib/ingredientAmount.ts` und `lib/portionLabels.ts` (`isDirectMetricPortion`). `MealItemOut.quantity_g` (`_resolve_ingredient_weight_g`) liefert schon die Grammmenge pro Person und speist Energie, Kosten und Einkaufsliste.

## Goals / Non-Goals

**Goals:**
- Eine einzige Formatierung der Zutatenmenge für Rezept und Plan.
- Einheit/Portion einer Plan-Zutat nach dem Hinzufügen änderbar, Menge in dieser Einheit editierbar.
- Notiz pro Einzelzutat.

**Non-Goals:**
- Einheiten-Editor in der Referenz-Mahlzeit (dort nur die Anzeige).
- Änderungen an Rezept-Zutaten, Einkaufsliste oder Portionsdaten.
- Umbau von Faktor-Logik für Rezept-Einträge.

## Decisions

**1. Formatter im Frontend zentralisieren, auf der Rezeptlogik aufbauen.** `lib/ingredientAmount.ts` bekommt eine Funktion für `MealItem`-artige Eingaben (`quantity`, `portion_*`, `measuring_unit_*`, `quantity_g`), die intern `isGramPortion`/`formatPortionAmount` nutzt. `formatItemPortion` und `MealSlot.formatPortion` werden dünne Aufrufer oder entfallen. Alternative: Formatierung im Backend liefern. Verworfen, weil Rezeptseiten schon im Frontend formatieren und ein zweiter Pfad die Abweichung erneut erzeugen würde.

**2. Umrechnung beim Einheitenwechsel im Backend.** Der Update-Endpoint berechnet die Grammmenge vor dem Wechsel mit `_resolve_ingredient_weight_g`, setzt Einheit/Portion und teilt durch das Gewicht je Einheit der neuen Portion (Gramm: 1, Milliliter über die Dichte wie im bestehenden Helper). Das Backend ist die einzige Quelle der Gewichtslogik, das Frontend rechnet nicht selbst. Alternative: Umrechnung im Frontend. Verworfen, weil Rundung und Dichte sonst an zwei Stellen leben. Ohne `weight_g` der Zielportion antwortet der Endpoint mit 422, statt ein Gewicht zu raten (wie `_require_defined_unit`).

**3. Gleichzeitige `quantity` heißt: keine Umrechnung.** Der Client sendet beim Hinzufügen und beim bewussten Editieren Menge plus Einheit zusammen. Nur ein reiner Einheitenwechsel löst die Umrechnung aus.

**4. Einheiten-UI wiederverwenden.** Die Zeile nutzt `PortionPicker` und `formatPortionOptionLabel`. Die Portionen der Zutat kommen mit dem Plan-Detail oder per bestehendem Zutaten-Endpoint (beim ersten Öffnen der Auswahl laden, per TanStack Query gecacht), damit die Plan-Antwort nicht für jeden Eintrag alle Portionen mitliefert. `QuantityInput` behält den Rohtext-Entwurf (siehe `DecimalInput`).

**5. Notiz als `TextField` auf `MealItem`.** `note = CharField(max_length=500, blank=True, default="")`, Migration ohne Datenänderung. Eigenes Feld statt `display_name`, weil `display_name` den Namen überschreibt und die Berechnung für reine Textzeilen beeinflusst. `MealItem` hat bereits ein Feld `display_name`; `Meal.note` existiert separat und bleibt unberührt.

## Risks / Trade-offs

- [Umrechnung rundet auf `DecimalField(…, 2)` Dezimalstellen] → Anzeige nutzt die gespeicherte Menge; `quantity_g` kann um Rundung abweichen. Test mit Toleranz, Rundung auf 2 Stellen dokumentieren.
- [Zielportion ohne Gewicht] → 422 mit klarer Meldung, UI blendet solche Optionen ab (`Gewicht fehlt`-Label wie im Rezept-Editor).
- [Gleiche Zutat in mehreren Rollen (Buffet)] → Update gilt nur für den einen Eintrag, `unique_ingredient_role_per_meal` bleibt unberührt.
- [Portionen pro Zeile nachladen] → Query pro Zutat, gecacht; Ladezustand zeigt die aktuelle Einheit als Text.

## Migration Plan

1. Migration für `MealItem.note` (additiv, abwärtskompatibel).
2. Backend und Frontend zusammen ausrollen. Es gibt keine Datenmigration der Mengen.
3. Rollback: Feld bleibt ungenutzt, Migration muss nicht zurückgedreht werden.

Für Prod gilt der gesammelte Rollout-Plan der Peter-Feedback-Änderungen (erst Dry-Run, Anwenden nur nach Freigabe).

## Open Questions

- Soll die Referenz-Mahlzeit später denselben Einheiten-Editor bekommen? Vorerst nur Anzeige.
