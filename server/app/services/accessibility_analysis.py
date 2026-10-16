"""Static three-view comparison; not an actual browser accessibility tree."""

import re
from dataclasses import dataclass, field
from html.parser import HTMLParser
from urllib.parse import urlsplit

from app.core.config import get_settings
from app.services.perceptual_analysis import INSTRUCTION_PATTERNS
from app.utils.email_parser import (
    _VOID_ELEMENTS, _SKIP_ELEMENTS, _parse_style, extract_urls,
)


@dataclass
class AccessibilityResult:
    ran: bool = False
    degraded: bool = False
    review_required: bool = False
    skipped_reason: str = ""
    method: str = "static HTML approximation"
    visible_excerpt: str = ""
    accessible_excerpt: str = ""
    machine_excerpt: str = ""
    evidence_truncated: bool = False
    mismatches: list[dict] = field(default_factory=list)
    limitations: list[str] = field(default_factory=lambda: [
        "No browser or screen reader was executed; external CSS, layout and client-specific behavior are not evaluated.",
        "Accessible naming covers links, buttons, images, and explicit link/button/img roles; other ARIA relationships are not fully modelled.",
    ])


@dataclass
class Node:
    tag: str
    attrs: dict = field(default_factory=dict)
    children: list = field(default_factory=list)


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack = [self.root]
        self.ids = {}
        self.nodes = 0

    def handle_starttag(self, tag, attrs):
        self.nodes += 1
        if self.nodes > 3000 or len(self.stack) >= 64:
            raise ValueError("HTML tree budget exceeded")
        node = Node(tag, dict(attrs))
        self.stack[-1].children.append(node)
        if node.attrs.get("id"):
            self.ids.setdefault(node.attrs["id"], node)
        if tag not in _VOID_ELEMENTS:
            self.stack.append(node)

    def handle_endtag(self, tag):
        for index in range(len(self.stack) - 1, 0, -1):
            if self.stack[index].tag == tag:
                del self.stack[index:]
                return

    def handle_data(self, data):
        self.stack[-1].children.append(data)


def compact(text):
    return " ".join(text.split())


def sensitive_values(text):
    """Concrete destinations/amounts, not arbitrary differences in wording."""
    values = {("host", (urlsplit(u).hostname or "").lower()) for u in extract_urls(text)}
    values |= {("email", value.lower()) for value in re.findall(r"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", text)}
    values |= {("amount", compact(value).lower()) for value in re.findall(r"(?:[$€£₹]\s*\d[\d,.]*|\b\d[\d,.]*\s*(?:USD|EUR|GBP|INR)\b)", text, re.I)}
    values |= {("account", re.sub(r"\s+", "", value).lower()) for value in re.findall(r"\b(?:account|iban)\s*[:#]?\s*([A-Z]{0,2}\d[\d A-Z-]{5,30})", text, re.I)}
    return values


class AccessibilityAnalysisService:
    def __init__(self, enabled=None):
        self.enabled = get_settings().accessibility_analysis_enabled if enabled is None else enabled

    def analyze(self, parsed):
        result = AccessibilityResult()
        if not self.enabled or not parsed.body_html:
            result.skipped_reason = "Accessibility analysis disabled or no HTML body"
            return result
        if len(parsed.body_html) > 100_000:
            result.skipped_reason = "HTML exceeds the 100000-character accessibility budget"
            return result
        tree = Tree()
        try:
            tree.feed(parsed.body_html)
            tree.close()
        except Exception:
            result.degraded = True
            result.skipped_reason = "HTML could not be analysed within the tree budget"
            return result

        comparisons = []

        def walk(node, accessible=True, referenced=False):
            if isinstance(node, str):
                return node
            if node.tag in _SKIP_ELEMENTS or node.tag == "template":
                return ""
            attrs = node.attrs
            style = _parse_style(attrs.get("style") or "")
            style = {k: v.replace("!important", "").strip() for k, v in style.items()}
            if not referenced and ("hidden" in attrs or style.get("display") == "none" or style.get("visibility") in ("hidden", "collapse")):
                return ""
            if accessible and not referenced and (attrs.get("aria-hidden") or "").lower() == "true":
                return ""
            if accessible and not referenced:
                named = node.tag in ("a", "button", "img") or attrs.get("role") in ("link", "button", "img")
                if named:
                    refs = [tree.ids[i] for i in (attrs.get("aria-labelledby") or "").split() if i in tree.ids]
                    label = compact(" ".join(walk(ref, True, True) for ref in refs)) if refs else ""
                    label = label or attrs.get("aria-label") or (attrs.get("alt") if node.tag == "img" else "")
                    if label:
                        visible = compact(" ".join(walk(c, False) for c in node.children))
                        comparisons.append((visible, compact(label), attrs.get("href") or ""))
                        return compact(label)
            children = node.children
            if node.tag == "details" and "open" not in attrs and not referenced:
                children = [c for c in children if isinstance(c, Node) and c.tag == "summary"]
            return compact(" ".join(walk(c, accessible, referenced) for c in children))

        accessible = walk(tree.root)
        rendered = parsed.rendered
        visible = rendered.visible_text if rendered else ""
        machine = rendered.machine_text if rendered else ""

        def mismatch(kind, shown, spoken, reason):
            if len(result.mismatches) < 20:
                result.mismatches.append({"kind": kind, "visible": shown[:500], "accessible": spoken[:500], "reason": reason})
            else:
                result.evidence_truncated = True
            result.review_required = True

        for shown, spoken, href in comparisons:
            left, right = sensitive_values(shown), sensitive_values(spoken)
            categories = {kind for kind, _ in left} & {kind for kind, _ in right}
            if any({v for k, v in left if k == kind} != {v for k, v in right if k == kind} for kind in categories):
                mismatch("conflicting_values", shown, spoken, "Visible and accessible labels disagree on a destination or payment value")
            spoken_hosts = {v for k, v in right if k == "host"}
            target = urlsplit(href).hostname if href.startswith(("http://", "https://")) else None
            if target and spoken_hosts and target.lower() not in spoken_hosts:
                mismatch("link_destination", href, spoken, "Accessible label names a different host than the link target")
            if any(pattern.search(spoken) and not pattern.search(shown) for _, pattern in INSTRUCTION_PATTERNS):
                mismatch("accessible_instruction", shown, spoken, "Accessible name contains analyser-directed instructions absent from its visible label")

        # A difference alone is normal accessibility behavior. Only concrete
        # conflicting values or analyser instructions above request review.
        result.visible_excerpt = visible[:2000]
        result.accessible_excerpt = accessible[:2000]
        result.machine_excerpt = machine[:2000]
        result.evidence_truncated |= any(len(t) > 2000 for t in (visible, accessible, machine))
        result.ran = True
        return result
