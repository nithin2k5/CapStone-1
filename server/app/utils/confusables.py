"""
Detecting text that borrows another script's characters to pass as Latin.

Cyrillic "а" and Latin "a" are different codepoints that render identically, so a
comparison against a known-good string succeeds or fails depending on which one
was used. Both the body analyser and the URL analyser need the same test.
"""

import re

_LATIN = re.compile(r"[a-zA-Z]")

# Everything outside the Latin blocks that ordinary Latin-script writing uses.
# Accented letters (U+00C0-U+024F) are excluded deliberately: bücher.de and
# société.fr are ordinary domains, and flagging them would bury the real signal.
# What remains is the confusable range — Greek and Cyrillic lookalikes, and the
# phonetic extensions that supply characters like U+0261, the script "g".
_FOREIGN = re.compile(r"[^\x00-\x7fÀ-ɏ]")


def has_non_latin(text: str) -> bool:
    """True when the text uses a character from outside Latin script."""
    return bool(_FOREIGN.search(text))


def is_mixed_script(text: str) -> bool:
    """True when one token mixes Latin letters with a foreign-script character."""
    return bool(_LATIN.search(text) and _FOREIGN.search(text))


def mixed_script_words(text: str) -> int:
    return sum(1 for word in re.findall(r"\S+", text) if is_mixed_script(word))


def decode_punycode(domain: str) -> str:
    """
    Render an IDN domain as the Unicode a recipient sees.

    An internationalised domain reaches us punycode-encoded — xn--pypal-4ve.com
    is pure ASCII — so any test for non-Latin characters applied to the wire form
    matches nothing. Undecodable labels are left as they arrived.
    """
    labels = []
    for label in domain.split("."):
        if label.lower().startswith("xn--"):
            try:
                label = label[4:].encode("ascii").decode("punycode")
            except (UnicodeError, ValueError):
                pass
        labels.append(label)
    return ".".join(labels)
