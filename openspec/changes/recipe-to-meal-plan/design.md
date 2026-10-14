## Context

- Die Rezeptdetailseite (`frontend-food/src/pages/recipes/RecipeDetailPage.tsx`) hat keine Aktion für Essenspläne; vorhanden sind `useMealPlans`, `useAddMeal`, `useAddMealItem`, `useBatchCreateMealItems` (`api/mealPlans.ts`) und `CreateMealPlanDialog`.
- Die Omnibar (`components/planning/MealOmnibarDialog.tsx`) bekommt Rezepte aus `GET /api/recipes/search/` (`backend/planner/api/meal_plan.py`, ca. Z. 2640–2800): Beschreibung auf 200 Zeichen gekürzt, `ingredients_preview` max. 8 Namen ohne Mengen. Zutaten kommen aus `_meal_plan_ingredient_search_queryset` (nur `VERIFIED`, `name__icontains`).
- Das Buffet sucht über `search_buffet_items` (`backend/supply/services/buffet_catalog.py`): Zutaten ohne `is_standalone_food` werden verworfen, solange `include_non_standalone` falsch ist (Standard im Frontend).
- Das Rezept-Autocomplete nutzt `GET /api/ingredients/?name=` (`backend/supply/api/ingredients.py`), `page_size=8`.
- `IngredientList.PortionPill` rechnet das Portionsgewicht mit `formatQuantity(weight, viscosity, density)` in ml um; bei einer Portion „Liter“ mit 1000 g und Dichte 1,02 entsteht „1 Liter à 980 ml“.
- Review-Dialog: `ReviewRow` rendert `IngredientQuantityDialog` nur bei `quantityIngredient && dialogPortionsReady`; `useIngredientPortions` ist bei leerem Slug deaktiviert. KI-Zeilen kamen ohne `selected_ingredient_slug` an.

## Goals / Non-Goals

**Goals:**
- Rezept in höchstens drei Schritten in beliebig viele Mahlzeiten legen.
- Rezept vor dem Hinzufügen vollständig prüfen können, auch mobil.
- Eine Suchlogik, die „Zwiebel“ → „Speisezwiebel“ überall findet.
- Keine widersprüchlichen Mengenangaben; keine stummen Buttons.

**Non-Goals:**
- Button in `RecipeCard`/Listen.
- Validierungswarnung im Portionsformular.
- Automatische Datenkorrektur ohne OK; Peters Plandaten bleiben unangetastet.

## Decisions

**D1 – Dialog „Zum Essensplan“ als eigene Komponente** `components/recipe/AddRecipeToMealPlanDialog.tsx`. Schritte Plan → Tage/Mahlzeiten (Checkboxen) → Portionen (Vorbelegung `norm_portions` des Plans). Pläne werden mit `can_edit` aus der API gefiltert. Zuletzt benutzter Plan wird in `localStorage` gemerkt (nur Komfort). Alternative: `MealOmnibarDialog` mit fixem Rezept – verworfen, weil die Auswahl mehrerer Mahlzeiten dort nicht passt.

**D2 – Schreiben über Batch-Endpunkt.** Mehrere Mahlzeiten werden nacheinander mit `useAddMealItem` angelegt, Fehler je Mahlzeit gesammelt; Rückgängig löscht die angelegten Items über `useRemoveMealItem`. Duplikatprüfung vor dem Senden anhand `plan.days[].meals[].items[].recipe_id`; Duplikat-Mahlzeiten sind im Dialog deaktiviert und erklärt. Serverseitig zusätzlich 409 bei doppeltem Rezept pro Mahlzeit (Backend-Quelle der Wahrheit).

**D3 – Anonyme Nutzer**: Button sichtbar; Klick ruft die bestehende Login-Weiterleitung mit Rücksprung auf die Rezeptseite auf.

**D4 – Omnibar-Response erweitern** (`RecipeSearchResultOut` in `planner/schemas/meal_plan.py` ↔ `schemas/mealPlan.ts`): `description` ungekürzt, `ingredients_preview` wird zu `ingredients: [{name, quantity_label}]` für die Normportionen (Mengen über die vorhandene Skalierungslogik der Rezeptseite), `allergens: [str]`. Für die Liste (25 Treffer) werden Zutaten nur für den aktiven Treffer nachgeladen: neuer Endpunkt `GET /api/recipes/{id}/preview/?portions=N` (Mengen, Allergene, Tags, volle Beschreibung). Alternative: alles in der Suchantwort – verworfen wegen Payload und N+1.

