"""Factories for creating test data."""

from model_bakery import baker

from idea.choices import DifficultyChoices, ExecutionTimeChoices, StatusChoices
from idea.models import Comment, Idea, ScoutLevel, Tag


def make_tag(**kwargs) -> Tag:
    defaults = {"slug": None}  # Let baker auto-generate
    defaults.update(kwargs)
    tag = baker.make(Tag, **defaults)
    if not tag.slug:
        tag.slug = f"tag-{tag.pk}"
        tag.save()
    return tag


def make_scout_level(**kwargs) -> ScoutLevel:
    return baker.make(ScoutLevel, **kwargs)


def make_idea(status: str = StatusChoices.PUBLISHED, **kwargs) -> Idea:
    defaults = {
        "title": "Testidee",
        "summary": "Eine tolle Gruppenstunde",
        "difficulty": DifficultyChoices.EASY,
        "execution_time": ExecutionTimeChoices.LESS_30,
        "status": status,
    }
    defaults.update(kwargs)
    return baker.make(Idea, **defaults)


def make_comment(idea: Idea | None = None, **kwargs) -> Comment:
    if idea is None:
        idea = make_idea()
    defaults = {"status": "approved"}
    defaults.update(kwargs)
    return baker.make(Comment, idea=idea, **defaults)
