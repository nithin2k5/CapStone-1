import hashlib
import re
from dataclasses import dataclass, field
from datetime import datetime
from email import message_from_string
from email.utils import parsedate_to_datetime
from html import unescape
from html.parser import HTMLParser
from typing import Any
from urllib.parse import urlparse


@dataclass
class ParsedAttachment:
    filename: str
    content_type: str
    size: int
    sha256: str | None = None


@dataclass
class ConcealedSegment:
    """One run of concealed text, with the techniques that concealed it.

    The channel belongs on the segment, not only on the message: a body hiding a
    preheader behind display:none and an instruction behind white-on-white is not
    the same as one doing both to the same span, and an explanation that cannot
    tell them apart cannot show its evidence.
    """

    text: str
    channels: list[str] = field(default_factory=list)


@dataclass
class RenderedEmail:
    """
    An email as two documents: the text a recipient renders, and the text a
    classifier ingests.

    Benign mail diverges slightly — a preheader line, a tracking pixel, a footer.
    Concealed content widens the gap deliberately, and when the divergent part
    carries instructions rather than keywords it is an injection channel. Keeping
    the difference makes it measurable; discarding it does not.
    """

    visible_text: str = ""
    hidden_text: str = ""
    machine_text: str = ""
    hidden_segments: list[ConcealedSegment] = field(default_factory=list)
    concealment_channels: list[str] = field(default_factory=list)
    invisible_codepoints: int = 0
    visible_urls: list[str] = field(default_factory=list)
    hidden_urls: list[str] = field(default_factory=list)

    @property
    def hidden_ratio(self) -> float:
        """Share of the ingested text that the recipient never sees."""
        total = len(self.visible_text) + len(self.hidden_text)
        if total == 0:
            return 0.0
        return len(self.hidden_text) / total


@dataclass
class ParsedEmail:
    sender: str = ""
    recipient: str = ""
    subject: str = ""
    date: datetime | None = None
    message_id: str = ""
    reply_to: str = ""
    return_path: str = ""
    received_chain: list[str] = field(default_factory=list)
    spf: str | None = None
    dkim: str | None = None
    dmarc: str | None = None
    body_text: str = ""
    body_html: str = ""
    urls: list[str] = field(default_factory=list)
    attachments: list[ParsedAttachment] = field(default_factory=list)
    raw_headers: dict[str, Any] = field(default_factory=dict)
    rendered: RenderedEmail | None = None
    # The message exactly as it arrived, when the provider can supply it. DKIM
    # hashes the original bytes, so a message reassembled from parsed parts
    # cannot be verified — only these can. Not persisted.
    raw_message: bytes | None = None

    @property
    def visible_text(self) -> str:
        """The body as the recipient sees it, falling back to the plain body."""
        if self.rendered and self.rendered.visible_text:
            return self.rendered.visible_text
        return self.body_text


URL_PATTERN = re.compile(
    r"https?://[^\s<>\"{}|\\^`\[\]]+|www\.[^\s<>\"{}|\\^`\[\]]+",
    re.IGNORECASE,
)

TAG_PATTERN = re.compile(r"<[^>]*>")

# Elements whose text content is markup, not message content. All of these are
# non-void and reliably closed, so tracking nesting depth is safe.
_SKIP_ELEMENTS = {"script", "style", "title", "noscript"}

# Elements that imply a line break, so words either side do not run together.
_BLOCK_ELEMENTS = {
    "p", "div", "br", "tr", "td", "li", "h1", "h2", "h3", "h4", "h5", "h6",
    "table", "blockquote", "section", "article", "header", "footer", "hr",
    "ul", "ol", "pre",
}


