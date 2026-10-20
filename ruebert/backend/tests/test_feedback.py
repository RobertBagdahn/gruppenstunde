"""Spec `feedback-issues`: issue creation, labels, pending fallback, retry, token never leaves the server."""

from __future__ import annotations

import json
import logging
from datetime import date
from pathlib import Path

import httpx
import pytest
from fastapi.testclient import TestClient
from pydantic import SecretStr
from ruebert.api.feedback import github_transport
from ruebert.feedback import FeedbackInput, retry_pending, submit
from ruebert.settings import Settings

from ruebert.journal import read_entries

from .conftest import make_client

TOKEN = "github_pat_TESTSECRET_do_not_leak"
KNOWLEDGE = Path(__file__).resolve().parents[2] / "knowledge"


class FakeGitHub:
    """Records every request; labels answer 404 until created; issues get numbers from 42 on."""

    def __init__(self, *, fail: bool = False, existing: set[str] | None = None) -> None:
        self.requests: list[tuple[str, str, dict[str, object]]] = []
        self.labels = set(existing or set())
        self.fail = fail
        self.next_number = 42

    def __call__(self, request: httpx.Request) -> httpx.Response:
        body: dict[str, object] = json.loads(request.content) if request.content else {}
        self.requests.append((request.method, request.url.path, body))
        assert request.headers["Authorization"] == f"Bearer {TOKEN}"
        if self.fail:
            return httpx.Response(500, json={"message": "Server Error"})
        if request.method == "GET" and "/labels/" in request.url.path:
            name = request.url.path.rsplit("/", 1)[1]
            return httpx.Response(200 if name in self.labels else 404, json={"name": name})
        if request.method == "POST" and request.url.path.endswith("/labels"):
            self.labels.add(str(body["name"]))
            return httpx.Response(201, json=body)
        if request.method == "POST" and request.url.path.endswith("/issues"):
            number = self.next_number
            self.next_number += 1
            return httpx.Response(201, json={"number": number, "html_url": f"https://github.com/x/y/issues/{number}"})
        return httpx.Response(404, json={"message": "Not Found"})

    def issues(self) -> list[dict[str, object]]:
        return [
            body
            for method, path, body in self.requests
            if method == "POST" and path.endswith("/issues") and isinstance(body, dict)
        ]


@pytest.fixture
def with_token(settings: Settings) -> Settings:
    return settings.model_copy(update={"github_token": SecretStr(TOKEN)})


def item(kind: str = "bug", title: str = "Button fehlt") -> FeedbackInput:
    return FeedbackInput(
        kind=kind,  # type: ignore[arg-type]
        title=title,
        description="Auf dem Artikel fehlt die Herleitung.",
        author="Daniel",
        context={"Route": "/products/DGW004", "Artikel": "DGW004", "Stichtag": "2026-05-18"},
    )


def payload(title: str = "Frage zur Rundung") -> dict[str, object]:
    return {
        "kind": "frage",
        "title": title,
        "description": "",
        "author": "",
        "context": {
            "route": "/order-plans",
            "page": "Bestellplaner",
            "sku": None,
            "case_id": None,
            "reference_date": date(2026, 5, 18).isoformat(),
            "app_version": "0.1.0",
        },
    }


