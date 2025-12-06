"""
MyDesk Multi-Agent System

This package contains the intelligent agents that power MyDesk's
productivity features including task parsing, workload prediction,
prioritization, and schedule optimization.
"""

from .agent_base import BaseAgent, AgentResponse, AgentStatus
from .mcp_orchestrator import MCPOrchestrator, WorkflowType, mcp_orchestrator
from .task_parsing_agent import task_parsing_agent
from .workload_prediction_agent import workload_prediction_agent
from .prioritization_agent import prioritization_agent
from .schedule_optimization_agent import schedule_optimization_agent
from .natural_language_agent import natural_language_agent
from .prompt_engineer_agent import prompt_engineer_agent

__all__ = [
    "BaseAgent",
    "AgentResponse",
    "AgentStatus",
    "MCPOrchestrator",
    "WorkflowType",
    "mcp_orchestrator",
    "task_parsing_agent",
    "workload_prediction_agent",
    "prioritization_agent",
    "schedule_optimization_agent",
    "natural_language_agent",
    "prompt_engineer_agent",
]

