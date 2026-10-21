# Atlas review rubric

Use alongside the shared workflow contract and repository adapter. This rubric describes review content, not a second JSON schema. Current repository instructions and actual interfaces take precedence over historical examples here.

## Severity and disposition

| Severity | Meaning | Examples |
|---|---|---|
| `blocker` | Trust or integration is unsafe to claim; acceptance cannot proceed | Stale review snapshot, lost learner/SRS keys, a required source unavailable for an unverified central claim, generated output from a failed/stale build, fabricated citation, required review missing |
| `major` | Materially teaches or behaves incorrectly | Wrong formula/sign/unit, unstated assumption changing validity, incorrect Russian technical meaning, answer key inconsistent with worked solution, demo curve contradicting its equation, broken primary lesson interaction |
| `minor` | Local issue with meaning and core behavior intact | Typographical error, readable but inconsistent punctuation, nonessential alignment issue |

Treat severity and execution status as separate concepts. A missing browser capability is an unavailable check, not evidence that the website itself is defective. It nevertheless blocks a release that requires that check. An item outside scope needs an explicit applicability rationale; required-but-unavailable work is never “not applicable.”

Unresolved blockers and majors prevent acceptance of the affected candidate. Report minor findings honestly and apply any stricter repository gate. Do not rename a material defect “minor” to move work forward. Use an evidence-based question when a possible defect is not yet established.

## Evidence ledger

For every new or materially changed claim, capture the following information in the shared contract's appropriate fields or linked evidence document:

- Claim location: source file, topic/element, and short identifying excerpt.
- Origin: department source, external primary reference, author derivation, illustrative assumption, or unresolved statement.
- Source locator: document/version and printed page, PDF page, lecture/slide, equation, or stable URL section. Preserve page-number offsets when relevant.
- What was inspected: original page image, extracted text, source code, executed result, or a combination.
- Independent verification: derivation, comparison, or counterexample; record assumptions and confidence limits.
- Candidate identity: the snapshot that contains both the claim and related artifacts.

Do not infer source access from a bibliography. If a lesson names a book that was not read, distinguish it from sources actually consulted. Do not copy department source files into the public repository. Public source notes should identify the lecture/page for learners rather than expose private local file paths or editorial directions.

## Gates to assess separately

| Area | What constitutes useful evidence | What does not establish it |
|---|---|---|
| Source fidelity | Claim mapped to inspected source location; ambiguous notation checked visually | A plausible citation or OCR alone for a disputed symbol |
| Academic validity | Reasoning, assumptions, conventions, and independent calculation/reference | Matching the source when the source may contain an error |
| Language | Independent check against canonical decisions and technical meaning | Automated mixed-script scan alone |
| Learning design | Goal–question–answer alignment, productive hints, correct assessment basis | More questions/cards or word count alone |
| Identity/data | Before/after keys and migration results for affected learner records | Same visible question text or same card count |
| Structural/build | Current command results with candidate/output identity | Old green CI or successful parse alone |
| Numerical behavior | Independent reference cases and justified tolerances | A test that reproduces the implementation's formula |
| Browser behavior | Actual interaction on the corresponding build over HTTP | Screenshot alone or inferred behavior from code |
| Visual correctness | Inspected screens and active demo states at relevant widths/themes | Canvas exists, screenshot created, or no console error |

## Academic and numerical review

1. Identify variables, definitions, units, coordinate/sign conventions, independent variable, and validity domain. Check whether a formula assumes linearity, steady state, independence, constant coefficients, or a small-angle approximation.
2. Derive or obtain the reference result independently of the demonstration implementation. Prefer exact/analytic cases where possible. Do not use the same helper function as both implementation and oracle.
3. Record the actual input and output pairs. Specify absolute/relative tolerances and their basis before comparing results; do not increase tolerances after seeing an unexplained failure.
4. Check representative behavior and meaningful boundaries, such as zero input, critical damping, repeated roots, invalid denominators, or probability limits. Choose relevant cases; do not manufacture a full test suite for a spelling correction.
5. Check presentation as well as numbers: axes, scale, dimensions, phase conventions, legends, parameter ranges, singularities, and the explanation of what changing a control means.
6. Keep dimensional analysis as one check. It cannot establish the right sign, constant, assumptions, or physical interpretation.

Examples of domain-specific questions:

| Domain | Questions to ask |
|---|---|
| Control theory | Does the derivation use the intended `p` convention and `a₀` as the highest-power coefficient? Are continuous/discrete models distinguished? Do pole locations, time response, and claimed stability agree under the stated assumptions? |
| Electrical circuits | Are passive sign conventions, RMS/peak values, angular/ordinary frequency, initial conditions, and component units consistent? Does topology match the equations? |
| Reliability | Are independence, repairability, constant failure-rate, and distribution assumptions explicit? Are probability, rate, availability, and reliability distinguished? |
| Navigation and attitude | Are frame, epoch, angle unit, rotation order, and Pitch/Yaw/Roll definitions stated where needed? Do edge cases invalidate the claimed general result? |
| Test/launch equipment (`ppo`) | Is the equipment name and role grounded in the actual course material? Do not reinterpret the subject acronym as applied software or invent procedures beyond the source. |

## Language and terminology

