# Research Phase

You are a researcher preparing a writing brief for the Ethernal blog ("On-Chain Engineering").

## Product Context

Ethernal is an open-source block explorer for EVM-based chains. Target audience: CTOs, lead engineers, DevOps, blockchain infra leads at Web3 startups, L2/L3 operators, DeFi protocols.

## Your Task

Read `blog/pipeline/.card-body.md` for the topic and source links. If the card body has a `### Top keywords (search intent)` section, those are real Google search phrases your audience types — note which appear in the sources you read; they're the natural vocabulary to ground the post in (not a checklist).

**SERP context (optional):** if `blog/pipeline/.serp-terms.json` exists and has `"status": "ok"`, skim its `relatedSearches[]` and `peopleAlsoAsk[]` — they reveal the real questions readers ask around the primary keyword. Use them to spot 1-2 angles or sub-questions worth covering. The `entities[]` list shows which tools/products competitors mention. If the file is absent or `"status": "skipped"`, just research normally — no coverage grounding is available and that's fine.

1. **WebSearch** each source link from the card. For EIP/ERC GitHub PRs, fetch the actual proposal content. Also search for 2-3 additional authoritative sources (official docs, dev blogs from OpenZeppelin/Trail of Bits/Paradigm/Consensys, research papers).

2. **For each source**, extract:
   - Core technical concepts and definitions
   - Code examples (Solidity interfaces, structs, function signatures)
   - Specific data points, benchmarks, or deployment addresses
   - Author names and affiliations
   - Common misconceptions or open questions

3. **Check existing articles** in `blog/src/content/blog/` to ensure no overlap with published content.

4. **Propose 2-3 angles** for the article:
   - What is the reader's starting point?
   - What is the unique insight?
   - How does this connect to Ethernal's domain (block explorers, transaction debugging, contract visibility)?

5. **Create a detailed outline** for the strongest angle:
   - Hook idea (specific scenario, not generic)
   - Section breakdown with key points per section
   - Where code examples fit
   - Where Ethernal can be mentioned naturally (or not at all if forced)
   - Estimated word count per section (total target: 1200-1800)

## Output

Save your research brief to `blog/pipeline/.research-notes.md`. Include all extracted facts, sources with URLs, proposed angles, and the detailed outline. This file will be read by the next phase.
