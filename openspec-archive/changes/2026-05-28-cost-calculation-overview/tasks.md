## 1. Page-Komponente erstellen

- [x] 1.1 `src/pages/tools/CostCalculationPage.tsx` erstellen mit Grundstruktur (Header mit Suchfeld + "Preise verwalten"-Button, drei Sektionen)
- [x] 1.2 Rezeptkosten-Sektion: Alle Rezepte laden, Liste mit Name und Preis anzeigen, Suchfilter implementieren, Empty-State
- [x] 1.3 Wochenplan-Kosten-Sektion: Alle MealPlans laden, pro Plan Kosten abrufen, Karten mit pro Tag / pro Person / pro Pers./Tag anzeigen
- [x] 1.4 Frühstückskosten-Sektion: Aus MealPlan-Daten Breakfast-Meals filtern und Kosten aggregiert anzeigen, Empty-State
- [x] 1.5 Hinweis-Banner "Preise verwalten" mit Link zu `/ingredients` am Seitenende

## 2. Routing und Navigation

- [x] 2.1 Route `/cost-calculation` in `App.tsx` hinzufügen
- [x] 2.2 Sidebar-Navigation: "Kostenkalkulation" Eintrag unter Tools-Sektion mit Dollar-Icon hinzufügen

## 3. Styling und Layout

- [x] 3.1 Card-basiertes 2-Spalten-Layout (Rezeptkosten links, Wochenplan-Kosten rechts) mit responsive Fallback auf 1 Spalte (Mobile-First)
- [x] 3.2 Design an den externen Rezeptkalkulator anlehnen (beige/grüne Farbgebung der Cards, ähnliche Typografie)
