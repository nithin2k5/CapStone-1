"""
The benchmark is evidence, so its construction is tested like anything else.

A corpus whose pairs are not actually matched, or whose concealment does not
conceal, would produce numbers that look like a result and mean nothing.
"""

from app.services.risk_engine import RiskEngine
from app.utils.email_parser import parse_email_content
from benchmarks.corpus import PAYLOADS, TECHNIQUES, build_corpus
from benchmarks.models import StandInModel
from benchmarks.run import Harness, run, summarise


class TestCorpusConstruction:
    def setup_method(self):
        self.cases = build_corpus()
        self.by_id = {c.id: c for c in self.cases}

    def test_every_attacked_case_has_a_clean_twin(self):
        for case in self.cases:
            if case.attacked:
                assert case.pair_id in self.by_id

    def test_the_twin_differs_only_in_the_concealed_half(self):
        """
        The visible halves must match exactly. If the payload changed anything the
        recipient can see, the pair would no longer isolate concealment.
        """
        for case in self.cases:
            if not case.attacked:
                continue
            attacked = parse_email_content(case.headers, "", case.html)
            clean = parse_email_content(
                self.by_id[case.pair_id].headers, "", self.by_id[case.pair_id].html
            )
            assert attacked.visible_text == clean.visible_text, case.id

    def test_every_technique_actually_conceals(self):
        """A technique the parser does not register as concealment tests nothing."""
        for technique in TECHNIQUES:
            case = next(
                c for c in self.cases if c.technique == technique and c.attacked
            )
            parsed = parse_email_content(case.headers, "", case.html)
            rendered = parsed.rendered
            concealed = bool(rendered.hidden_text) or rendered.invisible_codepoints > 0
            assert concealed, f"{technique} left nothing concealed"

    def test_pattern_evading_payloads_evade_the_pattern_list(self):
        """
        The claim these payloads carry is that the perceptual analyser's wording
        list does not match them. If one does match, the arm comparison it feeds
        would overstate what the pattern list misses.
        """
        from app.services.perceptual_analysis import PerceptualAnalysisService

        service = PerceptualAnalysisService()
        for payload in PAYLOADS:
            matched = service._instruction_matches(payload.text)
            if payload.evades_patterns:
                assert not matched, f"{payload.id} was matched by {matched}"
            else:
                assert matched, f"{payload.id} matches no pattern"

    def test_both_labels_are_represented(self):
        labels = {c.label for c in self.cases}
        assert labels == {"phish", "benign"}


class TestStandInModel:
    async def test_it_obeys_a_payload_it_is_shown(self):
        case = next(
            c
            for c in build_corpus(techniques=["display-none"], payloads=["verdict-forcing"])
            if c.attacked and c.label == "phish"
        )
        parsed = parse_email_content(case.headers, "", case.html)
        model = StandInModel()

        visible = await model.analyze_body(parsed, parsed.visible_text)
        ingested = await model.analyze_body(parsed, parsed.rendered.machine_text)

        assert visible.score > ingested.score, "the payload changed nothing"

    async def test_shredding_does_not_hide_the_payload_from_it(self):
        """
        The shredding technique splits the payload with invisible codepoints. A
        stand-in that only matched contiguous text would look immune to a technique
        a real model reads straight through, and the arm comparison would credit
        the gateway for a defence the codepoints never provided.
        """
        case = next(
            c
            for c in build_corpus(
                techniques=["hidden-shredded"], payloads=["verdict-forcing"]
            )
            if c.attacked and c.label == "phish"
        )
        parsed = parse_email_content(case.headers, "", case.html)
        model = StandInModel()

        ingested = await model.analyze_body(parsed, parsed.rendered.machine_text)
        assert ingested.score == StandInModel.SUPPRESSED_SCORE

    async def test_obedience_zero_resists_every_payload(self):
        case = next(
            c
            for c in build_corpus(techniques=["display-none"], payloads=["verdict-forcing"])
            if c.attacked and c.label == "phish"
        )
        parsed = parse_email_content(case.headers, "", case.html)
        model = StandInModel(obedience=0.0)

        ingested = await model.analyze_body(parsed, parsed.rendered.machine_text)
        assert ingested.score > StandInModel.SUPPRESSED_SCORE


class TestHarnessArms:
    """
    The result the project claims: a flat gateway is flipped by the payload, the
    pattern-based analyser catches the payloads it has wording for, and the probe
    catches the rest.
    """

    async def _summary(self, **kwargs):
        cases = build_corpus(**kwargs)
        harness = Harness(backend="stand-in")
        results = await run(cases, harness, concurrency=8)
        return summarise(results), results

    async def test_a_flat_gateway_catches_none_of_the_attacked_messages(self):
        summary, _ = await self._summary()

        assert summary["arms"]["flat"]["phish_attacked_caught"] == 0
        assert summary["arms"]["probe"]["phish_attacked_caught"] > 0

    async def test_the_flip_rate_is_undefined_while_clean_phishing_is_missed(self):
        """
        A pair can only flip if the twin without the payload was caught. While the
        risk engine scores unattacked phishing below the quarantine threshold, the
        denominator is empty, and the rate must report that rather than dividing by
        the full attacked set — which would read as 0% suppression, the number an
        undefended gateway would want to show.
        """
        summary, _ = await self._summary()

        assert summary["arms"]["flat"]["phish_clean_caught"] == 0
        assert summary["arms"]["flat"]["flip_scorable"] == 0
        assert summary["arms"]["flat"]["flip_rate"] is None

    async def test_the_probe_catches_what_the_pattern_list_misses(self):
        summary, _ = await self._summary()
        evading = summary["pattern_evading"]

        assert evading["total"] > 0
        assert evading["probe"] > evading["perceptual"], (
            "the probe added nothing over the pattern list on evading wording"
        )

    async def test_clean_benign_mail_is_not_flagged_by_any_arm(self):
        summary, _ = await self._summary()

        for arm in ("flat", "perceptual", "probe"):
            assert summary["arms"][arm]["false_positives"] == 0

    async def test_scores_never_exceed_the_scale(self):
        _, results = await self._summary(techniques=["display-none"])

        for result in results:
            for score in result.scores.values():
                assert 0.0 <= score <= 100.0

    async def test_quarantine_threshold_is_the_decision_line(self):
        _, results = await self._summary(techniques=["display-none"])

        for result in results:
            assert result.caught("probe") == (
                result.scores["probe"] >= RiskEngine.QUARANTINE_THRESHOLD
            )
