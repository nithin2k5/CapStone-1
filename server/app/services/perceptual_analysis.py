import re
from dataclasses import dataclass, field

from app.utils.confusables import mixed_script_words
from app.utils.email_parser import RenderedEmail


@dataclass
class PerceptualAnalysisResult:
    score: float = 0.0
    findings: list[str] = field(default_factory=list)
    hidden_ratio: float = 0.0
    hidden_chars: int = 0
    imperative_hidden: bool = False
    instruction_patterns: list[str] = field(default_factory=list)
    invisible_codepoints: int = 0
    mixed_script_words: int = 0
    link_mismatch: bool = False
    channels: list[str] = field(default_factory=list)
    # The two documents, bounded, so a reviewer can see what the finding is about
    # rather than take a number on trust. Attacker-controlled text: it is data to
    # display, never markup to render and never instruction to follow.
    visible_excerpt: str = ""
    concealed_segments: list[dict] = field(default_factory=list)
    evidence_truncated: bool = False


# Instruction-shaped text, aimed at the verdict rather than the reader. Grouped by
# what the payload is trying to do, because the finding should say which.
INSTRUCTION_PATTERNS: list[tuple[str, re.Pattern]] = [
    (
        "instruction override",
        re.compile(
            r"\b(ignore|disregard|forget|override)\b[^.]{0,40}"
            r"\b(previous|prior|preceding|above|earlier|all)\b[^.]{0,20}"
            r"\b(instruction|prompt|rule|direction|context)",
            re.IGNORECASE,
        ),
    ),
    (
        "role hijack",
        re.compile(
            r"\b(you are (now|a|an)|act as|pretend to be|behave as|"
            r"your new (role|objective|task|goal|instruction))\b",
            re.IGNORECASE,
        ),
    ),
    (
        "impersonated system turn",
        re.compile(
            r"(^|\n|\[|<)\s*(system|assistant|developer)\s*[:\]>]",
            re.IGNORECASE,
        ),
    ),
    (
        "verdict forcing",
        re.compile(
            r"\b(classify|categorise|categorize|label|treat|mark|report)\b[^.]{0,40}"
            r"\b(as\s+)?(safe|legitimate|legit|benign|harmless|trusted|not\s+(a\s+)?phishing|ham)\b",
            re.IGNORECASE,
        ),
    ),
    (
        "suppression request",
        re.compile(
            r"\b(do not|don't|never|refrain from)\b[^.]{0,30}"
            r"\b(flag|report|block|quarantine|warn|alert|analyz|analys)",
            re.IGNORECASE,
        ),
    ),
    (
        "output schema hijack",
        re.compile(
            r"(phishing_probability|spam_probability|requests_credentials|"
            r"\"is_urgent\"|return only|respond only with|output exactly)",
            re.IGNORECASE,
        ),
    ),
    (
        "task reassignment",
        re.compile(
            r"\b(task update|new instructions?|updated instructions?|"
            r"revised (task|objective)|end of (email|message)\s*[.\-—]*\s*(new|now))\b",
            re.IGNORECASE,
        ),
    ),
    (
        "refusal trigger",
        re.compile(
            r"\b(you must (refuse|decline|stop)|stop processing|"
            r"cease analysis|abort (the )?(scan|analysis))\b",
            re.IGNORECASE,
        ),
    ),
]

