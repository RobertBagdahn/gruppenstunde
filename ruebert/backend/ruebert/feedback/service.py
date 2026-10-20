"""Feedback submission: GitHub issue when possible, otherwise a pending journal entry that a retry sends later."""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Literal

import httpx

from ruebert.feedback.github import UNAVAILABLE, GitHubError, GitHubIssues
from ruebert.journal import read_entries, write_entry
from ruebert.settings import Settings

logger = logging.getLogger(__name__)

Kind = Literal["frage", "bug", "feature"]
KIND_LABEL: dict[str, str] = {"frage": "Frage", "bug": "Bug", "feature": "Feature"}
NO_TOKEN: str = "Kein GitHub-Zugang konfiguriert. Die Rückmeldung ist im Journal vorgemerkt."


@dataclass(frozen=True)
class FeedbackInput:
    kind: Kind
    title: str
    description: str
    author: str
    context: dict[str, str | None] = field(default_factory=lambda: {})


@dataclass(frozen=True)
class SubmitResult:
    status: Literal["sent", "pending"]
    message: str
    issue_number: int | None = None
    issue_url: str | None = None


def issue_title(item: FeedbackInput) -> str:
    return f"[{KIND_LABEL[item.kind]}] {item.title}"


def issue_body(item: FeedbackInput, mention: str) -> str:
    lines = [item.description.strip() or "(keine Beschreibung)", ""]
    if item.author:
        lines.append(f"Autorin/Autor: {item.author}")
    lines.append("Kontext:")
    lines += [f"- {key}: {value}" for key, value in item.context.items() if value]
    lines += ["", f"{mention}"]
    return "\n".join(lines)


def submit(
    settings: Settings,
    item: FeedbackInput,
    transport: httpx.BaseTransport | None = None,
    supersedes: str | None = None,
) -> SubmitResult:
    """Create the issue; on any failure or without token, write the feedback to the journal as pending.

    `supersedes` is the pending entry this send replaces (retry), so the journal shows one state per feedback.
    """
    token = settings.github_token
    if token is None:
        return _pending(settings, item, NO_TOKEN)
    try:
        return _send(settings, item, token.get_secret_value(), transport, supersedes)
    except GitHubError:
        return _pending(settings, item, UNAVAILABLE)


def _send(
    settings: Settings,
    item: FeedbackInput,
    token: str,
    transport: httpx.BaseTransport | None,
    supersedes: str | None,
) -> SubmitResult:
    client = GitHubIssues(token, settings.github_repo, transport)
    try:
        client.ensure_labels()
        mention = f"@{settings.github_assignee}"
        issue = client.create_issue(
            issue_title(item),
            issue_body(item, mention),
            [item.kind, "rübert-feedback"],
            settings.github_assignee,
        )
    finally:
        client.close()
    write_entry(
        settings.journal_dir,
        type="feedback",
        subject=f"feedback:{issue.number}",
        choice="sent",
        value=issue.number,
        author=settings.journal_author,
        details={"issue_url": issue.url, "kind": item.kind},
        supersedes=supersedes,
    )
    return SubmitResult(
        "sent", f"Danke. Die Rückmeldung ist als Issue #{issue.number} angelegt.", issue.number, issue.url
    )


def _pending(settings: Settings, item: FeedbackInput, reason: str) -> SubmitResult:
    entry = write_entry(
        settings.journal_dir,
        type="feedback",
        subject=f"feedback:pending:{item.title[:40]}",
        choice="pending",
        reason=item.title,
        author=settings.journal_author,
        details={
            "kind": item.kind,
            "title": item.title,
            "description": item.description,
            "author": item.author,
            "context": {k: v for k, v in item.context.items() if v is not None},
        },
    )
    logger.info("Feedback %s kept as pending in the journal", entry.id)
    return SubmitResult("pending", f"{reason} Sie wird gesendet, sobald GitHub erreichbar ist.")


def retry_pending(settings: Settings, transport: httpx.BaseTransport | None = None) -> list[str]:
    """Sends every pending feedback that is not yet superseded. Returns the issue URLs created."""
    entries = read_entries(settings.journal_dir)
    superseded = {e.supersedes for e in entries if e.supersedes}
    urls: list[str] = []
    for entry in entries:
        if entry.type != "feedback" or entry.choice != "pending" or entry.id in superseded or not entry.details:
            continue
        item = FeedbackInput(
            kind=entry.details["kind"],
            title=entry.details["title"],
            description=entry.details.get("description", ""),
            author=entry.details.get("author", ""),
            context=entry.details.get("context", {}),
        )
        result = submit(settings, item, transport, supersedes=entry.id)
        if result.status == "sent" and result.issue_url:
            urls.append(result.issue_url)
    return urls
