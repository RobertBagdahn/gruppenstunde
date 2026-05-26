# Implementation Tasks — recipe-detail-sidebar-layout

## 1. Komponenten-Extraktion

- [x] 1.1 `frontend/src/components/recipe/RecipeHeaderInfo.tsx` extrahieren aus `RecipeDetailPage.tsx` (Nutri-Badge + Gesamtkosten-KPI aus Change #1)
- [x] 1.2 Komponente akzeptiert Props: `nutriClass`, `priceTotal`, ggf. Recipe-Objekt
- [x] 1.3 Klasse `lg:hidden` als Default-Styling am Root-Element der Komponente

## 2. Sidebar-Komponente

- [x] 2.1 `frontend/src/components/recipe/RecipeSidebar.tsx` neu anlegen
- [x] 2.2 Props: `recipe`, `recipeId` (für Actions)
- [x] 2.3 Styling: `hidden lg:flex flex-col gap-4 w-80 sticky top-20 self-start max-h-[calc(100vh-5rem)] overflow-y-auto`
- [x] 2.4 Inhalt in Reihenfolge: (a) Hero-Metadaten (Rezepttyp, Autor, Zubereitungszeit, Schwierigkeit), (b) Nutri-Score-Badge, (c) Gesamtkosten-KPI, (d) PortionScaler (kompakt), (e) Action-Buttons „Einkaufsliste", „Teilen"
- [x] 2.5 Vorhandene Portion-Scaler-Komponente: Prop `compact?: boolean` hinzufügen; bei `compact=true` kleinere Höhe und engere Spacings

## 3. Mobile Action Bar

- [x] 3.1 `frontend/src/components/recipe/RecipeMobileActionBar.tsx` neu anlegen
- [x] 3.2 Styling: `fixed bottom-0 inset-x-0 h-16 pb-[env(safe-area-inset-bottom)] lg:hidden bg-background border-t z-40`
- [x] 3.3 Zwei Flex-1 Buttons: „Einkaufsliste" (öffnet bestehenden Portions-/Export-Dialog) und „Portionen" (öffnet Bottom-Sheet mit PortionScaler)
- [x] 3.4 Focus-Detection: useEffect mit `document.addEventListener('focusin'/'focusout')`, State `isTextareaFocused`, konditional `translate-y-full` anwenden
- [x] 3.5 Transition: `transition-transform duration-200`
- [x] 3.6 Aria-Labels: „Einkaufsliste erstellen", „Portionen skalieren"

## 4. Portion-Bottom-Sheet für Mobile

- [x] 4.1 Komponente `PortionBottomSheet` (oder shadcn/ui Sheet mit `side="bottom"`) für Mobile-Portionen-Skalierung
- [x] 4.2 Inhalt: identischer PortionScaler im Full-Size-Modus
- [x] 4.3 Öffnen via State in `RecipeDetailPage`, Button aus MobileActionBar triggert `setPortionSheetOpen(true)`

## 5. Layout-Umbau in RecipeDetailPage

- [x] 5.1 Root-Layout ändern zu: `<div class="mx-auto max-w-7xl lg:grid lg:grid-cols-[1fr_320px] lg:gap-8 pb-20 lg:pb-0">`
- [x] 5.2 Hauptinhalt in `<main class="min-w-0">` wrappen
- [x] 5.3 `<RecipeSidebar recipe={recipe} recipeId={recipeId} />` als zweite Grid-Spalte
- [x] 5.4 `<RecipeMobileActionBar recipeId={recipeId} onOpenPortions={...} onOpenShoppingList={...} />` am Ende renderbarem Output
- [x] 5.5 `<RecipeHeaderInfo />` bleibt in Hauptinhalt, hat bereits `lg:hidden`
- [x] 5.6 Hero-Bild-Platzierung: in Hauptinhalt, nicht in Sidebar

## 6. Action-Integration

- [x] 6.1 Existierenden Einkaufslisten-Export-Dialog-Trigger aus Header in eine wiederverwendbare Handler-Funktion extrahieren
- [x] 6.2 Handler in `RecipeDetailPage` definieren, an Sidebar und MobileActionBar als Prop übergeben
- [x] 6.3 „Teilen"-Button in Sidebar: Native `navigator.share()` mit Fallback `copyToClipboard(location.href)` + Toast „Link kopiert"

## 7. Responsive-Verifikation

- [ ] 7.1 Manuelles Testen auf 320px Viewport (iPhone SE): kein horizontaler Scroll, Bottom-Bar sichtbar, Bottom-Bar verschwindet bei Kommentar-Textarea-Focus
- [ ] 7.2 Manuelles Testen auf 768px (iPad Portrait): einspaltig, Bottom-Bar sichtbar, keine Sidebar
- [ ] 7.3 Manuelles Testen auf 1024px: Sidebar erscheint, Bottom-Bar verschwindet, Header-Info-Box verborgen
- [ ] 7.4 Manuelles Testen auf 1440px: Sidebar 320px, Hauptinhalt bekommt Rest, `max-w-7xl` verhindert Überbreite
- [ ] 7.5 Resize von 1400 auf 800 Live testen: Sidebar verschwindet sauber, Bottom-Bar erscheint

## 8. Qualität und Cleanup

- [x] 8.1 `pnpm tsc --noEmit` grün
- [x] 8.2 `pnpm lint` grün
- [ ] 8.3 Lighthouse-CLS-Check auf Mobile: Bottom-Bar darf keinen CLS verursachen (initial rendered mit Ziel-Position)
- [ ] 8.4 Accessibility: Tab-Order prüfen (Haupt-Content → Sidebar-Actions auf Desktop; Haupt-Content → Bottom-Bar auf Mobile)
- [ ] 8.5 Zeilenzahl RecipeDetailPage nach Extraktion: Ziel < 1200 Zeilen (von ~1400 nach Change #1/#2)

## 9. OpenSpec Archive

- [ ] 9.1 `openspec validate recipe-detail-sidebar-layout --strict` erfolgreich
- [ ] 9.2 Via `openspec archive recipe-detail-sidebar-layout` archivieren
