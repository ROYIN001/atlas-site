---
name: russian-thai-translate
description: Translate text between Russian and Thai (either direction, auto-detected), with special care for academic/technical vocabulary (aerospace, engineering, military, systems and control terminology) and official/formal documents (letters, forms, correspondence, certificates). Use this skill whenever the user pastes Russian or Thai text and asks for a translation, asks to check or improve a Thai/Russian translation, mentions lecture notes, technical manuals, coursework, or official letters that mix Thai and Russian, or uploads a .docx/.pdf file containing Russian or Thai content that needs translating. Also trigger for requests like "แปลอันนี้เป็นภาษารัสเซีย", "переведи на тайский", or "help me translate this for my academy assignment" even if the word "translate" isn't used explicitly. Make sure to use this skill any time Russian and Thai appear together in a request, even for short phrases.
---

# Russian–Thai Translation

## Why this skill exists

Russian and Thai are typologically very different (Cyrillic vs. Thai script, grammatical case vs. none, different particle/politeness systems), and machine translation between them is often routed through English as a pivot, which quietly loses precision — especially for specialized vocabulary that doesn't have a clean English equivalent either (military ranks, systems-engineering terms, academic titles). Translating carefully and flagging uncertainty is more valuable here than translating fast.

## Workflow

1. **Detect direction.** If the source text is in Cyrillic, translate to Thai. If it's in Thai script, translate to Russian. If the user mixes both or gives an explicit instruction, follow that instruction. When genuinely ambiguous, ask.

2. **Read for register and domain before translating.** A lecture excerpt on flight control systems, a military academy memo, and a casual message all call for different vocabulary and tone. Identify which of these it is (see `references/glossary.md` for domain-specific terms) so word choice matches — formal, polite/professional Thai for official documents, precise technical terms for coursework, natural conversational tone for everyday text.

3. **Translate for meaning, not word-for-word.** Russian sentence structure (long subordinate clauses, case-driven word order) does not map onto Thai directly. Restructure sentences so the Thai (or Russian) reads naturally to a native speaker, rather than mirroring the source syntax.

4. **Flag terms you're not fully confident about rather than guessing silently.** This matters most for:
   - Technical/engineering terms without a standardized Thai or Russian equivalent (e.g. specific aerospace systems, control-theory terms).
   - Military ranks, unit names, or institutional titles that may have official translations the user's institution already uses.
   - Idioms, acronyms, or abbreviations that don't survive translation cleanly.

   Check `references/glossary.md` first for terms already worked out. If a term isn't there and you're not confident, translate as best you can, then add a short bracketed note right after it, e.g. `กล่องควบคุมการบิน [RU: блок управления полётом — уточнить точный термин, если в вузе используется другой]`. Don't pepper the whole translation with notes — only flag genuine uncertainty, so the signal stays useful.

5. **Update the glossary as you go.** When you land on a good translation for a recurring technical/institutional term (e.g. a course name, a specific system name, a rank), add it to `references/glossary.md` so future translations stay consistent instead of re-deriving it each time.

## Output format

Default to this structure:

```
**Translation:**
[translated text]

**Notes:** (only if there's genuine ambiguity — omit this section entirely if none)
- [term/phrase]: [why it's uncertain, and what to double check]
```

Don't add transliteration/romanization unless asked — for technical and official text it adds clutter rather than clarity. If the user is clearly using this for language learning or pronunciation help, offer it, but it's not the default.

For longer documents, translate section by section preserving the original structure (headings, numbered lists, paragraph breaks) so the translation can be visually compared against the source.

## Working with files

If the source is an uploaded document rather than pasted text:

- **.docx source:** read it with the `docx` skill's guidance, extract the text preserving structure, translate, and — unless the user just wants the text in chat — produce a new .docx with the same formatting/layout using the `docx` skill, so headings stay headings and tables stay tables.
- **.pdf source:** use the `pdf` skill to extract the text (and note if OCR is needed for scanned pages), then translate. Only produce a translated PDF back if the user asks for a file; otherwise translated text in chat is often enough.
- Always tell the user which parts of a document (if any) couldn't be extracted cleanly (e.g. text inside images, complex tables) so nothing goes silently untranslated.

## A note on official documents

For anything that looks like it will be submitted somewhere official (a letter to the academy, a certificate, a form for a scholarship or military administrative process), lean toward the more formal, conventional register in the target language over a literal or overly casual rendering — these documents are judged partly on how standard/professional they sound, not just on accuracy.
