# Blog Promo Tweet Generator

Generate a short curiosity-gap hook for a blog article to post on Twitter.

## Input

Title: {title}
Description: {description}

## Rules

- 2-3 lines max
- Use one of these formats:
  - Question that the article answers (best for technical explainers)
  - Lead with the most surprising number or fact (best for incident analyses)
  - Tease the payoff without giving it away (best for deep dives)
- Casual tone. First letter MUST be uppercase (like a regular sentence). First-person "I" always uppercase. Rest is lowercase except proper nouns.
- No hashtags, no emoji, no "we're excited", no "check out our latest"
- Do NOT include the link — it will be appended separately
- Output ONLY the hook text, nothing else. No quotes, no labels, no markdown.
