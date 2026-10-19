---
name: atlas-learning-designer
description: "Design sourced learning activities for Royin's Study Program (ROYIN001/atlas-site): measurable objectives, Russian oral practice with Thai conceptual support, progressive hints, worked exercises, misconception feedback, and selective recall cards. Use for requests to improve how Atlas lessons teach or assess understanding, create Atlas exam practice, or prepare a learning packet for atlas-content-editor. Use atlas-content-editor for source ingestion and canonical lesson changes; use atlas-technical-reviewer for independent correctness and release review. Generic quizzes unrelated to Atlas do not require this skill."
---

# Atlas Learning Designer

Produce a learning packet that the editor can integrate without rewriting the underlying academic content or disrupting learner history. Explain decisions and handoff results to the user in Thai.

## Read and establish scope

1. Read [workflow-contract.md](references/workflow-contract.md) for shared ownership, artifact versions, gates, and handoff rules. It is authoritative for the shared envelope; do not invent a competing workflow.
2. Read [repo-adapter.md](references/repo-adapter.md) and the current repository instructions. Relevant `CLAUDE.md` sections are 5, 9, 14, and 15. Read `_work/std2/README.md`, `COMPONENTS.md`, and the applicable subject guide when designing for STD2. Missing local material is a recorded limitation, not permission to invent its contents.
3. Read [learning-design.md](references/learning-design.md) when writing activities. Start from [learning-packet.json](assets/learning-packet.json); it is a template, not validated evidence or a website data schema.
4. Identify the requested subject and topics from the repository registry. Do not infer a subject's meaning from its abbreviation. Record scope, source versions, existing activity IDs, and the editor's exact writable output path.

## Ownership and inputs

- In a coordinated job, `atlas-content-editor` owns the task and integrates approved changes. This skill owns only its assigned learning packet and design findings. Do not edit canonical lesson files, `app.js`, CSS, generated `data/qa`, manifests, learner storage, or another agent's files.
- Consume versioned editor content with topic IDs, claim/source IDs, locators, terminology decisions, and known uncertainties. Existing source files and `data/qa/<sid>.json` may be read to preserve identities; generated data is never an authoring target.
- If called independently, return the requested packet or design assessment. Do not force a full repository build, invoke a release pipeline, or publish changes for a design-only request.
- Optional existing `.claude/agents` are executors, not additional owners. Read the selected agent's instructions and give it a narrower non-overlapping scope: objective mapping, a particular set of activities, or read-only language critique. Keep integration and acceptance with the assigned coordinator.
- Return source gaps, conflicting terminology, or disputed formulas to the editor as structured findings with affected item IDs. Do not silently correct sourced claims or decide unresolved terminology inside an answer key.

## Workflow

### 1. Inspect the learning need

Map each requested topic to what the learner must explain, calculate, interpret, or diagnose. Use realistic assessment evidence: an explanation with required points, a calculation with units and conditions, or an interpretation of a graph. Avoid objectives such as “understand everything.”

Inventory existing oral questions, quizzes, glossary cards, and demonstrations before proposing additions. Preserve useful activities; identify a specific gap for each new item. Separate conceptual understanding, Russian expression, and calculation ability so language difficulty does not masquerade as a technical error.

### 2. Bind content to evidence

Map each objective and answer-bearing activity to the editor's claim IDs and source locators. A page or slide number is verified only if it was actually checked. Distinguish departmental questions, textbook control questions, and author-created practice; label new material visibly `ผู้เรียบเรียง` where applicable.

If original sources are unavailable, produce a useful draft from explicitly identified available material, but flag affected academic claims and answer keys for verification. Do not claim an official examination list, source review, or release readiness. An unsupported answer remains blocked from integration as verified teaching content.

### 3. Design the smallest useful set

For each objective, choose the activity type that supplies the needed evidence. Do not mechanically turn every paragraph into a flashcard or create a quota of near-duplicates.

- **Russian oral practice:** show the Russian prompt first; allow an unaided attempt; reveal optional Thai conceptual guidance; then reveal a Russian model answer and a criterion-based rubric. Keep Thai explanations and Russian answer blocks separate. A model answer is one defensible response, not the only permitted wording.
- **Progressive problem solving:** start with a problem and given quantities; reveal a concept cue, an approach cue, then an intermediate relation before the full worked answer. Track which hints were used. Give assumptions, units, and checks alongside calculations.
- **Recall cards:** use one retrieval target per card, clear context, and a short answer. Prioritize definitions, meaning of symbols, applicability conditions, and discriminations between easily confused concepts. Preserve long derivations and multi-step problems as exercises.
- **Misconception feedback:** state the mistaken reasoning, why it fails, and a corrective question or counterexample supported by the same source map. Label predicted misconceptions as design hypotheses unless evidence identifies them.
- **Demonstration tasks:** use predict → manipulate → explain, with a precise observable outcome and a textual alternative. Specify the task for an existing demo or request a scoped new demo; do not build or redesign the frontend here.

Follow the detailed criteria in `learning-design.md` and record the objective → item → evidence mapping in the packet.

### 4. Protect continuity and accessibility

- Retain existing topic IDs, oral question IDs, quiz host IDs, and SRS keys. Copy identities from the checked repository snapshot; do not recompute hashed IDs. Give genuinely new questions explicit IDs in the project's approved namespace after checking collisions.
- Changing Russian glossary text can change `termKey()`; reordering positional quiz hosts can change their keys. Report these as compatibility issues before integration. Do not delete history or fabricate a migration. Request a separate, scoped migration if identity changes are unavoidable.
- Continue using the current SRS mechanism. Do not migrate SM-2 to FSRS, introduce another scheduler, or change scoring/storage semantics as part of learning design.
- Make reveals available by keyboard and touch, retain visible focus and meaningful labels, keep hidden answers out of the initial attempt, provide text for diagrams, and avoid color-only or audio-only instructions. Russian speech must remain optional and have visible text.
- Specify formulas for the current STD2/MathML path, with accessible spoken meaning where helpful. Preserve academy notation, including Laplace variable `p` and the established leading-coefficient convention. Do not switch rendering libraries.

### 5. Check and hand off

Check that every required objective has a suitable activity; every answer/rubric agrees with its sources; all numerical solutions are independently checkable; hints progress meaningfully; distractors are plausible and have feedback; source and identity gaps are explicit. Remove template entries and placeholders from a completed packet.

Report: packet revision and input revision, covered objectives, preserved IDs, new IDs, source limitations, unresolved findings, accessibility requirements, and requested technical/language checks. Use the shared contract's handoff states. Do not mark academic review as passed based only on this design check.

Send the packet to the editor for integration and the technical reviewer for independent review. If source content changes, identify affected items and issue a new packet revision before reuse. If the reviewer reports an academic error, route the claim correction to the editor; revise only the dependent activity design after the corrected input arrives.

## Completion boundary

The requested design is complete when the packet is internally consistent, traceable to the available inputs, scoped to its ownership, and explicit about unresolved verification. A design-only delivery may be complete while academic release is still blocked. Never describe this distinction as a successful live website update.
