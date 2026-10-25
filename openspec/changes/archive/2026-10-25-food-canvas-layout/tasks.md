# Tasks

## 1. Rezepttyp-Chips

- [x] 1.1 `frontend-food/src/pages/recipes/RecipeListPage.tsx`: Typ-Chips auf die Chip-Regel umstellen (weiße Fläche `bg-card`, Rand `border-border`, Farbpunkt über `recipeTint` und `RECIPE_DOT_CLASSES`, aktiv `border-primary text-primary-dark font-semibold`, Höhe `h-11 md:h-9`). Logik und URL-State bleiben unverändert.
- [x] 1.2 Vitest-Test für die Chip-Markierung (`aria-pressed`, Farbpunkt je Typ, Petrol-Rand bei aktivem Chip) ergänzen; `npx vitest run` für die Datei grün.

## 1b. Startseite

- [x] 1b.1 `frontend-food/src/pages/HomePage.tsx`: Startseite im Canvas-Layout (Hero-Band mit Maskottchen, vier neutrale Bereichskacheln mit Zählern und Tags, Weiter-planen-Karte mit Kennzahlen und Fortschritt, Drei-Schritte-Erklärung, Beliebt-Karten). Tokens statt Hex-Werten, keine Kategorie-Tönung außer bei Rezepttypen; `HomePage.test.tsx` grün.

## 1c. Rezeptdetail

- [x] 1c.1 Rezeptdetail im Canvas-Layout: Typ- und Nutri-Chips im Kopf, Aktionszeile (Zum Essensplan, Bearbeiten, Drucken), Kennzahlen, Zutatenkarte mit Summenzeile, nummerierte Schritte mit neutralem Petrol-Badge, Aside mit Kochen starten, Einkaufsliste, Steckbrief und „In Essensplänen“. Nur Tokens, keine Kategorie-Tönung außer Rezepttyp; `npx vitest run` der Datei, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1d. Rezept erstellen und bearbeiten im Canvas-Layout

- [x] 1d.1 `frontend-food/src/pages/recipes/EditRecipePage.tsx` und Rezept-Assistent (`RecipeWizard.tsx`, `WizardStepBasis.tsx`) im Kartenlayout: Abschnittsköpfe mit Icon-Plakette (`bg-primary-soft`) und Großbuchstaben-Label, neutrale Karten, Chips und Felder mit 44 px Tippfläche, Schrift 16 px auf dem Phone, Aktionszeile mit Petrol-Primär und Petrol-Soft-Nebenaktion. Schatten nur `shadow-card`/`shadow-soft`, `bg-white` und `text-white` entfernt; Formularlogik, Zod-Schema und Berechtigungen unverändert. `npx vitest run` der Dateien, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1e. Rezept-Assistent Schritte im Canvas-Layout

- [x] 1e.1 Schritte `WizardStepMethod`, `WizardStepMetadata`, `WizardStepIngredients`, `WizardStepMaterials`, `WizardStepSteps` und `WizardStepPreview` sowie die Schrittanzeige in `RecipeWizard.tsx` im Kartenlayout: Abschnittsköpfe mit Icon-Plakette (`bg-primary-soft`) und Großbuchstaben-Label, neutrale `bg-card shadow-card`-Karten, sekundäre Chips und Buttons in `bg-primary-soft text-primary-dark`, Felder mit `min-h-11` und 16 px auf dem Phone. Nur Tokens, keine Kategorie-Tönung. Felder, Validierung, Zod-Schema, Navigation und Speichern unverändert. `StepEditor`, `RecipeMaterialsEditor` und `InlineIngredientEditor` nicht verändert (auch auf der Bearbeitungsseite genutzt). `npx vitest run` der Wizard-Dateien, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1f. Kochmodus im Canvas-Layout

