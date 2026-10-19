"""Shared, resource-conscious PDF rendering helpers."""

import logging
import threading

from django.conf import settings
from ninja.errors import HttpError
from weasyprint import HTML

logger = logging.getLogger(__name__)

# WeasyPrint renders are memory-heavy: one at a time per process, while other
# requests keep using the remaining threads.
_RENDER_SLOT = threading.BoundedSemaphore(1)


def render_html_to_pdf(html: str, *, export_type: str) -> bytes:
    """Render HTML to optimized PDF bytes with consistent diagnostics and errors."""
    try:
        with _RENDER_SLOT:
            return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf(optimize_images=True, jpeg_quality=82)
    except Exception as exc:
        logger.exception("PDF rendering failed (export_type=%s)", export_type)
        raise HttpError(500, "PDF-Generierung fehlgeschlagen") from exc
