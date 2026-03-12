---
description: Capture editorial feedback, update learning system, and revise the draft
user_input: feedback
---

# Blog Feedback

Process feedback on the current draft, update the learning system, and revise.

## Workflow

1. **Capture feedback** — The user's feedback is: "$ARGUMENTS"

   If no explicit feedback text, look at the most recent user messages in the conversation for feedback on the current draft.

2. **Log the feedback** — Append to the memory file at `~/.claude/projects/-Users-antoine-ethernal-ethernal/memory/blog-feedback-log.md`. Create it if it doesn't exist, using this format:
   ```markdown
   ---
   name: blog-feedback-log
   description: Cumulative editorial feedback log for blog articles
   type: feedback
   ---

   ## Feedback Log

   ### YYYY-MM-DD — Article Title
   - **Feedback:** user's feedback
   - **Theme:** tone | structure | length | technical depth | Ethernal mentions | style | accuracy
   ```

3. **Check for patterns** — Review the full feedback log. If any theme appears 3+ times, it's a pattern. Save a new memory file documenting the pattern as a writing rule, and update MEMORY.md.

4. **Revise the draft** — Apply the feedback to the current draft. Read the article from `blog/src/content/blog/<slug>.md`, make changes, and save.

5. **Show diff summary** — Briefly describe what changed and why.

6. **Track metrics** — Note the revision count for this article.

## Feedback Categories

| Theme | What it means |
|-------|--------------|
| tone | Voice doesn't match target (too formal, too casual, too salesy) |
| structure | Flow, organization, or pacing issues |
| length | Too long, too short, or section imbalance |
| technical depth | Too shallow or too deep for target audience |
| Ethernal mentions | Product references feel forced or are missing |
| style | Word choice, sentence structure, formatting |
| accuracy | Factual or technical errors |
