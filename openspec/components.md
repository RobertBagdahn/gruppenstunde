# Komponenten-Karte

Dieses Dokument bildet die wichtigsten UI-Komponenten und Backend-Module der Inspi-Plattform ab, organisiert nach Domaene. Verwende es als Referenz bei der Planung von Aenderungen, um zu verstehen welche Dateien betroffen sind.

## Plattform-Uebersicht

Die Plattform besteht aus zentralen Komponenten und funktionalen Modulen:

| Modul | Django App | Beschreibung | Frontend-Bereich |
|-------|-----------|-------------|------------------|
| **Zentral** | `core`, `profiles` | Auth, Profil, Gruppen, Admin | `/login`, `/profile/*`, `/groups/*`, `/admin/*` |
| **Ideen & Wissen** | `idea` | Lern-Ideen, Wissensbeitraege, Suche | `/search`, `/idea/:slug`, `/create` |
| **Rezepte** | `recipe` | Rezepte (eigenstaendiges Modul) | `/recipes`, `/recipes/:slug` |
| **Veranstaltungen** | `event` | Events, Buchung, Teilnehmer | `/events` (Landing), `/events/app` (App) |
| **Gruppenstundenplan** | `planner` | Heimabend-Planung | `/session-planner` (Landing), `/session-planner/app` (App) |
| **Essensplan** | `planner` | Mahlzeitenplanung, Einkaufslisten | `/meal-plans` (Landing), `/meal-plans/app` (App) |
| **Packlisten** | `packinglist` | Packlisten mit Kategorien | `/packing-lists` (Landing), `/packing-lists/app` (App) |

> **Hinweis**: Jedes Tool hat eine oeffentliche Landing-Page (ohne Login) und eine `/app`-Sub-Route fuer die eigentliche Anwendung.

## Backend-Module

### Django Apps

| App | Verzeichnis | Zweck | Wichtige Dateien |
|-----|-------------|-------|------------------|
| **idea** | `backend/idea/` | Kern-Idea-Verwaltung, Tags, Materialien, Suche, Views, Kommentare, Emotions | `models.py`, `api.py`, `schemas.py`, `services/ai_service.py`, `services/search_service.py`, `services/view_service.py`, `services/export_service.py` |
| **core** | `backend/core/` | Auth-API, Middleware, Paginierung, Speicher, Admin-Seite | `api.py`, `schemas.py`, `middleware.py`, `pagination.py`, `storage.py`, `admin.py` |
| **event** | `backend/event/` | Events, Buchung, Registrierung, Teilnehmer, Standorte, Personen | `models.py`, `api.py`, `schemas.py` |
| **profiles** | `backend/profiles/` | Benutzerprofile, Einstellungen, Gruppen, Mitgliedschaften, Beitrittsanfragen | `models.py`, `api.py`, `schemas.py` |
| **planner** | `backend/planner/` | Heimabend-Planung (gruppenbasiert, Wochentag+Uhrzeit, Status, Collaborators), Essensplan | `models.py`, `api.py`, `schemas.py` |
| **packinglist** | `backend/packinglist/` | Packlisten mit Kategorien und Items | `models.py`, `api.py`, `schemas.py`, `admin.py` |

### API-Router

