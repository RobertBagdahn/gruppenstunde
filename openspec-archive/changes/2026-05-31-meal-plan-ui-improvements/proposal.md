## Why

Die Essensplan-Detailansicht zeigt Energie- und Faktor-Werte unklar an. Der Soll/Ist-Vergleich der Tagesenergie ist schwer zu lesen ("(35%) 7%"), und Faktoren werden ohne Nachkommastelle dargestellt ("1" statt "1,0"). Die Tabellenansicht zeigt zu wenig Informationen pro Zelle.

## What Changes

- **Soll/Ist Energie-Anzeige**: Darstellung im Meal-Slot-Header ändern von `(35%) 7%` zu `Soll: 35% │ Ist: 7%` für bessere Lesbarkeit
- **Faktor mit Nachkommastelle**: Alle Faktor-Anzeigen (Input + Read-only) zeigen immer eine Nachkommastelle (z.B. "1,0" statt "1")
- **Tabellen-Zellen erweitern**: Pro Zelle zusätzlich Faktor, Energie (kcal) und Kosten (€) anzeigen

## Capabilities

### New Capabilities

_Keine neuen Capabilities — reine UI-Verbesserung._

### Modified Capabilities

_Keine Spec-Änderungen — nur Frontend-Darstellung betroffen._

## Impact

- **Frontend-Food**: `src/pages/planning/MealEventDetailPage.tsx` (Slot-Header, FactorInput, Read-only-Faktor)
- **Frontend-Food**: `src/pages/planning/TableView.tsx` (erweiterte Zelleninhalte)
- **Keine API-Änderungen**: Alle benötigten Daten sind bereits in den Responses vorhanden
- **Keine Schema-Änderungen**: Weder Pydantic noch Zod betroffen
- **Keine Migrations**: Rein kosmetische Änderung
