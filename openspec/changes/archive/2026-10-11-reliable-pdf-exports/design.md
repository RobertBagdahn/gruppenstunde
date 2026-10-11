# Design: Reliable and optimized PDF exports

## Runtime limits

Cloud Run is configured at 512 MiB while Gunicorn starts two processes with four threads each. A single meal-plan render exceeded that limit in production. Raise the container to 1 GiB and set instance concurrency to one, with one Gunicorn worker, so a PDF render is isolated from competing requests on the same instance. Cloud Run can scale out for parallel traffic.

## Rendering path

A shared helper will call WeasyPrint with the backend root as `base_url`, optimize embedded images/fonts, and log contextual exceptions before returning the existing German HTTP 500 error. The three WeasyPrint export services will use it. The recipe export will constrain embedded photos to a print-appropriate maximum resolution and JPEG quality, avoiding oversized data URIs and PDFs.

The container build will install the required Pango, Cairo, GDK-Pixbuf, and shared-mime libraries and run a minimal PDF write as a build-time smoke test. This detects broken native dependencies before deployment.

## Page formats

A4 stays the default. The meal-plan template will explicitly apply the selected A4 or Letter page size, matching the existing recipe and cooking-schedule exports.

## Compatibility

No URL, query-parameter, auth, or PDF response contract changes. ReportLab-based invitation and participant PDFs benefit from the same Cloud Run resource/concurrency limits but retain their existing renderer.