| Router | Mount-Pfad | Quelle | Spec-Domaene |
|--------|-----------|--------|--------------|
| Auth | `/api/auth/` | `core/api.py` | auth-session |
| Ideas | `/api/ideas/` | `idea/api.py` | idea-management, search |
| Tags | `/api/tags/` | `idea/api.py` | idea-management |
| AI | `/api/ai/` | `idea/api.py` | ai-features |
| Admin | `/api/admin/` | `idea/api.py` | admin |
| Materials | `/api/materials/` | `idea/api.py` | idea-management |
| Users | `/api/users/` | `profiles/api.py` | user-profiles |
| Profile | `/api/profile/` | `profiles/api.py` | user-profiles |
| Groups | `/api/groups/` | `profiles/api.py` | group-management |
| Events | `/api/events/` | `event/api.py` | event-management |
| Persons | `/api/persons/` | `event/api.py` | user-profiles |
| Locations | `/api/locations/` | `event/api.py` | event-management |
| Planner | `/api/planner/` | `planner/api.py` | planner, session-planner |
| Meal Plans | `/api/meal-plans/` | `planner/api.py` (NEU) | meal-plan |
| Ingredients | `/api/ingredients/` | `idea/api.py` (NEU) | ingredient-database |
| Ingredient AI | `/api/ingredients/{slug}/ai/` | `idea/api.py` (NEU) | ai-features, ingredient-database |
| Recipe Analysis | `/api/ideas/{id}/recipe-checks/` | `idea/api.py` (NEU) | ingredient-database |
| Retail Sections | `/api/retail-sections/` | `idea/api.py` (NEU) | ingredient-database |
| Nutritional Tags | `/api/nutritional-tags/` | `idea/api.py` (NEU) | ingredient-database |
| Measuring Units | `/api/measuring-units/` | `idea/api.py` (NEU) | ingredient-database |
| Packing Lists | `/api/packing-lists/` | `packinglist/api.py` | packing-list |

### Backend-Dienste

| Dienst | Pfad | Spec-Domaene | Zweck |
|--------|------|--------------|-------|
| AIService | `backend/idea/services/ai_service.py` | ai-features | Gemini-Integration (Textverbesserung, Tag-Vorschlaege, Aufbereitung, Embeddings) |
| IngredientAIService | `backend/idea/services/ingredient_ai.py` | ai-features, ingredient-database | KI-Autovervollstaendigung fuer Zutaten (6 Schritte) |
| NutriService | `backend/idea/services/nutri_service.py` | ingredient-database | Nutri-Score Berechnung, Naehrwert-Aggregation |
| PriceService | `backend/idea/services/price_service.py` | ingredient-database | Preiskaskade (Price -> Portion -> RecipeItem -> Recipe -> Meal -> MealPlan) |
| NormPersonService | `backend/idea/services/norm_person.py` | ingredient-database, meal-plan | Norm-Personen-Berechnung (Mifflin-St Jeor), Portionsskalierung |
| RecipeChecksService | `backend/idea/services/recipe_checks.py` | ingredient-database | Rezept-Bewertungen (Saettigung, Preis, Gesundheit, Geschmack) |
| HintService | `backend/idea/services/hint_service.py` | ingredient-database | RecipeHint-Regelabgleich fuer Verbesserungsvorschlaege |
| ShoppingService | `backend/idea/services/shopping_service.py` | meal-plan, ingredient-database | Einkaufslisten-Generierung aus MealPlan |
| SearchService | `backend/idea/services/search_service.py` | search | Hybride Suche (Volltext + Trigramm + Vektor-Aehnlichkeit) |
| ViewService | `backend/idea/services/view_service.py` | seo-analytics | Bot-Erkennung, IP-Hashing, View-Deduplizierung |
| ExportService | `backend/idea/services/export_service.py` | admin | Instagram-Slide-Generierung |

## Frontend-Komponenten

### Seiten (Routen)

> Die folgenden Routen entsprechen 1:1 den Route-Definitionen in `frontend/src/App.tsx`.
> Seiten, die noch nicht implementiert sind, sind mit "(NEU)" markiert.