- [x] 1f.1 `frontend-food/src/pages/recipes/RecipeCookingMode.tsx`: Zutaten- und Schrittbereich als `bg-card shadow-card`-Karten mit Icon-Plakette (`bg-primary-soft`), Schrittnummer als neutrales Petrol-Badge, Abschnittsmarke in Petrol-Dunkel, Fortschrittsbalken auch auf dem Desktop, Nebenaktion `Zurück` als `secondary`-Button, Zeitangabe mit Lucide-Uhr statt Emoji. Tippflächen `min-h-11`. Schrift der Schritte (`text-section`/`lg:text-title`) unverändert. Navigation, Timer, Tastatur, Wake Lock, Verlassen und Zutaten-Häkchen unverändert. `designRules.test.ts` und `pageHeaders.test.tsx` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1g. Meine Rezepte im Canvas-Layout

- [x] 1g.1 `frontend-food/src/pages/recipes/MyRecipesPage.tsx`: Seitenkopf mit Anzahl-Pille, Aktion „Alle Rezepte“ als Petrol-Soft-Nebenaktion, Kartenraster wie in der Rezeptliste (2/3/4 Spalten), Leerzustand über `EmptyState`, Paginierung über die gemeinsame `Pagination` (URL-State `?page=`). Karten und Rezepttyp-Tags unverändert aus `RecipeCard`. Keine Filter, Suche oder Sortierung auf dieser Seite vorhanden. `MyRecipesPage.test.tsx` neu; `npx vitest run` der Datei, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1h. Rezept-Ordner im Canvas-Layout

- [x] 1h.1 `frontend-food/src/pages/recipes/RecipeFoldersPage.tsx`: Seitenkopf als `PageHeader` mit Ordner-Anzahl-Pille und Aktion „Meine Rezepte“ (Petrol-Soft-Nebenaktion), Anlage-Formular als weiße Karte mit 44 px Feldern, neutrale weiße Ordnerkarten mit Petrol-Soft-Icon-Plakette (keine Rezepttyp-Tönung), 44 px Tippflächen für Umbenennen und Löschen, Leerzustand mit Icon-Plakette, Lade-Skeleton mit Lichtschimmer. Navigation, Anlegen, Umbenennen, Löschen mit `ConfirmDialog`, Berechtigungen und Fehlermeldungen unverändert. `RecipeFoldersPage.test.tsx` neu; `npx vitest run` der Datei, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1i. Essenspläne-Liste im Canvas-Layout

- [x] 1i.1 `frontend-food/src/pages/planning/MealEventListPage.tsx`: Seitenkopf als `PageHeader` mit Anzahl-Pille, Anstehend/Vergangen als Chips (aktiv Petrol, inaktiv `bg-card` mit `border-border`, 44 px Höhe), Plan-Karten als `bg-card shadow-card` mit neutraler Datumskachel (`bg-primary-soft`), Tags neutral (`bg-muted`), Fortschrittsbalken in Petrol auf `bg-muted`, Monatsüberschriften als Großbuchstaben-Label, Aktionsmenü mit 44 px Tippfläche, Norm-Portion-Simulator als Petrol-Soft-Nebenaktion. Lade-Skeleton mit `skeleton-shimmer`. Filter, Suche, Sortierung, Tabs, Paginierung, Anlegen, Vorlagen, Leerzustände und Berechtigungen unverändert. Keine Kategorie-Tönung, keine Typfarben. `MealEventListPage.test.tsx` und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1j. Essensplan-Detail im Canvas-Layout

- [x] 1j.1 `frontend-food/src/pages/planning/MealEventDetailPage.tsx` und die nur hier genutzten Teile (`DayPlanView`, `MealSlot`, `TableView`, `CostDashboard`): Kennzahlen-Reihe aus vorhandenen Plandaten (Tage, Mahlzeiten gefüllt mit Fortschrittsbalken, Portionen, Einkauf-Reserve) mit Großbuchstaben-Labels, Unter-Tabs als Pillen mit 44 px Höhe, Tagesköpfe und Mahlzeiten-Karten neutral (keine Mahlzeittyp-Tönung, nur das Icon trägt den Typ), Warnhinweis als `bg-warning-soft`, Schatten nur `shadow-card`/`shadow-soft`/`shadow-raised`. Funktionen, URL-State, Berechnung, Teilen und Einstellungen unverändert. `designRules.test.ts` und die Planungs-Tests grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1k. Planassistent im Canvas-Layout

