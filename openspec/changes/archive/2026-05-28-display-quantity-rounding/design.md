## Context

Rezept-Zutaten haben exakte Mengen gespeichert (z.B. 15g Pfeffer für 8 Portionen). Bei Skalierung auf andere Portionenzahlen entstehen krumme Werte (1,875g). Die Anzeige soll praxistaugliche, aufgerundete Werte zeigen, ohne die interne Berechnung zu verändern.

Betroffen sind alle Stellen, die skalierte Mengen in g/kg oder ml/l anzeigen:
- Rezept-Detail: Zutatenliste mit Portionen-Scaler
- Einkaufslisten: Aggregierte Mengen aus Rezepten/MealPlans

## Goals / Non-Goals

**Goals:**
- Reine Frontend-Utility-Funktion `formatQuantity(value: number, unit: string): string`
- Stufenweise Aufrundung für g/ml-basierte Einheiten
- Automatischer Einheitenwechsel g→kg, ml→l ab 1000
- Deutsche Zahlenformatierung (Komma als Dezimaltrenner)

**Non-Goals:**
- Keine Änderung an Backend-APIs oder Datenmodellen
- Keine Rundung für Stück, EL, TL, Prise etc.
- Keine Änderung der internen Berechnungslogik

## Decisions

### 1. Reine Frontend-Lösung

Die Formatierung erfolgt ausschließlich im Frontend als Utility-Funktion. Die API liefert weiterhin exakte Werte.

**Rationale**: Einfacher, keine API-Änderung nötig. Einkaufslisten-API liefert auch exakte Werte, Frontend formatiert bei Anzeige.

**Alternative**: Backend-seitige Formatierung — abgelehnt, da unnötige Komplexität und Verlust der exakten Werte für weitere Berechnungen.

### 2. Aufrundung statt kaufmännische Rundung

Immer aufrunden (`Math.ceil` auf Schrittweite), damit Nutzer nie zu wenig kaufen/abmessen.

### 3. Einheitenwechsel bei >= 1000

Werte >= 1000g werden als kg angezeigt (z.B. 1050g → "1,1 kg"), analog ml → l.

### 4. Betroffene Dateien

- `frontend/src/utils/formatQuantity.ts` — neue Utility-Funktion
- `frontend/src/features/recipe/` — Zutatenliste-Komponente
- `frontend/src/features/shopping/` — Einkaufslisten-Anzeige

## Risks / Trade-offs

- [Aufrundung bei kleinen Mengen kann summiert deutlich mehr ergeben als benötigt] → Akzeptabel, da praxisnah (lieber etwas mehr)
- [Einheitenwechsel bei genau 1000g: "1 kg" statt "1000 g"] → Konsistent mit der Regel, kein Sonderfall nötig
