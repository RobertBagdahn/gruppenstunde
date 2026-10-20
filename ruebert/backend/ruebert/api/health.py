"""Liveness endpoint: answers without touching any data store."""

from __future__ import annotations

from datetime import date
from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from ruebert import __version__
from ruebert.settings import Settings, get_settings

router = APIRouter(tags=["health"])


class Health(BaseModel):
    status: Literal["ok"]
    version: str
    reference_date: date


@router.get("/health", response_model=Health, summary="Lebenszeichen des Backends")
def health(settings: Annotated[Settings, Depends(get_settings)]) -> Health:
    return Health(status="ok", version=__version__, reference_date=settings.reference_date)