class PerceptualAnalysisService:
    """
    Score the divergence between what a recipient renders and what the classifier
    ingests.

    The other analysers ask whether the message is malicious. This one asks whether
    the message shown to the reader is the message handed to the model. Concealment
    is treated as evidence rather than noise to strip, because a large divergence
    whose hidden half carries instructions has no benign explanation.

    Instruction-likeness dominates the score deliberately. Hidden-text volume alone
    does not separate the classes: ordinary bulk mail conceals preheaders and
    tracking pixels, so volume produces false positives that content does not.
    """

    MAX_SCORE = 100.0

    IMPERATIVE_WEIGHT = 45.0
    LINK_MISMATCH_WEIGHT = 20.0
    CHANNEL_WEIGHT = 5.0
    MAX_CHANNEL_WEIGHT = 15.0
    BULK_HIDDEN_WEIGHT = 8.0
    BULK_HIDDEN_CHARS = 200

    # Volume bands. Deliberately shallow: a preheader is a legitimate reason for a
    # small divergence, so only a large one contributes meaningfully.
    RATIO_BANDS = ((0.6, 20.0), (0.3, 12.0), (0.1, 6.0))
    CODEPOINT_BANDS = ((20, 20.0), (5, 12.0), (1, 6.0))
    MIXED_SCRIPT_WEIGHT = 15.0

    # Evidence is persisted with every scan and shipped to a browser, so it is
    # bounded. A concealed payload long enough to exceed these is established by
    # its first few hundred characters anyway.
    MAX_SEGMENTS = 12
    MAX_SEGMENT_CHARS = 400
    MAX_VISIBLE_CHARS = 2000

    def _instruction_matches(self, text: str) -> list[str]:
        return [label for label, pattern in INSTRUCTION_PATTERNS if pattern.search(text)]

    def _evidence(self, rendered: RenderedEmail) -> tuple[str, list[dict], bool]:
        """The visible document and the concealed spans, clipped to a size worth storing."""
        segments = [
            {
                "text": segment.text[: self.MAX_SEGMENT_CHARS],
                "channels": list(segment.channels),
                "truncated": len(segment.text) > self.MAX_SEGMENT_CHARS,
            }
            for segment in rendered.hidden_segments[: self.MAX_SEGMENTS]
        ]
        truncated = (
            len(rendered.hidden_segments) > self.MAX_SEGMENTS
            or len(rendered.visible_text) > self.MAX_VISIBLE_CHARS
            or any(s["truncated"] for s in segments)
        )
        return rendered.visible_text[: self.MAX_VISIBLE_CHARS], segments, truncated

    def analyze(self, rendered: RenderedEmail | None) -> PerceptualAnalysisResult:
        if rendered is None:
            return PerceptualAnalysisResult(
                findings=["No rendered body available for comparison"]
            )

        findings: list[str] = []
        score = 0.0

        hidden_text = rendered.hidden_text
        hidden_ratio = rendered.hidden_ratio
        hidden_chars = len(hidden_text)

        # The injection signal: instructions in the half the reader never sees.
        patterns = self._instruction_matches(hidden_text)
        if patterns:
            score += self.IMPERATIVE_WEIGHT
            findings.append(
                "Concealed text contains instructions aimed at the analyser "
                f"({', '.join(patterns)})"
            )

        for threshold, weight in self.RATIO_BANDS:
            if hidden_ratio > threshold:
                score += weight
                findings.append(
                    f"{hidden_ratio:.0%} of the body text is concealed from the reader"
                )
                break

        if hidden_chars >= self.BULK_HIDDEN_CHARS:
            score += self.BULK_HIDDEN_WEIGHT
            findings.append(f"{hidden_chars} characters of concealed text")

        for threshold, weight in self.CODEPOINT_BANDS:
            if rendered.invisible_codepoints >= threshold:
                score += weight
                findings.append(
                    f"{rendered.invisible_codepoints} invisible codepoint(s) in the body"
                )
                break

        mixed = mixed_script_words(rendered.machine_text)
        if mixed:
            score += self.MIXED_SCRIPT_WEIGHT
            findings.append(f"{mixed} word(s) mixing Latin with Greek or Cyrillic script")

        link_mismatch = bool(rendered.hidden_urls)
        if link_mismatch:
            score += self.LINK_MISMATCH_WEIGHT
            findings.append(
                f"{len(rendered.hidden_urls)} link(s) present only in concealed markup"
            )

        visible_excerpt, segments, truncated = self._evidence(rendered)

        channels = rendered.concealment_channels
        if len(channels) > 1:
            extra = min(
                (len(channels) - 1) * self.CHANNEL_WEIGHT, self.MAX_CHANNEL_WEIGHT
            )
            score += extra
            findings.append(f"{len(channels)} concealment techniques combined")
        if channels:
            findings.append(f"Concealment channels: {', '.join(channels)}")

        return PerceptualAnalysisResult(
            score=min(score, self.MAX_SCORE),
            findings=findings or ["Rendered and analysed content agree"],
            hidden_ratio=round(hidden_ratio, 4),
            hidden_chars=hidden_chars,
            imperative_hidden=bool(patterns),
            instruction_patterns=patterns,
            invisible_codepoints=rendered.invisible_codepoints,
            mixed_script_words=mixed,
            link_mismatch=link_mismatch,
            channels=list(channels),
            visible_excerpt=visible_excerpt,
            concealed_segments=segments,
            evidence_truncated=truncated,
        )
