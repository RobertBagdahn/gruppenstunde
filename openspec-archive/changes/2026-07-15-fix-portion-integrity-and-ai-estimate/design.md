## Context

Live-Analyse von Rezept 59 ("Linsensuppe") und der lokalen Dev-DB (311 Rezepte, 2.038 RecipeItems) hat drei zusammenhängende strukturelle Probleme aufgedeckt:

1. **70,5 % aller RecipeItems** zeigen nicht auf die `rank=1`-Portion ihrer Zutat (mal gewollt — z.B. bewusst "1 Prise" gewählt —, mal ungewollt durch Altlasten).
2. **125 Zutaten** besitzen aktuell gleichzeitig zwei aktive `rank=1`-Portionen (Legacy-Portion aus altem Import + neue Portion aus einem `enrich_seeds`-Lauf), weil dieser Command beim Anlegen neuer Portionen nie die alten zurückstuft oder RecipeItems umhängt (`_rebind_recipe_items()` ist im `enrich-seed-data`-Change als offener Task vermerkt, aber nie implementiert).
3. Mehrere RecipeItems zeigen auf **soft-gelöschte Portionen** (z.B. Jodsalz-Item auf Portion, die seit 2026-07-05 `deleted_at` gesetzt hat), weil `portion-soft-delete` das Löschen unabhängig von bestehenden Referenzen erlaubt.

Der `RecipeQuantityEstimationService._build_response()` überschreibt für die AI-Mengenschätzung **immer** die gespeicherte Portion mit `ingredient.portions.filter(rank=1, deleted_at__isnull=True).first()` — ohne Tiebreaker bei Duplikaten, ohne Rücksicht auf die tatsächlich gespeicherte Portion. Da die Response kein `portion_id`-Feld hat, übernimmt `InlineIngredientEditor.handleApplyEstimate()` nur `quantity`, wodurch die Zeile auf ihrer alten (falschen) Portion mit neuer, für eine andere Portion berechneter Menge landet. Reproduzierbarer Live-Test: 3 von 10 Zutaten in Rezept 59 würden beim Klick auf "Übernehmen" um Faktor 10–333 verfälscht (Olivenöl 10×, Jodsalz 333×, Pfeffer 200×).

Zusätzlich berechnet `normalizeItems()` im Editor den editierbaren Mengenwert über eine fragile `ingredient_portions.find(p => p.id === item.portion_id)`-Lookup, die bei soft-gelöschten/fehlenden Portionen still auf `weight_g = 1` zurückfällt — das führt zu falsch angezeigten (und beim Speichern falsch übernommenen) Mengen im Edit-Mode selbst, unabhängig von der AI-Funktion.

## Goals / Non-Goals

**Goals:**
- Verhindern, dass zukünftige Wartungs-/Import-Prozesse (`enrich_seeds` & Nachfolger) referenzierte Portionen unbemerkt verändern oder verwaisen lassen.
- Die AI-Mengenschätzung so reparieren, dass "Übernehmen" niemals eine Menge auf eine andere Portion als die vom Backend gemeinte anwendet.
- Den Edit-Mode robust gegen fehlende/gelöschte Portionsreferenzen machen (immer korrekte Gramm-Anzeige).
- Bestehende, bereits korrumpierte/inkonsistente Daten (125 Rank-Duplikate, tote Portion-Referenzen, unplausible Rezeptmengen) einmalig automatisiert bereinigen.

**Non-Goals:**
- Keine grundsätzliche Neugestaltung des Portion/RecipeItem-Datenmodells (kein Wechsel weg vom "100g X"-Speicherformat).
- Keine Änderung an `RecipeIngredientsTable.tsx` (ungenutzte Alternativkomponente) oder anderen inaktiven UI-Pfaden.
- Keine manuelle Freigabe-UI für die automatische Massen-Reparatur (bewusst vollautomatisch, siehe Decisions).
- Keine Änderung an der grundsätzlichen "100g X als Speichereinheit"-Architektur — nur an der Integrität der Referenzen darauf.

## Decisions

### 1. Guard-Rail: `weight_g` referenzierter Portionen ist unveränderlich → neue Portion statt Update
**Entscheidung:** `Portion.save()`/die Update-API prüfen, ob `RecipeItem.objects.filter(portion=self).exists()`. Falls ja und `weight_g` sich ändern würde: die Operation wird stattdessen als "neue Portion anlegen" behandelt (alte Portion bleibt mit ursprünglichem `weight_g` unangetastet bestehen, ggf. auf `rank` zurückgestuft).
**Alternative verworfen:** Automatisches Mit-Skalieren aller referenzierenden RecipeItems bei jeder `weight_g`-Änderung — zu riskant, da es unklar ist, ob die Änderung eine Korrektur oder eine echte neue Bedeutung ist; das Anlegen einer neuen Portion ist die sicherere, nicht-destruktive Option.

