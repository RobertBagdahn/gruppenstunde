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


class AiTimelineEntryOut(Schema):
    date: str
    total: int
    thumbs_up: int
    thumbs_down: int


class AiInteractionStatsOut(Schema):
    total_calls: int
    calls_today: int
    voted_calls: int
    vote_rate: float = 0
    by_context: list[AiContextStatsOut] = []
    timeline: list[AiTimelineEntryOut] = []
