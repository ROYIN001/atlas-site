# Learning design decisions for Atlas

This guide governs the learning packet, not repository ownership or release states. The shared workflow contract and current repository instructions govern those.

## Activity selection

| Learning target | Evidence to elicit | Appropriate activity | Avoid |
|---|---|---|---|
| Define or distinguish a concept | Precise definition plus an important boundary | Short recall card or oral comparison | Copying an entire paragraph onto a card |
| Explain a mechanism | Causal chain with conditions | Russian oral response with a point rubric | A rubric that rewards memorized wording only |
| Apply a method | Valid setup, calculation, units, interpretation | Worked problem with staged hints | Treating final numerical agreement as full understanding |
| Interpret a plot or diagram | Meaning of axes, regions, signs, and limits | Annotated prompt or predict–observe–explain task | Decorative visuals without a question |
| Diagnose an error | Locate the violated assumption and correct it | Misconception challenge | Unsupported claims that all students make the same mistake |
| Transfer between topics | Identify applicable prior knowledge and explain its use | Short bridge problem or prerequisite check | Treating TF-IDF similarity as a verified prerequisite |

Choose only the activity types needed for the request. Map every item to one or more objective IDs; map every required objective to at least one item. Report gaps instead of padding the item count.

## Oral practice sequence

1. **Attempt:** show a Russian question and a clear instruction to answer without the model. Optional planning time is configurable, not a compulsory speed test.
2. **Support:** reveal Thai conceptual guidance separately. Start with the main principle and essential terms, then a suggested structure. A hint should not immediately disclose the full answer.
3. **Answer:** reveal a concise Russian model response, followed by optional elaboration. Include assumptions and limitations where the concept requires them.
4. **Assessment:** use a point rubric with observable requirements and acceptable alternatives. Distinguish technical completeness from Russian expression. Do not penalize harmless rephrasing or a valid alternative derivation.
5. **Repair:** identify an omitted or incorrect point and offer a focused retry. Do not label a student's pronunciation or grammar incorrect without a reliable basis or actual speech input.

Thai instructional sentences stay Thai, with Russian terms in parentheses when helpful. Put complete Russian prompts and answers in separate language blocks. Use the glossary's approved translation; unresolved terms return to the editor.

Represent examination provenance explicitly:

- `official_exam`: only when the actual departmental list has been read and the item mapping is verified.
- `textbook_control`: a control question from an identified textbook, with its locator.
- `author_practice`: a newly authored practice question, visibly labelled `ผู้เรียบเรียง`.
- `unverified_existing`: a pre-existing question whose claimed origin has not been checked.

Do not extrapolate official ticket numbers from topic order or claim generated practice predicts the examination. The repository may legitimately use different question sources for different semesters.

## Progressive hints and worked answers

Use four conceptual levels when the task warrants them:

1. **Concept:** identify what kind of system or principle applies.
2. **Plan:** indicate a representation, equation family, or next operation.
3. **Intermediate step:** show a setup or partial result that unlocks the next step.
4. **Full solution:** disclose the complete reasoning, final result, units, and interpretation.

Do not force four hints onto a simple definition. Avoid hints that merely repeat the prompt. Record dependency order and which hints a learner may open. Atlas does not record hint use; do not specify assisted grading unless an existing feature records it, and keep SRS grades aligned with existing product semantics (proposing a change does not authorize one).

For numerical work record givens, unknowns, assumptions, domain restrictions, symbolic result, units, numerical result, precision/tolerance when justified, and at least one appropriate check. Good checks include a limiting case, substitution into the governing equation, or comparison to a separately calculated reference. Unit consistency alone is not proof of correctness.

When a source appears wrong, record the source's statement and the candidate correction with evidence as a finding. Do not silently replace the source value or label the original wrong without review.

## Recall card quality

