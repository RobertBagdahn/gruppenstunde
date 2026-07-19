## Context

Das MeasuringUnit-System hat sich organisch entwickelt und enthält Duplikate (`g` PK 101 vs `Gramm` PK 61), semantisch falsche Typen (Esslöffel als `MASS` statt `VOLUME`) und konzeptionelle Kategorie-Fehler (Stück, Scheibe, Dose, Glas etc. als MeasuringUnits, obwohl sie keine Messeinheiten mit definiertem Umrechnungsfaktor sind).

Aktuell listet die API `GET /api/supplies/measuring-units/` alle 21 Datensätze ungefiltert. Das Frontend zeigt sie im Dropdown als Roh-Namen (`g`, `Gramm`, `ml` nebeneinander). `kitchen-unit-display` (UnitSwitcher) und `unit-conversion` (Seed-Daten) referenzieren diese Einheiten.

**Constraint**: Rückwärtskompatibilität nicht nötig (aktive Entwicklung). Alle FK-Referenzen dürfen hart migriert werden.

## Goals / Non-Goals

**Goals:**
- MeasuringUnit auf 10 echte Küchenmesseinheiten reduzieren
- Duplikate mergen (`g`→`Gramm`, `ml`→`Milliliter`)
- Semantisch falsche Typen korrigieren (EL, TL, Tasse: `g`→`ml`)
- Dropdown-Anzeige formatieren: `Name (Menge Einheit)`, sortiert nach Relevanz
- KI-Knowledge mit realen MeasuringUnits synchronisieren
- UnitConversion-Records vor dem Löschen bereinigen

**Non-Goals:**
- Legacy-Portions-Namen bereinigen („100g", „1 Scheibe (50g)") — separates Folgeprojekt
- RecipeItem-Referenzen auf gelöschte MeasuringUnits — existieren nicht, da RecipeItems über Portionen gehen
- Frontend UnitSwitcher-Logik ändern (außer Unit-Namen-Referenzen aktualisieren)

## Decisions

### 1. Hart löschen statt is_active-Flag

**Entscheidung**: Gelöschte Units werden hart aus der DB entfernt.

**Alternativen**:
- `is_active=False` Flag: Erhöht Komplexität in jedem Query (`filter(is_active=True)`) und verhindert kein echtes Aufräumen.
- Soft-Delete: Gibt es bereits auf Portion-Ebene. Auf MeasuringUnit-Ebene unnötig, da FK-Referenzen vorher migriert werden.

**Risiko**: Kein Rollback ohne Backup. ⚠️ Vor Produktionslauf DB-Backup erstellen.

### 2. Volumen-Typ für EL, TL, Tasse

**Entscheidung**: EL (`unit="ml"`, `quantity=15`), TL (`unit="ml"`, `quantity=5`), Tasse (`unit="ml"`, `quantity=250`). `compute_weight_g` wendet dann `ingredient.physical_density` an.

**Alternativen**:
- Bei `unit="g"` belassen und nur Display korrigieren: Inkonsistent, das Modell lügt.
- Separates `display_unit`-Feld: Zusätzliche Komplexität für einen Edge Case.

**Konsequenz**: Portionen ohne `physical_density` auf der Zutat bekommen andere `weight_g`-Werte:
- EL: 10g → 15g (+50%) bei density=1.0; 10g → 7.5g (-25%) bei density=0.5
- TL: 5g → 5g (keine Änderung, quantity bleibt 5)
- Tasse: 150g → 250g (+67%) bei density=1.0

Portionen mit explizitem `weight_g` (nicht None) bleiben unverändert.

### 3. Stück, Packung, Portion, Scheibe, Dose, Glas, Becher, Bund entfernen

**Entscheidung**: Diese „Einheiten" beschreiben Formen/Verpackungen, keine Messeinheiten mit definiertem Umrechnungsfaktor. Sie sind Spezialfälle von „ein Exemplar von etwas". Alle FK-Referenzen werden auf `Gramm` (PK 61) migriert.

**Begründung**:
- Stück: `quantity=1.0` → `weight_g` immer 1.0 — produziert systematisch falsche Gewichte
- Packung/Portion: Subjektive Maße ohne Standard-Umrechnung
- Scheibe/Dose/Glas/Becher/Bund: Beschreiben die physische Form, nicht das Gewicht/Volumen

### 4. Schuss als neue MeasuringUnit

**Entscheidung**: `Schuss` (10 ml, VOLUME) wird als MeasuringUnit angelegt. Universale Volumeneinheit für Flüssiggewürze (Essig, Öl, Sojasauce). Wird bereits in `portion_knowledge.py` referenziert.

### 5. Dropdown: Format und Sortierung

**Entscheidung**: Anzeigeformat `{name} ({formatted_quantity} {unit_abbrev})` mit deutschen Dezimaltrennzeichen. Ausnahmen:
- Base-Units (`quantity=1.0`): nur Name ohne Faktor („Gramm", „Milliliter")

Sortierung statisch nach Küchenrelevanz (nicht dynamisch nach Nutzungshäufigkeit, um Layout-Flackern zu vermeiden):
1. Gramm
2. Kilogramm
3. Milliliter
4. Liter
5. Esslöffel
6. Teelöffel
7. Prise
8. Messerspitze
9. Tasse
10. Schuss

Implementiert über das existierende `MeasuringUnit`-Model — kein neues `sort_order`-Feld nötig, Reihenfolge wird im API-Endpunkt hartcodiert.

### 6. Kein neues Modell-Feld für Sortierung

**Entscheidung**: Die Sortierreihenfolge wird in der API-View (`list_measuring_units`) per `Case`/`When` hartcodiert. Kein migrationspflichtiges `sort_order`-Feld.

**Alternativen**:
- `sort_order` IntegerField: Sauberer, aber Migration + Admin-Pflege nötig. Overkill für 10 statische Einträge.
- Alphabetisch: Kilogramm und Gramm stehen dann weit auseinander.

## Risks / Trade-offs

| Risiko | Mitigation |
|--------|------------|
| EL/TL/Tasse Typ-Änderung ändert `compute_weight_g` für Portionen ohne explizites `weight_g` | Akzeptiertes Risiko. Werte werden korrekter (EL = 15ml per Definition). Betroffene Portionen erhalten bei nächstem Save neue Gewichte. |
| ~65.500 FK-Updates in einer Migration — potenziell langsam | `UPDATE ... WHERE measuring_unit_id IN (...)` ist ein einzelner Bulk-Update pro Ziel-ID. Keine Row-by-Row-Operation. |
| UnitConversion-Records mit Dangling-Referenzen | Vor dem Delete prüfen: `SELECT * FROM supply_unitconversion WHERE from_unit_id IN (deleted_ids) OR to_unit_id IN (deleted_ids)`. Gefundene Records löschen oder auf neue Units migrieren. |
| FK-Schutz (`on_delete=PROTECT`) auf `Portion.measuring_unit` verhindert Unit-Delete | FK-Referenzen werden VOR dem Unit-Delete in derselben Migration aktualisiert. Reihenfolge im `operations`-Array sichert dies. |
| Produktions-DB ohne Backup | `export_prod_data.py` vor Deployment laufen lassen. |
| KI schlägt weiterhin nicht-existente Einheiten vor | `portion_knowledge.py` wird synchron bereinigt. `unit_resolution.py`-Synonyms auf neue Unit-Namen aktualisiert. |
