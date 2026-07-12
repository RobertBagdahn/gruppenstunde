from datetime import datetime
from decimal import Decimal

from ninja import Schema


class AiVoteIn(Schema):
    vote: str  # "up" or "down"


class AiVoteOut(Schema):
    status: str = "ok"


class AiContextStatsOut(Schema):
    context: str
    label: str
    total: int
    success_count: int
    error_count: int
    thumbs_up: int
    thumbs_down: int
    vote_rate: float = 0
    total_tokens: int = 0
    total_cost_eur: float = 0


class AiTimelineEntryOut(Schema):
    date: str
    total: int
    thumbs_up: int
    thumbs_down: int
    total_cost_eur: float = 0
    total_tokens: int = 0


class AiInteractionStatsOut(Schema):
    total_calls: int
    calls_today: int
    voted_calls: int
    vote_rate: float = 0
    total_tokens_all: int = 0
    total_cost_eur: float = 0
    by_context: list[AiContextStatsOut] = []
    timeline: list[AiTimelineEntryOut] = []


# -- Admin Log Viewer Schemas --


class AiInteractionItemOut(Schema):
    id: str
    context: str
    model: str
    user_name: str | None = None
    created_at: datetime
    total_tokens: int | None = None
    cost_eur: float | None = None
    duration_ms: int | None = None
    success: bool
    error_code: str = ""
    vote: str | None = None
    is_background: bool = False


class AiInteractionDetailOut(AiInteractionItemOut):
    prompt: dict | list | str | None = None
    response: str = ""


class UserCostOut(Schema):
    user_id: int
    user_name: str
    total_calls: int
    total_tokens: int
    total_cost_eur: float
    cost_30d_eur: float
    vote_rate: float


class GeminiPricingEntryOut(Schema):
    model: str
    type: str
    input_per_1m_usd: float
    output_per_1m_usd: float | None = None
    image_output_per_1m_usd: float | None = None


class GeminiPricingOut(Schema):
    pricing: list[GeminiPricingEntryOut]
    usd_to_eur: float
