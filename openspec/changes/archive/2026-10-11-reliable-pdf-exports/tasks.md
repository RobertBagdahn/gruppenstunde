## 1. Container and Cloud Run reliability

- [x] 1.1 Explicitly install WeasyPrint's runtime libraries and run a build-time render smoke test.
- [x] 1.2 Bound backend instance concurrency, reduce Gunicorn worker memory, and raise the Cloud Run memory limit to 1 GiB.

## 2. PDF rendering improvements

- [x] 2.1 Add a shared WeasyPrint helper with base URL, output optimization, and logged German errors.
- [x] 2.2 Use it in meal-plan, cooking-schedule, and recipe PDF services.
- [x] 2.3 Downsample/compress recipe images before embedding them.
- [x] 2.4 Apply page format reliably in the meal-plan PDF.
- [x] 2.5 Skip excluded meal-plan calculations and release raw prefetched objects before rendering.

## 3. Verification

- [x] 3.1 Add tests for renderer error handling, recipe image bounds, and meal-plan page format.
- [x] 3.2 Run focused PDF tests and backend checks. Docker is unavailable locally; the image build now performs the render smoke test in CI.

## 4. Review follow-up (WP-07/WP-08)

- [x] 4.1 Replace the unsupported `optimize_size` option with `optimize_images=True, jpeg_quality=82`; test asserts no „Unknown rendering option“ warning (`core/tests/test_pdf_rendering.py`).
- [x] 4.2 One Gunicorn worker × one thread in `Dockerfile.backend`; GitHub Actions deploy (single production pipeline) sets 1 GiB, concurrency 1, max 2 instances; Cloud Build files removed; consistency enforced by `core/tests/test_runtime_limits.py`.
- [x] 4.3 Sprint-B verification: meal-plan PDF A4/Letter returned valid PDFs (2026-10-11 food-shopping-pdf report).
- [ ] 4.4 Browser-verify that the recipe PDF table and step list use the same units. The available food-recipe-wizard report documents the pre-fix step-unit defect but does not include post-fix browser evidence.
