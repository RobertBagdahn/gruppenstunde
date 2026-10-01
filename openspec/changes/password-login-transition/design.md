## Context

Production has no OAuth clients yet; every account is an e-mail/password account. The previous change removed the password API.

## Goals / Non-Goals

**Goals:** Roll out the new system without locking anybody out; switch off password login later without a code change.
**Non-Goals:** Password reset by e-mail, migrating users automatically.

## Decisions

- One switch `AUTH_PASSWORD_LOGIN_ENABLED` (env, default `True`) gates login and registration together, so new visitors can still sign up while no provider is configured.
- The frontend never decides on its own: it shows the e-mail form only when `/api/auth/providers/` returns `password_login: true`.
- Registration validates with Django's `AUTH_PASSWORD_VALIDATORS` (German messages) and creates the `UserProfile`; new accounts see the onboarding dialog like social signups.
- Account deletion keeps the "recent login" rule; a password login counts as a fresh login.

## Risks / Trade-offs

- [No brute-force protection on the login endpoint, as before] → unchanged from the old system; tracked separately.
- [Allauth wipes the password when an unverified local address is linked via e-mail authentication] → only after a user logs in with a provider using the same e-mail; that user then logs in via the provider.

## Rollout-Kompatibilität

Während des Rolling Deployments liefert `/api/auth/me/` die alten Top-Level-Userfelder zusätzlich zum neuen Session-Envelope. So kann das alte Frontend angemeldete Sessions weiter erkennen, bis beide Frontends aktualisiert sind. Für anonyme Nutzer bleiben `id` und `email` null; es wird keine Scheinidentität ausgegeben.
