from fastapi import APIRouter, HTTPException, Request

from src.models.schemas import ChatRequest, ChatResponse

router = APIRouter()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, fastapi_req: Request) -> ChatResponse:
    """Tương tác bằng ngôn ngữ tự nhiên với VinStay AI Matchmaker Agent."""
    try:
        initial_criteria = {}
        if request.budget_ceiling:
            initial_criteria["budget_ceiling"] = request.budget_ceiling
        if request.motorbikes is not None:
            initial_criteria["motorbikes"] = request.motorbikes
        if request.cars is not None:
            initial_criteria["cars"] = request.cars
        if request.occupants is not None:
            initial_criteria["occupants"] = request.occupants

        state_input = {
            "query": request.message,
            "criteria": initial_criteria,
            # In MessagesAnnotation, you can also append to messages if needed
            # "messages": [("user", request.message)]
        }
        
        agent = fastapi_req.app.state.agent
        config = {"configurable": {"thread_id": request.session_id}}
        
        result = await agent.ainvoke(state_input, config)
        return ChatResponse(
            response=result.get("response", ""),
            analysis=result.get("analysis", ""),
            matched_units=result.get("matched_units", []),
            criteria=result.get("criteria", {}),
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status")
async def agent_status():
    """Kiểm tra trạng thái VinStay AI Agent."""
    return {
        "status": "ready",
        "agent": "VinStay AI Matchmaker Copilot (LangGraph)",
        "area": "Vinhomes Ocean Park (The Sapphire 1 & 2)",
    }
