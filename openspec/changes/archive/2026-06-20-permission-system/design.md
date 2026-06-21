## Context

Inspi hat aktuell kein einheitliches Permission-System. Die einzige systemweite Rolle ist Djangos `is_staff`-Flag. Jede App implementiert Auth-Checks ad-hoc und inkonsistent:

- **Ingredients LIST**: komplett öffentlich (kein Auth-Check)
- **Materials UPDATE**: jeder authentifizierte User darf jedes Material editieren (kein Owner-Check)
- **Portions/Aliases**: nur `require_auth`, keine Ownership-Prüfung
- **Recipe Items `_can_edit_recipe`** in `items.py` prüft NICHT auf `owner_id` (Bug)
- **Recipe DELETE**: nur Staff (Owner darf nicht löschen)
- **MealPlanCollaborator, ShoppingList-Collab, PlannerCollaborator**: drei separate, ähnliche aber nicht identische Implementierungen

Dazu kommen inkonsistente Sichtbarkeitsregeln: Ingredients sind komplett öffentlich, Recipes filtern nach `visibility` (private/group/public) + `owner` + `status`, MealPlans nach `visibility` + Collab-Rollen.

## Goals / Non-Goals

**Goals:**

- Einheitliches Rollen-System (user/staff/admin) auf UserProfile
- Vereinfachtes Status-Modell (draft/verified) für alle Content-Typen
- Einheitliche Sichtbarkeits- und Edit-Regeln über alle Modelle hinweg
- Generisches Sharing-System (ContentCollaborator) als Ersatz für drei separate Collab-Modelle
- Soft-Delete für Creator bei Drafts
- API-Response mit `can_edit`/`can_delete`-Flags
- Schreibschutz für Stammdaten (Materials, Units, Tags)
- Portion-Lock bei Ingredient-Verified

**Non-Goals:**

- Kein Submission/Review-Workflow (Staff verified direkt)
- Keine Notifications für Status-Änderungen
- Kein Undo für Creator-Soft-Delete
- Kein Revert von verified auf draft
- Event-Modell bleibt unangetastet (eigene Permission-Logik)
- PackingList bleibt mit eigener `user_can_edit`-Methode (wird später vereinheitlicht)

## Decisions

### 1. UserProfile.role statt Django Groups

**Entscheidung**: `CharField` mit `choices=[("user", "User"), ("staff", "Staff"), ("admin", "Admin")]` auf `UserProfile`.

**Alternativen verworfen**:
- Django Groups/Permissions: Overengineered für drei Rollen, keine direkte Objekt-Level-Performance, komplexeres Caching.
- Separates Role-Model: Unnötig für den aktuellen Scope. Bei Bedarf später erweiterbar.

**Konsequenz**: Jeder Auth-Check greift auf `request.user.profile.role` zu. `is_staff` verliert seine Bedeutung im Application-Code (bleibt für Django-Admin).

### 2. Generisches ContentCollaborator statt pro-Modell

**Entscheidung**: Ein `ContentCollaborator`-Modell mit `GenericForeignKey` für alle Content-Typen inkl. Non-Content-Modelle (Ingredient, MealPlan, ShoppingList, Planner).

```python
class ContentCollaborator(models.Model):
    content_type = FK(ContentType)
    object_id = PositiveIntegerField
    content_object = GenericForeignKey("content_type", "object_id")

    user = FK(User, null=True, blank=True)
    group = FK(UserGroup, null=True, blank=True)
    role = CharField(choices=[("viewer", "Betrachter"), ("editor", "Bearbeiter"), ("admin", "Admin")])

    created_by = FK(User, related_name="created_collaborations")
    created_at = DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            CheckConstraint(
                check=Q(user__isnull=False) | Q(group__isnull=False),
                name="collab_user_or_group_required"
            ),
            UniqueConstraint(
                fields=["content_type", "object_id", "user", "group"],
                name="unique_collab"
            )
        ]
```

**Alternativen verworfen**:
- Pro-Modell (RecipeCollaborator, SessionCollaborator...): Mehr Boilerplate, schwerer wartbar, keine einheitliche API.
- M2M auf Content-Basis mit Through-Tabelle: authors-Feld würde überladen, Rollen-Trennung schwierig.

**Konsequenz**: GFK-Queries sind etwas langsamer als direkte FKs. Da Sharing pro Objekt abgefragt wird (nicht in Bulk-List-Views), ist der Performance-Impact minimal.

