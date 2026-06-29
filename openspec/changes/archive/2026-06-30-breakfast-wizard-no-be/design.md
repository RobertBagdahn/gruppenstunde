## Context

Der Frühstücksassistent verwendet aktuell BE (Broteinheit) als zentrale Recheneinheit:
- Step 1: Nutzer wählt BE/Person → verteilt auf Brot-Sorten → BE × sharePercent → Scheiben × sliceWeightG → Gramm → kcal
- Step 2: Belag-Portionen decken BE → Intensität bestimmt Gramm pro Portion
- Step 5: Cockpit zeigt BE-abgeleitete Portionen ("×2,64 Scheibe")

Diese Abstraktion erschwert das Verständnis für Nutzer (die in Gramm und Kalorien denken) und erzwingt unnötige Konvertierungsschritte. Das Backend speichert bereits in Gramm — die BE existiert nur im Frontend.

## Goals / Non-Goals

**Goals:**
- BE vollständig aus dem Frühstücksassistenten entfernen (Frontend + Spezifikation)
- Wizard-Zustand auf `gramsPerPerson` umstellen (statt `bePerPerson`)
- Alle Berechnungsfunktionen in `breakfastCalc.ts` auf Gramm + kcal umstellen
- StepBasis: Gesamt-Gramm/Person als Eingabe
- StepBelag: Gramm-basierte Deckung statt BE-Deckung
- StepCockpit: Gramm + natürliche Einheiten anzeigen
- Normalisieren: Brot- + Belag-Gramm skalieren
- `day_part_factor` default auf 0.30 (30% Tagesbedarf)
- Extras (warme Gerichte + Zutaten) ins Energie-Ist integrieren
- Backend-Endpoint für Extra-Zutaten kcal-Berechnung
- Ampel: dreistufig (rot/gelb/grün) mit Überplanungs-Warnung bei >120%

**Non-Goals:**
- Keine Änderung am Backend-Speichermodell (MealItems bleiben in Gramm)
- Keine Datenmigration
- Keine Änderung an Step 4 (Getränke) — bleiben separat, kein Einfluss auf Soll
- Keine Personalisierung (bleibt bei Norm-Person 2335 kcal)
- Kein neues UI-Framework oder Design-System-Änderungen

## Decisions

### 1. BE → Gramm: Eingabeeinheit für StepBasis

**Entscheidung**: Gesamt-Gramm Brot/Person als zentrale Eingabegröße, verteilt pro Brot-Sorte via %-Slider.

**Alternativen**:
- **Pro Sorte direkt** (jede Brotsorte eigene Gramm-Eingabe): Mehr Freiheit, aber aufwendigere UI und schwierigeres Rebalancing. Gewählt: Gesamt + %-Verteilung behält das bewährte Slider-Pattern bei.
- **Scheiben/Person**: Wäre ein Retronym für BE — nicht besser.

**Konsequenz**: `bePerPerson` im WizardState wird zu `gramsPerPerson`. `beToGrams()` entfällt. `basisKcalPerPerson()` arbeitet direkt auf Gramm.

### 2. Belag-Deckung: Gramm-Verhältnis statt BE-Coverage

**Entscheidung**: Das Gramm-Verhältnis Brot:Belag wird geprüft. Typischer Richtwert: Belag ~25-40% des Brotgewichts.

**Alternativen**:
- **Coverage komplett weg**: Zu wenig Feedback für Nutzer
- **BE-Coverage beibehalten**: Widerspricht dem Ziel, BE zu entfernen
- **Gramm-basiertes Verhältnis**: Gibt sinnvolles Feedback ohne BE

**Konsequenz**: `toppingGramsPerPerson()` arbeitet direkt auf Gramm. `belagCoverageRatio()` prüft Gramm-Verhältnis.

### 3. Cockpit: Gramm + natürliche Einheiten

**Entscheidung**: Cockpit zeigt Gramm UND natürliche Einheiten (z.B. "158g (2,64 Scheiben)"). Gramm für Präzision, natürliche Einheiten für Vorstellbarkeit.

**Alternativen**:
- **Nur Gramm**: Präzise, aber "158g" sagt Nutzern nicht wie viele Scheiben das sind
- **Nur natürliche Einheiten**: Verliert die direkte Vergleichbarkeit mit Gramm-Angaben
- **Gramm + natürliche Einheiten**: Beste Kombination

### 4. Normalisieren: Brot + Belag Gramm, nicht BE

**Entscheidung**: `normalize()` skaliert Brot-Gramm und Belag-Gramm proportional. Das Verhältnis bleibt erhalten.

**Begründung**: Da BE nur eine Zwischenabstraktion war, macht Gramm-basiertes Normalisieren dasselbe mit einem Schritt weniger.

### 5. day_part_factor Default: 0.30

**Entscheidung**: Frühstück default 30% Tagesbedarf (701 kcal von 2335). Überschreibbar im Settingspanel.

**Begründung**: Frühstück ist eine Hauptmahlzeit und soll satt machen. 20-25% sind zu wenig für eine aktive Pfadfindergruppe.

### 6. Extras mit Backend-kcal

**Entscheidung**: Für Extra-Zutaten (Gemüse) liefert das Backend die kcal über einen einfachen Rechen-Endpoint. Frontend schickt `ingredient_id + quantity`, Backend antwortet mit `energy_kcal`.

**Alternativen**:
- **Frontend-Berechnung**: Würde `energy_kcal` pro Zutat im Wizard-State erfordern — möglich, aber aufwändiger und riskiert Inkonsistenz mit Backend-Daten.
- **Ignorieren**: 0 kcal für Extras ist falsch und widerspricht "voll integrieren".

### 7. Ampel: Dreistufig

**Entscheidung**: < 80% rot, 80-110% grün, 110-120% gelb, >120% rot mit Warnhinweis.

**Begründung**: Bewährtes Pattern aus bestehenden NutritionViews. Einfach, verständlich, handlungsleitend.

## Risks / Trade-offs

- **Extra-Zutaten kcal Endpoint**: Neuer API-Endpoint nötig → geringer Backend-Aufwand, aber zusätzlicher API-Call im Wizard. [Risk: Latenz bei vielen Zutaten] → Mitigation: Endpoint akzeptiert Array von Items in einem Request.
- **Umstellung von BE auf Gramm**: Bestehende RefMeals (gespeichert in Gramm) sind nicht betroffen, aber Rekonstruktion aus RefMeal (`refMealToWizardState.ts`) muss auf Gramm-Basis umgestellt werden. Keine Migration nötig, aber sorgfältige Code-Änderung.
- **Gramm-basiertes Belag-Verhältnis**: Der Richtwert (25-40% des Brotgewichts) ist eine Heuristik. Kann bei speziellen Diäten falsche Warnungen auslösen. [Risk: False Positives] → Mitigation: Warnung ist nicht-blockierend, Nutzer kann ignorieren.
