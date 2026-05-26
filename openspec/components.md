# Komponenten-Karte

Dieses Dokument bildet die wichtigsten UI-Komponenten und Backend-Module der Inspi-Plattform ab, organisiert nach Domäne. Verwende es als Referenz bei der Planung von Änderungen, um zu verstehen welche Dateien betroffen sind.

## Plattform-Übersicht

Die Plattform besteht aus zentralen Komponenten und funktionalen Modulen:

| Modul | Django App(s) | Beschreibung | Frontend-Bereich |
|-------|-------------|-------------|------------------|
| **Zentral** | `core`, `profiles` | Auth, Profil, Gruppen, Admin | `/login`, `/profile/*`, `/groups/*`, `/admin/*` |
| **Inhalte** | `content`, `session`, `blog`, `game` | Abstrakte Content-Basis, Gruppenstunden, Blog, Spiele | `/search`, `/sessions/*`, `/blogs/*`, `/games/*`, `/create/*` |
| **Rezepte** | `recipe` | Rezepte mit Nährwerten, Cockpit, Health Rules | `/recipes/*` |
| **Zutaten & Material** | `supply` | Zutaten-Datenbank, Materialien, Portionen, Norm-Person | `/ingredients/*`, `/materials/*` |
| **Veranstaltungen** | `event` | Events, Buchung, Teilnehmer, WhatsApp | `/events/*` |
| **Planung** | `planner` | Heimabend-Planung, Essensplan | `/session-planner/*`, `/meal-plans/*` |
| **Packlisten** | `packinglist` | Packlisten mit Kategorien | `/packing-lists/*` |
| **Einkaufslisten** | `shopping` | Kollaborative Einkaufslisten (WebSocket) | `/shopping-lists/*` |

## Backend-Module

### Django Apps (INSTALLED_APPS)

| App | Verzeichnis | Struktur | Zweck |
|-----|-------------|----------|-------|
| **content** | `backend/content/` | Hybrid (Packages) | Abstrakte Content-Basis, Tags, Kommentare, Emotionen, Suche, Embeddings, AI, Approval, Content-Linking |
| **supply** | `backend/supply/` | Hybrid (Packages) | Abstrakte Supply-Basis, Ingredient (standalone), Material, Portionen, Messeinheiten, DGE-Referenzen, Norm-Person |
| **core** | `backend/core/` | Einzeldateien | Auth-API, Management-Commands |
| **profiles** | `backend/profiles/` | Hybrid (Packages) | Benutzerprofile, Einstellungen, Gruppen, Mitgliedschaften, Corporate Identity |
| **session** | `backend/session/` | Einzeldateien | GroupSession Content-Typ |
| **blog** | `backend/blog/` | Einzeldateien | Blog Content-Typ |
| **game** | `backend/game/` | Einzeldateien | Game Content-Typ |
| **recipe** | `backend/recipe/` | Hybrid (Packages) | Recipe Content-Typ, RecipeItem, HealthRule, Cockpit, Inspi-Score |
| **planner** | `backend/planner/` | Hybrid (Packages) | Heimabend-Planer, MealPlan, Meal, MealItem |
| **event** | `backend/event/` | Hybrid (Packages) | Events, Registrierungen, Teilnehmer, Zahlungen, WhatsApp, Tagesplan |
| **packinglist** | `backend/packinglist/` | Einzeldateien | Packlisten mit Kategorien und Items |
| **shopping** | `backend/shopping/` | Einzeldateien | Einkaufslisten mit WebSocket-Kollaboration |

### API-Router