**D5 – Mobil Bottom-Sheet** `components/planning/RecipePreviewSheet.tsx` (vorhandenes Sheet-Muster, `animate-sheet-up`), geöffnet über „Details“ in der Zeile. Desktop nutzt dieselbe Inhaltskomponente in der rechten Spalte, damit beide nicht auseinanderlaufen. „Rezept ansehen“ ist ein Link `target="_blank" rel="noopener"` auf `/recipes/{slug}`.

**D6 – Gemeinsame Suchlogik** `backend/supply/services/ingredient_search.py` mit `search_ingredients(user, query, *, include_drafts, limit)`: Teilstring über Name und `IngredientAlias`, Umlautvarianten (vorhandene `_query_variants`), Rang 0 exakt, 1 beginnt mit, 2 Wortanfang (`" " + q`, `-`), 3 enthält, danach `-usage_count`, `name`, `id`. Buffet, Omnibar und `/api/ingredients/?name=` rufen sie auf; `buffet_catalog._name_query` und `_meal_plan_ingredient_search_queryset` werden darauf umgestellt. Alternative: Logik pro Endpunkt angleichen – verworfen (genau so ist die Abweichung entstanden).

**D7 – Buffet-Filter**: `include_non_standalone` entfällt (Parameter bleibt für ein Release als ignorierter Query-Parameter akzeptiert; Frontend sendet ihn nicht mehr). Relevanzgruppen: Favorit 0, Standalone 1, Rezepte 2/3, Nicht-Standalone-Zutat 4. Antwort-Item bekommt `is_cooking_ingredient: bool` für das Badge „Zutat zum Kochen“ (Pydantic ↔ `BuffetCatalogSearchItemSchema`).

**D8 – Omnibar-Status**: `VERIFIED` plus eigene Entwürfe (`owner == user`), Antwortfeld `status` existiert bereits; UI zeigt Badge „Entwurf“.

**D9 – Mengenanzeige** in `lib/ingredientAmount.ts` und `IngredientList.tsx`: Neue Funktion `formatPortionReference(portion, ingredient)` liefert für Portionsnamen mit Volumen-/Masseneinheit (`isGramPortion` oder Liter/ml) das Gewicht als „≈ 1.020 g“ in Klammern statt „à …ml“; für Stück-/Löffelportionen bleibt „à …“. Bestehende Tests `ShoppingListItemRow`/`shoppingItemDisplay` bleiben unverändert (anderer Pfad).

**D10 – Daten-Report** `supply/management/commands/report_volume_portion_density.py`: Dry-run, listet Zutaten mit Portion in Volumeneinheit, deren `weight_g` um mehr als 1 % von `density × Volumen` abweicht; Ausgabe als Tabelle/CSV; `--apply` existiert nicht in dieser Änderung. Korrektur läuft über den Prod-Rollout-Plan nach OK.

**D11 – Review-Dialog**: `RecipeIngredientReviewStep` rendert `IngredientQuantityDialog` sofort, übergibt `portionsLoading` und `portionsError` (+ `onRetry`) an den Dialog; `IngredientQuantityDialog` zeigt Skeleton bzw. `ErrorDisplay` mit „Erneut versuchen“. Slug-Lücke zusätzlich im Frontend schließen: Fehlt der Slug, lädt der Dialog Portionen über die Zutaten-ID (bestehender Endpunkt oder Slug-Lookup per `GET /api/ingredients/{id}`).

## Risks / Trade-offs

- [Mehr Zutatentreffer im Buffet] → Ranking und Badge halten Standalone-Treffer oben; Limit 30 bleibt.
- [Preview-Endpunkt erhöht Anfragen] → TanStack-Query-Cache je Rezept/Portionszahl, `staleTime` 60 s, nur für aktiven Treffer.
- [Gemeinsame Suche ändert Reihenfolgen bestehender Suchen] → Tests für Ranking in allen drei Aufrufern; Reihenfolge-Änderung ist gewollt.
- [Mehrfach-Schreiben nicht atomar] → Fehler je Mahlzeit anzeigen, Rückgängig nur für erfolgreiche Items; serverseitig lehnt die bestehende Prüfung Duplikate ab.
- [Entfernter Buffet-Filter bricht alte Clients] → Parameter wird ignoriert, nicht abgelehnt.

## Migration Plan

Keine Schema-Migration. Deploy Backend vor Frontend (neue optionale Felder, ignorierter Parameter). Datenkorrekturen aus D10 nur nach Dry-run-Review und OK, als Schritt im Prod-Rollout-Plan.

## Open Questions

- Soll `GET /api/recipes/{id}/preview/` später auch die Rezeptdetailseite speisen? (nicht Teil dieser Änderung)
