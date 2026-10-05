"""Tests for shared WeasyPrint rendering behavior."""

import pytest
from ninja.errors import HttpError

from core.services.pdf_rendering import render_html_to_pdf


def test_render_html_to_pdf_returns_pdf_bytes() -> None:
    pdf = render_html_to_pdf("<html><body><p>PDF test</p></body></html>", export_type="test")

    assert pdf.startswith(b"%PDF-")


def test_render_html_to_pdf_returns_logged_german_error_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingHtml:
        def __init__(self, *, string: str, base_url: str) -> None:
            self.string = string
            self.base_url = base_url

        def write_pdf(self, *, optimize_size: tuple[str, ...]) -> bytes:
            raise RuntimeError("renderer unavailable")

    monkeypatch.setattr("core.services.pdf_rendering.HTML", FailingHtml)

    with pytest.raises(HttpError) as error:
        render_html_to_pdf("<p>PDF test</p>", export_type="test")

    assert error.value.status_code == 500
    assert error.value.message == "PDF-Generierung fehlgeschlagen"