| Router | Mount-Pfad | Quelle | Spec-Domäne |
|--------|-----------|--------|--------------|
| Auth | `/api/auth/` | `core/api.py` | auth-session |
| Admin | `/api/admin/` | `content/admin_api.py` | admin |
| Content | `/api/content/` | `content/api/` | content-base, content-search, ai-features |
| Tags | `/api/tags/` | `content/tags_api.py` | content-base |
| Scout Levels | `/api/scout-levels/` | `content/tags_api.py` | content-base |
| Sessions | `/api/sessions/` | `session/api.py` | group-session |
| Blogs | `/api/blogs/` | `blog/api.py` | blog-content |
| Games | `/api/games/` | `game/api.py` | game-content |
| Recipes | `/api/recipes/` | `recipe/api/` | recipe |
| Health Rules | `/api/health-rules/` | `recipe/api/cockpit.py` | meal-cockpit |
| Cockpit | `/api/` (root) | `recipe/api/cockpit.py` | meal-cockpit |
| Supplies | `/api/supplies/` | `supply/api/` | supply-base |
| Ingredients | `/api/ingredients/` | `supply/api/` | ingredient-database |
| Retail Sections | `/api/retail-sections/` | `supply/api/` | ingredient-database |
| Norm Person | `/api/norm-person/` | `supply/api/` | norm-portion-simulator |
| DGE References | `/api/dge-references/` | `supply/api/` | ingredient-database |
| Profile | `/api/profile/` | `profiles/api/` | user-profiles |
| Groups | `/api/groups/` | `profiles/api/` | group-management |
| Events | `/api/events/` | `event/api/` | event-management |
| Persons | `/api/persons/` | `event/api/` | user-profiles |
| Locations | `/api/locations/` | `event/api/` | event-management |
| Meeting Points | `/api/meeting-points/` | `event/api/` | event-management |
| WhatsApp | `/api/whatsapp/` | `event/api/` | whatsapp-connection |
| Message Templates | `/api/message-templates/` | `event/api/` | event-messaging |
| Planner | `/api/planner/` | `planner/api/` | session-planner |
| Meal Plans | `/api/meal-plans/` | `planner/api/meal_plan.py` | meal-plan |
| Packing Lists | `/api/packing-lists/` | `packinglist/api.py` | packing-list |
| Shopping Lists | `/api/shopping-lists/` | `shopping/api.py` | shopping-list |

### Backend-Dienste

| Dienst | Pfad | Spec-Domäne | Zweck |
|--------|------|--------------|-------|
| AIService | `content/services/ai_service.py` | ai-features | Gemini-Integration (Textverbesserung, Tag-Vorschläge, Refurbish, Embeddings) |
| SearchService | `content/services/search_service.py` | content-search | Hybride Suche (Volltext + Trigramm + Vektor-Ähnlichkeit) |
| ViewService | `content/services/view_service.py` | seo-analytics | Bot-Erkennung, IP-Hashing, View-Deduplizierung |
| ExportService | `content/services/export_service.py` | admin | Content-Export |
| IngredientAIService | `supply/services/ingredient_ai_service.py` | ai-features, ingredient-database | KI-Autovervollständigung für Zutaten |
| NutriService | `supply/services/nutri_service.py` | ingredient-database | Nutri-Score Berechnung, Nährwert-Aggregation |
| PriceService | `supply/services/price_service.py` | ingredient-database | Preisberechnung via price_per_kg |
| NormPersonService | `supply/services/norm_person_service.py` | norm-portion-simulator | Norm-Personen-Berechnung (Mifflin-St Jeor) |
| CockpitService | `recipe/services/cockpit_service.py` | meal-cockpit | HealthRule-Evaluation, Ampel-Dashboard |
| RecipeChecksService | `recipe/services/recipe_checks.py` | recipe | Rezept-Cache-Neuberechnung, Hints |

## Frontend-Komponenten

### Seiten (Routen)

> Die folgenden Routen entsprechen 1:1 den Route-Definitionen in `frontend/src/App.tsx`.

#### Zentral

| Seite | Pfad | Route | Spec-Domäne |
|-------|------|-------|--------------|
| HomePage | `src/pages/HomePage.tsx` | `/` | homepage-redesign |
| LoginPage | `src/pages/LoginPage.tsx` | `/login` | auth-session |
| RegisterPage | `src/pages/RegisterPage.tsx` | `/register` | auth-session |
| SearchPage | `src/pages/SearchPage.tsx` | `/search` | content-search |
| CreateHubPage | `src/pages/CreateHubPage.tsx` | `/create` | content-stepper |
| MyDashboardPage | `src/pages/MyDashboardPage.tsx` | `/my-dashboard` | user-profiles |
| AboutPage | `src/pages/AboutPage.tsx` | `/about` | - |
| ImpressumPage | `src/pages/ImpressumPage.tsx` | `/imprint` | - |
| DatenschutzPage | `src/pages/DatenschutzPage.tsx` | `/privacy` | - |

