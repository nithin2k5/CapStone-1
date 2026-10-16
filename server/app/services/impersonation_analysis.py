"""
Who the sender is pretending to be.

SPF, DKIM and DMARC answer whether a message was authorised by the domain it
claims. They are exactly what business email compromise passes: a message from
a domain the attacker genuinely controls, correctly signed, correctly aligned,
soliciting a payment in a colleague's name. This project's threat model already
concedes the point — a message from a genuinely authenticated compromised
colleague "passes every authentication check here, correctly."

What those checks cannot see is the relationship. The signals here are about
that instead: whether this mailbox has ever heard from this address, whether the
name on the message belongs to someone it has heard from at a different address,
and whether the address is a near-miss for one it knows.

The discipline that matters is what is *not* scored. Most legitimate mail is a
first contact — receipts, newsletters, a new supplier, a recruiter. Treating an
unfamiliar sender as suspicious would fire on ordinary mail all day, so first
contact contributes nothing on its own and only becomes evidence alongside a
request worth making up a stranger for. The detectors that do score alone are
the ones with no innocent reading: a name this mailbox knows, arriving from an
address it does not.
"""

from dataclasses import dataclass, field
from collections import Counter
from email.utils import parseaddr
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.logging import get_logger
from app.repositories.sender_repository import SenderHistoryRepository
from app.utils.email_parser import extract_domain

logger = get_logger("impersonation")

# How close two addresses have to be before one is a plausible misreading of the
# other. One or two edits covers the substitutions that work on a human eye —
# biling for billing, acme-net for acme.net, rn for m — without pulling in
# genuinely different addresses at the same company.
LOOKALIKE_MAX_EDITS = 2

# Below this, an address is too short for an edit-distance comparison to mean
# anything: two edits on a six-character local part is a different person.
LOOKALIKE_MIN_LENGTH = 8

# A name has to have been seen this many times before impersonating it is
# evidence. Once is not a relationship, and a single prior message from a
# display name is as likely to be the attacker's own earlier attempt.
KNOWN_NAME_MIN_SIGHTINGS = 2


@dataclass
class ImpersonationAnalysisResult:
    ran: bool = False
    score: float = 0.0
    # This mailbox has never had mail from this address. Deliberately not scored
    # on its own — see the module docstring.
    first_contact: bool = False
    # A display name this mailbox knows, arriving from an address it does not.
    display_name_impersonation: bool = False
    # An address within a couple of edits of a known correspondent's.
    lookalike_address: bool = False
    # Who is being imitated, for the finding. Attacker-controlled text: data to
    # display, never markup to render.
    impersonated: str = ""
    findings: list[str] = field(default_factory=list)
    skipped_reason: str = ""
    supporting_email_ids: list[str] = field(default_factory=list)
    history_truncated: bool = False


def _levenshtein(a: str, b: str, cap: int) -> int:
    """
    Edit distance, abandoned once it exceeds `cap`.

    Bounded because the answer is only ever compared against a small threshold,
    and the comparison runs against every known correspondent.
    """
    if a == b:
        return 0
    if abs(len(a) - len(b)) > cap:
        return cap + 1

    previous = list(range(len(b) + 1))
    for i, ca in enumerate(a, start=1):
        current = [i]
        for j, cb in enumerate(b, start=1):
            current.append(
                min(
                    previous[j] + 1,
                    current[j - 1] + 1,
                    previous[j - 1] + (ca != cb),
                )
            )
        if min(current) > cap:
            return cap + 1
        previous = current
    return previous[-1]


def split_sender(raw: str) -> tuple[str, str]:
    """Separate a From header into its display name and address, both lowered."""
    name, address = parseaddr(raw or "")
    return name.strip().lower(), address.strip().lower()


