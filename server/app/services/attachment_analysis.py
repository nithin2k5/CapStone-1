import hashlib
from dataclasses import dataclass, field

from app.utils.email_parser import ParsedAttachment

DANGEROUS_EXTENSIONS = {
    ".exe", ".bat", ".cmd", ".com", ".scr", ".pif", ".vbs", ".js", ".jar",
    ".msi", ".ps1", ".hta", ".dll",
}
MACRO_EXTENSIONS = {".docm", ".xlsm", ".pptm", ".dotm"}
ARCHIVE_EXTENSIONS = {".zip", ".rar", ".7z", ".tar", ".gz"}
DOUBLE_EXT_PATTERN = (
    ".pdf.exe", ".doc.exe", ".jpg.exe", ".png.exe", ".txt.exe",
)


@dataclass
class AttachmentAnalysisResult:
    score: float = 0.0
    findings: list[str] = field(default_factory=list)
    hashes: dict[str, str] = field(default_factory=dict)


class AttachmentAnalysisService:
    """
    Analyze email attachments for malware indicators.
    Architecture ready for future ClamAV integration.
    """

    MAX_SCORE = 100.0
    LARGE_ATTACHMENT_BYTES = 10 * 1024 * 1024  # 10 MB

    def analyze(self, attachments: list[ParsedAttachment]) -> AttachmentAnalysisResult:
        findings: list[str] = []
        hashes: dict[str, str] = {}
        score = 0.0

        if not attachments:
            return AttachmentAnalysisResult(score=0.0, findings=["No attachments"])

        for attachment in attachments:
            filename_lower = attachment.filename.lower()
            ext = self._get_extension(filename_lower)

            if ext in DANGEROUS_EXTENSIONS:
                score += 40
                findings.append(f"Dangerous executable extension: {attachment.filename}")

            if any(filename_lower.endswith(de) for de in DOUBLE_EXT_PATTERN):
                score += 35
                findings.append(f"Double extension detected: {attachment.filename}")

            if ext in MACRO_EXTENSIONS:
                score += 25
                findings.append(f"Macro-enabled document: {attachment.filename}")

            if ext in ARCHIVE_EXTENSIONS:
                score += 10
                findings.append(f"Archive attachment: {attachment.filename}")

            if attachment.size > self.LARGE_ATTACHMENT_BYTES:
                score += 15
                findings.append(f"Large attachment ({attachment.size} bytes): {attachment.filename}")

            # Compute SHA256 placeholder (would use actual content with ClamAV)
            content_hash = attachment.sha256 or self._mock_hash(attachment.filename)
            hashes[attachment.filename] = content_hash

        return AttachmentAnalysisResult(
            score=min(score, self.MAX_SCORE),
            findings=findings,
            hashes=hashes,
        )

    def _get_extension(self, filename: str) -> str:
        parts = filename.rsplit(".", 1)
        return f".{parts[-1]}" if len(parts) > 1 else ""

    def _mock_hash(self, filename: str) -> str:
        return hashlib.sha256(filename.encode()).hexdigest()

    # Future ClamAV integration point
    async def scan_with_clamav(self, file_path: str) -> bool:
        """Placeholder for ClamAV integration."""
        raise NotImplementedError("ClamAV integration not yet implemented")
