"""`make feedback-retry`: sends the pending feedback entries of the journal to GitHub."""

from __future__ import annotations

import sys

from ruebert.feedback.service import retry_pending
from ruebert.settings import get_settings


def main() -> int:
    settings = get_settings()
    if settings.github_token is None:
        sys.stderr.write("GITHUB_TOKEN fehlt in backend/.env. Nichts gesendet.\n")
        return 1
    urls = retry_pending(settings)
    sys.stdout.write(f"{len(urls)} Rückmeldung(en) gesendet.\n")
    for url in urls:
        sys.stdout.write(f"{url}\n")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
