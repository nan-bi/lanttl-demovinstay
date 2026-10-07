from typing import Any, TypedDict, Annotated
from langgraph.graph.message import AnyMessage, add_messages


class SearchCriteria(TypedDict, total=False):
    budget_ceiling: float | None
    layout_type: str | None
    zone: str | None
    occupants: int
    motorbikes: int
    cars: int
    pet_friendly: bool | None
    balcony_direction: str | None


class MatchedUnit(TypedDict, total=False):
    unit_code: str
    building_code: str
    zone_name: str
    floor_number: int
    layout_type: str
    carpet_area_m2: float
    base_rent_price: float
    all_in_total: float
    management_fee: float
    parking_fee: float
    utility_cost: float
    market_avg_price: float
    saving_percentage: int
    is_bargain: bool
    badge_text: str | None
    verified_label: str
    highlights: list[str]


class AgentState(TypedDict, total=False):
    query: str
    chat_history: list[dict[str, str]]
    messages: Annotated[list[AnyMessage], add_messages]
    intent: str  # "search_unit" | "all_in_calc" | "policy_faq" | "greeting" | "fallback"
    criteria: SearchCriteria
    matched_units: list[MatchedUnit]
    policy_answer: str | None
    analysis: str
    response: str
    error: str | None
    metadata: dict[str, Any]
