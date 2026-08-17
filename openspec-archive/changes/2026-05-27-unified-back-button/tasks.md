## 1. BackButton Komponente erstellen

- [x] 1.1 Erstelle `frontend/src/components/shared/BackButton.tsx` mit Props `to?`, `onClick?`, `className?`. Nutzt Lucide `ChevronLeft`, Label "Zurück", rendert als Link oder button je nach Props.
- [x] 1.2 Kopiere die Komponente nach `frontend-food/src/components/shared/BackButton.tsx`

## 2. Frontend (main) – Alle Zurück-Buttons ersetzen

- [x] 2.1 `pages/AdminUserDetailPage.tsx` – Ersetze inline Link+ArrowLeft durch `<BackButton to="/admin/users" />`, Layout auf Breadcrumb-artig umbauen (Button + Titel in einer Zeile)
- [x] 2.2 `pages/GroupDetailPage.tsx` – Ersetze inline "Zurück zur Übersicht" durch `<BackButton />`
- [x] 2.3 `pages/GroupCorporateIdentityPage.tsx` – Ersetze beide inline Zurück-Links
- [x] 2.4 `pages/NewEventPage.tsx` – Ersetze inline Zurück-Button — SKIPPED: ist Wizard-Step-Navigation, kein Zurück-Button
- [x] 2.5 `pages/PackingListDetailPage.tsx` – Ersetze `backLabel="Zurück zur Übersicht"` / inline Button
- [x] 2.6 `pages/QRCodePage.tsx` – Ersetze inline Zurück-Button
- [x] 2.7 `pages/profile/PrivacyPage.tsx` – Ersetze inline Zurück-Button — SKIPPED: ist Dialog-Step-Navigation
- [x] 2.8 `pages/recipes/RecipeDetailPage.tsx` – Existiert nur in frontend-food, dort erledigt
- [x] 2.9 `pages/recipes/RecipeCookingMode.tsx` – Existiert nur in frontend-food; ist Step-Navigation
- [x] 2.10 `pages/shopping/ShoppingListDetailPage.tsx` – Existiert nur in frontend-food, dort erledigt
- [x] 2.11 `pages/planning/MealEventDetailPage.tsx` – Existiert nur in frontend-food, dort erledigt
- [x] 2.12 `pages/supplies/IngredientDetailPage.tsx` – Ersetze backLabel-Nutzung
- [x] 2.13 `pages/supplies/MaterialDetailPage.tsx` – Ersetze backLabel-Nutzung
- [x] 2.14 `pages/admin/ApprovalQueuePage.tsx` – SKIPPED: ist Pagination-Button
- [x] 2.15 `pages/admin/EmbeddingFeedbackPage.tsx` – SKIPPED: ist Pagination-Button
- [x] 2.16 `pages/admin/EmbeddingViewerPage.tsx` – SKIPPED: ist Pagination-Button
- [x] 2.17 `components/events/dashboard/TimelineTab.tsx` – SKIPPED: ist Pagination-Button

## 3. Frontend-Food – Alle Zurück-Buttons ersetzen

- [x] 3.1 `pages/planning/MealEventDetailPage.tsx` – Ersetze inline Button+Material Icon, Layout auf Breadcrumb umbauen
- [x] 3.2 `pages/recipes/RecipeDetailPage.tsx` – Ersetze inline Zurück-Button
- [x] 3.3 `pages/recipes/RecipeCookingMode.tsx` – SKIPPED: ist Step-Navigation im Kochmodus
- [x] 3.4 `pages/shopping/ShoppingListDetailPage.tsx` – Ersetze backLabel-Nutzung

## 4. Verifizierung

- [x] 4.1 TypeScript-Kompilierung prüfen (`npm run build` in beiden Frontends) — keine neuen Fehler durch unsere Änderungen
- [ ] 4.2 Visuell prüfen: Breadcrumb-Layout konsistent auf allen umgebauten Seiten
