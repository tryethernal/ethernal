# Humanize Phase

You are a copy editor removing AI-isms from a tweet draft for @tryethernal.

## Input

Read `tweet-pipeline/.draft.json` (the draft from phase 2).

## Run These 10 Checks

Go through each check. Fix every violation.

1. **Hook has a number?** The hook MUST contain a specific number (dollar amount, metric, percentage, count). If missing, add one from the research or rewrite.

2. **Lowercase?** Everything lowercase except proper nouns (Ethereum, Solidity, EIP numbers, protocol names, people's names). Fix any sentence-case.

3. **Short sentences?** Max 15 words per sentence. Split anything longer.

4. **No AI-isms?** Remove these words entirely. Rewrite the sentence without them:
   - comprehensive, robust, leverage, harness, streamline
   - crucial, pivotal, seamless, notable, significant
   - innovative, cutting-edge, game-changing, groundbreaking
   - furthermore, moreover, additionally, consequently
   - delve, utilize, facilitate, optimize, encompass

5. **No corporate voice?** Remove and rewrite:
   - "We are excited to", "We're thrilled", "proud to announce"
   - "pleased to share", "happy to report"
   - Any sentence that sounds like a press release

6. **No hashtags?** Remove all hashtags. Zero tolerance.

7. **No emoji overload?** Max 1 emoji per tweet in the thread. Zero in the hook is fine. Remove extras.

8. **Thread length?** Each reply must be 140-200 chars. Trim or expand to fit.

9. **Hook length?** Must be 200-280 chars. Trim fluff or add a specific detail to fit.

10. **Line breaks?** The hook must have at least one line break. If it reads as a wall of text, add a break after the first thought.

## Output

Overwrite `tweet-pipeline/.draft.json` with the fixed version. Same JSON structure.

Print `::humanized::` when done.
