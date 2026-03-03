# Wrapup Ethernal

End-of-session cleanup that runs refactoring, documentation updates, and creates a PR.

**CRITICAL:** This is the Ethernal project wrapup command. It creates a PR — it does NOT deploy. Use `/deploy` after merge to release. If you see a global wrapup command (for Capo), ignore it — always use THIS project-level command.

**IMPORTANT:** Execute all steps in order without asking for user approval between steps.

## Step 1: Refactor

Run the `/refactor` command to clean up code scoped to this branch's changes:

1. Detect files changed on this branch vs `develop`
2. Run `jscpd` scoped to changed files
3. Run `knip` filtered to changed files
4. Fix any issues found
5. Run code-simplifier on changed files
6. Commit refactoring changes (if any)

## Step 2: Update CLAUDE.md

Run the `/update-claudemd` command to update documentation:

1. Review recent changes and their impact
2. Update CLAUDE.md with new patterns, conventions, or architecture changes
3. Commit documentation updates (if any)

## Step 3: Create PR

Create a pull request targeting `develop`:

1. Get all commits on this branch vs develop:
   ```bash
   git log --oneline develop..HEAD
   ```

2. Check if branch is pushed to remote:
   ```bash
   git rev-parse --abbrev-ref --symbolic-full-name @{u} 2>/dev/null
   ```
   If not tracking a remote branch, push it:
   ```bash
   git push -u origin $(git rev-parse --abbrev-ref HEAD)
   ```
   If already tracking but behind remote, push:
   ```bash
   git push
   ```

3. Generate PR title and body from the branch commits. Keep the title under 70 characters. Use this format:
   ```bash
   gh pr create --title "PR title here" --body "$(cat <<'EOF'
   ## Summary
   - Bullet points summarizing the changes

   ## Test plan
   - [ ] Relevant test steps

   🤖 Generated with [Claude Code](https://claude.com/claude-code)
   EOF
   )"
   ```

4. Display the PR URL to the user.

## Step 4: Summary

Display a summary:

```
## Wrapup Complete

- **Refactoring**: {what was done, or "No changes needed"}
- **CLAUDE.md**: {what was updated, or "No updates needed"}
- **PR**: {PR URL}

### Next steps:
1. Review the PR
2. Merge to `develop`
3. Run `/deploy` from `develop` to release
```

## Usage

Run this command when:
- A feature or fix is complete on a feature branch
- Before handing off work or ending a coding session
- You want to clean up and get a PR ready in one step