### 3. Status: draft/verified über alle Content-Typen

**Entscheidung**: Alle Modelle, die `status` haben (Content-Subclasses, Ingredient, MealPlan) verwenden nur noch `draft` und `verified`. `approved`, `published`, `user_content` entfallen.

Properties:
- `draft`: Sichtbar für Creator+Co-Autoren+Shared+Staff. Editierbar durch Creator+Co-Autoren+Shared-Editoren+Staff.
- `verified`: Sichtbar für alle (auch anonym). Editierbar NUR durch Staff/Admin.

**Alternativen verworfen**:
- draft/submitted/verified (3-stufig): Benötigt Submission-Workflow, Notifications, mehr Komplexität.

### 4. created_by als Herkunfts-Marker

**Entscheidung**: `created_by = None` bedeutet Inspi-Systemdaten. `created_by = User` bedeutet User-erstellt. Kein separates `source`-Feld.

Gruppe zum Schutz vor Datenverlust: User werden nie hart gelöscht (`is_active=False`). `created_by`-Referenz bleibt intakt.

Staff bekommt eine Checkbox "Als Inspi-System speichern" die `created_by=None` und `status=verified` setzt.

**Alternativen verworfen**:
- Separates `source`-Feld: Redundant, da `created_by` die gleiche Information trägt.
- `on_delete=PROTECT`: Verhindert User-Löschung zu stark. `is_active=False` ist die sauberere Lösung.

### 5. Entfernung von owner und visibility

**Entscheidung**:
- `Recipe.owner` entfällt. Herkunft über `created_by`. "Meine Rezepte" filtert nach `created_by` + ContentCollaborator.
- `Recipe.visibility` (private/group/public) entfällt. `status=draft` = privat, `status=verified` = öffentlich. Group-Sharing über ContentCollaborator.
- `MealPlan.visibility` (private/public) entfällt. Gleiche Logik wie Recipe.

### 6. Soft-Delete via is_deleted-Flag

**Entscheidung**: Content-Basis bekommt `is_deleted = BooleanField(default=False)` + `deleted_at = DateTimeField(null=True)`. Default-Manager filtert `is_deleted=False`. Admin-Manager (`objects_including_deleted`) zeigt alles.

Hard-Delete nur durch Staff/Admin, Soft-Delete durch Creator bei Drafts. Keine automatische Bereinigung (Admin macht das manuell).

### 7. API: can_edit/can_delete auf jedem Response-Objekt

**Entscheidung**: Jedes List/Detail-Response-Objekt bekommt `can_edit: bool` und `can_delete: bool`. Berechnung zentral in `content/api/helpers.py`.

```python
def enrich_with_permissions(obj, user):
    has_role = user.is_authenticated and user.profile.role in ("staff", "admin")
    is_verified = obj.status == "verified"
    is_creator = user.is_authenticated and obj.created_by_id == user.id
    is_author = user.is_authenticated and obj.authors.filter(id=user.id).exists()
    is_collab_editor = ContentCollaborator.objects.filter(
        content_type=ContentType.objects.get_for_model(obj),
        object_id=obj.id,
        user=user,
        role__in=["editor", "admin"]
    ).exists() | ContentCollaborator.objects.filter(
        content_type=ContentType.objects.get_for_model(obj),
        object_id=obj.id,
        group__memberships__user=user,
        group__memberships__is_active=True,
        role__in=["editor", "admin"]
    ).exists()

    obj.can_edit = has_role or (not is_verified and (is_creator or is_author or is_collab_editor))
    obj.can_delete = has_role or (not is_verified and is_creator)
```

### 8. List-Filterung: Sichtbarkeit zentral

```python
def get_visible_queryset(model, user):
    qs = model.objects.all()
    if user.is_authenticated and user.profile.role in ("staff", "admin"):
        return qs
    verified_q = Q(status="verified")
    if user.is_authenticated:
        own_q = Q(created_by=user)
        author_q = Q(authors=user)  # falls model authors hat
        collab_q = Q(collaborators__user=user) | Q(collaborators__group__memberships__user=user)
        return qs.filter(verified_q | own_q | author_q | collab_q).distinct()
    return qs.filter(verified_q)
```

### 9. Stammdaten: Public Read, Staff Write