- Apply the canonical glossary decisions consistently across prose, diagrams, controls, questions, hints, and answers. Record unresolved terms for the coordinator in the established pending-terms location; do not settle them by creating a new local glossary.
- Write Thai explanations as Thai sentences with Russian terms parenthesized. Do not insert bare Russian fragments into Thai sentences. Dedicated Russian oral answers and quoted source terminology remain valid.
- Use established Thai terms rather than needless Russian transliteration. Preserve technical meaning even if a more fluent translation is tempting.
- Check that RU/TH/EN labels refer to the same concept. Treat language corrections that alter a formula, value, definition, or assumption as technical changes requiring technical re-review.
- Search for Thai–Cyrillic character adjacency and inspect hits. Also review screenshots, because detached Russian labels can pass the adjacency scan.
- Label author-created derivations, examples, and interpretations visibly as `ผู้เรียบเรียง`; a code comment is not reader-facing attribution.
- End each topic with a useful source statement. Source-error notes must show both the documented and corrected values and explain the difference after independent adjudication.

Keep language and technical review separate until both initial reports are submitted. For long content, divide technical text into bounded chunks (the repository uses roughly 120–320 lines) and language text into at most 300-line segments, with overlap/context for cross-references. Record coverage and gaps; silence from a timed-out reviewer is not a clean review. Follow the repository's retry limit and write partial findings early.

## Learning artifacts

- Confirm what the learner should be able to explain or calculate and whether the task tests that skill.
- Check all supplied answers and intermediate hints against the same source-backed reasoning.
- Separate official exam-ticket content from generated practice. Do not present predictive “likely exam questions” as factual institutional requirements.
- Check that a Russian oral answer is technically correct, speakable, and consistent with its Thai explanation. Its checklist should identify required ideas, not demand an unsupported single wording.
- Avoid flashcards that omit a condition needed for the formula to be true. Multi-step proofs belong in a worked exercise or deliberate practice sequence.
- When answer choices are reordered, preserve correct answer mapping. After a rebalance, rerun affected JSON and quiz checks and confirm that escaping remains intact.
- Review a prerequisite edge as a pedagogical claim. A TF-IDF similarity link only establishes lexical relatedness, not a prerequisite relationship.

## Identity and architecture

Compare before/after topic, oral-question, quiz-host, and glossary identities. Existing QA keys come from canonical `data/qa`/DOM and the established helpers; do not independently recreate a competing hashing scheme. Newly inserted oral questions need explicit stable IDs so they cannot take the IDs of an existing summary question. Reordering quiz blocks needs stable host IDs to preserve records.

Changing the Russian text used by `termKey()` can change its identity. Require a deliberate, tested learner migration where necessary. Never clear real learner data during verification. Use an isolated browser context with representative fixture records.

Inspect new runtime features for existing integration contracts: subject JS/CSS namespaces, `HOOKS`, `registerPage`, `store()`, `learnerKey()`, offline asset registration, deferred demo mounting, cleanup, and hidden-tab suspension. Generated indexes, QA, related topics, dimensions, and hashes should be regenerated by their canonical producers. Review build scripts rather than patching their outputs.

## Build and browser review

Read the current repository adapter before running anything. In the established Atlas workflow, build precedes Node tests and subject/mobile verification. Node's `tests/*.test.cjs` does not automatically run the separate `*.browser.cjs` acceptance scripts. A skipped browser subtest cannot be summarized as “browser passed.” Shared-code changes need the repository-required broader browser coverage.

Check at least the affected user paths: loading the lesson, toggling summary/full content, expanding deep sections, using changed demos, opening hints/answers, following references, and preserving relevant practice state. Add navigation, search, offline, import/export, or performance scenarios only when affected or required by the repository.

Use HTTP, not `file://`. Inspect the required mobile layout and applicable desktop layout, math/table overflow, image loading, active controls, and dark/light themes. Check for `.tfail`, demo failures, console/page errors, missing search indexes, and unexpected external runtime requests. Lazy or suspended canvases require bringing the specific demo into view before judging a blank screenshot.

Preserve validation protections. A legitimate content-count change may require an explained producer-generated baseline update by its owner. It is different from lowering a baseline, increasing a CAP, adding an exception, or disabling a test to hide a defect. Review baseline diffs and forbid unexplained losses.

In STD2 builds, a failed formula/JSON conversion may leave older `out/*.html` intact. Verify exit status, output freshness, and actual content hashes. A newer log or a screenshot filename alone does not prove the new source was rendered.

## Correction and re-review loop

1. Publish one initial report per independent reviewer with snapshot identity and coverage.
2. Have the coordinator reconcile conflicting claims. For a disputed source error, use an independent refutation attempt and inspect the original page.
3. Assign one owner per correction; sequence changes to shared files. Provide uniquely located corrections and preserve unresolved questions.
4. Obtain the corrected snapshot and owner change record. Validate any OLD/NEW replacements, JSON escaping, backslashes, and authoring-source locations before application.
5. Re-review the correction and its dependencies. For example, a formula correction also affects a worked solution, quiz answer, flashcard, and demo when they share it.
6. Reconcile final technical and language reports on the same candidate. Record retained, fixed, refuted, and unresolved findings according to the shared contract.
7. Submit an honest readiness assessment. The builder/coordinator, not this reviewer, owns integration and review-status metadata.

## Report completeness checklist

- Exact requested scope, mode, revision identity, inspected files/pages, and coverage gaps.
- Findings ranked by severity, with locations, evidence, one fix owner, and closure check.
- Separate results for source/academic, language, numerical, structural/build, identity, browser, and visual work where applicable.
- Actual commands, inputs, exit results, and artifact identities for executed checks; reasons for blocked or unrun checks.
- Independent-review status, disputed source statements, and remaining questions.
- What the result establishes and what remains necessary before integration or release.

Keep a standalone audit standalone: an actionable report is a complete deliverable even when broader release validation was outside the user's request.
