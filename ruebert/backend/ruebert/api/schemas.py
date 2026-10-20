"""Response models shared by several routers."""

from __future__ import annotations

from pydantic import BaseModel

from ruebert.domain.derivation import Derivation


class StepOut(BaseModel):
    key: str
    label: str
    delta: float
    value: float
    note: str
    question_id: str | None


class DerivationOut(BaseModel):
    steps: list[StepOut]
    result: float


def derivation_out(derivation: Derivation) -> DerivationOut:
    return DerivationOut(
        steps=[StepOut(**vars(s)) for s in derivation.steps],
        result=derivation.result,
    )
