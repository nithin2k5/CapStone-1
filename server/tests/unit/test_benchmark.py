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

    async def test_a_flat_gateway_is_flipped_and_a_watching_one_is_not(self):
        """
        The headline result. Same messages, same model, same visible content: the
        gateway that only reads the flattened document is argued out of a verdict
        it had already reached, and the one watching the divergence is not.
        """
        summary, _ = await self._summary()

        assert summary["arms"]["flat"]["flip_scorable"] > 0, "no pair could flip"
        assert summary["arms"]["flat"]["flip_rate"] > 0.3
        assert summary["arms"]["perceptual"]["flip_rate"] == 0.0
        assert summary["arms"]["probe"]["flip_rate"] == 0.0

    async def test_the_flip_denominator_excludes_pairs_that_were_never_caught(self):
        """
        A message an arm misses anyway says nothing about suppression. Counting it
        would quietly improve the rate — and while no clean phishing was caught at
        all, dividing by the full attacked set would print "0% suppression" for the
        undefended arm, which is the number an undefended gateway would like.
        """
        summary, results = await self._summary()

        clean_caught = {
            r.case.base
            for r in results
            if not r.case.attacked and r.caught("flat") and r.case.label == "phish"
        }
        expected = sum(
            1 for r in results if r.case.attacked and r.case.base in clean_caught
        )
        assert summary["arms"]["flat"]["flip_scorable"] == expected

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


class TestAdaptiveAttacker:
    """
    The adaptive loop reports how many moves it takes to get a message delivered.
    That number is only meaningful if every attempt is a real attack and the
    mutations really are different attacks.
    """

    def test_every_register_is_a_payload_the_model_falls_for(self):
        """
        The regression that made the first run of this loop meaningless: the
        stand-in only recognised wordings borrowed from the corpus, so five of six
        registers never suppressed anything. Attempts that were not attacks were
        being scored as attacks the defence had survived.
        """
        from benchmarks.adaptive import REGISTERS
        from benchmarks.models import StandInModel

        model = StandInModel()
        for text in REGISTERS.values():
            model.register_payload(text)

        for name, text in REGISTERS.items():
            assert model._payload_index(text) is not None, name

    def test_shredding_survives_the_parser_and_still_reads_as_the_payload(self):
        from benchmarks.adaptive import REGISTERS, Move, _build
        from benchmarks.models import StandInModel
        from app.utils.email_parser import parse_email_content

        html = _build("<p>hello</p>", (Move("register", "administrative"), Move("shred", "1")))
        parsed = parse_email_content({"From": "a@b.com"}, "", html)

        assert parsed.rendered.hidden_text != REGISTERS["administrative"]
        model = StandInModel()
        model.register_payload(REGISTERS["administrative"])
        assert model._payload_index(parsed.rendered.hidden_text) is not None

    def test_visible_padding_lowers_the_concealed_share(self):
        from benchmarks.adaptive import Move, _build
        from app.utils.email_parser import parse_email_content

        def ratio(chain):
            html = _build("<p>hello</p>", chain)
            return parse_email_content({"From": "a@b.com"}, "", html).rendered.hidden_ratio

        bare = ratio((Move("register", "administrative"),))
        padded = ratio((Move("register", "administrative"), Move("visible_pad", "12")))

        assert padded < bare

    def test_the_ladder_tries_free_moves_before_structural_ones(self):
        from benchmarks.adaptive import REGISTERS, _ladder

        ladder = _ladder()
        first = ladder[: len(REGISTERS)]

        assert all(len(chain) == 1 for chain in first)
        assert {chain[0].value for chain in first} == set(REGISTERS)

    async def test_channels_the_parser_knows_are_never_evaded(self):
        """
        Concealment the parser recognises is caught whatever the wording — the
        payload is split out of the model's input, so rewording buys nothing.
        """
        from benchmarks.adaptive import run_adaptive
        from benchmarks.corpus import TECHNIQUES

        attempts, _ = await run_adaptive("invoice-fraud", 600)

        for attempt in attempts:
            channel = next(
                (m.value for m in attempt.chain if m.kind == "channel"), "display-none"
            )
            if channel in TECHNIQUES:
                assert not attempt.delivered("probe"), (
                    f"{channel} was evaded: {[m.value for m in attempt.chain]}"
                )