### 2. Guard-Rail: `RecipeItem.portion_id` ist nur durch expliziten User-Edit änderbar
**Entscheidung:** Kein automatisierter Prozess (Migration, `enrich_seeds`, Bereinigungs-Command) darf `RecipeItem.portion_id` direkt umschreiben, außer über eine dedizierte, geloggte Rebind-Funktion (siehe Decision 4), die die Gramm-Menge explizit erhält. Der manuelle Portion-Wechsel im `InlineIngredientEditor` (`handlePortionChange`) bleibt unverändert erlaubt und ist bereits korrekt implementiert (rechnet Menge korrekt um).

### 3. Partial Unique Index gegen doppelte `rank=1`
**Entscheidung:** Migration mit `UniqueConstraint(fields=["ingredient"], condition=Q(rank=1, deleted_at__isnull=True), name="unique_rank1_portion_per_ingredient")` auf `Portion`. Verhindert auf DB-Ebene, dass jemals wieder zwei aktive `rank=1`-Portionen für dieselbe Zutat existieren.
**Alternative verworfen:** Nur Application-Level-Validierung — zu unsicher, da Bulk-Operationen (Fixtures, `bulk_create`) Model-`clean()` umgehen können.

### 4. Auto-Rebind beim Löschen einer referenzierten Portion
**Entscheidung:** `DELETE /api/supply/ingredients/{slug}/portions/{portion_id}/` prüft vor dem Soft-Delete, ob RecipeItems referenzieren. Falls ja: für jedes referenzierende RecipeItem wird `portion_id` auf die aktuell gültige `rank=1`-Portion der Zutat umgehängt, wobei `quantity` so umgerechnet wird, dass die ursprüngliche Gramm-Menge (`alte_quantity × alte_weight_g`) erhalten bleibt (`neue_quantity = alte_quantity × alte_weight_g / neue_weight_g`). Anschließend wird die Portion wie bisher soft-gelöscht. **BREAKING** gegenüber der bestehenden `portion-soft-delete`-Spec (Scenario "RecipeItem mit gelöschter Portion" wird ersetzt).
**Alternative verworfen:** Löschen komplett blockieren, wenn referenziert — zu einschränkend für den normalen Zutaten-Pflege-Workflow; Auto-Rebind erhält die Nutzerabsicht (Menge in Gramm) ohne UI-Blocker.

### 5. AI-Mengenschätzung: `portion_id` immer = aktuelle rank=1-Portion, atomar übernommen
**Entscheidung:** `_build_response()` gibt zusätzlich `portion_id` der verwendeten `target_portion` zurück (die bereits heute berechnete rank=1-Portion). `EstimateQuantityItemOut`/Zod-Schema erweitert um `portion_id: int`. `handleApplyEstimate()` setzt `quantity` **und** `portion_id` gemeinsam. Damit ist der Ziel-Zustand nach "Übernehmen" immer konsistent mit dem, was die AI tatsächlich gemeint hat — unabhängig davon, auf welcher Portion die Zeile vorher stand.
**Alternative verworfen:** Backend rechnet stattdessen auf die *gespeicherte* Portion um (wie es die alte Spec `recipe-ai-quantity-estimate` ursprünglich vorsah) — wurde verworfen, weil das Nutzererlebnis (immer Gramm/rank-1, konsistent mit Edit-Mode-Entscheidung) dadurch nicht erreicht wird und weiterhin Mehrdeutigkeiten bei Duplikat-rank=1-Fällen bestehen könnten (die aber durch Decision 3 ausgeschlossen werden).

### 6. Backend-Plausibilitätscheck beim Speichern
**Entscheidung:** `PATCH /api/recipes/{id}/items/{item_id}/` (bzw. der zugrunde liegende Service) validiert bei Aufrufen aus dem AI-Estimate-Flow, dass `quantity × portion.weight_g` innerhalb einer Toleranz (z.B. ±1 %) der ursprünglich von der AI gemeinten Gramm-Menge liegt; andernfalls wird ein Fehler zurückgegeben statt stillschweigend zu speichern. Dies ist ein zusätzliches Sicherheitsnetz, falls Frontend und Backend künftig wieder auseinanderlaufen.

