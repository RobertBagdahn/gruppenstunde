## Context

Nach dem Stakeholder-Gespräch vom 23.06.2026 wurden 30 Bugs und unfertige Features identifiziert. Dieser Change behebt alle im Gespräch gefundenen Probleme in einem gebündelten Fix. Die App ist noch in der Demo-Phase (keine echten Endnutzer), daher kein Rückwärtskompatibilitätsdruck. BUG-016 (Kochplan) wird als eigener Change ausgelagert — zu eigenständig und zu komplex für diesen Bug-Fix-Batch.

## Goals / Non-Goals

**Goals:**
- Alle 29 identifizierten Bugs und unfertigen Features beheben
- Datenqualität sichtbar machen (nicht automatisch migrieren)
- Druckfunktionen als `/print`-Routen implementieren (gleiche Technologie für Rezept und Essensplan)
- AI-Import-Qualität durch Prompt-Anpassung verbessern
- Nährwertanalyse durchgehend auf pro-100g-Basis normieren

**Non-Goals:**
- Datenmigration für historische Energiewerte (erst sichten, dann entscheiden)
- Kochplan / Zubereitungsübersicht (eigener Change)
- Echte PDF-Generierung (WeasyPrint) für Druckansicht — `/print`-Route reicht
- Neue Nutzer-Rollen oder Permission-Änderungen

## Decisions

### Entscheidung: BUG-003 — kein automatisches Daten-Fix

**Problem:** Label war „Energie (kJ)", Code schreibt in `energy_kcal`. Alle bisher eingegebenen Werte könnten falsch sein.

**Entscheidung:** Label auf „Energie (kcal)" korrigieren. Keine automatische Migration. Stattdessen: Datenqualitäts-Ansicht zeigt alle Zutaten mit `energy_kcal > 900` als unplausibel an (BUG-026). Der Nutzer sichtet und korrigiert manuell.

**Alternativen verworfen:**
- `÷ 4.184` Migration: Zu riskant ohne Gewissheit ob User kcal oder kJ eingegeben hat
- Alle löschen und neu importieren: Zu destruktiv

---

### Entscheidung: Druckansicht als `/print`-Route (nicht `@media print` CSS)

**Problem:** Rezept (BUG-031) und Essensplan (BUG-015) brauchen Druckansicht. Stakeholder will „ein gutes Template".

**Entscheidung:** Dedizierte `/recipes/:slug/print` und `/meal-plans/:id/print` React-Routen. Kein simples CSS. Gleiche Technologie für beide. Layout: A4-optimiert, alle Sektionen ausgeklappt, keine Navigation, kein Header/Footer.

**Alternativen verworfen:**
- WeasyPrint (Server-PDF): Zu komplex für diesen Change, bereits in `meal-plan-export` specced
- `@media print`: Nicht ausreichend für das gewünschte Layout-Niveau

---

### Entscheidung: Portion-Ranking — ▲/▼ statt Drag&Drop

**Problem:** BUG-012 beschreibt Drag&Drop als kaputt. `portion-ranking` Spec definiert bereits ▲/▼-Buttons.

**Entscheidung:** ▲/▼-Buttons gemäß existierender Spec implementieren (waren wohl nie fertig). Kein Drag&Drop — zu komplex für Touch, ▲/▼ ist bereits specced und ausreichend.

---

### Entscheidung: BUG-010 / BUG-019 zusammenführen

Identischer Bug, doppelt erfasst. Wird als ein Fix behandelt: Vegan/Vegetarisch-Filter in `RecipeSearchDialog` / Mahlzeiten-Suche, basierend auf `nutritional_tags`.

---

### Entscheidung: BUG-011 Ref-Meal — Frontend-First-Debugging

Der Backend-Endpunkt existiert und ist getestet. „Für alle übernehmen" hat keinen Effekt → vermutlich fehlende TanStack Query Cache-Invalidierung nach dem API-Call. Lösung: `queryClient.invalidateQueries` nach erfolgreichem Sync-Response.

---

### Entscheidung: Nährwertanalyse ausschließlich pro 100g

BUG-021: Alle Gesundheitsanalysen und Einordnungsbalken auf Rezeptdetailseite NUR pro 100g. Absolute Werte werden nicht in Analysen gezeigt. Einkaufsliste und Essensplan bleiben bei absoluten Mengen.

---

### Entscheidung: AI-Prompt-Strategie für BUG-002 und BUG-006

Zwei separate Prompt-Anpassungen:
1. **BUG-002:** „und" in Zutatenname verboten → AI liefert immer genau eine Zutat pro Eintrag
2. **BUG-006:** Zustandsform immer erzwingen (frisch / getrocknet / TK / aus der Dose / gemahlen)

Keine DB-Migration für Bestandsdaten — nur neue Imports werden gefiltert.

---

### Entscheidung: BUG-020 Essensplan-Tabs — `is_reference` Flag auf MealPlan

Sharing-Modell existiert. Referenzpläne werden durch ein neues `is_reference` Flag auf `MealPlan` markiert — nur Admin kann setzen. UI zeigt drei Tabs: „Meine Pläne" (owner), „Geteilt mit mir" (shared, nicht eigene), „Referenz-Vorlagen" (`is_reference=True`).

---

### Entscheidung: BUG-029 Reserve — `reserve_percent` Feld auf MealPlan

Kein neues Modell. `MealPlan.reserve_percent` (DecimalField, default 10%) steuert den Reserveanteil. Einkaufsliste zeigt optional `1.300g (inkl. 10% Reserve = 130g)`.

## Risks / Trade-offs

- **[Risiko] Energiedaten falsch** → Die Datenqualitäts-Ansicht deckt Ausreißer auf. Nutzer korrigiert manuell. Kein Datenverlust.
- **[Risiko] BUG-022 URL-Import unklar** → Logs auf Production prüfen vor Fix. Wahrscheinlich fehlende Env-Variable oder Proxy-Konfiguration.
- **[Risiko] BUG-004 Day-Part-Aggregation** → Logik existiert im Frontend (`DayPlanView.tsx:115`), aber Anreisetag-Berechnung muss im Detail geprüft werden. Eventuell ist das Problem ein Null-Check für leere `day_part_factor`-Werte.
- **[Risiko] Viele parallele Änderungen** → Klare Aufgabenteilung nach Themenbereich in tasks.md reduziert Konfliktrisiko.