- [x] 1k.1 `frontend-food/src/pages/planning/wizard/MealPlanWizardPage.tsx` und die Schritte `StepBasicSettings`, `StepStrategy`, `StepAiPrompt`, `StepCockpit`, `ExtendedSettingsSection`: Schrittanzeige wie im Rezept-Assistenten (nummerierte Kreise mit Verbindungslinie, aktiver Schritt auf Phones als Text), Abschnittsköpfe mit Icon-Plakette (`bg-primary-soft`), Strategie-Karten mit Petrol-Soft-Auswahl, Chips und Nebenaktionen in `bg-primary-soft text-primary-dark`, Felder mit `min-h-11` und 16 px auf dem Phone, Schatten nur `shadow-card`/`shadow-soft`. Nur Tokens, keine Kategorie-Tönung. Schrittreihenfolge, Validierung, Zod, KI-Ablauf, Speichern, Navigation und URL-State unverändert. `npx vitest run` der Wizard-Dateien und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1l. Frühstück-Assistent im Canvas-Layout

- [x] 1l.1 `frontend-food/src/pages/planning/breakfast/BreakfastWizardPage.tsx` und die Schritte `StepBasis`, `StepStreichfett`, `StepBelag`, `StepExtras`, `StepGetraenke`, `StepCockpit` im Planassistenten-Layout: `FlowHeader` mit Schrittanzeige und nummerierten Schritt-Kreisen, Abschnittsköpfe mit Icon-Plakette (`WizardSectionHeading`), neutrale `bg-card shadow-card`-Karten, Chips und Nebenaktionen in `bg-primary-soft text-primary-dark` (44 px), Mengenfelder mit 44 px Höhe und 16 px Schrift auf dem Phone, Entfernen-Buttons 44 px, `ActionBar` als Fußleiste. Nur Tokens, keine Kategorie-Tönung. Schritte, Auswahl, Mengen, Validierung, Speichern, Teilen-Logik und URL-State unverändert. `ShareSlider` bleibt unverändert, weil es auch vom Buffet-Assistenten genutzt wird. `npx vitest run` der Frühstücks-Dateien und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1m. Referenz-Mahlzeiten-Editor im Canvas-Layout