class _HTMLTextExtractor(HTMLParser):
    """Collect the readable text of an HTML document, dropping markup-only elements."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self._chunks: list[str] = []
        self._skip_depth = 0

    def handle_starttag(self, tag: str, attrs: list) -> None:
        if tag in _SKIP_ELEMENTS:
            self._skip_depth += 1
        elif tag in _BLOCK_ELEMENTS:
            self._chunks.append("\n")

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_ELEMENTS:
            self._skip_depth = max(self._skip_depth - 1, 0)
        elif tag in _BLOCK_ELEMENTS:
            self._chunks.append("\n")

    def handle_data(self, data: str) -> None:
        if not self._skip_depth:
            self._chunks.append(data)

    def get_text(self) -> str:
        return "".join(self._chunks)


def _collapse_whitespace(text: str) -> str:
    lines = (re.sub(r"[^\S\n]+", " ", line).strip() for line in text.split("\n"))
    return "\n".join(line for line in lines if line)


def html_to_text(html: str) -> str:
    """
    Extract the readable text of an HTML email body.

    HTML-only messages carry no text/plain part, so without this the content
    analysers receive nothing to work with. On malformed markup this degrades to
    a tag strip rather than returning an empty body.
    """
    if not html:
        return ""

    extractor = _HTMLTextExtractor()
    try:
        extractor.feed(html)
        extractor.close()
        return _collapse_whitespace(extractor.get_text())
    except Exception:
        return _collapse_whitespace(unescape(TAG_PATTERN.sub(" ", html)))


# --------------------------------------------------------------------------
# Two-channel extraction: what the recipient renders vs. what the model ingests
# --------------------------------------------------------------------------

# Codepoints that occupy no visual space. Text built from these is present in the
# byte stream and absent from the rendered message.
INVISIBLE_CODEPOINTS = re.compile(
    "["
    "­"  # soft hyphen
    "​-‏"  # zero-width space/non-joiner/joiner, LRM, RLM
    "‪-‮"  # bidi embedding and override
    "⁠-⁤"  # word joiner, invisible operators
    "⁦-⁩"  # bidi isolates
    "﻿"  # zero-width no-break space
    "\U000e0000-\U000e007f"  # Unicode tag characters
    "]"
)

_STYLE_BLOCK = re.compile(r"<style[^>]*>(.*?)</style>", re.IGNORECASE | re.DOTALL)
_CSS_RULE = re.compile(r"([^{}]+)\{([^{}]*)\}")
_ZERO_LENGTH = re.compile(r"^0(\.0+)?(px|pt|em|rem|ex|%|vh|vw|ch)?$")
# Text too small to read but not zero. An adaptive attacker found font-size:1px
# walking straight past a rule that only knew about 0.
_TINY_LENGTH = re.compile(r"^(0?\.\d+|[12])(px|pt)?$")
# clip-path:inset(100%) and the older clip:rect(0,0,0,0) both remove the element
# from the page while leaving its text in the document.
_CLIPPED = re.compile(r"inset\(\s*(100%|5\d%|[6-9]\d%)|rect\(\s*0[a-z]*\s*[, ]")
# scale(0), scale3d(0,...), matrix with zero scale factors.
_ZERO_SCALE = re.compile(r"scale[3dxyz]*\(\s*0(\.0+)?\s*[,)]")
_OFFSCREEN = re.compile(r"^-\s*(\d{3,})(\.\d+)?(px|pt|em|rem|ex|%)?$")

_VOID_ELEMENTS = {
    "area", "base", "br", "col", "embed", "hr", "img", "input",
    "link", "meta", "param", "source", "track", "wbr",
}

_NAMED_COLORS = {
    "white": "#ffffff",
    "black": "#000000",
    "transparent": "transparent",
}

# An alt or title attribute long enough to be prose rather than a label.
_ATTRIBUTE_TEXT_THRESHOLD = 40


def _parse_style(style: str) -> dict[str, str]:
    declarations: dict[str, str] = {}
    for declaration in style.split(";"):
        prop, sep, value = declaration.partition(":")
        if sep:
            declarations[prop.strip().lower()] = value.strip().lower()
    return declarations


def _color_distance(first: str, second: str) -> float | None:
    """
    How far apart two colours are, as plain RGB distance.

    Exact equality was the only test here, so #fefefe on #ffffff — indisputably
    invisible, and found by the adaptive loop in one move — did not register.
    """
    if not (first.startswith("#") and second.startswith("#")):
        return None
    if len(first) != 7 or len(second) != 7:
        return None
    try:
        a = [int(first[i : i + 2], 16) for i in (1, 3, 5)]
        b = [int(second[i : i + 2], 16) for i in (1, 3, 5)]
    except ValueError:
        return None
    return sum((x - y) ** 2 for x, y in zip(a, b)) ** 0.5


# Distance below which text cannot be read against its background. Well under the
# contrast any legible palette uses, so ordinary low-contrast design is untouched.
_INVISIBLE_COLOR_DISTANCE = 24.0


def _normalise_color(value: str) -> str:
    value = value.strip().lower()
    if value in _NAMED_COLORS:
        return _NAMED_COLORS[value]

    short = re.fullmatch(r"#([0-9a-f]{3})", value)
    if short:
        return "#" + "".join(c * 2 for c in short.group(1))
    if re.fullmatch(r"#[0-9a-f]{6}", value):
        return value

    rgb = re.fullmatch(
        r"rgba?\(\s*(\d+)\s*[,\s]\s*(\d+)\s*[,\s]\s*(\d+)\s*(?:[,/]\s*([\d.]+))?\s*\)",
        value,
    )
    if rgb:
        alpha = rgb.group(4)
        if alpha is not None and float(alpha) == 0:
            return "transparent"
        return "#%02x%02x%02x" % tuple(int(rgb.group(i)) for i in (1, 2, 3))

    return value


def _concealment_channels(style: dict[str, str], attrs: dict[str, str]) -> list[str]:
    """Name the techniques that keep this element's text off the screen."""
    channels: list[str] = []

    if style.get("display") == "none":
        channels.append("display-none")
    if style.get("visibility") in ("hidden", "collapse"):
        channels.append("visibility-hidden")
    opacity = style.get("opacity", "")
    if opacity:
        try:
            if float(opacity) <= 0.1:
                channels.append("opacity-zero" if float(opacity) == 0 else "near-transparent")
        except ValueError:
            pass
    font_size = style.get("font-size", "")
    if _ZERO_LENGTH.match(font_size):
        channels.append("zero-font-size")
    elif _TINY_LENGTH.match(font_size):
        channels.append("tiny-font-size")
    if _CLIPPED.search(style.get("clip-path", "")) or _CLIPPED.search(style.get("clip", "")):
        channels.append("clipped")
    if _ZERO_SCALE.search(style.get("transform", "")):
        channels.append("zero-scale")
    if any(_ZERO_LENGTH.match(style.get(prop, "")) for prop in ("height", "max-height")):
        channels.append("zero-height")
    if any(_ZERO_LENGTH.match(style.get(prop, "")) for prop in ("width", "max-width")):
        channels.append("zero-width")
    if _OFFSCREEN.match(style.get("text-indent", "")):
        channels.append("offscreen-indent")
    if style.get("position") in ("absolute", "fixed") and any(
        _OFFSCREEN.match(style.get(prop, "")) for prop in ("left", "top", "right", "bottom")
    ):
        channels.append("offscreen-position")
    if style.get("mso-hide") == "all":
        channels.append("mso-hide")

    color = style.get("color")
    if color:
        foreground = _normalise_color(color)
        background = style.get("background-color") or style.get("background")
        distance = (
            _color_distance(foreground, _normalise_color(background))
            if background
            else None
        )
        if background and _normalise_color(background) == foreground:
            channels.append("matched-color")
        elif distance is not None and distance <= _INVISIBLE_COLOR_DISTANCE:
            channels.append("near-matched-color")
        elif foreground == "transparent":
            channels.append("transparent-color")
        elif (
            not background
            and (_color_distance(foreground, "#ffffff") or 999) <= _INVISIBLE_COLOR_DISTANCE
            and foreground != "#ffffff"
        ):
            # Near-white on the default canvas: invisible for the same reason
            # white is, and a step the attacker takes to dodge an equality test.
            channels.append("near-white-on-default")
        elif foreground == "#ffffff" and not background:
            # White text with no declared background: on the default white canvas
            # this is invisible. Named separately because a dark-themed template
            # can produce it legitimately.
            channels.append("white-on-default")

    if "hidden" in attrs:
        channels.append("hidden-attribute")
    return channels


