---
description: Generate or refresh the 2-week blog content calendar and maintain the topic backlog
---

# Blog Content Planning

Generate a 2-week content calendar targeting 1 post every 2 days. Maintain a healthy topic backlog.

## Workflow

1. **Check existing pipeline** — List published and draft articles in `blog/src/content/blog/`. Note publish dates from frontmatter to understand current pace.

2. **Invoke the content-strategy skill** to guide topic selection, content mix, and audience targeting.

3. **Replenish backlog** — If fewer than 15 ideas exist in the calendar, use WebSearch to research trending blockchain dev topics. Target categories:
   - Solidity Patterns
   - EVM Internals
   - L2 Architecture
   - Smart Contract Security
   - Tooling Tutorials
   - DeFi Engineering
   - Infrastructure/DevOps
   - Block Explorer Concepts

4. **Build calendar** — Pick topics for the next 14 days (7 posts at 1 per 2 days). Balance across categories. Save the calendar to `blog/CONTENT-CALENDAR.md`:
   ```markdown
   # Content Calendar

   | Date | Topic | Category | Status |
   |------|-------|----------|--------|
   | YYYY-MM-DD | Topic title | Category | planned/researched/drafted/published |
   ```

5. **Display the calendar** in a clear table.

6. Show backlog stats: total ideas, breakdown by category.

## Content Mix Guidelines

- ~40% educational (Solidity, EVM, L2) — broadest reach
- ~30% practical (tooling, tutorials, how-to) — highest engagement
- ~20% Ethernal-adjacent (explorer concepts, infrastructure) — natural product tie-in
- ~10% opinion/trend (DeFi engineering, security) — thought leadership

Never schedule two posts from the same category back-to-back.
