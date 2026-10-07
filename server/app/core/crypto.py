"""
Encryption for the credentials this gateway holds.

The system stores Google and Microsoft refresh tokens for every connected user.
A refresh token is durable, full-mailbox access that survives the user changing
their password, which makes this database a more valuable target than any single
message it protects — and they were stored as plain text in columns beside the
email address they belong to.

The threat model covers the recipient, the classifier's input channel, the
pipeline's trust in its own components and the analyst's screen. It does not
cover the gateway as a credential store, and "Out of scope" does not exclude it.
This closes that gap at the layer where it cannot be forgotten: the column type,
so every read and write goes through it whatever the calling code does.

What this does and does not buy:

- It protects against a database read that is not also a read of the
  application's configuration — a stolen dump, a backup on the wrong disk, a
  misconfigured replica, `SELECT * FROM users` through an injection.
- It does not protect against an attacker who has the running host, because the
  key has to be readable by the process that uses it. Nothing short of a KMS or
  an HSM changes that, and either would be a deployment decision rather than a
  code one.

With no key configured the columns pass through unchanged and the application
says so loudly at startup. That is deliberate: refusing to start would break
every existing install on upgrade, and silently encrypting with a generated key
would make the tokens unrecoverable on the next restart.
"""

from functools import lru_cache

from cryptography.fernet import Fernet, InvalidToken
from sqlalchemy import Text
from sqlalchemy.types import TypeDecorator

from app.core.logging import get_logger

logger = get_logger("crypto")

# Marks a value this module wrote. Without it there is no way to tell ciphertext
# from a legacy plaintext token, and a wrong guess either corrupts a working
# credential or hands one out in the clear.
PREFIX = "enc:v1:"


@lru_cache(maxsize=1)
def _cipher() -> Fernet | None:
    """
    The configured cipher, or None when no key is set.

    Cached because this is consulted on every column read. Imported lazily to
    keep this module usable from the models without a circular import at
    definition time.
    """
    from app.core.config import get_settings

    key = (get_settings().token_encryption_key or "").strip()
    if not key:
        return None
    try:
        return Fernet(key.encode())
    except (ValueError, TypeError) as e:
        # A malformed key is a configuration error, and continuing with
        # pass-through would quietly store credentials in the clear after
        # someone had explicitly asked for them to be encrypted.
        raise ValueError(
            "TOKEN_ENCRYPTION_KEY is not a valid Fernet key. Generate one with: "
            "python -c 'from cryptography.fernet import Fernet; "
            "print(Fernet.generate_key().decode())'"
        ) from e


def encryption_available() -> bool:
    return _cipher() is not None


def encrypt(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    cipher = _cipher()
    if cipher is None:
        return value
    if value.startswith(PREFIX):
        # Already encrypted; re-encrypting would nest the envelope.
        return value
    return PREFIX + cipher.encrypt(value.encode()).decode()


def decrypt(value: str | None) -> str | None:
    if value is None or value == "":
        return value
    if not value.startswith(PREFIX):
        # A token stored before encryption was enabled. Returned as-is so the
        # user's mailbox keeps working; it is re-stored encrypted the next time
        # anything writes it, which the token refresh does routinely.
        return value

    cipher = _cipher()
    if cipher is None:
        # Encrypted rows and no key to read them with — almost always a key that
        # was removed or rotated without re-encrypting. Returning the envelope
        # would send ciphertext to Google as a bearer token.
        logger.error(
            "Found an encrypted credential but TOKEN_ENCRYPTION_KEY is not set. "
            "The affected user must reconnect their mailbox, or the original "
            "key must be restored."
        )
        return None

    try:
        return cipher.decrypt(value[len(PREFIX):].encode()).decode()
    except InvalidToken:
        logger.error(
            "A stored credential could not be decrypted with the configured "
            "key. The affected user must reconnect their mailbox."
        )
        return None


class EncryptedToken(TypeDecorator):
    """
    A Text column whose value is encrypted at rest.

    Applied at the column so that nothing has to remember to call it. The
    previous arrangement — plain columns and the intention to be careful — is
    the one that produced plaintext refresh tokens.
    """

    impl = Text
    cache_ok = True

    def process_bind_param(self, value, dialect):
        return encrypt(value)

    def process_result_value(self, value, dialect):
        return decrypt(value)
