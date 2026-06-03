## Why

Während der Speiseplanung im Essensplaner (TableView) ist es für Gruppenführer mühsam, die Einhaltung des Budgets zu überwachen. Bisher mussten sie dafür auf den Reiter „Kosten“ (CostDashboard) wechseln. Eine direkte Anzeige der verbleibenden bzw. überschrittenen Budget-Beträge pro Tag und Person direkt in den Tagessummen-Zellen der Tabelle erhöht die Benutzerfreundlichkeit und Effizienz bei der Rezeptauswahl erheblich.

## What Changes

- Erweiterung der Tagessummen-Zeile („Tagessumme“) in der `TableView` um eine dynamische Budget-Ampel pro Tag.
- Berechnung der täglichen Kosten pro Person auf Basis der Tagessumme geteilt durch `norm_portions`.
- Vergleich der täglichen Kosten pro Person mit dem im Speiseplan konfigurierten `budget_per_person_per_day`.
- Anzeige des verbleibenden Budgets („noch X,XX € / Pers.“) oder des Überschreitungsbetrags („+X,XX € / Pers.“) unterhalb der täglichen Energie- und Kostenwerte in der Tabellen-Fußzeile.
- Visuelle Hervorhebung (Farbe und Rahmen) basierend auf dem Budget-Status:
  - Grün (Kosten <= Budget): Ausreichend Budget vorhanden.
  - Gelb (Kosten <= Budget * 1.2): Budget leicht überschritten (bis zu 20%).
  - Rot (Kosten > Budget * 1.2): Budget deutlich überschritten (mehr als 20%).
- Berücksichtigung von Tagen, für die kein Budget konfiguriert ist (Ausblendung der Ampel-Anzeige).

## Capabilities

### New Capabilities
- None

### Modified Capabilities
- `meal-plan-table-view`: Erweiterung der Tagessumme um die tägliche Budget-Ampel und Berechnung der Pro-Person-Kosten relativ zum konfigurierten Plan-Budget.

## Impact

- **Frontend-Komponenten**: `TableView.tsx` wird aktualisiert, um `budgetPerPersonPerDay` als neue Prop entgegenzunehmen, die Pro-Person-Kosten zu berechnen, mit dem Budget zu vergleichen und visuell darzustellen.
- **Frontend-Pages**: `MealEventDetailPage.tsx` übergibt das Feld `plan.budget_per_person_per_day` an die `TableView`.
- **Zod-Schemas**: Keine Anpassungen erforderlich, da `budget_per_person_per_day` bereits im `MealPlanSchema` vorhanden ist.
- **Datenbank & API**: Keine Änderungen am Backend oder Datenmodell nötig, da alle relevanten Daten (Budget und Tageskosten) bereits vorhanden sind und geliefert werden.
