# Reliable and optimized PDF exports

## Why

Production Cloud Run logs show that exporting meal plan 18 returns HTTP 503 because the backend instance exceeds its 512 MiB memory limit and is terminated during WeasyPrint rendering. All server-generated PDFs share this constrained backend, and the WeasyPrint-based recipe and cooking-plan exports also need bounded asset sizes and consistent rendering behavior.

## What Changes

- Increase backend memory and bound Cloud Run/Gunicorn concurrency so concurrent, memory-heavy PDF renders cannot exhaust an instance.
- Make container builds execute a real WeasyPrint render smoke test and explicitly install its runtime libraries.
- Use a shared WeasyPrint rendering helper with a filesystem base URL, output optimization, and consistent logged German errors.
- Downsample and compress recipe images before embedding them in PDF HTML.
- Honor selected page formats consistently, including meal-plan exports.

## Capabilities

### New Capabilities
- `reliable-pdf-exports`: Runtime reliability, memory bounds, and consistent rendering for server-generated PDFs.

## Impact

- Backend PDF services in `planner` and `recipe`.
- `Dockerfile.backend`, Cloud Build and GitHub Actions deploy commands, and Cloud Run Terraform defaults.
- No API schema changes. Existing PDF URLs, query parameters, response content type, and inline disposition remain unchanged.
