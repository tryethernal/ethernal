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
- End with a short transition to the link, like: "full breakdown →", "full investigation →", "full article →", "we wrote about it →", "deep dive →". Pick whichever fits the content's tone.
- Do NOT include the actual URL — it will be appended after your transition line.
- Output ONLY the hook text (including the transition line), nothing else. No quotes, no labels, no markdown.

## Writing Style (CRITICAL)

Zero em dashes (—). Use commas, periods, colons, or parentheses instead.

**Banned words:** comprehensive, robust, leverage, harness, streamline, crucial, pivotal, seamless, notable, significant, innovative, cutting-edge, game-changing, groundbreaking, furthermore, moreover, additionally, consequently, delve, utilize, facilitate, optimize, encompass, nuanced, multifaceted, notably, fundamental

**Banned patterns:**
- No "It's not just X; it's Y" or "Not only... but..."
- No "serves as / stands as / marks / represents" — just say "is"
- No significance inflation ("marking a pivotal moment", "stands as a testament")
- No press release voice ("proud to announce", "pleased to share")
- No forced groups of three

**Voice:** Have an opinion. React to the fact, don't just report it. Short punchy sentences. Vary rhythm. Sound like a person who found something interesting, not a content marketer.
