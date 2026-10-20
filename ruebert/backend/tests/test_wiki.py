"""Spec `wiki-viewer`: tree and pages from knowledge/, path checks (404, nothing read), read-only."""

from __future__ import annotations

from pathlib import Path

import pytest
from ruebert.settings import Settings

from .conftest import make_client

KNOWLEDGE = Path(__file__).resolve().parents[2] / "knowledge"


@pytest.fixture
def wiki(settings: Settings) -> object:
    settings.knowledge_dir = KNOWLEDGE
    return make_client(settings)


def test_tree_lists_folders_and_pages_with_frontmatter_titles(wiki) -> None:  # type: ignore[no-untyped-def]
    tree = wiki.get("/api/wiki").json()
    names = {node["path"] for node in tree}
    assert "index.md" in names and "plan" in names and "open-questions" in names
    plan = next(node for node in tree if node["path"] == "plan")
    assert plan["kind"] == "folder"
    assert plan["title"]  # from plan/index.md, never empty


def test_raw_input_is_not_presented(wiki) -> None:  # type: ignore[no-untyped-def]
    paths = {node["path"] for node in wiki.get("/api/wiki").json()}
    assert "input" not in paths


def test_page_returns_frontmatter_and_body_without_the_header(wiki) -> None:  # type: ignore[no-untyped-def]
    page = wiki.get("/api/wiki/page", params={"path": "open-questions/q-050-rundungsregel.md"}).json()
    assert page["title"].startswith("Q-050")
    assert page["status"] == "draft"
    assert page["visibility"] == "public"
    assert "---" not in page["body"].splitlines()[0]


@pytest.mark.parametrize(
    "bad",
    [
        "../pyproject.toml",
        "../../AGENTS.md",
        "/etc/passwd",
        "plan/../../AGENTS.md",
        "plan/index.txt",
        "input/anything.md",
        "does-not-exist.md",
        "",
        "C:\\Windows\\win.ini",
    ],
)
def test_paths_outside_knowledge_or_not_markdown_are_404(wiki, bad: str) -> None:  # type: ignore[no-untyped-def]
    assert wiki.get("/api/wiki/page", params={"path": bad}).status_code == 404


def test_the_wiki_is_read_only(wiki) -> None:  # type: ignore[no-untyped-def]
    assert wiki.put("/api/wiki/page", json={"body": "x"}).status_code == 405
    assert wiki.post("/api/wiki", json={}).status_code == 405
    assert wiki.delete("/api/wiki/page").status_code == 405
