"""Feedback as GitHub issues in the private repository (spec feedback-issues). The token stays on the server."""

from ruebert.feedback.service import FeedbackInput, SubmitResult, retry_pending, submit

__all__ = ["FeedbackInput", "SubmitResult", "retry_pending", "submit"]
