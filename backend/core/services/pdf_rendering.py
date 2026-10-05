"""Shared, resource-conscious PDF rendering helpers."""

import logging

from django.conf import settings
from ninja.errors import HttpError
from weasyprint import HTML

logger = logging.getLogger(__name__)


def render_html_to_pdf(html: str, *, export_type: str) -> bytes:
    """Render HTML to optimized PDF bytes with consistent diagnostics and errors."""
    try:
        return HTML(string=html, base_url=str(settings.BASE_DIR)).write_pdf(optimize_size=("images", "fonts"))
    except Exception as exc:
        logger.exception("PDF rendering failed (export_type=%s)", export_type)
        raise HttpError(500, "PDF-Generierung fehlgeschlagen") from exc