class TestSubmit:
    def test_creates_an_issue_with_type_label_context_and_mention(self, with_token: Settings) -> None:
        fake = FakeGitHub()
        result = submit(with_token, item(), httpx.MockTransport(fake))
        assert result.status == "sent"
        assert result.issue_number == 42
        assert result.issue_url == "https://github.com/x/y/issues/42"
        [issue] = fake.issues()
        assert issue["title"] == "[Bug] Button fehlt"
        assert issue["labels"] == ["bug", "rübert-feedback"]
        assert issue["assignees"] == ["RobertBagdahn"]
        assert "@RobertBagdahn" in str(issue["body"])
        assert "- Artikel: DGW004" in str(issue["body"])
        assert "Autorin/Autor: Daniel" in str(issue["body"])

    def test_missing_labels_are_created_and_existing_ones_are_left_alone(self, with_token: Settings) -> None:
        fake = FakeGitHub(existing={"bug", "frage"})
        submit(with_token, item(), httpx.MockTransport(fake))
        created = {
            body["name"] for method, path, body in fake.requests if method == "POST" and path.endswith("/labels")
        }  # type: ignore[index]
        assert created == {"feature", "rübert-feedback"}

    def test_success_is_recorded_in_the_journal(self, with_token: Settings) -> None:
        submit(with_token, item(), httpx.MockTransport(FakeGitHub()))
        [entry] = read_entries(with_token.journal_dir)
        assert (entry.type, entry.choice, entry.value) == ("feedback", "sent", 42)

    def test_without_token_the_feedback_waits_in_the_journal_as_pending(self, settings: Settings) -> None:
        result = submit(settings, item())
        assert result.status == "pending"
        assert "vorgemerkt" in result.message
        [entry] = read_entries(settings.journal_dir)
        assert entry.choice == "pending"
        assert entry.details is not None and entry.details["title"] == "Button fehlt"

    def test_github_error_keeps_the_feedback_pending(self, with_token: Settings) -> None:
        result = submit(with_token, item(), httpx.MockTransport(FakeGitHub(fail=True)))
        assert result.status == "pending"
        assert [e.choice for e in read_entries(with_token.journal_dir)] == ["pending"]

    def test_the_token_never_appears_in_results_journal_or_logs(
        self, with_token: Settings, caplog: pytest.LogCaptureFixture
    ) -> None:
        caplog.set_level(logging.DEBUG)
        results = [
            submit(with_token, item(), httpx.MockTransport(FakeGitHub())),
            submit(with_token, item("frage", "Warum?"), httpx.MockTransport(FakeGitHub(fail=True))),
        ]
        visible = " ".join([r.message for r in results] + [caplog.text])
        for path in Path(with_token.journal_dir).rglob("*.yaml"):
            visible += path.read_text(encoding="utf-8")
        assert TOKEN not in visible


class TestRetry:
    def test_pending_entries_are_sent_once_and_superseded(self, with_token: Settings, settings: Settings) -> None:
        submit(settings, item())  # without token: pending
        urls = retry_pending(with_token, httpx.MockTransport(FakeGitHub()))
        assert urls == ["https://github.com/x/y/issues/42"]
        pending, sent = read_entries(with_token.journal_dir)
        assert (pending.choice, sent.choice, sent.supersedes) == ("pending", "sent", pending.id)
        assert retry_pending(with_token, httpx.MockTransport(FakeGitHub())) == []


class TestApi:
    def test_missing_title_is_rejected_and_nothing_is_sent(self, client: TestClient, settings: Settings) -> None:
        response = client.post("/api/feedback", json=payload(title="   "))
        assert response.status_code == 422
        assert response.json()["errors"][0]["field"] == "title"
        assert read_entries(settings.journal_dir) == []

    def test_success_returns_issue_number_and_link_without_the_token(self, settings: Settings) -> None:
        app_client = make_client(settings.model_copy(update={"github_token": SecretStr(TOKEN)}))
        fake = FakeGitHub()
        app_client.app.dependency_overrides[github_transport] = lambda: httpx.MockTransport(fake)  # type: ignore[attr-defined]
        response = app_client.post("/api/feedback", json=payload())
        assert response.status_code == 200
        assert response.json() == {
            "status": "sent",
            "message": "Danke. Die Rückmeldung ist als Issue #42 angelegt.",
            "issue_number": 42,
            "issue_url": "https://github.com/x/y/issues/42",
        }
        assert TOKEN not in response.text

    def test_without_token_the_api_answers_pending(self, client: TestClient) -> None:
        body = client.post("/api/feedback", json=payload()).json()
        assert body["status"] == "pending"
        assert body["issue_number"] is None


class TestQuestions:
    def test_a_question_is_read_from_the_wiki_files(self, settings: Settings) -> None:
        settings.knowledge_dir = KNOWLEDGE
        response = make_client(settings).get("/api/questions/Q-050")
        assert response.status_code == 200
        assert response.json()["title"].startswith("Q-050")
        assert response.json()["priority"] == "A"

    @pytest.mark.parametrize("bad", ["Q-999", "q-050", "Q-050x"])
    def test_unknown_or_malformed_ids_are_404(self, settings: Settings, bad: str) -> None:
        settings.knowledge_dir = KNOWLEDGE
        assert make_client(settings).get(f"/api/questions/{bad}").status_code == 404