#### Zentral

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| HomePage | `src/pages/HomePage.tsx` | `/` | idea-management, search |
| LoginPage | `src/pages/LoginPage.tsx` | `/login` | auth-session |
| RegisterPage | `src/pages/RegisterPage.tsx` | `/register` | auth-session |
| ProfilePage | `src/pages/ProfilePage.tsx` | `/profile` | user-profiles |
| NamePage | `src/pages/NamePage.tsx` | `/profile/name` | user-profiles |
| NamePage (Admin) | `src/pages/NamePage.tsx` | `/profile/name/:userId` | user-profiles |
| EinstellungenPage | `src/pages/EinstellungenPage.tsx` | `/profile/settings` | user-profiles |
| PersonsPage | `src/pages/PersonsPage.tsx` | `/profile/persons` | user-profiles |
| UserProfilePage | `src/pages/UserProfilePage.tsx` | `/user/:userId` | user-profiles |
| GruppenPage | `src/pages/GruppenPage.tsx` | `/profile/groups` | group-management |
| GroupDetailPage | `src/pages/GroupDetailPage.tsx` | `/groups/:slug` | group-management |
| MyDashboardPage | `src/pages/MyDashboardPage.tsx` | `/my-dashboard` | user-profiles |
| AdminPage | `src/pages/AdminPage.tsx` | `/admin` (Layout mit `:section` Child-Route) | admin |
| AdminUserDetailPage | `src/pages/AdminUserDetailPage.tsx` | `/admin/users/:userId` | admin |
| AboutPage | `src/pages/AboutPage.tsx` | `/about` | - |
| ImpressumPage | `src/pages/ImpressumPage.tsx` | `/imprint` | - |
| DatenschutzPage | `src/pages/DatenschutzPage.tsx` | `/privacy` | - |

#### Modul 1: Ideen & Wissen

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| SearchPage | `src/pages/SearchPage.tsx` | `/search` | search |
| IdeaPage | `src/pages/IdeaPage.tsx` | `/idea/:slug` | idea-management, comments-emotions |
| CreateHubPage | `src/pages/CreateHubPage.tsx` | `/create` | idea-management |
| NewIdeaPage | `src/pages/NewIdeaPage.tsx` | `/create/:ideaType` | idea-management |
| MaterialPage | `src/pages/MaterialPage.tsx` | `/material/:slug` | idea-management |

#### Modul 3: Veranstaltungen (Events)

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| EventsLandingPage | `src/pages/tools/EventsLandingPage.tsx` | `/events` (Landing) | event-management |
| EventsPage | `src/pages/EventsPage.tsx` | `/events/app` | event-management |
| NewEventPage | `src/pages/NewEventPage.tsx` | `/events/app/new` | event-management |
| EventDetailPage | (NEU) | `/events/app/:slug` | event-management |

#### Modul 4: Gruppenstundenplan (Session Planner)

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| SessionPlannerLandingPage | `src/pages/tools/SessionPlannerLandingPage.tsx` | `/session-planner` (Landing) | session-planner |
| PlannerPage | `src/pages/PlannerPage.tsx` | `/session-planner/app` | session-planner |

#### Modul 5: Essensplan (Meal Plan)

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| MealPlanLandingPage | `src/pages/tools/MealPlanLandingPage.tsx` | `/meal-plans` (Landing) | meal-plan |
| MealPlanListPage | `src/pages/planning/MealPlanListPage.tsx` | `/meal-plans/app` | meal-plan |
| MealPlanDetailPage | `src/pages/planning/MealPlanDetailPage.tsx` | `/meal-plans/:id` | meal-plan |

#### Modul 6: Packlisten

| Seite | Pfad | Route | Spec-Domaene |
|-------|------|-------|--------------|
| PackingListLandingPage | `src/pages/tools/PackingListLandingPage.tsx` | `/packing-lists` (Landing) | packing-list |
| PackingListsPage | `src/pages/PackingListsPage.tsx` | `/packing-lists/app` | packing-list |
| PackingListDetailPage | `src/pages/PackingListDetailPage.tsx` | `/packing-lists/app/:id` | packing-list |

### Geteilte UI-Komponenten