def _hidden_selectors(html: str) -> tuple[set[str], set[str]]:
    """Collect class and id names that <style> rules use to conceal content."""
    classes: set[str] = set()
    ids: set[str] = set()

    for css in _STYLE_BLOCK.findall(html):
        for selector, body in _CSS_RULE.findall(css):
            if not _concealment_channels(_parse_style(body), {}):
                continue
            for token in re.findall(r"[.#][\w-]+", selector):
                (classes if token[0] == "." else ids).add(token[1:].lower())

    return classes, ids


class _TwoChannelExtractor(HTMLParser):
    """Split an HTML body into rendered text and concealed text."""

    def __init__(self, hidden_classes: set[str], hidden_ids: set[str]) -> None:
        super().__init__(convert_charrefs=True)
        self._hidden_classes = hidden_classes
        self._hidden_ids = hidden_ids
        # (tag, state, channels). state is "conceal", "reveal", or None to
        # inherit. "reveal" exists for <summary>, which renders even when the
        # <details> around it is collapsed — without it, a collapsed FAQ would
        # report its own heading as concealed text.
        self._stack: list[tuple[str, str | None, tuple[str, ...]]] = []
        self._skip_depth = 0
        self.visible: list[str] = []
        self.hidden: list[str] = []
        self.hidden_segments: list[str] = []
        self.channels: list[str] = []
        self.visible_urls: list[str] = []
        self.hidden_urls: list[str] = []

    @property
    def _concealed(self) -> bool:
        concealed = False
        for _, state, _ in self._stack:
            if state == "conceal":
                concealed = True
            elif state == "reveal":
                concealed = False
        return concealed

    @property
    def _active_channels(self) -> list[str]:
        """The techniques concealing the element currently being read."""
        active: list[str] = []
        for _, state, channels in self._stack:
            if state == "reveal":
                active = []
            elif state == "conceal":
                for channel in channels:
                    if channel not in active:
                        active.append(channel)
        return active

    def _note(self, channel: str) -> None:
        if channel not in self.channels:
            self.channels.append(channel)

    def _emit(self, text: str, concealed: bool, channels: list[str] | None = None) -> None:
        if not text.strip():
            return
        if concealed:
            self.hidden.append(text)
            self.hidden_segments.append(
                ConcealedSegment(
                    text=text.strip(),
                    channels=channels if channels is not None else self._active_channels,
                )
            )
        else:
            self.visible.append(text)

    def handle_starttag(self, tag: str, attrs: list) -> None:
        attributes = {k.lower(): (v or "") for k, v in attrs}

        if tag in _SKIP_ELEMENTS:
            self._skip_depth += 1
            return

        channels = _concealment_channels(
            _parse_style(attributes.get("style", "")), attributes
        )

        for name in attributes.get("class", "").lower().split():
            if name in self._hidden_classes:
                channels.append("stylesheet-class")
        if attributes.get("id", "").lower() in self._hidden_ids:
            channels.append("stylesheet-id")

        # Elements whose contents the browser never paints, whatever their style.
        if tag == "template":
            channels.append("template-element")
        if tag == "details" and "open" not in attributes:
            channels.append("collapsed-details")

        concealed = self._concealed or bool(channels)
        for channel in channels:
            self._note(channel)

        if tag in _BLOCK_ELEMENTS:
            (self.hidden if concealed else self.visible).append("\n")

        # Attribute text is read by a parser and generally not by a reader.
        for attribute in ("alt", "title"):
            value = attributes.get(attribute, "").strip()
            if value:
                attribute_channels = self._active_channels or [f"{attribute}-attribute"]
                self._emit(f" {value} ", True, attribute_channels)
                if len(value) >= _ATTRIBUTE_TEXT_THRESHOLD:
                    self._note(f"{attribute}-attribute")

        if tag == "a":
            href = attributes.get("href", "").strip()
            if href.lower().startswith(("http://", "https://")):
                target = self.hidden_urls if concealed else self.visible_urls
                if href not in target:
                    target.append(href)

        if tag not in _VOID_ELEMENTS:
            # A summary renders with its details collapsed, so it is the one
            # element that puts text back on the screen.
            state = "reveal" if tag == "summary" else ("conceal" if concealed else None)
            self._stack.append((tag, state, tuple(channels)))

    def handle_endtag(self, tag: str) -> None:
        if tag in _SKIP_ELEMENTS:
            self._skip_depth = max(self._skip_depth - 1, 0)
            return
        if tag in _VOID_ELEMENTS:
            return

        if tag in _BLOCK_ELEMENTS:
            (self.hidden if self._concealed else self.visible).append("\n")

        for index in range(len(self._stack) - 1, -1, -1):
            if self._stack[index][0] == tag:
                del self._stack[index:]
                return
        # Unmatched closing tag: leave the stack alone rather than desyncing it.

    def handle_data(self, data: str) -> None:
        if self._skip_depth:
            return
        self._emit(data, self._concealed)

    def handle_comment(self, data: str) -> None:
        if data.strip():
            self.hidden.append(f" {data} ")
            self.hidden_segments.append(
                ConcealedSegment(text=data.strip(), channels=["html-comment"])
            )
            self._note("html-comment")


