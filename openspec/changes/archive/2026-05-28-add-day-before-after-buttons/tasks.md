## 1. Frontend: Quick-Add Day Buttons

- [x] 1.1 In `MealPlanDetailPage.tsx`: Aus den gruppierten Tagen das erste und letzte Datum extrahieren
- [x] 1.2 "Tag davor"-Button (mit ChevronLeft Icon) oberhalb der Tagesliste rendern, der `addDay.mutate({ date: subDays(firstDate, 1) })` aufruft
- [x] 1.3 "Tag danach"-Button (mit ChevronRight Icon) unterhalb der Tagesliste rendern, der `addDay.mutate({ date: addDays(lastDate, 1) })` aufruft
- [x] 1.4 Beide Buttons nur anzeigen wenn mindestens ein Tag existiert
- [x] 1.5 Fehlerbehandlung: Toast bei API-Fehler (z.B. "Dieser Tag existiert bereits")