#### Content-Typen

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| SessionListPage | `/sessions` | group-session |
| SessionDetailPage | `/sessions/:slug` | group-session |
| CreateSessionPage | `/create/session` | group-session, content-stepper |
| BlogListPage | `/blogs` | blog-content |
| BlogDetailPage | `/blogs/:slug` | blog-content |
| CreateBlogPage | `/create/blog` | blog-content, content-stepper |
| GameListPage | `/games` | game-content |
| GameDetailPage | `/games/:slug` | game-content |
| CreateGamePage | `/create/game` | game-content, content-stepper |
| RecipeListPage | `/recipes` | recipe |
| RecipeDetailPage | `/recipes/:slug` | recipe |
| CreateRecipePage | `/recipes/new` | recipe |
| EditRecipePage | `/recipes/:slug/edit` | recipe |
| MyRecipesPage | `/recipes/my-recipes` | personal-recipes |

#### Supply / Zutaten

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| IngredientListPage | `/ingredients` | ingredient-database |
| IngredientDetailPage | `/ingredients/:slug` | ingredient-database |
| IngredientCreatePage | `/ingredients/new` | ingredient-database |
| MaterialListPage | `/materials` | supply-base |
| MaterialDetailPage | `/materials/:slug` | supply-base |

#### Profil & Gruppen

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| ProfilePage | `/profile` | user-profiles |
| PersonsPage | `/profile/persons` | user-profiles |
| GruppenPage | `/profile/groups` | group-management |
| PrivacyPage | `/profile/privacy` | privacy-data-overview |
| UserProfilePage | `/user/:userId` | user-profiles |
| GroupDetailPage | `/groups/:slug` | group-management |
| GroupCIPage | `/groups/:slug/settings/corporate-identity` | group-corporate-identity |

#### Events

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| EventsLandingPage | `/events` | event-landing-page |
| EventsPage | `/events/app` | event-management |
| NewEventPage | `/events/app/new` | event-wizard-overhaul |
| EventDashboardPage | `/events/app/:slug` | event-organizer-dashboard |
| EventDetailPage | `/events/:slug` | event-landing-page |
| GuestRegistrationPage | `/events/:slug/register` | event-guest-registration |
| QRCodePage | `/events/app/:slug/qr-code` | event-qr-code |
| ParentPage | `/events/:slug/parent/:token` | event-parent-access |
| PersonsPage | `/events/app/persons` | user-profiles |

#### Planung

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| SessionPlannerLandingPage | `/session-planner` | session-planner |
| PlannerPage | `/session-planner/app` | session-planner |
| MealPlanLandingPage | `/meal-plans` | meal-plan |
| MealPlanListPage | `/meal-plans/app` | meal-plan |
| MealPlanDetailPage | `/meal-plans/:id` | meal-plan |

#### Packlisten & Einkaufslisten

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| PackingListLandingPage | `/packing-lists` | packing-list |
| PackingListsPage | `/packing-lists/app` | packing-list |
| PackingListDetailPage | `/packing-lists/:id` | packing-list |
| PackingListWizardPage | `/packing-lists/new` | packing-list-wizard |
| PackingListSharePage | `/packing-lists/shared/:token` | packing-list-sharing |
| ShoppingListPage | `/shopping-lists` | shopping-list |
| ShoppingListDetailPage | `/shopping-lists/:id` | shopping-list |

#### Tools

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| NormPortionSimulatorPage | `/tools/norm-portion-simulator` | norm-portion-simulator |

#### Admin

| Seite | Route | Spec-Domäne |
|-------|-------|--------------|
| AdminPage | `/admin` | admin |
| AdminUserDetailPage | `/admin/users/:userId` | admin |
| IdeaOfTheWeekPage | `/admin/idea-of-the-week` | admin |

### Geteilte UI-Komponenten

