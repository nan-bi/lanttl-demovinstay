"""
VinStay AI - Matchmaker StateGraph
LangGraph Agent điều phối luồng tư vấn tìm căn hộ theo All-in Cost và giải đáp quy chế BQL Vinhomes Ocean Park.
"""

from langgraph.graph import END, StateGraph

from src.agents.nodes.intent_parser import parse_intent_and_criteria_node
from src.agents.nodes.matchmaker import matchmaker_node
from src.agents.nodes.response_generator import response_generator_node
from src.agents.state import AgentState


def route_intent(state: AgentState) -> str:
    """Điều hướng theo ý định người dùng (FAQ BQL vs Tìm kiếm căn hộ)."""
    if state.get("error"):
        return END
    intent = state.get("intent", "search_unit")
    if intent == "policy_faq":
        return "respond"
    return "matchmaker"


def build_graph(checkpointer=None):
    graph = StateGraph(AgentState)

    # 1. Thêm các Node nghiệp vụ
    graph.add_node("parse_intent", parse_intent_and_criteria_node)
    graph.add_node("matchmaker", matchmaker_node)
    graph.add_node("respond", response_generator_node)

    # 2. Thiết lập điểm vào và các cạnh điều phối
    graph.set_entry_point("parse_intent")
    graph.add_conditional_edges("parse_intent", route_intent)
    graph.add_edge("matchmaker", "respond")
    graph.add_edge("respond", END)

    return graph.compile(checkpointer=checkpointer)