- [x] 1m.1 `frontend-food/src/pages/planning/RefMealEditorPage.tsx`: Kopf als `DetailHeader` mit Zurück-Pille, Abschnitte als `bg-card shadow-card`-Karten mit Icon-Plakette und Großbuchstaben-Label (`WizardSectionHeading`), Rezeptkacheln neutral `bg-muted` mit `RecipeTypeTag` als einziger Typ-Tönung, Such- und Faktorfelder mit `WIZARD_INPUT_CLASS` und 44 px Höhe, Entfernen-Button 44 px, Aktionen als Petrol-Primär und Petrol-Soft-Nebenaktion. Auswahl, Reihenfolge, Faktoren, Normalisieren, Speichern, Synchronisieren, Verknüpfen, Löschen-Bestätigung und Berechtigungen unverändert. `npx vitest run` der Verknüpfungs- und Design-Tests, `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1n. Neuer Essensplan im Canvas-Layout

- [x] 1n.1 `/meal-plans/new` ist `MealPlanWizardPage` und damit der Planassistent aus 1k. Nachzug: Zeitfelder der erweiterten Einstellungen (`ExtendedSettingsSection`) auf 16 px auf dem Phone (`text-emphasis`), erweiterter Bereich ohne Box-in-Box (Trennlinie oben statt bordered Karte). Formularfelder, Zod-Validierung, Erstellen-und-Weiterleiten und Berechtigungen unverändert. `npx vitest run` der Wizard-Dateien und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1o. Meal-Events im Canvas-Layout

- [x] 1o.1 `frontend-food/src/pages/tools/MealEventLandingPage.tsx` (Route `/meal-plans`; `/meal-events/*` leitet nur weiter): Eigenes Layout statt `ToolLandingPage` mit `PageHeader` (Titel, Beschreibung, Petrol-Primär „Zu den Essensplänen“), Abschnitte mit `WizardSectionHeading`, neutrale `bg-card shadow-card`-Karten mit `bg-primary-soft`-Icon-Plakette, Nebenaktionen in `bg-primary-soft text-primary-dark` (44 px), FAQ als Karten, Abschluss-Karte mit `shadow-raised`. Keine Kategorie-Tönung, keine Hex-Werte. Texte, Links und Anmelde-Logik unverändert. `MealEventLandingPage.test.tsx` neu; `npx vitest run` der Datei und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1p. Einkaufslisten-Übersicht im Canvas-Layout

- [x] 1p.1 `frontend-food/src/pages/shopping/ShoppingListPage.tsx`: Listenkarten als `card-hover bg-card shadow-card` ohne Rahmen und ohne `shadow-md`, Event-Name als neutrale Petrol-Soft-Pille, Fortschritt inline in Petrol (`bg-muted`-Balken, `bg-success-bright` bei vollständiger Liste), Löschen-Button und Umschalter 44 px auf dem Phone. Kopf, Suche, Erstellen, Event-Auswahl, Leerzustände, Berechtigungen und URL-State unverändert; `ShoppingListProgress` bleibt für die Detailseite unverändert. `ShoppingListPage.test.tsx` und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1q. Einkaufsliste-Detail im Canvas-Layout

- [x] 1q.1 `frontend-food/src/pages/shopping/ShoppingListDetailPage.tsx` und `ShoppingListItemRow.tsx` (nur hier genutzt): Breadcrumbs statt Zurück-Link, breiter Hauptbereich mit Seitenkarte rechts (ab `lg`, auf dem Phone oben) mit `ShoppingListProgress` (unverändert), Kostenkarte mit Großbuchstaben-Label und Tipp-Hinweis mit Maskottchen. Abteilungskarten mit Icon-Plakette (`bg-primary-soft`) und „x von y“ je Abteilung, neutral ohne Kategorie-Tönung. Kopf-Schaltflächen als `bg-card shadow-soft`, Preise in `tabular-nums`. Einkaufsmodus (`ShoppingBoardView`), Teilen, Mitglieder, Berechtigungen, Suche und Summen unverändert. `ShoppingListDetailPage.test.tsx`, `ShoppingListItemRow.test.tsx`, `ShoppingListPage.test.tsx` und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1r. Einkauf-Beitritt im Canvas-Layout

- [x] 1r.1 `frontend-food/src/pages/shopping/ShoppingListJoinPage.tsx` (nur hier genutzt): Karte mit `bg-card shadow-card`, Icon-Plakette als `bg-primary-soft` (rounded-xl), Namensfeld und Petrol-Primär „Einkaufsliste öffnen“ mit 44 px. Ladezustand als Formular-Skelett in der Karte, Fehlerzustand mit `ErrorDisplay` (ohne eingebaute Knöpfe) und eigenen Knöpfen: „Erneut versuchen“ als Petrol-Primär (ausgeblendet bei abgelaufenem Link) und „Zu meinen Einkaufslisten“ als Petrol-Soft-Nebenaktion. Beitritts-Ablauf, Gast-Zugangsdaten, Weiterleitungen, Fehlertexte und Berechtigungen unverändert. `npx vitest run` von `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1s. Trip-Planung im Canvas-Layout

- [x] 1s.1 `frontend-food/src/pages/shopping/TripPlanningPage.tsx` mit `TripCard`, `UncoveredSection` und `MoveAllocationDialog` (nur hier genutzt): Rücklink als Breadcrumbs im `PageHeader`, Einkaufskarten `bg-card shadow-card`, Status „Geplant“ als Petrol-Soft-Pille, Hinweisblock `shadow-soft`, Verschieben-Dialog mit 16 px Auswahlfeldern auf dem Phone, 44 px Tippflächen für Radio-Zeilen und die Zuordnung zurücknehmen, Abschnittslabels in Großbuchstaben. Laden, Anlegen, Ändern, Löschen, Verschieben, Zuordnung zurücknehmen, Liste erstellen und Berechtigungen unverändert. `TripFormDialog` bleibt unverändert, weil `DayPlanView` es ebenfalls nutzt. `npx vitest run` der Trip-Dateien und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1t. Zutaten-Liste im Canvas-Layout

- [x] 1t.1 `frontend-food/src/pages/ingredients/IngredientListPage.tsx` mit `IngredientFilterSidebar` (Filter jetzt als weiße Chip-Zeilen statt Seitenleiste, aktiv nur Petrol-Rand und -Schrift) und neuer `IngredientTableRow` (`bg-card shadow-card`-Zeilen mit Nutri-Score über `NutriScoreBadge`, kcal und Preis je kg; Mobil-Werte unter dem Namen). `IngredientCard.tsx` entfernt (nur von dieser Seite genutzt). Kopf als `PageHeader` mit Anzahl-Pille und Brotkrumen, Sortierung und Statistik-Knopf im Listen-Stil der Rezeptliste, Suche, Anlegen, Filter, Sortierung, Paginierung, Leerzustände, Löschen-Dialog und Berechtigungen (`can_delete`) unverändert. Keine Kategorie-Tönung. `npx vitest run` der Zutaten-Dateien und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1u. Zutat-Detail im Canvas-Layout

- [x] 1u.1 `frontend-food/src/pages/ingredients/IngredientDetailPage.tsx` mit `detail/IngredientSummary.tsx` und neuer `detail/IngredientNutrientAside.tsx` (nur hier genutzt): Seitenbreite `max-w-7xl` wie das Rezeptdetail, Kennzahlen-Reihe mit Nutri-Score über `NutriScoreBadge` als Kachel (`bg-card shadow-card`, Großbuchstaben-Label, `text-section`-Werte), Zwei-Spalten-Layout ab `lg` mit Seitenkarte rechts (Makro-Balken pro 100 g in Petrol auf neutraler Spur, Portions-Pillen neutral), Portionskarten ohne farbige Kopfbänder (Icon-Plakette `bg-primary-soft`, Standard-Portion über `ring-primary-soft-border`). Bearbeiten, Löschen, KI-Aktionen, Berechtigungen, Verifizieren, Links, Abschnitte und Dialoge unverändert. Keine Kategorie-Tönung, keine Hex-Werte. `npx vitest run` der Zutat-Detail-Dateien und `designRules.test.ts` grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1v. Zutat erstellen und bearbeiten im Canvas-Layout

- [x] 1v.1 `frontend-food/src/pages/ingredients/CreateIngredientPage.tsx` und `IngredientEditPage.tsx`: Abschnitte als `bg-card shadow-card`-Karten mit Icon-Plakette (`bg-primary-soft`) und Großbuchstaben-Label (Erstellen über `WizardSectionHeading`, Bearbeiten mit gleicher Kopfoptik), Felder über `WIZARD_INPUT_CLASS` und `WIZARD_LABEL_CLASS` mit 44 px und 16 px Schrift auf dem Phone, Chips für Allergene und Tags in `bg-primary-soft`/`bg-card` mit 44 px Höhe, Nebenaktionen in `bg-primary-soft text-primary-dark`, Primär-Buttons in `bg-primary`, Fehlerboxen über `bg-danger-soft`. Modal-Schatten nur `shadow-raised`, keine Tints außer Rezepttyp, keine Hex-Werte. Felder, Zod-Validierung, Same-Name-Prüfung, Speichern, Berechtigungen und Navigation unverändert. `CreateIngredientPage*.test.tsx`, `IngredientEditPage*.test.tsx` und `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1w. Zutaten-Statistik im Canvas-Layout

- [x] 1w.1 `frontend-food/src/pages/ingredients/statistics/IngredientStatisticsPage.tsx` mit Tabs unter `statistics/tabs/` und `statistics/components/`: Kopf als `PageHeader`, Auswertungs-Tabs als weiße Chips mit feinem Rand (aktiv nur Petrol-Rand und -Schrift, 44 px Höhe auf dem Phone), Kategorie-Label in Großbuchstaben Petrol, Inhaltskarte `shadow-card`. Filter-Selects und Umschalter 44 px auf dem Phone, Ladeplatzhalter mit Lichtschimmer statt Pulsieren. NOVA-Stufen neutral mit `bg-*-bright`-Punkten statt Statusflächen, Heatmap-Linie über `chart-*`, Tooltip-Schatten `shadow-soft`. Diagrammdaten, Filter, Tabs, URL-State und Exporte unverändert. `designRules.test.ts`, `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1x. Material-Seiten im Canvas-Layout

- [x] 1x.1 `frontend-food/src/pages/materials/MaterialListPage.tsx`, `MaterialDetailPage.tsx`, `MaterialChecklistPage.tsx` (Route `/material-list`) und `components/material/MaterialFormDialog.tsx` (nur von diesen Seiten genutzt): Kopf als `PageHeader` mit Brotkrumen bzw. `DetailHeader` mit Zurück-Pille, Filter-Chips im Zutaten-Stil (44 px auf dem Phone, aktiv nur Petrol-Rand und -Schrift), Listenzeilen als `bg-card shadow-card` mit neutraler Icon-Plakette, Typ-Badges neutral (Verbrauch `bg-muted`, Gerät `bg-primary-soft`), Abschnittskarten der Checkliste mit Icon-Plakette und 44 px Zeilen, Fortschrittsanzeige in Petrol auf `bg-muted`, Sekundäraktionen `bg-primary-soft text-primary-dark`, Formular-Auswahlfelder mit 16 px auf dem Phone. Keine Kategorie-Tönung, keine Hex-Werte. Suche, Filter, URL-State, Paginierung, Abhaken (localStorage), Sortierung, Kopieren, Drucken, Berechtigungen (`can_edit`, `can_delete`) und Zusammenführen unverändert. `npx vitest run` von `MaterialChecklistPage.test.tsx` (7 Tests) und `designRules.test.ts` (8 Tests) grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1y. Konto-Seiten im Canvas-Layout

- [x] 1y.1 `frontend-food/src/pages/profile/ProfilePage.tsx` (öffentliches Profil), `MyProfilePage.tsx` (Mein Profil) und `AccountPage.tsx` (Konto & Anmeldung): Kopf als `DetailHeader`, Abschnitte als `bg-card shadow-card`-Karten mit Icon-Plakette (`WizardSectionHeading`, Großbuchstaben-Label), Profilbild-Aktionen als sichtbare 44 px Schaltflächen statt Hover-Overlay, Profil-Dialog mit `WIZARD_INPUT_CLASS`/`WIZARD_LABEL_CLASS` und 16 px Schrift auf dem Phone, Sichtbarkeit als neutrale Pille, Kennzahlen mit `text-metric`, Nebenaktionen in `bg-primary-soft text-primary-dark` (44 px), Listenzeilen ohne Rahmen und ohne `shadow-md`. Keine Kategorie-Tönung, keine Hex- oder `text-white`-Werte. Profildaten, Bearbeiten, Speichern, Bildupload und -löschen, Anbieter trennen, KI-Kontingent, Abmelden, Weiterleitungen und Anmeldeprüfung unverändert. `npx vitest run` von `designRules.test.ts` und `pageHeaders.test.tsx` grün (keine eigenen Tests für diese Seiten vorhanden); `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1z. Login und Registrierung im Canvas-Layout

- [x] 1z.1 `frontend-food/src/pages/LoginPage.tsx`: Hero-Band wie auf der Startseite (`bg-primary-soft shadow-card`, Sticker „Für Gruppenstunde, Fahrt &amp; Lager“, Maskottchen `/images/inspi_thinking.webp` ab `md`), Formularkarte `bg-card shadow-card` mit Icon-Plakette (`bg-primary-soft`, 44 px) und Überschrift „Anmelden“ als `h2`. Fehlerhinweis, Anmeldeoptionen, Weiterleitung, Consent-Text und E-Mail-Formular (`LoginPanel`, `PasswordLoginForm`) unverändert. `RegisterPage.tsx` ist nur eine Weiterleitung auf `/login?mode=register` und bleibt unverändert. `LoginPage.test.tsx` und `designRules.test.ts` grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1aa. Rechtliches, Simulator und Styleguide im Canvas-Layout

- [x] 1aa.1 `frontend-food/src/pages/legal/DatenschutzPage.tsx` und `ImpressumPage.tsx`: Inhalt und Texte unverändert; Abschnitte als `bg-card shadow-card`-Karten mit `md:p-8`, Abschnittsüberschriften als `h2` (Seitentitel bleibt die einzige H1), Link-Karte „Meine Daten & Datenschutz“ (nur angemeldet) als `bg-card shadow-card` mit `bg-primary-soft`-Icon-Plakette und 44 px Höhe, Lesebreite `max-w-3xl` bleibt. `frontend-food/src/pages/tools/NormPortionSimulatorPage.tsx`: Abschnittsköpfe mit Icon-Plakette (`bg-primary-soft`) und Großbuchstaben-Label, PAL-Auswahl als 44 px Kacheln mit Petrol-Soft-Auswahl, Felder über `WIZARD_INPUT_CLASS`/`WIZARD_LABEL_CLASS` (16 px auf dem Phone), Fehlerhinweise über `danger-soft`/`danger-border`/`danger-foreground`, Ergebniskacheln mit `bg-primary-soft` für den Normfaktor, Tooltip und Schatten nur `shadow-soft`/`shadow-card`, Referenzlinie des Diagramms ohne Hex-Wert. Berechnung, Diagrammdaten, URL-State (`pal`, `meal-plan-id`, `age`, `gender`) und Texte unverändert. `StyleguidePage.tsx` nicht geändert, weil keine gemeinsame Komponente geändert wurde, die dort gezeigt wird. `npx vitest run` von `designRules.test.ts`, `StyleguidePage.test.tsx` und `src/pages/tools` (13 Tests) grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1ab. Admin-Übersicht im Canvas-Layout

- [x] 1ab.1 `frontend-food/src/pages/admin/AdminPage.tsx` mit `PageHeader` (Brotkrumen, Titel „Stammdaten“) und weißen Chip-Tabs (aktiv nur Petrol-Rand und -Schrift, 44 px auf dem Phone); Tabs `TagTab`, `RetailSectionTab`, `NutritionalTagTab`, `RuleTab`, `ApprovalTab` und `AiFeedbackTab`: Anzahl als Petrol-Soft-Pille, Nebenaktionen in `bg-primary-soft text-primary-dark`, Tippflächen 44 px auf dem Phone, Regel-Bereichsmarken neutral (keine Typ-Farben), Schalter für Regeln mit 44 px Tippfläche, Schatten nur `shadow-card`/`shadow-soft`/`shadow-raised`, Skeleton mit Lichtschimmer. Tabellen bleiben lesbar. Tabs, URL-State, Freigaben, Regeln, Berechtigungen und alle Admin-Aktionen unverändert. `designRules.test.ts` grün; `npm test`, `npm run lint` und `npx tsc --noEmit` grün.

## 1ac. Datenqualität und Verteilung im Canvas-Layout

- [x] 1ac.1 `frontend-food/src/pages/admin/DataQualityPage.tsx` mit `PageHeader` und weißen Chip-Tabs (aktiv nur Petrol-Rand und -Schrift, 44 px auf dem Phone); `DataQualityIngredientsPage.tsx` und `DataQualityRecipesPage.tsx` mit Prüf-Chips im selben Stil (Plausibilitäts-Anzahl als Danger-Soft-Pille, `py-0.2` korrigiert). `frontend-food/src/pages/DataDistributionsPage.tsx` mit `PageHeader`, Typ-Chips und Diagrammkarten `bg-card shadow-card` als `section` mit `h2`; Streudiagramm nur über `chart-1`/`chart-2` statt Hex-Werten. Nur direkt genutzte Komponenten in `components/data-quality/` und `DataOffensivePage` (Fehlerhinweis): Karten ohne Rahmen `bg-card shadow-card` mit `hover:shadow-soft`, Schatten `hover:shadow-sm` entfernt, `bg-primary/10`/`bg-primary/5` durch `bg-primary-soft` ersetzt, `destructive`-Fläche durch `danger-soft`/`danger-border`/`danger`, Tabellen-Box `overflow-x-auto`. Tabs, Filter, URL-State, Diagrammdaten, Listen, Aktionen und Berechtigungen unverändert. `npx vitest run` von `designRules.test.ts` (8 Tests) und `src/components/data-quality` (19 Tests) grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 1ad. Data Offensive, Tag-Detail und 404 im Canvas-Layout

- [x] 1ad.1 `frontend-food/src/pages/admin/DataOffensivePage.tsx` (Cockpit-Tab unter `/admin/data-quality/cockpit`; der Kopf kommt von `DataQualityPage`, daher kein zweiter H1): Zutaten/Packungen als weiße Chips (aktiv nur Petrol-Rand und -Schrift, 44 px auf dem Phone); `OffensiveKpiGrid` als `bg-card shadow-card`-Kacheln ohne Rahmen; Problem-Chips der Nährwerte mit 44 px Tippfläche; Sticky-Leisten `shadow-soft`; Fehlerhinweise und Problem-Markierungen über `danger`-Tokens statt `destructive/…`; Confidence-Chip mit Petrol-Soft. Abläufe, URL-State, Berechtigungen und Texte unverändert.
- [x] 1ad.2 `frontend-food/src/pages/admin/TagDetailPage.tsx`: `DetailHeader` mit Zurück-Pille „Zurück zu Tags“, Stammdaten als `dl` in `bg-card shadow-card` mit Großbuchstaben-Labels in Petrol, Rezept- und Zutatenkarten mit Icon-Plakette (`bg-primary-soft`) und 44 px Linkzeilen. Daten, Links (neuer Tab) und Texte unverändert.
- [x] 1ad.3 `frontend-food/src/pages/NotFoundPage.tsx`: Hero-Fläche `bg-primary-soft shadow-card` mit Maskottchen `/images/inspi_confused.png` und einem Petrol-Primärbutton „Zur Startseite“ (navigiert wie zuvor auf `/`). Text „Seite nicht gefunden“ jetzt als H1. `npx vitest run` von `designRules.test.ts` und `PackageSuggestionsPanel.test.tsx` (17 Tests) grün; `npm test` (189 Dateien, 1481 Tests), `npm run lint` und `npx tsc --noEmit` grün.

## 2. Qualitätstore

- [x] 2.1 `npm test` aus `frontend-food` grün (alle Tests, einschließlich `designRules.test.ts`).
- [x] 2.2 `npm run lint` aus `frontend-food` ohne neue Fehler.
- [x] 2.3 `npx tsc --noEmit` aus `frontend-food` ohne Fehler.

## 3. Playwright-Baselines im Container

- [x] 3.1 `sh e2e/update-ui-baselines.sh` aus dem Worktree-Stamm, erster Lauf; PNG-Prüfsummen notieren.
- [x] 3.2 Zweiter Lauf; PNG-Prüfsummen vergleichen. Identisch = reproduzierbar.
- [x] 3.3 Die Baseline `startseite` und `rezeptdetail` für `ui-mobile` und `ui-desktop` mit dem Read-Werkzeug öffnen und beschreiben. Außerdem `rezeptuebersicht` (Chips).
- [x] 3.4 Nur abhaken, wenn 3.3 tatsächlich ausgeführt wurde.

## 4. Abschluss

- [x] 4.1 `openspec validate food-canvas-layout --strict` grün.
- [ ] 4.2 Archivieren mit `openspec archive food-canvas-layout`, erst wenn 2.x, 3.x und `openspec validate` grün sind.
