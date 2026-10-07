"""
Stored mailbox credentials.

A refresh token is durable, full-mailbox access that survives the user changing
their password, and these were stored as plain text in columns beside the email
address they belong to — which made this database a higher-value target than any
message it protects.

The cases that matter are the migration ones. An install upgrading has plaintext
rows and may have no key; an install that loses its key has ciphertext and
nothing to read it with. Getting either wrong means handing an unusable string
to Google as a bearer token, or storing a credential in the clear after someone
asked for it to be encrypted.
"""

import pytest
from cryptography.fernet import Fernet

from app.core import crypto


@pytest.fixture
def key(monkeypatch):
    """A real Fernet key, with the module's cache cleared around the test."""
    generated = Fernet.generate_key().decode()
    cipher = Fernet(generated.encode())
    # Patched rather than configured, so the cached cipher in the module cannot
    # leak a key between tests.
    monkeypatch.setattr(crypto, "_cipher", lambda: cipher)
    return generated


@pytest.fixture
def no_key(monkeypatch):
    monkeypatch.setattr(crypto, "_cipher", lambda: None)


class TestRoundTrip:
    def test_a_token_survives_encryption(self, key):
        assert crypto.decrypt(crypto.encrypt("1//abc-refresh")) == "1//abc-refresh"

    def test_the_stored_form_is_not_the_token(self, key):
        stored = crypto.encrypt("1//abc-refresh")
        assert "1//abc-refresh" not in stored
        assert stored.startswith(crypto.PREFIX)

    def test_encrypting_twice_does_not_nest(self, key):
        once = crypto.encrypt("1//abc-refresh")
        assert crypto.encrypt(once) == once

    def test_empty_values_pass_through(self, key):
        assert crypto.encrypt(None) is None
        assert crypto.encrypt("") == ""
        assert crypto.decrypt(None) is None
        assert crypto.decrypt("") == ""


class TestUpgradingAnExistingInstall:
    def test_a_legacy_plaintext_token_is_still_readable(self, key):
        """
        Rows written before encryption was enabled must keep working, or
        enabling it would disconnect every mailbox at once.
        """
        assert crypto.decrypt("1//legacy-plaintext") == "1//legacy-plaintext"

    def test_with_no_key_everything_passes_through(self, no_key):
        """
        The default. Refusing to start would break every install on upgrade;
        generating a key would make the tokens unrecoverable on restart.
        """
        assert crypto.encrypt("1//abc") == "1//abc"
        assert crypto.decrypt("1//abc") == "1//abc"


class TestKeyLoss:
    def test_ciphertext_with_no_key_reads_as_nothing(self, key, monkeypatch):
        """
        Returning the envelope would send ciphertext to Google as a bearer
        token. None is the honest answer: the credential is unavailable.
        """
        stored = crypto.encrypt("1//abc-refresh")
        monkeypatch.setattr(crypto, "_cipher", lambda: None)

        assert crypto.decrypt(stored) is None

    def test_ciphertext_under_the_wrong_key_reads_as_nothing(self, key, monkeypatch):
        stored = crypto.encrypt("1//abc-refresh")
        other = Fernet(Fernet.generate_key())
        monkeypatch.setattr(crypto, "_cipher", lambda: other)

        assert crypto.decrypt(stored) is None


class TestColumnType:
    def test_the_column_encrypts_on_write_and_decrypts_on_read(self, key):
        """
        The protection lives in the column so no call site has to remember it.
        """
        column = crypto.EncryptedToken()
        stored = column.process_bind_param("1//abc-refresh", None)

        assert stored.startswith(crypto.PREFIX)
        assert column.process_result_value(stored, None) == "1//abc-refresh"

    def test_the_user_model_uses_it(self):
        from app.database.models import User

        for field in (
            "google_access_token",
            "google_refresh_token",
            "microsoft_access_token",
            "microsoft_refresh_token",
        ):
            column = User.__table__.columns[field]
            assert isinstance(column.type, crypto.EncryptedToken), (
                f"{field} is not an encrypted column"
            )


class TestMisconfiguration:
    def test_a_malformed_key_is_refused_rather_than_ignored(self, monkeypatch):
        """
        Falling back to pass-through here would store credentials in the clear
        after someone had explicitly configured encryption.
        """
        from app.core.config import Settings

        crypto._cipher.cache_clear()
        monkeypatch.setattr(
            "app.core.config.get_settings",
            lambda: Settings(TOKEN_ENCRYPTION_KEY="not-a-real-fernet-key"),
        )
        with pytest.raises(ValueError, match="not a valid Fernet key"):
            crypto._cipher()
        crypto._cipher.cache_clear()
