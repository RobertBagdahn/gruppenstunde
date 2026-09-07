# Food E2E Tests

The required suite uses the local Food frontend at `http://localhost:5174` and the session-authenticated seed user by default.

```bash
npm test
npm run test:mocked
npm run test:live
npm run test:responsive
```

Start the backend and both frontends with `./e2e/smoke-test.sh` when running against the local stack. Override the defaults with `E2E_BASE_URL`, `FOOD_E2E_EMAIL`, and `FOOD_E2E_PASSWORD`.

The required projects do not call live AI providers or external recipe websites. Live provider checks belong in a separate optional project. Tests track created resources and clean them up in reverse dependency order; cleanup failures fail the test run instead of silently reusing polluted data.

The live and responsive projects require the local backend, database, and Food frontend. Start them with `./e2e/smoke-test.sh`; this requires a running Podman machine. If Podman or PostgreSQL is unavailable, mocked tests can still run against a standalone Food Vite server:

```bash
npm --prefix ../frontend-food run dev -- --port 5174 --strictPort
npx playwright test --project=mocked
```

The regular recipe smoke files retain a small amount of legacy coverage for public/authenticated page availability. New integrity tests use the shared fixtures and do not filter flow errors or skip missing persistence data.

Ordinary shopping-list tests isolate the REST workflow from the list WebSocket. Realtime protocol coverage is a separate boundary and is not part of the required suite.
