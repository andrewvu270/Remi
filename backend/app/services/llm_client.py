import asyncio
import logging
import os
from typing import Any, Dict, List, Optional

from openai import AsyncOpenAI

try:
    from groq import Groq  # type: ignore
except ImportError:  # pragma: no cover - optional dependency
    Groq = None  # type: ignore


class LLMClientManager:
    """Handles Groq-first, OpenAI-fallback chat completions."""

    def __init__(self) -> None:
        self.logger = logging.getLogger(__name__)

        self._groq_client = None
        self._groq_model = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
        groq_key = os.getenv("GROQ_API_KEY")
        if groq_key and Groq:
            try:
                self._groq_client = Groq(api_key=groq_key)
            except Exception as exc:  # pragma: no cover - defensive
                self.logger.error("Failed to initialize Groq client: %s", exc)
        elif groq_key and not Groq:
            self.logger.warning(
                "GROQ_API_KEY provided but groq package missing. Run `pip install groq`."
            )

        self._openai_client = None
        self._openai_model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
        openai_key = os.getenv("OPENAI_API_KEY")
        if openai_key:
            self._openai_client = AsyncOpenAI(api_key=openai_key)

        if not self._groq_client and not self._openai_client:
            raise ValueError(
                "No LLM providers configured. Set GROQ_API_KEY and/or OPENAI_API_KEY."
            )

    async def chat_completion(
        self,
        *,
        messages: List[Dict[str, Any]],
        temperature: float = 0.2,
        response_format: Optional[Dict[str, Any]] = None,
        max_tokens: Optional[int] = None,
    ):
        """Call Groq first, then fall back to OpenAI."""
        last_error: Optional[Exception] = None

        if self._groq_client:
            try:
                groq_kwargs: Dict[str, Any] = {
                    "model": self._groq_model,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    groq_kwargs["response_format"] = response_format
                if max_tokens:
                    groq_kwargs["max_tokens"] = max_tokens

                response = await asyncio.to_thread(
                    self._groq_client.chat.completions.create, **groq_kwargs
                )
                return response
            except Exception as exc:  # pragma: no cover - network call
                self.logger.warning("Groq completion failed: %s", exc)
                last_error = exc

        if self._openai_client:
            try:
                openai_kwargs: Dict[str, Any] = {
                    "model": self._openai_model,
                    "messages": messages,
                    "temperature": temperature,
                }
                if response_format:
                    openai_kwargs["response_format"] = response_format
                if max_tokens:
                    openai_kwargs["max_tokens"] = max_tokens

                response = await self._openai_client.chat.completions.create(
                    **openai_kwargs
                )
                return response
            except Exception as exc:  # pragma: no cover - network call
                self.logger.error("OpenAI completion failed: %s", exc)
                last_error = exc

        raise RuntimeError(f"All LLM providers failed: {last_error}")
