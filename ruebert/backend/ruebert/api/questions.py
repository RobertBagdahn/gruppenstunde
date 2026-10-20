"""Open questions for the question pins: read-only from knowledge/open-questions (the wiki view comes later)."""

from __future__ import annotations

import re
from typing import Annotated

import frontmatter
from fastapi import APIRouter, HTTPException, Path
from pydantic import BaseModel

from ruebert.api.deps import SettingsDep

router = APIRouter(prefix="/questions", tags=["questions"])

QUESTION_ID = re.compile(r"^Q-\d{3}$")


class QuestionOut(BaseModel):
    question_id: str
    title: str
    description: str
    status: str
    priority: str | None


@router.get("/{question_id}", summary="Offene Frage (für die Pins im Präsentationsmodus)")
def get_question(question_id: Annotated[str, Path(max_length=8)], settings: SettingsDep) -> QuestionOut:
    if not QUESTION_ID.match(question_id):
        raise HTTPException(404, f"Frage {question_id} gibt es nicht.")
    folder = settings.knowledge_dir / "open-questions"
    matches = sorted(folder.glob(f"{question_id.lower()}-*.md"))
    if not matches:
        raise HTTPException(404, f"Frage {question_id} gibt es nicht.")
    post = frontmatter.loads(matches[0].read_text(encoding="utf-8"))
    return QuestionOut(
        question_id=question_id,
        title=str(post.metadata.get("title", question_id)),
        description=str(post.metadata.get("description", "")),
        status=str(post.metadata.get("status", "draft")),
        priority=str(post.metadata["priority"]) if post.metadata.get("priority") else None,
    )
