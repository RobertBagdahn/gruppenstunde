## Context

Das Food Frontend (`frontend-food/`) hat keine User-Profil-Seite. Klicks auf Autorennamen in Rezept-Details erzeugen Links zu `/profile/name/{id}`, aber diese Route existiert nicht – tote Links.

Der `entityUrls.ts` im Food Frontend generiert User-Links mit numerischer ID (`/profile/name/11`). Es gibt keine human-readable URL und keine Möglichkeit, alle öffentlichen Inhalte eines Users zu sehen.

Das Haupt-Frontend (`frontend/`) hat bereits eine öffentliche Profil-Seite unter `/user/:userId` mit Sessions/Blog/Game (nicht Rezepte).

Das Backend verwendet Django's Standard `auth.User` (kein custom User-Model, da keine `AUTH_USER_MODEL` in Settings). Django-allauth generiert Usernames automatisch bei Email-Registrierung (nicht human-readable). `UserProfile` ist der 1:1-Extension-Punkt.

## Goals / Non-Goals

**Goals:**
- User-Profil-Seite im Food Frontend unter `/profile/name/:slug`
- `slug`-Feld auf `UserProfile` als human-readable Identifier
- API-Endpunkt `GET /api/profile/by-slug/{slug}/` für Food-Frontend
- Alle öffentlichen Inhalte anzeigen: Rezepte, Einkaufslisten, Essenspläne
- `entityUrls` und Autoren-Links verwenden `slug` statt `id`

**Non-Goals:**
- Keine Änderungen am Haupt-Frontend (`frontend/`) – bleibt bei `/user/:userId`
- Kein Slug-Onboarding-Flow (wird separat umgesetzt, falls nötig)
- Keine Änderungen am bestehenden `GET /api/profile/{user_id}/` Endpunkt

## Decisions

### 1. `slug` auf UserProfile statt auf auth.User
Warum nicht auf Django's auth.User: Kein custom User-Model vorhanden. Migration auf custom User-Model wäre komplex und riskant (FK-Beziehungen, Datenbank-Migration). `UserProfile` ist bereits der etablierte Extension-Punkt (1:1 mit User).

- **Feld**: `slug = models.SlugField(max_length=50, unique=True, null=True, blank=True)`
- **Fallback**: Wenn `slug=None`, wird `str(user.id)` als Identifier verwendet
- **Validierung**: Slug-Format (lowercase, Bindestriche erlaubt, keine Leerzeichen)
- **API-Schreibzugriff**: Über PATCH `/api/profile/me/` im bestehenden `UserProfileUpdateIn` Schema

### 2. Neuer API-Endpunkt statt Erweiterung des bestehenden
Der bestehende Endpunkt `GET /api/profile/{user_id}/` wird von Haupt-Frontend genutzt und gibt nur Sessions/Blog/Game zurück. Statt ihn zu erweitern (breaking für Haupt-Frontend), gibt es einen neuen Endpunkt speziell für das Food Frontend:

- `GET /api/profile/by-slug/{slug}/` → `PublicUserFoodProfileOut`
- Löst per slug auf (mit Fallback auf `str(user.id)` als Slug)
- Gibt öffentliche Rezepte (visibility=public), Einkaufslisten (shared), Essenspläne (shared) zurück
- Respektiert `is_public` Flag wie der bestehende Endpunkt

### 3. Paginierte Sektionen im Profil
Rezepte, Einkaufslisten und Essenspläne werden als paginierte Sektionen ausgeliefert (jeweils neueste 20). Das Profil selbst hat keine Paginierung (nur ein User).

### 4. Sichtbarkeitsfilter pro Entity-Typ
- **Rezepte**: `visibility=PUBLIC AND status=APPROVED` ODER `is_owner=true` für den eigenen User
- **Einkaufslisten**: Nur Lists wo der User `owner` ist (keine Rollen-basierte Öffentlichkeit)
- **Essenspläne**: Alle Pläne wo `created_by=user` (kein Sichtbarkeits-Flag)

## Risks / Trade-offs

- **Fallback auf user.id**: Wenn slug nicht gesetzt ist, sind URLs nicht human-readable (nur numerisch). User können das aber nachträglich setzen.
- **Sichtbarkeit von Einkaufslisten/Essensplänen**: Diese haben kein explizites `is_public`-Flag. Im ersten Release werden nur eigene (owner/created_by) angezeigt. Kollaboration/Lesen-Rechte könnten später ergänzt werden.
- **Migration**: Nullable Slug mit unique-Constraint bedeutet, dass viele User erstmal `slug=NULL` haben. Das ist ok, solange der Fallback sauber funktioniert.

## Data Model

```
UserProfile
  └─ slug: SlugField(max_length=50, unique=True, null=True, blank=True)
```

## API Contract

### GET /api/profile/by-slug/{slug}/

**Response 200** (PublicUserFoodProfileOut):

```json
{
  "id": 1,
  "slug": "peter",
  "scout_name": "Peter",
  "first_name": "Peter",
  "about_me": "Hallo!",
  "profile_picture_url": "https://...",
  "created_at": "2024-01-01T00:00:00Z",
  "recipes": [
    {
      "id": 1,
      "title": "Nudeln mit Tomatensoße",
      "slug": "nudeln-mit-tomatensosse",
      "summary": "...",
      "image_url": null,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "shopping_lists": [
    {
      "id": 1,
      "name": "Wocheneinkauf",
      "item_count": 12,
      "created_at": "2024-01-01T00:00:00Z"
    }
  ],
  "meal_plans": [
    {
      "id": 1,
      "name": "Sommerlager",
      "slug": "sommerlager",
      "created_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

**Response 404**: `{ "detail": "Profil nicht gefunden" }`