### 7. Edit-Mode: robuste Gramm-Berechnung statt fragiler Portion-Lookup
**Entscheidung:** `normalizeItems()` berechnet den editierbaren `quantity`-Wert künftig direkt aus dem backend-autoritativen `item.weight_g` (analog zu `getItemWeightG()`, das bereits für die Alt-Spalten-Anzeige existiert), statt über `ingredient_portions.find(p => p.id === item.portion_id)`, das bei fehlenden/gelöschten Portionen still auf `weight_g=1` zurückfällt. Anzeige erfolgt immer in Gramm, gebunden an die rank=1-Portion (Label "Gramm"/"g").

### 8. Bestandsreparatur: Reihenfolge und Automatisierungsgrad
**Entscheidung:** Ein neuer Management-Command (`repair_portion_integrity` o.ä.) läuft in fester Reihenfolge:
1. Dedupe der 125 Zutaten mit doppeltem `rank=1` (bereits referenzierte Portion gewinnt, sonst plausibelste `weight_g`).
2. Rebind aller RecipeItems mit toter Portion-Referenz (Decision 4 wiederverwendet).
3. AI-Plausibilitätsprüfung über alle 311 Rezepte (Wiederverwendung von `RecipeQuantityEstimationService`-Logik), automatische Korrektur ohne manuelle Freigabe, kein Report-File.
4. Vollständiger `recalculate_recipe_cache()` für alle veränderten Rezepte.
Diese Reihenfolge ist zwingend, weil Schritt 3 auf korrekten Portionsdaten aus Schritt 1+2 aufbaut.

## Risks / Trade-offs

- **[Risiko]** Automatische AI-Neuschätzung ohne manuelle Freigabe könnte bei einzelnen Rezepten (Ausnahmefälle, bewusst ungewöhnliche Mengen) falsche "Korrekturen" vornehmen. → **Mitigation:** Plausibilitätsgrenzen (nur Rezepte mit offensichtlich unrealistischem Gesamtgewicht/Portion werden angefasst), vollständige Nachvollziehbarkeit über bestehende `AiInteraction`-Logs.
- **[Risiko]** Der Dedupe-Schritt könnte bei den 125 Duplikat-Fällen die "falsche" Portion als rank=1 behalten, wenn keine RecipeItems referenzieren (Tie-Break auf `weight_g`-Plausibilität ist heuristisch). → **Mitigation:** Regressionstest deckt die dokumentierten Fälle ab; Ergebnis ist im schlimmsten Fall gleichwertig zum aktuellen (bereits inkonsistenten) Zustand, nicht schlechter.
- **[Risiko]** Guard-Rail "neue Portion statt Update" kann zu Portion-Wildwuchs führen (viele ähnliche Portionen pro Zutat über Zeit). → **Mitigation:** Ist durch das bestehende Soft-Delete/Rank-System bereits vorgesehen; alte, nicht mehr referenzierte Portionen können separat aufgeräumt werden (außerhalb dieses Changes).
- **[Trade-off]** Backend-Plausibilitätscheck (Decision 6) erhöht Kopplung zwischen AI-Estimate-Flow und Save-Endpoint. Bewusst in Kauf genommen als Sicherheitsnetz gegen genau die Bug-Klasse, die diesen Change ausgelöst hat.

## Migration Plan

1. Deploy Guard-Rails (Model/API-Constraints, Unique Index) — rein additiv, keine Datenänderung.
2. Deploy `recipe-quantity-repair`-Command, manuell einmalig gegen Produktions-DB ausführen (Dedupe → Rebind → AI-Plausibilität → Cache-Rebuild).
3. Deploy AI-Mengenschätzung-Fix (Backend Response-Schema + Frontend Apply-Logik) und Edit-Mode-Fix gemeinsam (beide Frontend-Schemas müssen synchron sein).
4. Rollback-Strategie: Guard-Rails sind rein additive DB-Constraints (Rollback = Migration zurückrollen). Der Reparatur-Command ist nicht automatisch rückgängig zu machen — vor dem produktiven Lauf wird ein DB-Snapshot/Backup empfohlen (Standard-Praxis, kein neuer Mechanismus nötig).

## Open Questions

Keine offenen Fragen — alle Kernentscheidungen wurden im Rahmen der Exploration (20 Rückfragen) mit dem Projektverantwortlichen geklärt.