def render_email(body_html: str, body_text: str = "") -> RenderedEmail:
    """
    Separate an email body into what a recipient renders and what a parser reads.

    With no HTML part there is nothing to conceal, so both channels are the plain
    body. Concealment is reported as named channels rather than a single flag so a
    finding can say which technique was used.
    """
    if not body_html:
        text = body_text or ""
        return RenderedEmail(
            visible_text=text,
            hidden_text="",
            machine_text=text,
            invisible_codepoints=len(INVISIBLE_CODEPOINTS.findall(text)),
            visible_urls=extract_urls(text),
        )

    machine_text = html_to_text(body_html)
    hidden_classes, hidden_ids = _hidden_selectors(body_html)
    extractor = _TwoChannelExtractor(hidden_classes, hidden_ids)

    try:
        extractor.feed(body_html)
        extractor.close()
    except Exception:
        # Unparseable markup: treat the whole body as visible rather than inventing
        # a divergence that would look like an attack.
        return RenderedEmail(
            visible_text=machine_text,
            hidden_text="",
            machine_text=machine_text,
            invisible_codepoints=len(INVISIBLE_CODEPOINTS.findall(machine_text)),
            visible_urls=extract_urls(machine_text),
        )

    visible_text = _collapse_whitespace("".join(extractor.visible))
    hidden_text = _collapse_whitespace("".join(extractor.hidden))

    visible_urls = extractor.visible_urls + [
        u for u in extract_urls(visible_text) if u not in extractor.visible_urls
    ]
    hidden_urls = [
        u
        for u in extractor.hidden_urls + extract_urls(hidden_text)
        if u not in visible_urls
    ]

    return RenderedEmail(
        visible_text=visible_text,
        hidden_text=hidden_text,
        machine_text=machine_text,
        hidden_segments=extractor.hidden_segments,
        concealment_channels=extractor.channels,
        invisible_codepoints=len(INVISIBLE_CODEPOINTS.findall(machine_text)),
        visible_urls=visible_urls,
        hidden_urls=list(dict.fromkeys(hidden_urls)),
    )


