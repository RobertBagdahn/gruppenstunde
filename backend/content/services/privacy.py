"""Content app privacy data collector."""

from __future__ import annotations

from typing import Any

from django.contrib.auth import get_user_model

from profiles.services.privacy import PrivacyDataCollector

User = get_user_model()


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
            items = model.all_objects.filter(created_by=user).values("id", "title", "slug", "status", "created_at")
            for item in items:
                item["content_type"] = content_type
                item["created_at"] = str(item["created_at"])
                content_items.append(item)

        # Comments
        comments = list(ContentComment.objects.filter(user=user).values("id", "text", "author_name", "created_at"))
        for c in comments:
            c["created_at"] = str(c["created_at"])

        # Emotions
        emotions = list(ContentEmotion.objects.filter(user=user).values("id", "emotion_type", "created_at"))
        for e in emotions:
            e["created_at"] = str(e["created_at"])

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
