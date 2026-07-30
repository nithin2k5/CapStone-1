from datetime import datetime, timezone


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def score_to_risk_level(score: float) -> str:
    if score < 20:
        return "safe"
    if score < 40:
        return "low"
    if score < 60:
        return "medium"
    if score < 80:
        return "high"
    return "critical"
