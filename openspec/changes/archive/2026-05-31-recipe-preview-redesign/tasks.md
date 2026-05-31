## 1. Rezept-Vorschau Layout umbauen

- [x] 1.1 In `CreateRecipePage.tsx` die `renderPreviewExtras`-Funktion komplett neu gestalten: Sektionsbasiertes Layout mit Überschriften für Rezepttyp/Portionen, KPIs, Zutaten, Zubereitung und Tags
- [x] 1.2 KPIs als 2×2 Grid mit Icons und Labels implementieren (Schwierigkeit, Kochzeit, Kosten, Vorbereitungszeit)
- [x] 1.3 Zutaten als vertikale Liste darstellen (eine Zeile pro Zutat: Menge + Einheit + Name)
- [x] 1.4 Beschreibung/Zubereitung als eigene Sektion mit Überschrift und Markdown-Rendering einfügen
- [x] 1.5 Tags und Pfadfinderstufen als eigene Sektion am Ende platzieren

## 2. ContentStepper Preview-Sektion anpassen

- [x] 2.1 Prüfen ob die generischen KPI-Badges und Tag-Chips im ContentStepper für Rezepte ausgeblendet werden sollten (da `renderPreviewExtras` diese nun selbst rendert) — ggf. eine `hideDefaultPreview`-Option oder ähnlichen Mechanismus einbauen
- [x] 2.2 Sicherstellen, dass andere Content-Typen (Blog, Game, Session) weiterhin die generische Preview nutzen

## 3. Visuelles Feintuning

- [x] 3.1 Responsive Darstellung testen (Mobile 320px bis Desktop)
- [x] 3.2 Tailwind-Klassen an die Detailseite angleichen (Spacing, Typografie, Sektions-Trenner)
