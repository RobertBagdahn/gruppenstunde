"""POST /api/feedback: a question, bug or wish from any page, sent as GitHub issue or kept pending."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

import httpx
from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, StringConstraints

from ruebert.api.deps import SettingsDep
from ruebert.feedback import FeedbackInput, submit

router = APIRouter(prefix="/feedback", tags=["feedback"])

Title = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=200)]


class FeedbackContext(BaseModel):
    route: str = Field(max_length=300)
    page: str = Field(max_length=120)
    sku: str | None = Field(default=None, max_length=40)
    case_id: str | None = Field(default=None, max_length=200)
    reference_date: date
    app_version: str = Field(max_length=40)


class FeedbackIn(BaseModel):
    kind: Literal["frage", "bug", "feature"]
    title: Title
    description: str = Field(default="", max_length=4000)
    author: str = Field(default="", max_length=100)
    context: FeedbackContext


class FeedbackOut(BaseModel):
    status: Literal["sent", "pending"]
    message: str
    issue_number: int | None
    issue_url: str | None


def github_transport() -> httpx.BaseTransport | None:
    """Real network in production; tests replace this dependency with a mock transport."""
    return None


@router.post("", summary="Rückmeldung an Robert (GitHub-Issue oder Journal, wenn GitHub nicht erreichbar)")
def send_feedback(
    body: FeedbackIn,
    settings: SettingsDep,
    transport: Annotated[httpx.BaseTransport | None, Depends(github_transport)],
) -> FeedbackOut:
    item = FeedbackInput(
        kind=body.kind,
        title=body.title,
        description=body.description,
        author=body.author,
        context={
            "Seite": body.context.page,
            "Route": body.context.route,
            "Artikel": body.context.sku,
            "Fall": body.context.case_id,
            "Stichtag": body.context.reference_date.isoformat(),
            "Version": body.context.app_version,
        },
    )
    result = submit(settings, item, transport)
    return FeedbackOut(
        status=result.status,
        message=result.message,
        issue_number=result.issue_number,
        issue_url=result.issue_url,
    )