def extract_urls(text: str) -> list[str]:
    if not text:
        return []
    urls = URL_PATTERN.findall(text)
    normalized: list[str] = []
    for url in urls:
        if url.lower().startswith("www."):
            url = f"http://{url}"
        
        url = url.rstrip(".,;:'\"!?")
        
        normalized.append(url)
    return list(dict.fromkeys(normalized))


def collect_headers(pairs) -> dict[str, Any]:
    """
    Build a header mapping that keeps repeated headers.

    A plain dict comprehension over the header pairs keeps only the last value of
    each name, which erased the whole Received chain — one hop survived, so the
    hop-count check could never fire however many relays a message had passed
    through. Repeated names become a list here; single ones stay strings.
    """
    headers: dict[str, Any] = {}
    for name, value in pairs:
        if name not in headers:
            headers[name] = value
        elif isinstance(headers[name], list):
            headers[name].append(value)
        else:
            headers[name] = [headers[name], value]
    return headers


def header_values(raw_headers: dict[str, Any], name: str) -> list[str]:
    """Every value recorded under a header name, in the order received."""
    values: list[str] = []
    for key, value in raw_headers.items():
        if key.lower() != name.lower():
            continue
        if isinstance(value, list):
            values.extend(str(v) for v in value)
        elif value is not None:
            values.append(str(value))
    return values


