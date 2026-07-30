from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str
    error_code: str | None = None
    errors: list[dict] | None = None


class MessageResponse(BaseModel):
    message: str
