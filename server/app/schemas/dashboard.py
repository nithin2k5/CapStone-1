from pydantic import BaseModel, Field


class RiskDistribution(BaseModel):
    safe: int = 0
    low: int = 0
    medium: int = 0
    high: int = 0
    critical: int = 0


class TopSender(BaseModel):
    sender: str
    count: int


class TopDomain(BaseModel):
    domain: str
    count: int


class RecentThreat(BaseModel):
    email_id: str
    sender: str
    subject: str
    risk_score: float
    risk_level: str
    received_at: str | None


class MonthlyStat(BaseModel):
    month: str
    total: int
    blocked: int
    safe: int


class DashboardResponse(BaseModel):
    total_emails: int
    scanned_emails: int
    blocked_emails: int
    safe_emails: int
    quarantined_emails: int
    top_senders: list[TopSender]
    top_domains: list[TopDomain]
    recent_threats: list[RecentThreat]
    risk_distribution: RiskDistribution
    monthly_statistics: list[MonthlyStat]
    detection_accuracy: float = Field(default=99.4, description="Mock accuracy metric")
