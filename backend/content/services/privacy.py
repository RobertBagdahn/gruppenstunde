"""Content app privacy data collector."""

from __future__ import annotations

from typing import Any, cast

from django.contrib.auth.models import User
from django.db.models import Manager, Model

from profiles.services.privacy import PrivacyDataCollector


class ContentPrivacyCollector(PrivacyDataCollector):
    """Collects and anonymizes Content, Comments, Emotions, Views, SearchLogs."""

    def collect(self, user: User) -> dict[str, Any]:
        from blog.models import Blog
        from content.models import ContentComment, ContentEmotion, ContentView, SearchLog
        from game.models import Game
        from recipe.models import Recipe
        from session.models import GroupSession

        # Authored content across all content types
        content_items = []
        for model, content_type in [
            (GroupSession, "session"),
            (Blog, "blog"),
            (Game, "game"),
            (Recipe, "recipe"),
        ]:
            manager = cast(Manager[Model], model.all_objects)
            items = manager.filter(created_by=user).values("id", "title", "slug", "status", "created_at")
            for item in items:
                item_any = cast(dict[str, Any], item)
                item_any["content_type"] = content_type
                item_any["created_at"] = str(item_any["created_at"])
                content_items.append(item_any)

        # Comments
        comments = list(ContentComment.objects.filter(user=user).values("id", "text", "author_name", "created_at"))
        for c in comments:
            c_any = cast(dict[str, Any], c)
            c_any["created_at"] = str(c_any["created_at"])

        # Emotions
        emotions = list(ContentEmotion.objects.filter(user=user).values("id", "emotion_type", "created_at"))
        for e in emotions:
            e_any = cast(dict[str, Any], e)
            e_any["created_at"] = str(e_any["created_at"])

        # Analytics counts only
        view_count = ContentView.objects.filter(user=user).count()
        search_count = SearchLog.objects.filter(user=user).count()

        return {
            "content": {"count": len(content_items), "items": content_items},
            "comments": {"count": len(comments), "items": comments},
            "interactions": {"count": len(emotions), "items": emotions},
            "analytics": {"view_count": view_count, "search_count": search_count},
        }

    def anonymize(self, user: User) -> None:
        from content.models import ContentComment, ContentEmotion, ContentView, SearchLog

        # Delete analytics data entirely
        ContentView.objects.filter(user=user).delete()
        SearchLog.objects.filter(user=user).delete()
        ContentEmotion.objects.filter(user=user).delete()

        # Anonymize comments (keep text for context, anonymize author)
        ContentComment.objects.filter(user=user).update(
            author_name="Gelöscht",
            user=None,
        )
