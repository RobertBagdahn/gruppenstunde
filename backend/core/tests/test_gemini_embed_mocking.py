"""Tests for Vertex AI Gemini embedding client with mocking."""

import pytest
from unittest.mock import Mock, patch, MagicMock
from core.services.gemini import gemini_embed, GeminiUnavailableError


class TestGeminiEmbedWithMocking:
    """Tests for gemini_embed function with mocked Vertex AI client."""

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_basic(self, mock_get_client):
        """Test basic embedding generation without actual API call."""
        # Mock the client
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock the response
        mock_embedding = MagicMock()
        mock_embedding.values = [0.1, 0.2, 0.3, 0.4, 0.5]
        mock_response = MagicMock()
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response

        # Call the function
        result = gemini_embed(
            contents="Test ingredient: Tomato",
            model="gemini-embedding-001",
        )

        # Verify
        assert result == [0.1, 0.2, 0.3, 0.4, 0.5]
        mock_client.models.embed_content.assert_called_once()

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_with_output_dimensionality(self, mock_get_client):
        """Test embedding with output_dimensionality parameter."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        mock_embedding = MagicMock()
        # Simulating 384-dimensional output
        mock_embedding.values = [0.1] * 384
        mock_response = MagicMock()
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response

        result = gemini_embed(
            contents="Test",
            model="gemini-embedding-001",
            output_dimensionality=384,
        )

        assert len(result) == 384
        # Verify the parameter was passed
        call_kwargs = mock_client.models.embed_content.call_args[1]
        assert "output_dimensionality" in call_kwargs
        assert call_kwargs["output_dimensionality"] == 384

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_no_client_returns_none(self, mock_get_client):
        """Test that None is returned if client is unavailable."""
        mock_get_client.return_value = None

        result = gemini_embed(contents="Test")
        assert result is None

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_api_error_returns_none(self, mock_get_client):
        """Test that None is returned on API error."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Simulate API error
        mock_client.models.embed_content.side_effect = Exception("API Error")

        result = gemini_embed(contents="Test")
        assert result is None

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_empty_response_returns_none(self, mock_get_client):
        """Test that None is returned if response has no embeddings."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        # Mock response with no embeddings
        mock_response = MagicMock()
        mock_response.embeddings = []
        mock_client.models.embed_content.return_value = mock_response

        result = gemini_embed(contents="Test")
        assert result is None

    @patch("core.services.gemini._check_embedding_limit")
    @patch("core.services.gemini._get_client")
    def test_gemini_embed_respects_rate_limits(self, mock_get_client, mock_check_limit):
        """Test that rate limit checks are called."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_embedding = MagicMock()
        mock_embedding.values = [0.5]
        mock_response = MagicMock()
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response

        gemini_embed(contents="Test", bypass_limits=False)

        # Verify rate limit check was called with bypass_limits=False
        mock_check_limit.assert_called_once_with(bypass_limits=False)

    @patch("core.services.gemini._check_embedding_limit")
    @patch("core.services.gemini._get_client")
    def test_gemini_embed_bypass_limits_for_testing(self, mock_get_client, mock_check_limit):
        """Test that bypass_limits can be used for scripts/testing."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_embedding = MagicMock()
        mock_embedding.values = [0.5]
        mock_response = MagicMock()
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response

        gemini_embed(contents="Test", bypass_limits=True)

        # Verify rate limit check was called with bypass_limits=True
        mock_check_limit.assert_called_once_with(bypass_limits=True)

    @patch("core.services.gemini._get_client")
    def test_gemini_embed_model_parameter(self, mock_get_client):
        """Test that model parameter is correctly passed to API."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client
        mock_embedding = MagicMock()
        mock_embedding.values = [0.5]
        mock_response = MagicMock()
        mock_response.embeddings = [mock_embedding]
        mock_client.models.embed_content.return_value = mock_response

        gemini_embed(
            contents="Test",
            model="gemini-embedding-001",
        )

        # Verify model was passed
        call_args = mock_client.models.embed_content.call_args
        assert call_args[1]["model"] == "gemini-embedding-001"

    @patch("core.services.gemini._get_client")
    def test_different_output_dimensions(self, mock_get_client):
        """Test various output dimensionality options."""
        mock_client = MagicMock()
        mock_get_client.return_value = mock_client

        for target_dim in [768, 384, 256, 128, 64]:
            mock_embedding = MagicMock()
            mock_embedding.values = [0.1] * target_dim
            mock_response = MagicMock()
            mock_response.embeddings = [mock_embedding]
            mock_client.models.embed_content.return_value = mock_response

            result = gemini_embed(
                contents=f"Test dim {target_dim}",
                output_dimensionality=target_dim,
            )

            assert len(result) == target_dim
