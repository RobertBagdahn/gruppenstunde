"""Read-only access to knowledge/: page tree with frontmatter, one page by path (wiki-viewer spec)."""

from __future__ import annotations

from pathlib import Path
from typing import Annotated, Literal

import frontmatter
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

from ruebert.api.deps import SettingsDep

router = APIRouter(prefix="/wiki", tags=["wiki"])

# Raw source material is kept as delivered and is not presented in the wiki view (knowledge/wiki-konventionen.md).
EXCLUDED_FOLDERS = frozenset({"input"})


class WikiNode(BaseModel):
    path: str
    title: str
    description: str
    kind: Literal["folder", "page"]
    status: str | None
    children: list[WikiNode] = []


class WikiPage(BaseModel):
    path: str
    title: str
    description: str
    type: str | None
    status: str | None
    visibility: str | None
    body: str


WikiNode.model_rebuild()


def _meta(path: Path) -> tuple[str, str, str | None]:
    """Title, description and status from the frontmatter; the file name is the fallback title."""
    post = frontmatter.loads(path.read_text(encoding="utf-8"))
    title = str(post.metadata.get("title", path.stem))
    description = str(post.metadata.get("description", ""))
    status = post.metadata.get("status")
    return title, description, str(status) if status is not None else None


def _tree(root: Path, folder: Path) -> list[WikiNode]:
    nodes: list[WikiNode] = []
    for child in sorted(folder.iterdir(), key=lambda p: (p.is_file(), p.name)):
        relative = child.relative_to(root).as_posix()
        if child.is_dir():
            if child.name.startswith(".") or child.name in EXCLUDED_FOLDERS:
                continue
            index = child / "index.md"
            title, description, status = _meta(index) if index.is_file() else (child.name, "", None)
            nodes.append(
                WikiNode(
                    path=relative,
                    title=title,
                    description=description,
                    kind="folder",
                    status=status,
                    children=_tree(root, child),
                )
            )
        elif child.suffix == ".md" and not child.name.startswith("."):
            title, description, status = _meta(child)
            nodes.append(WikiNode(path=relative, title=title, description=description, kind="page", status=status))
    return nodes


def resolve_page(root: Path, requested: str) -> Path:
    """The file for a wiki path. Anything outside `root`, not Markdown or excluded is a 404 and reads nothing."""
    if not requested or requested.startswith("/") or "\\" in requested:
        raise HTTPException(404, "Seite nicht gefunden.")
    candidate = (root / requested).resolve()
    try:
        candidate.relative_to(root.resolve())
    except ValueError as error:
        raise HTTPException(404, "Seite nicht gefunden.") from error
    if candidate.suffix != ".md" or not candidate.is_file():
        raise HTTPException(404, "Seite nicht gefunden.")
    if candidate.relative_to(root.resolve()).parts[0] in EXCLUDED_FOLDERS:
        raise HTTPException(404, "Seite nicht gefunden.")
    return candidate


@router.get("", summary="Seitenbaum des Wissens mit Titeln und Beschreibungen")
def wiki_tree(settings: SettingsDep) -> list[WikiNode]:
    root = settings.knowledge_dir
    if not root.is_dir():
        raise HTTPException(503, "Der Ordner knowledge/ fehlt.")
    return _tree(root, root)


@router.get("/page", summary="Eine Wiki-Seite mit Frontmatter und Text")
def wiki_page(path: Annotated[str, Query(max_length=300)], settings: SettingsDep) -> WikiPage:
    root = settings.knowledge_dir
    file = resolve_page(root, path)
    post = frontmatter.loads(file.read_text(encoding="utf-8"))
    meta = post.metadata
    return WikiPage(
        path=file.relative_to(root.resolve()).as_posix(),
        title=str(meta.get("title", file.stem)),
        description=str(meta.get("description", "")),
        type=str(meta["type"]) if meta.get("type") else None,
        status=str(meta["status"]) if meta.get("status") else None,
        visibility=str(meta["visibility"]) if meta.get("visibility") else None,
        body=post.content,
    )