| Kategorie | Komponenten |
|-----------|-------------|
| **Layout** | Layout, Navigation, Breadcrumb, ScrollToTop |
| **Fehlerbehandlung** | ErrorBoundary, ErrorDisplay, ConfirmDialog |
| **Content** | ContentCard, ContentStepper, ContentInlineEditor, ContentStatusBadge, ContentLinkSection, TitleImageEditor |
| **Interaktion** | CommentSection, EmotionBar, AuthorInfo |
| **Suche** | SearchBar, AutocompleteSearch, FilterSelect, SortSelect |
| **Rezepte** | RecipeCard, RecipeFilterSidebar, PortionScaler, NutriScoreBadge, InspiScore, RecipeHintDetail |
| **Cockpit** | TrafficLightIndicator, HealthTipCard, CockpitDashboard, CockpitSummaryCard |
| **Supply** | IngredientList, MaterialList, SupplySearch |
| **Events** | EventDashboard-Tabs (Overview, Participants, Invitations, Settings, Payments, Mail, Export, Timeline, Stats, Registration, PackingList, Budget, Attendance, RoomAssignment, ParentAccess, Messaging) |
| **WhatsApp** | WhatsAppConnectionCard, QRCodeDialog, StatsDisplay, PrivacyNotice |
| **Shopping** | ShoppingItemRow, ProgressBar, CollaboratorManager |
| **Charts** | NutrientBalanceChart, ContentStatsBar, NutritionPieChart |
| **Markdown** | MarkdownEditor (@uiw/react-md-editor), MarkdownRenderer (react-markdown + remark-gfm) |
| **UI Primitives** | shadcn/ui: Button, Card, Dialog, Input, Label, Tabs, Tooltip, Separator, Select, Textarea, Switch, Progress, Avatar, ColorPicker, Sheet, Command |

### API-Hooks (TanStack Query)

| Hook-Datei | Pfad | Spec-Domäne |
|------------|------|--------------|
| auth.ts | `src/api/auth.ts` | auth-session |
| sessions.ts | `src/api/sessions.ts` | group-session |
| blogs.ts | `src/api/blogs.ts` | blog-content |
| games.ts | `src/api/games.ts` | game-content |
| recipes.ts | `src/api/recipes.ts` | recipe |
| supplies.ts | `src/api/supplies.ts` | supply-base |
| ingredients.ts | `src/api/ingredients.ts` | ingredient-database |
| cockpit.ts | `src/api/cockpit.ts` | meal-cockpit |
| normPerson.ts | `src/api/normPerson.ts` | norm-portion-simulator |
| profile.ts | `src/api/profile.ts` | user-profiles, group-management |
| events.ts | `src/api/events.ts` | event-management |
| eventDashboard.ts | `src/api/eventDashboard.ts` | event-organizer-dashboard |
| eventDayPlan.ts | `src/api/eventDayPlan.ts` | event-day-plan |
| whatsapp.ts | `src/api/whatsapp.ts` | whatsapp-connection |
| planner.ts | `src/api/planner.ts` | session-planner |
| mealPlans.ts | `src/api/mealPlans.ts` | meal-plan |
| packingLists.ts | `src/api/packingLists.ts` | packing-list |
| shoppingLists.ts | `src/api/shoppingLists.ts` | shopping-list |
| search.ts | `src/api/search.ts` | content-search |
| contentInteractions.ts | `src/api/contentInteractions.ts` | comments-emotions |
| contentLinks.ts | `src/api/contentLinks.ts` | content-linking |
| tags.ts | `src/api/tags.ts` | content-base |
| ai.ts | `src/api/ai.ts` | ai-features |
| admin.ts | `src/api/admin.ts` | admin |
| privacy.ts | `src/api/privacy.ts` | privacy-data-overview |

### Zod-Schemas

