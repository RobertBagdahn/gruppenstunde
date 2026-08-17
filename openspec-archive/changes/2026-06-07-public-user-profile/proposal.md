## Why

Das öffentliche User-Profil auf essensplan.app ist tot: Links zu `/profile/name/11` führen ins Leere (keine Route), und es gibt keine Möglichkeit, alle öffentlichen Inhalte eines Users (Rezepte, Einkaufslisten, Essenspläne) an einem Ort zu sehen.

## What Changes

- **UserProfile erhält ein `slug`-Feld** (unique, optional, max 50 Zeichen) als human-readable Identifier
- **Neuer API-Endpunkt** `GET /api/profile/by-slug/{slug}/` gibt öffentliches Profil inkl. Rezepte, Einkaufslisten und Essenspläne zurück
- **Neue Route** `/profile/name/:slug` im Food Frontend mit einer ProfilePage
- **entityUrls** nutzt `slug` statt `id` für User-Links
- **ContentAuthorSection** und andere User-Links verweisen auf die neue Route
- Bestehender `GET /api/profile/{user_id}/` Endpunkt bleibt erhalten (für Kompatibilität mit Haupt-Frontend)

## Capabilities

### New Capabilities
- `public-user-profile`: Öffentliches User-Profil im Food-Frontend mit slug-basierter URL, Anzeige von User-Info, Rezepten (public/sichtbare), Einkaufslisten (shared), Essensplänen (shared)

### Modified Capabilities
- `user-profiles`: UserProfile-Modell erhält `slug`-Feld; API erhält neuen by-slug-Endpunkt und gibt slug in allen Profil-Out-Schemas aus

## Impact

- **Backend**: Migration für neues `slug`-Feld auf UserProfile; neuer API-Endpunkt; Pydantic-Schemas erweitern
- **Food Frontend**: Neue Page, Route, API-Hook; entityUrls-Update; Zod-Schemas erweitern
- **Haupt-Frontend**: Keine Änderungen (bleibt bei `/user/:userId`)