| Komponente | Pfad | Verwendet in | Spec-Domaene |
|------------|------|-------------|--------------|
| Layout | `src/components/Layout.tsx` | Alle Seiten | - (Shell) |
| ErrorBoundary | `src/components/ErrorBoundary.tsx` | `main.tsx` (wraps App) | error-handling |
| ErrorDisplay | `src/components/ErrorDisplay.tsx` | HomePage, SearchPage, IdeaPage, EventsPage, PlannerPage, PackingListDetailPage | error-handling |
| ConfirmDialog | `src/components/ConfirmDialog.tsx` | PlannerPage, PackingListsPage, PackingListDetailPage, EventsPage, PersonsPage | error-handling |
| IdeaCard | `src/components/IdeaCard.tsx` | HomePage, SearchPage, DashboardPage | idea-management |
| SearchBar | `src/components/SearchBar.tsx` | HomePage (Hero-Variante), Layout (Standard) | search |
| IdeaFilterSidebar | `src/components/IdeaFilterSidebar.tsx` | SearchPage | search |
| CommentSection | `src/components/CommentSection.tsx` | IdeaPage | comments-emotions |
| SimilarIdeas | `src/components/SimilarIdeas.tsx` | IdeaPage | search |
| EditableSection | `src/components/EditableSection.tsx` | IdeaPage (Bearbeitungsmodus) | idea-management |
| MarkdownEditor | `src/components/MarkdownEditor.tsx` | CreateIdeaPage, NewIdeaPage, NewEventPage, IdeaPage (Bearbeitung) | idea-management, event-management |
| MarkdownRenderer | `src/components/MarkdownRenderer.tsx` | IdeaPage, NewIdeaPage, RefurbishPage, NewEventPage | idea-management, event-management |

### Utilities

| Utility | Pfad | Verwendet in | Spec-Domaene |
|---------|------|-------------|--------------|
| pdfExport | `src/lib/pdfExport.ts` | IdeaPage (PDF-Download-Button) | idea-management |

### API-Hooks (TanStack Query)

| Hook-Datei | Pfad | Spec-Domaene | Wichtige Hooks |
|------------|------|--------------|----------------|
| ideas.ts | `src/api/ideas.ts` | idea-management, search | `useIdeas`, `useIdea`, `useIdeaBySlug`, `useCreateIdea`, `useUpdateIdea`, `useDeleteIdea`, `useIdeaAutocomplete`, `useSimilarIdeas`, `useScoutLevels` |
| auth.ts | `src/api/auth.ts` | auth-session | `useCurrentUser`, `useLogin`, `useRegister`, `useLogout`, `useCsrfToken` |
| tags.ts | `src/api/tags.ts` | idea-management | `useTags`, `useCreateTag`, `useUpdateTag`, `useDeleteTag` |
| ai.ts | `src/api/ai.ts` | ai-features | `useImproveText`, `useSuggestTags`, `useRefurbish` |
| admin.ts | `src/api/admin.ts` | admin | `useAdminStats`, `useAdminComments`, `useApproveComment`, `useAdminUsers`, `useIdeaOfTheWeek` |
| profile.ts | `src/api/profile.ts` | user-profiles, group-management | `useProfile`, `useUpdateProfile`, `useMyIdeas`, `useMyGroups`, `usePersons` |
| materials.ts | `src/api/materials.ts` | idea-management | `useMaterials`, `useMaterial` |
| planner.ts | `src/api/planner.ts` | session-planner | `usePlanners`, `usePlanner`, `useCreatePlanner`, `useUpdatePlanner`, `useDeletePlanner`, `useAddPlannerEntry`, `useUpdatePlannerEntry`, `useRemovePlannerEntry`, `useInviteCollaborator`, `useSearchUsers` |
| events.ts | `src/api/events.ts` | event-management | `useEvents`, `useEvent`, `useCreateEvent`, `useBookingOptions`, `useRegisterForEvent`, `useParticipants` |
| mealPlans.ts | `src/api/mealPlans.ts` (NEU) | meal-plan | `useMealPlans`, `useMealPlan`, `useCreateMealPlan`, `useAddRecipeToMeal`, `useShoppingList`, `useNutritionSummary` |
| ingredients.ts | `src/api/ingredients.ts` (NEU) | ingredient-database | `useIngredients`, `useIngredient`, `useCreateIngredient`, `useUpdateIngredient`, `usePortions`, `useAddPortion`, `usePrices`, `useAddPrice`, `useIngredientAI` |
| packingLists.ts | `src/api/packingLists.ts` | packing-list | `usePackingLists`, `usePackingList`, `useCreatePackingList`, `useUpdatePackingList`, `useDeletePackingList`, `useCreateCategory`, `useUpdateCategory`, `useDeleteCategory`, `useSortCategories`, `useCreateItem`, `useUpdateItem`, `useDeleteItem`, `useSortItems` |

