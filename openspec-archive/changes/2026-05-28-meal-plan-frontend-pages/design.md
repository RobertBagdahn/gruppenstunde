## Context

Die Meal Plan API ist vollständig (CRUD, Days, Meals, Items, Collaborators, Nutrition, Shopping List, PDF Export). Frontend-Hooks und Zod-Schemas existieren bereits. Es fehlen nur die Seiten und Routing. Ähnliche Seiten existieren für Packing Lists und Shopping Lists als Referenz-Pattern.

## Goals / Non-Goals

**Goals:**
- Funktionierende List/Create/Detail-Seiten für Essenspläne
- Collaborator-Management auf Detail Page
- Mobile-First, konsistent mit restlichem UI
- Nutzung der existierenden API-Hooks und Schemas

**Non-Goals:**
- Drag & Drop für Mahlzeiten-Reihenfolge
- Inline-Editing von Rezepten innerhalb des Plans
- WebSocket-Echtzeit-Updates (kommt ggf. später)
- Nutrition Cockpit Integration (existiert als separate Komponente)

## Decisions

### 1. Page-Struktur: 3 Seiten

| Route | Seite | Beschreibung |
|-------|-------|-------------|
| `/meal-plans/app` | MealPlansPage | Liste eigener + kollaborativer Pläne |
| `/meal-plans/new` | CreateMealPlanPage | Erstellformular |
| `/meal-plans/:id` | MealPlanDetailPage | Detail mit Tagen/Mahlzeiten/Items + Collaborators |

**Alternative**: Single-Page-App mit Tabs → Zu komplex für den Start, Detail-Page reicht.

### 2. Detail Page Layout

Tagesbasierte Ansicht (analog zum Backend-Modell):
```
┌─────────────────────────────────────────┐
│  Plan-Name          [Edit] [Share] [⋮]  │
├─────────────────────────────────────────┤
│  Tabs: Tagesplan | Einkaufsliste | ...  │
├─────────────────────────────────────────┤
│  Tag 1 (Mo 15.06.)                      │
│  ┌─────────────────────────────────┐    │
│  │ Frühstück                       │    │
│  │  • Müsli mit Obst              │    │
│  │  • [+ Rezept hinzufügen]       │    │
│  ├─────────────────────────────────┤    │
│  │ Mittagessen                     │    │
│  │  • Nudeln mit Tomatensoße      │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Tag 2 (Di 16.06.)                      │
│  ...                                    │
├─────────────────────────────────────────┤
│  Mitglieder (Collaborators)             │
│  ┌─────────────────────────────────┐    │
│  │ Max M. — Editor    [×]         │    │
│  │ [+ Mitglied einladen]          │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

### 3. Collaborator-UI Pattern

Kopie des Shopping List Patterns: Section am Ende der Detail Page mit Liste + Invite-Formular. Kein eigenes Modal, direkt inline.

### 4. Datei-Benennung

- `src/pages/tools/MealPlansPage.tsx` — List
- `src/pages/tools/CreateMealPlanPage.tsx` — Create
- `src/pages/tools/MealPlanDetailPage.tsx` — Detail
- `src/components/meal-plan/CollaboratorSection.tsx` — Collaborator UI

## Risks / Trade-offs

- **Detail Page Komplexität**: Mahlzeiten-Management (Add/Remove Recipes, Day Management) ist umfangreich → Erst Basis (Anzeige + Collaborators), Editing in Folge-Change
- **Recipe Search Integration**: Add-Item Dialog braucht Rezept-Suche → Hook existiert bereits (`useRecipeSearch`)
