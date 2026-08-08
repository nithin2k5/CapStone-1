from pydantic import BaseModel, ConfigDict, Field
from uuid import UUID

class SettingsResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID
    user_id: UUID
    organization_name: str
    admin_email: str
    domain: str
    
    notif_critical: bool
    notif_daily: bool
    notif_quarantine: bool
    notif_weekly: bool
    
    sens_phishing: int
    sens_malware: int
    sens_url: int
    sens_ai: int
    
    api_key: str

class SettingsUpdateRequest(BaseModel):
    organization_name: str | None = None
    admin_email: str | None = None
    domain: str | None = None
    
    notif_critical: bool | None = None
    notif_daily: bool | None = None
    notif_quarantine: bool | None = None
    notif_weekly: bool | None = None
    
    sens_phishing: int | None = Field(default=None, ge=0, le=100)
    sens_malware: int | None = Field(default=None, ge=0, le=100)
    sens_url: int | None = Field(default=None, ge=0, le=100)
    sens_ai: int | None = Field(default=None, ge=0, le=100)