- Ask for a specific retrieval target. Provide enough context to avoid multiple unintended answers.
- Prefer conditions and meaning as well as formula recall: “When is this relation valid?” may reveal more than “Write the relation.”
- Keep answers short enough to judge consistently. Long reasoning belongs in an exercise.
- Reuse existing cards when they target the same knowledge. Distinct RU→TH and TH→RU directions are useful only if both are intentional learning goals.
- Separate a card's internal design ID from the actual existing SRS key. A template `null` means unresolved, not a new key.
- The site's Flashcards and term quizzes read the vocabulary in `MODULES` (app.js), keyed by `termKey()`; there is no separate card store. A recall card is therefore either a proposed `MODULES` term for the editor (never change the Russian text of an existing term: that changes its key) or practice content inside the topic.
- Do not invent SRS intervals, mastery claims, or retention guarantees. The scheduler is a separate component already present in Atlas.

## Feedback and assessment quality

Give each multiple-choice option an explanation of the reasoning it represents. Ensure there is one defensible best answer under the stated conditions, or clearly declare a multiple-answer task. Avoid cues from answer length or grammar. Where a set of choices is needed, check the distribution of correct-answer positions; preserve the correct-answer mapping after reordering.

Separate three observations in rubrics: technical content, method/reasoning, and language. A response may be technically correct but linguistically awkward. Specify partial credit in terms of demonstrated knowledge. Reserve “not yet assessed” for missing evidence; do not convert it into a failure.

An activity's design quality is not proof of a learning gain. If the user requests evaluation, propose a modest pre/post or delayed-recall check with the same objectives, record actual observations, and avoid causal claims from a tiny uncontrolled trial.

## STD2 integration notes

The editor maps the packet into existing STD2 components: a concise summary, topic map, explanatory layers, one coherent trap section, section practice, and end-of-topic oral review. Preserve the agreed visible-length budget; move elaboration into appropriate disclosure blocks instead of deleting essential content.

Use current `quiz2`, `details.qa`, and existing practice routes where applicable. Preserve explicit oral IDs and host IDs; pin with the `id` attribute (the runtime sets `data-id` from it). A quiz2 block without an id is `<tid>-q<n>` by position, and links such as `#/<sid>/<tid>/<tid>-q1` point at that position, so insert, delete or move blocks only after pinning every block of the topic with `id` (`data-id` alone does not pin). Even then the v4 side-rail card reads `atlas-quiz-v1` by block order and will show another block's old result; report that as an accepted side effect. Do not introduce parallel quiz or flashcard systems. Slide images never go inside `details.deep` (verify.py reports them as missing sources).

References in learner-facing text should identify a lecture, slide, or book page. Internal filenames and processing details belong in the packet metadata. Do not expose implementation instructions or JSON field names to learners.

## Accessibility specifications

State interaction requirements in the packet; implementation and browser checks belong to the editor/builder and reviewer:

- Keyboard and touch can reveal each hint or answer; controls indicate expanded/collapsed state.
- Focus order follows the question, optional support, answer, and assessment. Revealing content does not unexpectedly move focus.
- Graph tasks include axes, units, relevant data, and a usable text alternative. Do not convey correctness by color alone.
- Thai and Russian blocks have appropriate language metadata. Formula alternatives convey meaning rather than raw markup alone.
- Audio is optional, available text remains readable, and any timer can be paused or omitted. No task depends on hover.
- Mobile presentation avoids requiring horizontal scrolling merely to reach feedback or controls. Long equations may use the site's existing accessible overflow behavior.

## Versioning and handoff checklist

Packet `status` is `draft`, `delivered` (ready for the coordinator; the handoff phase `learning_ready`) or `blocked`. A delivered packet names at least one verified input, classifies every activity's provenance, and carries no blocking issue (otherwise use `blocked`). Before handoff, run `scripts/check_learning_packet.py <packet> --repo-root <repo>`; it rechecks input hashes, topic-bound question ids and preserved quiz host ids. Include changed objective/item IDs and dependencies so a later source correction invalidates only the affected activities. Readiness is per the shared contract; do not add a parallel release flag.

The packet must contain no invented source records, fabricated reviewed hashes, or claims of completed tests. Empty or `null` source fields are acceptable in a clearly marked template or blocked draft; they are not acceptable evidence for a verified academic answer. Keep a human-readable list of exactly what remains to be supplied or checked.
