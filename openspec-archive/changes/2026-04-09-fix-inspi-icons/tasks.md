## 1. Datei-Umbenennung & Cleanup

- [x] 1.1 `Inspi_filter.png` → `inspi_filter.png` umbenennen via `git mv` (zwei Schritte wegen macOS case-insensitivity)
- [x] 1.2 Referenz in `SearchPage.tsx` von `Inspi_filter.png` auf `inspi_filter.png` aktualisieren
- [x] 1.3 Doppelten `inspi_front_kopfhoerer.webp`-Eintrag aus der `inspiImages`-Array in `AboutPage.tsx` entfernen

## 2. Footer-Icon Verzerrung beheben

- [x] 2.1 In `Layout.tsx` das Footer-Icon-Styling von `h-14 w-14` auf `w-14 h-auto object-contain` ändern

## 3. Dekorative Rand-Icons entfernen

- [x] 3.1 In `HomePage.tsx` das dekorative Inspi-Bild links (`inspi_pirat.png`, `absolute -left-6`) aus der Hero-Sektion entfernen
- [x] 3.2 In `HomePage.tsx` das dekorative Inspi-Bild rechts (`inspi_rover.png`, `absolute -right-4`) aus der Hero-Sektion entfernen
- [x] 3.3 In `HomePage.tsx` das dekorative Inspi-Bild (`inspi_creativ.png`) aus der CTA-Sektion entfernen

## 4. Card-Fallback-Bilder reparieren

- [x] 4.1 In `RecipeCard.tsx` Fallback-Bild von `object-cover` auf `object-contain p-4 bg-muted/30` ändern
- [x] 4.2 In `BlogCard.tsx` Fallback-Bild von `object-cover` auf `object-contain p-4 bg-muted/30` ändern
- [x] 4.3 In `ContentCard.tsx` Fallback-Bild von `object-cover` auf `object-contain p-4 bg-muted/30` ändern
- [x] 4.4 In `TitleImageEditor.tsx` Fallback-Bild von `object-cover` auf `object-contain p-6 bg-muted/30` ändern
- [x] 4.5 In `RecipeDetailPage.tsx` Fallback-Bild bei "Ähnliche Rezepte" von `object-cover` auf `object-contain p-4 bg-muted/30` ändern

## 5. Hero-Maskottchen-Größen vereinheitlichen

- [x] 5.1 In `AboutPage.tsx` Hero-Mascot von `h-48 md:h-64` auf `w-48 md:w-64 h-auto` umstellen
- [x] 5.2 In `ImpressumPage.tsx` Hero-Mascot von `h-36 md:h-48` auf `w-36 md:w-48 h-auto` umstellen
- [x] 5.3 In `DatenschutzPage.tsx` Hero-Mascot von `h-36 md:h-48` auf `w-36 md:w-48 h-auto` umstellen
- [x] 5.4 In `ToolLandingPage.tsx` Hero-Mascot Styling auf `w-36 md:w-48 h-auto` vereinheitlichen
- [x] 5.5 In `SearchPage.tsx` Hero-Icon `w-auto` explizit ergänzen (zu `h-20 md:h-28 w-auto`)

## 6. Verifikation

- [x] 6.1 Frontend-Build (`npm run build`) erfolgreich durchführen — keine Broken-Image-Referenzen (Vite build erfolgreich, pre-existing TS-Fehler in unrelated Dateien)
- [ ] 6.2 Visuell prüfen: HomePage, SearchPage, AboutPage, ImpressumPage, DatenschutzPage, RecipeCards, BlogCards
