"""Outbound mail for the few messages the gateway sends itself.

Only the password reset link so far. The transport is stdlib `smtplib` run off
the event loop; with no SMTP host configured it degrades to writing the link to
the log, so a local install can complete a reset without standing up a mail
server. That fallback puts a credential-bearing URL in the log, which is only
acceptable where the log is the operator's alone — it is off in any deployment
that has SMTP configured, which is the point of gating it on the host.
"""

import asyncio
import smtplib
from email.message import EmailMessage

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("mail")


class MailService:
    def __init__(self) -> None:
        self.settings = get_settings()

    @property
    def configured(self) -> bool:
        return bool(self.settings.smtp_host)

    async def send_password_reset(self, to_email: str, reset_url: str) -> bool:
        """Deliver a reset link. Returns whether it left the process.

        Never raises: a caller in the forgot-password path must answer the same
        way whether or not delivery worked, so a failure here is logged and
        swallowed rather than turned into a response the sender can read.
        """
        subject = "Reset your Secure Email Gateway password"
        expires = self.settings.password_reset_expire_minutes
        body = (
            "Someone asked to reset the password for this account.\n\n"
            f"{reset_url}\n\n"
            f"The link is valid for {expires} minutes and can be used once. "
            "If this was not you, no action is needed — the password is "
            "unchanged until the link is used.\n"
        )

        if not self.configured:
            logger.warning(
                "SMTP is not configured; password reset link for %s not sent. "
                "Link: %s",
                to_email,
                reset_url,
            )
            return False

        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = self.settings.smtp_from
        message["To"] = to_email
        message.set_content(body)

        try:
            await asyncio.to_thread(self._send, message)
        except Exception as exc:  # noqa: BLE001 - delivery must not leak upward
            logger.error("Password reset delivery to %s failed: %s", to_email, exc)
            return False

        logger.info("Password reset link sent to %s", to_email)
        return True

    def _send(self, message: EmailMessage) -> None:
        settings = self.settings
        with smtplib.SMTP(settings.smtp_host, settings.smtp_port, timeout=15) as smtp:
            if settings.smtp_starttls:
                smtp.starttls()
            if settings.smtp_user:
                smtp.login(settings.smtp_user, settings.smtp_password)
            smtp.send_message(message)