def parse_email_content(
    raw_headers: dict[str, Any],
    body_text: str = "",
    body_html: str = "",
    attachments: list[ParsedAttachment] | None = None,
) -> ParsedEmail:
    # A repeated header collapses to its last value for the single-valued lookups
    # below; the ones that are genuinely a sequence are read with header_values.
    headers_lower: dict[str, str] = {}
    for key, value in raw_headers.items():
        if isinstance(value, list):
            value = value[-1] if value else ""
        headers_lower[key.lower()] = value

    received_chain = header_values(raw_headers, "received")

    auth_results = headers_lower.get("authentication-results", "")
    spf = extract_auth(auth_results, "spf")
    dkim = extract_auth(auth_results, "dkim")
    dmarc = extract_auth(auth_results, "dmarc")

    date_str = headers_lower.get("date", "")
    parsed_date = None
    if date_str:
        try:
            parsed_date = parsedate_to_datetime(date_str)
        except (ValueError, TypeError):
            parsed_date = None

    rendered = render_email(body_html, body_text)

    if not body_text.strip() and body_html:
        body_text = rendered.machine_text

    combined_text = f"{body_text} {body_html}"
    urls = extract_urls(combined_text)

    return ParsedEmail(
        sender=headers_lower.get("from", ""),
        recipient=headers_lower.get("to", ""),
        subject=headers_lower.get("subject", ""),
        date=parsed_date,
        message_id=headers_lower.get("message-id", ""),
        reply_to=headers_lower.get("reply-to", ""),
        return_path=headers_lower.get("return-path", ""),
        received_chain=received_chain,
        spf=spf,
        dkim=dkim,
        dmarc=dmarc,
        body_text=body_text,
        body_html=body_html,
        urls=urls,
        attachments=attachments or [],
        raw_headers=raw_headers,
        rendered=rendered,
    )


def extract_auth(auth_results: str, mechanism: str) -> str | None:
    pattern = rf"{mechanism}=\w+"
    match = re.search(pattern, auth_results, re.IGNORECASE)
    return match.group(0) if match else None


def parse_raw_email(raw_email: str, raw_message: bytes | None = None) -> ParsedEmail:
    msg = message_from_string(raw_email)
    headers = collect_headers(msg.items())
    body_text = ""
    body_html = ""
    attachments: list[ParsedAttachment] = []

    if msg.is_multipart():
        for part in msg.walk():
            content_type = part.get_content_type()
            disposition = str(part.get("Content-Disposition", ""))
            if "attachment" in disposition:
                filename = part.get_filename() or "unknown"
                payload = part.get_payload(decode=True) or b""
                attachments.append(
                    ParsedAttachment(
                        filename=filename,
                        content_type=content_type,
                        size=len(payload),
                        sha256=hashlib.sha256(payload).hexdigest() if payload else None,
                    )
                )
            elif content_type == "text/plain" and not body_text:
                body_text = part.get_payload(decode=True).decode("utf-8", errors="ignore")
            elif content_type == "text/html" and not body_html:
                body_html = part.get_payload(decode=True).decode("utf-8", errors="ignore")
    else:
        payload = msg.get_payload(decode=True)
        if payload:
            body_text = payload.decode("utf-8", errors="ignore")

    parsed = parse_email_content(headers, body_text, body_html, attachments)
    parsed.raw_message = raw_message if raw_message is not None else raw_email.encode()
    return parsed


def extract_domain(email_or_url: str) -> str:
    if "@" in email_or_url:
        return email_or_url.split("@")[-1].strip(">").lower()
    try:
        parsed = urlparse(email_or_url if "://" in email_or_url else f"http://{email_or_url}")
        return (parsed.hostname or "").lower()
    except Exception:
        return ""
