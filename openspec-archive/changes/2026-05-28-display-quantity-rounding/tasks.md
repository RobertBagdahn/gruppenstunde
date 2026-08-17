## 1. Utility-Funktion erstellen

- [x] 1.1 `frontend/src/utils/formatQuantity.ts` erstellen mit Funktion `formatQuantity(value: number, unit: string): string`
- [x] 1.2 Rundungslogik implementieren: < 2 → 0.1, 2–10 → 1, 10–1000 → 5, >= 1000 → 100 (Aufrundung)
- [x] 1.3 Einheitenwechsel implementieren: g → kg ab 1000, ml → l ab 1000
- [x] 1.4 Deutsche Zahlenformatierung (Komma als Dezimaltrenner)
- [x] 1.5 Nicht-g/ml-Einheiten unverändert durchreichen

## 2. Rezept-Zutatenliste integrieren

- [x] 2.1 Komponente finden, die skalierte Zutatenmengen anzeigt
- [x] 2.2 `formatQuantity` in die Mengenanzeige einbauen

## 3. Einkaufsliste integrieren

- [x] 3.1 Komponente finden, die aggregierte Mengen in der Einkaufsliste anzeigt
- [x] 3.2 `formatQuantity` in die Mengenanzeige einbauen
