## Context

DGE-Referenzwerte (empfohlene Tagesdosis nach Alter x Geschlecht) existieren doppelt:

1. **Statisches Dict** `supply/data/dge_reference.py` — 10 Altersgruppen x 2 Geschlechter, Makronährstoffe + Ballaststoffe. Enthält auch Konstanten (`NORM_PERSON_DAILY_KCAL` etc.) und Lookup-Funktionen `get_dge_reference()` / `get_all_dge_reference()`.

2. **Django-Model** `supply.models.DgeReference` — selbe Daten als DB-Tabelle, plus Max-Limits (`sugar_g_max`, `salt_g_max`, etc.) und Vitamin-C. Wurde nie mit Seed-Daten befüllt (Seed auskommentiert: "model was simplified, seed data is outdated"). Die Tabelle ist auf allen Umgebungen leer.

Die statischen Daten werden von allen aktiven Features genutzt (Norm-Person-Simulator, Frühstücks-Wizard, PDF-Export, Speisepläne). Das DB-Model wird nur von `recipe/api/nutrition.py` abgefragt — und liefert immer `None`, da die Tabelle leer ist. DGE-Coverage war also faktisch nie aktiv.

## Goals / Non-Goals

**Goals:**
- DB-Model `DgeReference`, zugehörigen Router (`/api/dge-references/`), Admin und Schemas entfernen
- `recipe/api/nutrition.py` auf statische `get_dge_reference()` umstellen, sodass DGE-Coverage endlich funktioniert
- Ungenutzte Frontend-Schemas und Hooks entfernen
- Migration zum Löschen der Tabelle

**Non-Goals:**
- DGE-Referenzwerte ändern oder erweitern
- Neue Admin-Oberfläche für DGE-Werte bauen
- Max-Limits (`sugar_g_max`, `salt_g_max`, etc.) migrieren — die statischen Daten enthalten diese nicht; die Felder waren ohnehin nie befüllt

## Decisions

### Decision 1: Statische Daten als alleinige Quelle

**Entscheidung:** Das statische `DGE_REFERENCE`-Dict in `supply/data/dge_reference.py` bleibt die Single Source of Truth. Kein DB-Model, kein Admin.

**Begründung:** Die Werte ändern sich selten (DGE publiziert Referenzwerte im 5-10 Jahres-Rhythmus). Ein Admin-Interface für 20 Zeilen lohnt den Wartungsaufwand nicht. Bei Bedarf können Admins das Dict editieren und deployen.

**Alternative:** DB-Model befüllen und nutzen. Abgelehnt — erhöht Komplexität ohne Mehrwert, da die Werte quasi-statisch sind.

### Decision 2: `recipe/api/nutrition.py` nutzt `get_dge_reference()`

**Entscheidung:** Die DGE-Coverage-Berechnung in `nutrition.py:256-293` ersetzt den DB-Query durch einen Aufruf von `get_dge_reference(age, gender)` aus den statischen Daten. Die Max-Limit-Felder (`fat_sat_g_max`, `sugar_g_max`, `salt_g_max`) entfallen aus der Coverage-Berechnung, da sie nicht in den statischen Daten enthalten sind und die DB-Tabelle leer ist (→ Coverage für diese Felder war nie aktiv).

**Begründung:** Die statischen Daten enthalten `energy_kcal`, `protein_g`, `fat_g`, `carbohydrate_g`, `fibre_g`. Für diese Felder kann Coverage korrekt berechnet werden.

**Alternative:** Max-Limits in statische Daten aufnehmen. Abgelehnt — das sind andere Werte (Obergrenzen, nicht Empfehlungen) und würden das Datenmodell aufblähen. Kann bei Bedarf später ergänzt werden.

### Decision 3: `DgeGenderChoices` mit entfernen

Das Choices-Enum `DgeGenderChoices` in `supply/models/reference.py` wird nur vom `DgeReference`-Model verwendet. Es kann mit entfernt werden.

## Risks / Trade-offs

- **[Risk] Migration auf Produktion** → Die Tabelle ist leer, `DROP TABLE` ist harmlos. Keine Daten zu verlieren.
- **[Risk] DGE-Coverage-Werte ändern sich** → Da die Coverage vorher immer `{}` war (leere DB), ist jedes Ergebnis besser als keins. Die neuen Werte basieren auf denselben Makronährstoff-Empfehlungen, die auch der Norm-Person-Simulator nutzt.
- **[Trade-off] Keine Admin-Pflege mehr** → Bei DGE-Änderungen muss Code deployed werden statt Admin-UI. Akzeptabel, da Änderungen extrem selten sind.
