from typing import Any

from pydantic import BaseModel, Field


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000, description="Tin nhắn hoặc yêu cầu tìm phòng")
    session_id: str = Field(default="default_session", description="Session ID để lưu lịch sử chat")
    budget_ceiling: float | None = Field(default=None, description="Ngân sách trần All-in Cost nếu nhập riêng")
    motorbikes: int | None = Field(default=1, description="Số lượng xe máy")
    cars: int | None = Field(default=0, description="Số lượng ô tô")
    occupants: int | None = Field(default=2, description="Số người ở")


class ChatResponse(BaseModel):
    response: str = Field(..., description="Câu trả lời tự nhiên từ VinStay AI Agent")
    analysis: str = Field(default="", description="Bóc tách chi phí và phân tích nội bộ")
    matched_units: list[dict[str, Any]] = Field(default_factory=list, description="Danh sách căn hộ thỏa mãn ngân sách trần All-in")
    criteria: dict[str, Any] | None = Field(default=None, description="Tiêu chí AI trích xuất được")
