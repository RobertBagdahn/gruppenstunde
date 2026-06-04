## ADDED Requirements

### Requirement: MealPlan-Skalierungsmodell ohne Aktivitätsfaktor
Der MealPlan SHALL seine Skalierung ausschließlich über `norm_portions` (Personenanzahl) und `reserve_factor` (Einkaufspuffer) definieren. Die Property `scaling_factor` SHALL `norm_portions × reserve_factor` ergeben. Ein PAL-/Aktivitätsfaktor SHALL kein Bestandteil des MealPlans sein.

#### Scenario: scaling_factor ohne Aktivitätsfaktor
- **WHEN** ein MealPlan `norm_portions = 18` und `reserve_factor = 1.2` hat
- **THEN** liefert `scaling_factor` den Wert `21.6` (= 18 × 1.2)

#### Scenario: scaling_factor ohne Reservepuffer
- **WHEN** ein MealPlan `norm_portions = 18` und `reserve_factor = 1.0` hat
- **THEN** liefert `scaling_factor` den Wert `18.0`

#### Scenario: MealPlan-Erstellung ohne activity_factor
- **WHEN** ein authentifizierter Nutzer POST `/api/meal-plans/` mit `norm_portions` und `reserve_factor` sendet
- **THEN** wird der MealPlan erstellt und das Request-Schema SHALL kein `activity_factor`-Feld akzeptieren oder erwarten

## REMOVED Requirements

### Requirement: Aktivitätsfaktor (PAL) im MealPlan
**Reason**: PAL ist ein Kalorienbedarfs-Faktor und gehört fachlich in den Norm-Portion-Rechner, nicht in die Berechnung physischer Einkaufsmengen. Die Anwendung von PAL auf Mengen führte zu unplausiblen Einkaufslisten (z.B. 11 kg statt 5.4 kg Brot) und zu Inkonsistenz mit Kosten-/Nährwert-Berechnungen.

**Migration**: Das Feld `MealPlan.activity_factor` wird per Datenbank-Migration entfernt. Bestehende Werte gehen verloren (keine Rückwärtskompatibilität nötig). PAL bleibt ausschließlich im Norm-Portion-Rechner (`supply/services/norm_person_service.py`, Tool `/tools/norm-portion-simulator`) verfügbar. API-Konsumenten dürfen `activity_factor` nicht mehr senden oder erwarten.