**Entscheidung**: Materials, MeasuringUnits, RetailSections, NutritionalTags, DgeReferences bleiben öffentlich lesbar. Create/Update/Delete nur für Staff/Admin.

Bestehende APIs werden angepasst: `require_auth`-Checks in Create/Update/Delete durch `require_staff` ersetzt.

### 10. Portion/Alias: Nur Ingredient-Creator

**Entscheidung**: `POST/PATCH/DELETE` auf Portion- und Alias-Endpunkten prüft `ingredient.created_by == request.user OR staff/admin`. Portionen erben den Lock: wenn Ingredient verified ist, sind alle Portions/Aliases auch gesperrt.

## Risks / Trade-offs

- **[Risk] GFK-Performance**: ContentCollaborator mit GenericForeignKey kann bei vielen Shares langsam werden → **Mitigation**: Index auf (content_type, object_id). Shares werden pro Objekt abgefragt, nicht in Bulk.
- **[Risk] Datenverlust bei Migration**: Auto-verify von approved/published könnte ungeprüfte Inhalte öffentlich machen → **Mitigation**: Nur approved/published → verified. user_content → draft (bleibt privat).
- **[Risk] MealPlan-Colab-Migration**: Viele MealPlans haben Collaborators mit aktiven Rechten → **Mitigation**: Alle MealPlanCollaborator-Rows 1:1 in ContentCollaborator kopieren. MealPlan-API auf neue Queries umstellen.
- **[Risk] Frontend muss alle Views anpassen**: Großer Scope, viele Touchpoints → **Mitigation**: Zuerst Backend-API fertigstellen (Permissions in Responses), dann Frontend iterativ pro View.
- **[Trade-off] Kein Undo für Soft-Delete**: Creator kann nicht wiederherstellen → Akzeptiert. Admin kann über Django-Admin eingreifen.

## Migration Plan

**Phase 1: Model-Änderungen**
1. UserProfile.role Feld + Migration (is_staff=True → admin)
2. Content.status: vorhandene approved/published → verified, user_content → draft
3. Recipe: owner → created_by kopieren, owner-Feld droppen, visibility droppen
4. MealPlan: status Feld, visibility droppen
5. Ingredient: user_content Status entfernen (→ draft)
6. ContentCollaborator Modell + Migration aller bestehenden Collab-Daten

**Phase 2: API-Updates**
7. Permission-Helper zentralisieren (helpers.py)
8. Alle List-Endpunkte: Sichtbarkeitsfilter einbauen
9. Alle Detail-Endpunkte: can_edit/can_delete enrichment
10. Alle Create/Update/Delete: Permission-Checks vereinheitlichen
11. ContentCollaborator CRUD-Endpunkte
12. Stammdaten: Staff-Schreibschutz

**Phase 3: Frontend**
13. Zod-Schemas synchronisieren
14. UI-Komponenten für can_edit/can_delete
15. Sharing-Dialog (User/Group-Picker, Rollen)
16. Verified-Badge
17. Admin-Stammdaten-UI

**Rollback**: Migrationen sind vorwärts-only (breaking changes sind erlaubt). Im Notfall DB-Backup vor Migration.

### 11. Transitive Visibility

**Entscheidung**: Wenn ein User Zugriff auf ein übergeordnetes Objekt hat (z.B. MealPlan), erhält er automatisch Lesezugriff auf alle darin referenzierten untergeordneten Objekte (Meals → Recipes → Ingredients → Portions). Dies gilt für Detail-Endpunkte, nicht für globale Listen.

**Implementierung**: In den Detail-Endpunkten wird bei fehlgeschlagener normaler Sichtbarkeitsprüfung eine transitive Prüfung durchgeführt:
- Recipe: Existiert ein MealPlan, den der User sehen kann, der dieses Recipe referenziert?
- Ingredient: Existiert ein Recipe, das der User sehen kann (direkt oder transitiv), das diese Ingredient referenziert?
- Portion: Ist die zugehörige Ingredient transitiv sichtbar?

Transitiv sichtbare Objekte erhalten `can_edit=false`, `can_delete=false`.

**Alternativen verworfen**:
- Automatische ContentCollaborator-Anlage bei Referenzierung: Zu viele Schreiboperationen, schwer zu maintainen.
- Transitive Objekte in globalen Listen anzeigen: Würde Listen mit fremden Drafts überfluten.

## Open Questions

- Keine. Alle Design-Entscheidungen sind mit dem Stakeholder geklärt.
