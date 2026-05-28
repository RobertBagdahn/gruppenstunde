---
description: Deploy Inspi to Google Cloud Run (interactive, step-by-step)
---

Deploy the Inspi platform to Google Cloud Run. Runs pre-flight checks, verifies infrastructure, and deploys backend/frontend step by step — asking before each action.

Load the `deploy` skill and follow its workflow.

Supports partial deploys:
- `/deploy` — Full deployment (all phases)
- `/deploy backend` — Only backend
- `/deploy frontend` — Only frontend
- `/deploy checks` — Only pre-flight checks, no deploy
- `/deploy migrations` — Only run Django migrations
