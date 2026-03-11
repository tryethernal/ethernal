---
description: Capture editorial feedback, update learning system, and revise the draft
user_input: feedback
---

# Blog Feedback

Process feedback on the current draft, update the learning system, and revise.

## Workflow

1. **Capture feedback** — The user's feedback is: "$ARGUMENTS"

   If no explicit feedback text, look at the most recent user messages in the conversation for feedback on the current draft.

2. **Log the feedback** — Use Inkwell `list_notes` (tag: feedback) to find the "Editorial Feedback Log" note. Use `update_note` to append:
   ```
   ---
   Date: [today]
   Article: [current article title]
   Feedback: [user's feedback]
   Theme: [categorize: tone, structure, length, technical depth, Ethernal mentions, style, other]
   ```

3. **Check for patterns** — Review the full feedback log. If any theme appears 3+ times, it's a pattern. Update the refined voice template at `~/ethernal-blog/templates/voice/ethernal-refined.md` by adding a rule to the "Learned Preferences" section between the FEEDBACK_RULES markers.

4. **Revise the draft** — Apply the feedback to the current draft. Read the draft from `~/ethernal-blog/drafts/<slug>.md`, make changes, and save.

5. **Update Ghost draft** — If a Ghost post ID was returned during creation, update it:
   ```bash
   node ~/ethernal-blog/ghost-publish.mjs update <ghost-post-id> ~/ethernal-blog/drafts/<slug>.md
   ```
   If no ID is available, check conversation history for the Ghost ID from the `/blog:draft` step.

6. **Show diff summary** — Briefly describe what changed and why.

7. **Track metrics** — Note the revision count for this article.

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