class ImpersonationAnalysisService:
    """Relationship signals: is this sender who the message implies they are?"""

    def __init__(self, repository_factory=SenderHistoryRepository):
        self._repository_factory = repository_factory

    async def analyze(
        self, db: AsyncSession, user_id: UUID, sender: str, *, email=None
    ) -> ImpersonationAnalysisResult:
        result = ImpersonationAnalysisResult()
        display_name, address = split_sender(sender)

        # parseaddr returns a non-address unchanged rather than rejecting it, so
        # "not an address" arrives here looking like an address. Requiring an @
        # with something either side of it is what actually separates the two,
        # and without it every malformed From header would be reported as a
        # first contact from a brand new correspondent.
        local, _, domain = address.partition("@")
        if not (local and domain):
            result.skipped_reason = "no parseable sender address"
            return result

        try:
            repo = self._repository_factory(db)
            evidence_rows = []
            if email is not None:
                if email.id is None or email.created_at is None:
                    result.skipped_reason = "Persisted email identity and arrival order required"
                    return result
                evidence_rows, result.history_truncated = await repo.evidence_before(email)
                correspondents = list(Counter(raw for _, raw in evidence_rows).items())
            else:
                correspondents = await repo.known_correspondents(user_id)
        except Exception as e:
            # Relationship context is an enrichment. Losing it must not fail the
            # scan, but it must also not read as "nothing found".
            logger.error(
                "Sender history lookup failed for user=%s: %s", user_id, e, exc_info=True
            )
            result.skipped_reason = "sender history unavailable"
            return result

        result.ran = True

        # Build the two views of history this needs: addresses seen, and the
        # display names each address has used.
        seen_addresses: dict[str, int] = {}
        names_by_address: dict[str, set[str]] = {}
        for raw, count in correspondents:
            known_name, known_address = split_sender(raw)
            if not known_address:
                continue
            seen_addresses[known_address] = seen_addresses.get(known_address, 0) + count
            if known_name:
                names_by_address.setdefault(known_address, set()).add(known_name)

        result.first_contact = address not in seen_addresses
        if result.first_contact:
            # Recorded, not scored. Most legitimate mail is a first contact.
            result.findings.append("First message this mailbox has had from this address")

        if not result.first_contact:
            result.supporting_email_ids = [str(id_) for id_, raw in evidence_rows if split_sender(raw)[1] == address]
            # A known address is the end of it. The checks below are about
            # addresses this mailbox does not know.
            return result

        # A name this mailbox knows, from an address it does not.
        name_sightings = 0
        impersonated_address = ""
        supporting_addresses = set()
        for known_address, names in names_by_address.items():
            if known_address == address or display_name not in names:
                continue
            if seen_addresses.get(known_address, 0) > name_sightings:
                name_sightings = seen_addresses[known_address]
                impersonated_address = known_address

        if display_name and name_sightings >= KNOWN_NAME_MIN_SIGHTINGS:
            result.display_name_impersonation = True
            result.impersonated = impersonated_address
            supporting_addresses.add(impersonated_address)
            result.score = max(result.score, 55.0)
            result.findings.append(
                f"Display name {display_name!r} belongs to a correspondent at "
                f"{impersonated_address}, not at {extract_domain(address)}"
            )

        # An address that is a near-miss for one this mailbox knows.
        if len(address) >= LOOKALIKE_MIN_LENGTH:
            for known_address, count in seen_addresses.items():
                if len(known_address) < LOOKALIKE_MIN_LENGTH:
                    continue
                distance = _levenshtein(address, known_address, LOOKALIKE_MAX_EDITS)
                if 0 < distance <= LOOKALIKE_MAX_EDITS:
                    result.lookalike_address = True
                    result.impersonated = result.impersonated or known_address
                    supporting_addresses.add(known_address)
                    result.score = max(result.score, 65.0)
                    result.findings.append(
                        f"Sender address is {distance} edit(s) from "
                        f"{known_address}, seen {count} time(s) before"
                    )
                    break

        result.supporting_email_ids = [str(id_) for id_, raw in evidence_rows if split_sender(raw)[1] in supporting_addresses]
        return result
