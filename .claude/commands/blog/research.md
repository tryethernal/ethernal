---
description: Research a topic thoroughly before drafting a blog post
user_input: topic
---

# Blog Research: $ARGUMENTS

Research the topic "$ARGUMENTS" thoroughly to prepare a writing brief.

## Workflow

1. **WebSearch** for 3-5 authoritative sources:
   - Official documentation (Ethereum docs, EIPs, protocol specs)
   - Well-known dev blogs (OpenZeppelin, Trail of Bits, Paradigm, Consensys)
   - Recent conference talks or research papers
   - Quality tutorials or deep dives

2. **Save sources** via Inkwell `add_source` for each. Include URL and a brief description of what it covers.

3. **Extract key facts** — For each source, pull out:
   - Core technical concepts and definitions
   - Code examples worth referencing
   - Data points, benchmarks, or comparisons
   - Common misconceptions to address
   Save each as `add_note` (type: fact, tag matching the article slug).

4. **Propose angles** — Suggest 2-3 possible angles for the article. Consider:
   - What's the reader's starting point? (beginner, intermediate, advanced)
   - What's the unique insight we can offer?
   - How does this connect to Ethernal's domain?
   Save as `add_note` (type: angle).

5. **Create an outline** — Pick the strongest angle and create a detailed outline:
   - Hook idea
   - Section breakdown with key points per section
   - Where code examples fit
   - Where Ethernal can be mentioned naturally (if at all — don't force it)
   - Estimated word count per section
   Save as `add_note` (type: outline).

6. **Run `prepare_brief`** and display the complete brief for review.

## Output

Present the brief clearly and ask: "Ready to draft, or want to adjust the angle/outline?"
