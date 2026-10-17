"""The WSGI app and URLconf must not import heavy Google SDKs at startup (cold start)."""

import json
import subprocess
import sys
from pathlib import Path

HEAVY_PREFIXES = ("google.genai", "google.cloud", "google.api_core", "grpc")

SCRIPT = """
import json, sys
import django
django.setup()
from django.urls import get_resolver
from inspi.wsgi import application  # noqa: F401
get_resolver().url_patterns
print(json.dumps(sorted(m for m in sys.modules if m.split('.')[0] in ('google', 'grpc'))))
"""


def test_wsgi_import_and_urlconf_do_not_load_heavy_sdks() -> None:
    backend_dir = Path(__file__).resolve().parents[2]
    result = subprocess.run(
        [sys.executable, "-c", SCRIPT],
        cwd=backend_dir,
        capture_output=True,
        text=True,
        check=False,
        timeout=120,
    )

    assert result.returncode == 0, result.stderr[-2000:]
    loaded = json.loads(result.stdout.strip().splitlines()[-1])
    heavy = [name for name in loaded if name.startswith(HEAVY_PREFIXES)]
    assert heavy == [], heavy[:10]