### Zod-Schemas

| Schema-Datei | Pfad | Synchron mit (Backend) | Spec-Domaene |
|--------------|------|------------------------|--------------|
| idea.ts | `src/schemas/idea.ts` | `idea/schemas.py` | idea-management, search |
| auth.ts | `src/schemas/auth.ts` | `core/schemas.py` | auth-session |
| event.ts | `src/schemas/event.ts` | `event/schemas.py` | event-management |
| profile.ts | `src/schemas/profile.ts` | `profiles/schemas.py` | user-profiles, group-management |
| planner.ts | `src/schemas/planner.ts` | `planner/schemas.py` | session-planner |
| mealPlan.ts | `src/schemas/mealPlan.ts` (NEU) | `planner/schemas.py` | meal-plan |
| ingredient.ts | `src/schemas/ingredient.ts` (NEU) | `idea/schemas.py` | ingredient-database |
| packingList.ts | `src/schemas/packingList.ts` | `packinglist/schemas.py` | packing-list |

### Zustandsverwaltung

| Store | Pfad | Spec-Domaene | Zweck |
|-------|------|--------------|-------|
| useIdeaStore | `src/store/useIdeaStore.ts` | search | Such-Filter, Paginierungszustand, URL-Synchronisation |

## Querschnittsthemen

### Fehlerbehandlung

Die Fehlerbehandlung ist vollstaendig implementiert:

| Komponente | Beschreibung |
|------------|-------------|
| `ErrorBoundary` | React Error Boundary in `main.tsx`, faengt unbehandelte Render-Fehler ab |
| `ErrorDisplay` | Geteilte Fehler-UI mit `full` und `inline` Varianten, erkennt automatisch 404/403/Network/500 |
| `ConfirmDialog` | Bestaetigungsdialog fuer destruktive Aktionen (native `<dialog>`, loading-State, destructive Variante) |
| `sonner` Toaster | Toast-Benachrichtigungen (bottom-right, richColors, 4s) fuer Erfolg/Fehler bei Mutations |

Alle `window.confirm()`-Aufrufe wurden durch `ConfirmDialog` ersetzt. Toast-Benachrichtigungen werden in den Seiten-Komponenten (`onSuccess`/`onError` Callbacks) verwendet, nicht in den API-Hooks.

### Schema-Synchronisation (Pydantic <-> Zod)

Jede Aenderung an einem Backend-Pydantic-Schema in `**/schemas.py` MUSS im entsprechenden Zod-Schema in `frontend/src/schemas/*.ts` gespiegelt werden und umgekehrt. Die Schemas muessen 1:1 synchron bleiben.

### Paginierung

Alle Listen-Endpunkte verwenden das Standard-paginierte Antwortformat:
```
{ items: T[], total: number, page: number, page_size: number, total_pages: number }
```

Standard: `page=1`, `page_size=20`. Ausnahme: `GET /api/planner/` gibt derzeit eine flache Liste zurueck (Paginierung geplant).

### Authentifizierung

Alle authentifizierten Endpunkte erfordern ein gueltiges Session-Cookie. Das Frontend muss CSRF-Tokens bei allen veraendernden Anfragen mitsenden. Der Auth-Zustand wird ueber `useCurrentUser` aus `src/api/auth.ts` verwaltet.

### Idea-Typen und Material/Zutaten

| Idea-Typ | Code | Material | Zutaten (RecipeItem) | Frontend-Label |
|----------|------|----------|---------------------|----------------|
| Lern-Idee | `idea` | Ja (`MaterialItem`) | Nein | "Material" |
| Rezept | `recipe` | Optional (`MaterialItem`) | Ja (`RecipeItem`) | "Zutaten" |
| Wissensbeitrag | `knowledge` | Nein | Nein | — (ausgeblendet) |
