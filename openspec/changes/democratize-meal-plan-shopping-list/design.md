## Context

Die `shopping` App hat bereits ein vollständiges Collaborator-System (`ShoppingListCollaborator` mit Rollen viewer/editor/admin). Die `planner` App (Meal Plans) hat kein solches System — dort gilt nur `owner or staff`. Beide Apps prüfen Permissions inline in den View-Funktionen.

Aktuell sind Erstellung und Zugriff auf Meal Plans und Shopping Lists auf Staff-User beschränkt. Normale angemeldete User sollen dieselben Features nutzen können.

## Goals / Non-Goals

**Goals:**
- Alle angemeldeten User können Meal Plans und Shopping Lists erstellen
- Meal Plans bekommen ein Collaborator-System analog zu Shopping Lists
- List-Endpunkte zeigen nur eigene + Collaborator-Objekte (kein globaler Zugriff)
- Bestehendes Shopping List Collaborator-System bleibt unverändert

**Non-Goals:**
- Öffentliche/anonyme Essenspläne oder Einkaufslisten
- Gruppen-basierte Berechtigungen (nur explizite Collaborator-Einladungen)
- Änderung der Event-basierten Meal Plan Logik
- WebSocket-Echtzeit für Meal Plan Collaborators (Shopping Lists haben das bereits)

## Decisions

### 1. MealPlanCollaborator analog zu ShoppingListCollaborator

Neues Model `MealPlanCollaborator` in `planner/models/` mit identischer Struktur:
- FK zu MealPlan, FK zu User, role (viewer/editor/admin), created_at
- Unique constraint auf (meal_plan, user)

**Alternative**: Generisches Collaborator-Model für beide → Zu viel Refactoring für den Nutzen, und Shopping List hat bereits WebSocket-Integration die spezifisch ist.

### 2. Shared CollaboratorRole Enum

Die `CollaboratorRole` TextChoices (viewer/editor/admin) aus `shopping/models.py` in ein shared Module verschieben oder in `planner` duplizieren.

**Entscheidung**: Duplizieren in `planner/models/`. Einfacher, weniger Kopplung. Kann später extrahiert werden.

### 3. Permission-Helper-Pattern

Für Meal Plans einen Helper `_get_user_role(meal_plan, user)` einführen (analog zu Shopping Lists), der Owner als impliziten "admin" behandelt.

### 4. List-Endpunkt Filterung

Beide List-Endpunkte (Meal Plans + Shopping Lists) filtern:
```
eigene (created_by=user) OR Collaborator-Einträge
```
Staff sieht weiterhin alle (für Admin-Zwecke).

## Risks / Trade-offs

- **Bestehende Meal Plans ohne Owner**: Falls alte Meal Plans kein `created_by` haben → Prüfen ob Feld nullable ist. Ggf. Migration die bestehende Plans einem Staff-User zuordnet.
- **Performance bei vielen Collaborators**: JOIN über Collaborator-Tabelle bei List-Endpunkt → Bei aktueller Datenmenge irrelevant, bei Wachstum Index auf (user, meal_plan) reicht.
- **Frontend-Aufwand**: Collaborator-Management-UI für Meal Plans muss gebaut werden → Kann Pattern von Shopping Lists übernehmen.
