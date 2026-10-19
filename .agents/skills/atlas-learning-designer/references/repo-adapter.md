# Atlas repository adapter — inspected 2026-10-19
Snapshot: ROYIN001/atlas-site main 95e548bf086000a1ac63f0c73d2468ad65857ef8.
This is a navigation aid, not a frozen authority. Re-read current CLAUDE.md and applicable local instructions before work. Newer explicit migration instructions and actual files supersede obsolete inventories; expose material ambiguity instead of guessing.

## Entry and current sources
Read CLAUDE.md §§4–5 and 7 for checks, language and workers; §§9,13–15 for STD2 and upgrades. Read relevant claude/ standards without restoring obsolete two-volume artifact publishing.
The repository has HTML in data/t/<sid>__<tid>.json, but assembled STD2 topics have authoring sources in _work/<sid>std2/src/*.src.html and demos/*.js. Detect source ownership from §15 and src/blocks.json before editing. Do not assume every data/t file is directly editable.
For STD2 work read _work/std2/README.md, COMPONENTS.md, WORKFLOW.md and _work/std2-upgrade/STATUS.md plus applicable coordination instructions. Those ignored local files and faculty originals are not included in a fresh clone. Their absence is an integration dependency, not a reason to recreate a competing assembler.
Use existing per-subject workflows and approved prototypes. A new subject prototype needs the actual repo approval before scaling/committing it unless already approved in session. Skills-only changes do not constitute a subject prototype.
Do not hardcode content counts or assume that js/subj is absent: the older inventory is stale.
Read subject names from SUBJECTS/DEEP and actual lessons. In this repo ppo means Проверочно-пусковое оборудование ЛА, not an assumed software course.

## Shared resources and output boundaries
- Canonical terminology: .claude/skills/russian-thai-translate/references/glossary.md. Consult the translation skill if available. Queue unresolved terms in the existing TERMS-PENDING workflow; only the coordinator integrates accepted decisions.
- Generated: data/ix, data/qa, data/manifest.json, data/rel.json, data/figdim.json, cache/version fields, assembled topic and subject outputs. Use their real producers, not manual patches.
- Contention points: app.js, app.css, shared _work/std2 sources, glossary, counts/block baselines and generated outputs. Single integrator under the existing lock; re-read before applying patches.
- Preserve topic/question IDs and termKey semantics. New oral items need explicit stable IDs. Compare data/qa IDs before/after against the base revision; do not orphan SRS/progress through source ordering changes.
- Workers: notes/topic-writer for content; demo-writer for isolated demos; tech-reviewer and lang-reviewer independently; builder for mechanical integration. Respect available model mappings in the current runtime; do not invent unavailable model names or override global model settings.

## Academic and frontend conventions
Thai sentences; Russian terms in parentheses or separate answer blocks. Use p for Laplace and a₀ for the highest-order coefficient. Give source lines with pages/slides; visibly label author additions ผู้เรียบเรียง. Faculty-source discrepancies need actual primary-source verification and clear presentation of the difference.
Reuse STD2 and its current MathML pipeline. Do not introduce MDX, KaTeX, a new glossary or FSRS migration as a routine lesson edit. Native source formulas may be transformed by the existing builder.
Reuse namespaced js/subj assets and current buildDemo/demoWatch, lazy install and hidden-page suspension. New shared behavior uses HOOKS/registerPage. Preserve offline operation and local fonts/data; no unrequested external calls.
Use the current visibility/content-budget rules, preserving depth through details.deep. Validate all learner-visible labels, diagrams, axes, controls, feedback and narrow mobile layout.

## Validation selection
For a real content integration, inspect the current workflow before running commands:
1. Current subject source build/check, freshness of generated output and coverage/identity comparison.
2. Independent technical/language review and numerical/reference checks; apply corrections and repeat affected checks.
3. Locked assembly and python src/build_data.py.
4. Inspect counts diff; python src/counts.py --update only for intended justified changes. src/blocks.py --update only after its real producer ran.
5. node --test tests/*.test.cjs; on shells without glob expansion enumerate the intended .test.cjs files explicitly.
6. python src/verify.py --subject <sid> --mobile --no-throttle --timeout 240; relevant tests/*.browser.cjs are separate. Run with a local HTTP server, not file://.
7. Inspect screenshots and demo edge cases. Record browser, viewport, topic route and exact candidate.
Follow a required broader repo gate if it applies; do not expand optional testing without a concrete risk. Documentation/skills-only changes need their own validation and do not warrant claiming website verification.
On Windows use python and PYTHONIOENCODING=utf-8. Distinguish CRLF serialization issues from content errors; do not relax tests to hide them. Install dependencies only within existing authorization. Report unavailable prerequisites accurately.