| Schema-Datei | Pfad | Synchron mit (Backend) | Spec-Domäne |
|--------------|------|------------------------|--------------|
| content.ts | `src/schemas/content.ts` | `content/schemas/` | content-base |
| session.ts | `src/schemas/session.ts` | `session/schemas.py` | group-session |
| blog.ts | `src/schemas/blog.ts` | `blog/schemas.py` | blog-content |
| game.ts | `src/schemas/game.ts` | `game/schemas.py` | game-content |
| recipe.ts | `src/schemas/recipe.ts` | `recipe/schemas/` | recipe |
| supply.ts | `src/schemas/supply.ts` | `supply/schemas/` | supply-base, ingredient-database |
| cockpit.ts | `src/schemas/cockpit.ts` | `recipe/schemas/cockpit.py` | meal-cockpit |
| normPerson.ts | `src/schemas/normPerson.ts` | `supply/schemas/norm_person.py` | norm-portion-simulator |
| auth.ts | `src/schemas/auth.ts` | `core/schemas.py` | auth-session |
| event.ts | `src/schemas/event.ts` | `event/schemas/` | event-management |
| profile.ts | `src/schemas/profile.ts` | `profiles/schemas/` | user-profiles, group-management |
| planner.ts | `src/schemas/planner.ts` | `planner/schemas/` | session-planner |
| mealPlan.ts | `src/schemas/mealPlan.ts` | `planner/schemas/meal_plan.py` | meal-plan |
| packingList.ts | `src/schemas/packingList.ts` | `packinglist/schemas.py` | packing-list |
| shoppingList.ts | `src/schemas/shoppingList.ts` | `shopping/schemas.py` | shopping-list |
| search.ts | `src/schemas/search.ts` | `content/schemas/search.py` | content-search |
| contentLink.ts | `src/schemas/contentLink.ts` | `content/schemas/links.py` | content-linking |
| whatsapp.ts | `src/schemas/whatsapp.ts` | `event/schemas/whatsapp.py` | whatsapp-connection |
| messaging.ts | `src/schemas/messaging.ts` | `event/schemas/messaging.py` | event-messaging |
| privacy.ts | `src/schemas/privacy.ts` | `profiles/schemas/privacy.py` | privacy-data-overview |

## Querschnittsthemen

### Fehlerbehandlung

| Komponente | Beschreibung |
|------------|-------------|
| `ErrorBoundary` | React Error Boundary in `main.tsx`, fängt unbehandelte Render-Fehler ab |
| `ErrorDisplay` | Geteilte Fehler-UI mit `full` und `inline` Varianten, erkennt automatisch 404/403/Network/500 |
| `ConfirmDialog` | Bestätigungsdialog für destruktive Aktionen (loading-State, destructive Variante) |
| `sonner` Toaster | Toast-Benachrichtigungen (bottom-right, richColors, 4s) für Erfolg/Fehler bei Mutations |

### Schema-Synchronisation (Pydantic <-> Zod)

Jede Änderung an einem Backend-Pydantic-Schema MUSS im entsprechenden Zod-Schema gespiegelt werden und umgekehrt. Die Schemas müssen 1:1 synchron bleiben.

### Paginierung

Alle Listen-Endpunkte verwenden das Standard-paginierte Antwortformat:
```
{ items: T[], total: number, page: number, page_size: number, total_pages: number }
```

Standard: `page=1`, `page_size=20`.

### Authentifizierung

Alle authentifizierten Endpunkte erfordern ein gültiges Session-Cookie (HTTP-only, kein JWT). Das Frontend muss CSRF-Tokens bei allen verändernden Anfragen mitsenden. Der Auth-Zustand wird über `useCurrentUser` aus `src/api/auth.ts` verwaltet.

### Content-Typ-Architektur

| Content-Typ | Django Model | Django App | Frontend-Bereich |
|-------------|-------------|-----------|-----------------|
| Gruppenstunde | `session.GroupSession` | `session` | `/sessions/*` |
| Blog | `blog.Blog` | `blog` | `/blogs/*` |
| Spiel | `game.Game` | `game` | `/games/*` |
| Rezept | `recipe.Recipe` | `recipe` | `/recipes/*` |

Alle Content-Typen erben von `content.Content` (abstrakt) und teilen: Titel, Slug, Beschreibung (Markdown), Schwierigkeit, Kosten, Dauer, Status, Bild, Tags, Pfadfinderstufen, Autoren, Kommentare, Emotionen, Views.

### Supply-Architektur

| Supply-Typ | Django Model | Vererbung |
|------------|-------------|-----------|
| Material | `supply.Material` | Erbt von `Supply` (abstrakt) |
| Zutat | `supply.Ingredient` | Standalone (`models.Model`) — hat 30+ eigene Felder |
