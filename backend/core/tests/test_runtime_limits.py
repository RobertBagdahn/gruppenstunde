"""Backend runtime limits must be identical in every deploy definition.

The production pipeline (.github/workflows/deploy.yml), the image defaults
(Dockerfile.backend), OpenTofu (terraform/variables.tf), the manual Makefile
deploy and the database capacity check must agree on one set of values.
"""

import re
from io import StringIO
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
import yaml
from django.core.management import call_command

from core.services.database_capacity import calculate_max_application_connections

REPO_ROOT = Path(__file__).resolve().parents[3]

# reliable-pdf-exports: one Gunicorn worker and one request per instance, >= 1 GiB.
EXPECTED_RUNTIME_LIMITS = {
    "BACKEND_MAX_INSTANCES": "2",
    "BACKEND_CONCURRENCY": "1",
    "BACKEND_MEMORY": "1Gi",
    "GUNICORN_WORKERS": "1",
    "GUNICORN_THREADS": "1",
}

TERRAFORM_VARIABLE_NAMES = {
    "BACKEND_MAX_INSTANCES": "backend_max_instances",
    "BACKEND_CONCURRENCY": "backend_concurrency",
    "BACKEND_MEMORY": "backend_memory",
    "GUNICORN_WORKERS": "backend_gunicorn_workers",
    "GUNICORN_THREADS": "backend_gunicorn_threads",
}


def _read_repo_file(relative_path: str) -> str:
    return (REPO_ROOT / relative_path).read_text(encoding="utf-8")


def test_deploy_workflow_uses_the_expected_runtime_limits() -> None:
    workflow = yaml.safe_load(_read_repo_file(".github/workflows/deploy.yml"))
    deploy_env = workflow["jobs"]["deploy"]["env"]

    assert {name: str(deploy_env[name]) for name in EXPECTED_RUNTIME_LIMITS} == EXPECTED_RUNTIME_LIMITS


def test_backend_image_defaults_match_the_runtime_limits() -> None:
    dockerfile = _read_repo_file("Dockerfile.backend")

    for name in ("GUNICORN_WORKERS", "GUNICORN_THREADS"):
        match = re.search(rf"\b{name}=(\S+)", dockerfile)
        assert match is not None, name
        assert match.group(1) == EXPECTED_RUNTIME_LIMITS[name], name


def test_terraform_defaults_match_the_runtime_limits() -> None:
    variables = _read_repo_file("terraform/variables.tf")

    for name, variable in TERRAFORM_VARIABLE_NAMES.items():
        match = re.search(rf'variable "{variable}" \{{.*?default\s*=\s*"?([^"\s]+)"?', variables, re.DOTALL)
        assert match is not None, variable
        assert match.group(1) == EXPECTED_RUNTIME_LIMITS[name], variable


def test_makefile_defaults_match_the_runtime_limits() -> None:
    makefile = _read_repo_file("Makefile")

    for name, expected in EXPECTED_RUNTIME_LIMITS.items():
        match = re.search(rf"^{name} \?= (\S+)$", makefile, re.MULTILINE)
        assert match is not None, name
        assert match.group(1) == expected, name


def test_capacity_check_defaults_match_the_runtime_limits(monkeypatch: pytest.MonkeyPatch) -> None:
    for name in (*EXPECTED_RUNTIME_LIMITS, "BACKGROUND_WORKERS_PER_PROCESS", "DB_CONNECTION_RESERVE"):
        monkeypatch.delenv(name, raising=False)
    connection = MagicMock()
    connection.vendor = "postgresql"
    connection.cursor.return_value.__enter__.return_value.fetchone.return_value = (100, 3, 0, 0)
    output = StringIO()

    with patch("core.management.commands.check_database_capacity.connection", connection):
        call_command("check_database_capacity", stdout=output)

    expected_maximum = calculate_max_application_connections(
        max_instances=int(EXPECTED_RUNTIME_LIMITS["BACKEND_MAX_INSTANCES"]),
        request_concurrency=int(EXPECTED_RUNTIME_LIMITS["BACKEND_CONCURRENCY"]),
        gunicorn_workers=int(EXPECTED_RUNTIME_LIMITS["GUNICORN_WORKERS"]),
        gunicorn_threads=int(EXPECTED_RUNTIME_LIMITS["GUNICORN_THREADS"]),
        background_workers_per_process=1,
        connection_max_age_seconds=0,
    )
    assert f"configured_application_max={expected_maximum}" in output.getvalue()
