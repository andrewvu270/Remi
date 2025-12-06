"""
Prompt Engineer Agent

Refines prompts for other agents to improve instruction quality, structure,
and adherence to constraints before they are sent to LLM endpoints.
"""

from typing import Any, Dict, Optional, List
import json
import logging

from ..agents.agent_base import BaseAgent
from ..services.llm_client import LLMClientManager

logger = logging.getLogger(__name__)


class PromptEngineerAgent(BaseAgent):
    """Agent responsible for refining prompts for other agents."""

    def __init__(self):
        super().__init__("PromptEngineerAgent")
        self.llm_manager = LLMClientManager()

    async def process(
        self,
        input_data: Dict[str, Any],
        context: Optional[Dict[str, Any]] = None,
    ):
        """
        Improve a prompt intended for another agent or LLM call.

        Expected input_data:
            - prompt: str (required) → the base prompt or instructions
            - target_agent: str (optional) → name of agent/LLM usage
            - goal: str (optional) → desired outcome
            - constraints: List[str] (optional) → formatting or policy requirements
            - additional_context: str (optional) → supplemental info
        """
        prompt = input_data.get("prompt")
        if not prompt:
            return self._create_response(
                data={"improved_prompt": ""},
                confidence=0.0,
                explanation="No prompt provided for refinement.",
            )

        target_agent = input_data.get("target_agent", "generic_agent")
        goal = input_data.get("goal", "Produce the most accurate and helpful response.")
        constraints: List[str] = input_data.get("constraints") or []
        additional_context = input_data.get("additional_context", "")

        try:
            messages = [
                {
                    "role": "system",
                    "content": (
                        "You are a world-class AI prompt engineer. "
                        "You take an initial prompt and produce an improved instruction "
                        "set that maximizes clarity, structure, evaluation criteria, "
                        "and guardrails. Always return valid JSON."
                    ),
                },
                {
                    "role": "user",
                    "content": json.dumps(
                        {
                            "target_agent": target_agent,
                            "original_prompt": prompt,
                            "goal": goal,
                            "constraints": constraints,
                            "context": additional_context,
                        },
                        ensure_ascii=False,
                        indent=2,
                    ),
                },
            ]

            completion = await self.llm_manager.chat_completion(
                messages=messages,
                temperature=0.2,
            )

            refined_content = completion.choices[0].message.content
            refined = self._parse_response(refined_content)

            return self._create_response(
                data=refined,
                confidence=refined.get("confidence", 0.85),
                explanation="Prompt refined successfully.",
            )

        except Exception as exc:
            logger.error("Prompt Engineer Agent failed: %s", exc, exc_info=True)
            return self._create_response(
                data={"improved_prompt": prompt},
                confidence=0.4,
                explanation="Prompt refinement failed; returning original prompt.",
                metadata={"error": str(exc)},
            )

    def _parse_response(self, response_text: str) -> Dict[str, Any]:
        """Parse LLM response, ensuring required keys exist."""
        try:
            data = json.loads(response_text)
        except json.JSONDecodeError:
            data = {
                "improved_prompt": response_text.strip(),
                "system_guidance": "",
                "evaluation_checklist": [],
            }

        data.setdefault("improved_prompt", "")
        data.setdefault("system_guidance", "")
        data.setdefault("evaluation_checklist", [])
        data.setdefault("confidence", 0.85)

        return data


prompt_engineer_agent = PromptEngineerAgent()
