"""Tests for shared WeasyPrint rendering behavior."""

import logging

import pytest
from ninja.errors import HttpError

from core.services.pdf_rendering import render_html_to_pdf


def test_render_html_to_pdf_returns_pdf_bytes() -> None:
    pdf = render_html_to_pdf("<html><body><p>PDF test</p></body></html>", export_type="test")

    assert pdf.startswith(b"%PDF-")


def test_render_html_to_pdf_uses_only_known_weasyprint_options(caplog: pytest.LogCaptureFixture) -> None:
    with caplog.at_level(logging.WARNING, logger="weasyprint"):
        pdf = render_html_to_pdf("<html><body><p>Kleines PDF</p></body></html>", export_type="test")

    assert pdf.startswith(b"%PDF-")
    assert not [record for record in caplog.records if "Unknown rendering option" in record.getMessage()]


def test_render_html_to_pdf_returns_logged_german_error_on_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    class FailingHtml:
        def __init__(self, *, string: str, base_url: str) -> None:
            self.string = string
            self.base_url = base_url

        def write_pdf(self, *, optimize_images: bool, jpeg_quality: int) -> bytes:
            raise RuntimeError("renderer unavailable")

    monkeypatch.setattr("core.services.pdf_rendering.HTML", FailingHtml)

    with pytest.raises(HttpError) as error:
        render_html_to_pdf("<p>PDF test</p>", export_type="test")

    assert error.value.status_code == 500
    assert error.value.message == "PDF-Generierung fehlgeschlagen"


def test_concurrent_renders_do_not_overlap(monkeypatch: pytest.MonkeyPatch) -> None:
    import threading
    import time

    state = {"active": 0, "peak": 0}
    guard = threading.Lock()

    class SlowHtml:
        def __init__(self, *, string: str, base_url: str) -> None:
            pass

        def write_pdf(self, *, optimize_images: bool, jpeg_quality: int) -> bytes:
            with guard:
                state["active"] += 1
                state["peak"] = max(state["peak"], state["active"])
            time.sleep(0.05)
            with guard:
                state["active"] -= 1
            return b"%PDF-"

    monkeypatch.setattr("core.services.pdf_rendering.HTML", SlowHtml)

    threads = [
        threading.Thread(target=render_html_to_pdf, args=("<p>x</p>",), kwargs={"export_type": "test"})
        for _ in range(4)
    ]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert state["peak"] == 1
