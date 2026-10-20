"""Minimal GitHub REST client for issues and labels. Errors never contain the token."""

from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Final

import httpx

logger = logging.getLogger(__name__)

API_URL: Final = "https://api.github.com"
LABEL_COLOURS: Final[dict[str, str]] = {
    "frage": "0075ca",
    "bug": "d73a4a",
    "feature": "a2eeef",
    "rübert-feedback": "7057ff",
}
UNAVAILABLE: Final = "GitHub ist gerade nicht erreichbar. Die Rückmeldung ist im Journal vorgemerkt."


class GitHubError(RuntimeError):
    """The request failed; the message is German and can be shown to the user."""


@dataclass(frozen=True)
class CreatedIssue:
    number: int
    url: str


class GitHubIssues:
    def __init__(self, token: str, repo: str, transport: httpx.BaseTransport | None = None) -> None:
        self._repo = repo
        self._client = httpx.Client(
            base_url=API_URL,
            headers={
                "Authorization": f"Bearer {token}",
                "Accept": "application/vnd.github+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            timeout=10.0,
            transport=transport,
        )

    def close(self) -> None:
        self._client.close()

    def ensure_labels(self) -> None:
        """Creates the labels that are missing in the repository; existing labels are left alone."""
        for name, colour in LABEL_COLOURS.items():
            response = self._request("GET", f"/repos/{self._repo}/labels/{name}", allow_404=True)
            if response.status_code == 404:
                self._request("POST", f"/repos/{self._repo}/labels", json={"name": name, "color": colour})

    def create_issue(self, title: str, body: str, labels: list[str], assignee: str) -> CreatedIssue:
        response = self._request(
            "POST",
            f"/repos/{self._repo}/issues",
            json={"title": title, "body": body, "labels": labels, "assignees": [assignee]},
        )
        data = response.json()
        return CreatedIssue(number=int(data["number"]), url=str(data["html_url"]))

    def _request(self, method: str, path: str, *, json: object = None, allow_404: bool = False) -> httpx.Response:
        try:
            response = self._client.request(method, path, json=json)
        except httpx.HTTPError as error:
            logger.warning("GitHub request %s %s failed: %s", method, path, type(error).__name__)
            raise GitHubError(UNAVAILABLE) from error
        if response.status_code == 404 and allow_404:
            return response
        if response.status_code >= 400:
            logger.warning("GitHub answered %s to %s %s", response.status_code, method, path)
            raise GitHubError(UNAVAILABLE)
        return response
