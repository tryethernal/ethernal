# Refactor

PR-scoped refactoring — only operates on files changed on the current branch vs `develop`.

## Step 1: Detect Changed Files

Get the list of files touched on this branch:

```bash
git diff --name-only develop...HEAD
```

If no files have changed, tell the user "No files changed on this branch — nothing to refactor." and stop.

Split the changed files into two groups:
- **Frontend**: files under `src/`
- **Backend**: files under `run/`

## Step 2: Run jscpd (Duplicate Detection)

Check if `jscpd` is available. If not, install it:

```bash
npx jscpd --version || npm install -D jscpd
```

Run jscpd scoped to changed files only. If there are frontend files, run on `src/`. If there are backend files, run on `run/`. Only scan changed files:

```bash
# For frontend changes
npx jscpd --pattern "file1.vue,file2.vue" src/

# For backend changes
npx jscpd --pattern "file1.js,file2.js" run/
```

If jscpd doesn't support pattern-based filtering for your file set, run it on the parent directories of changed files and only report duplicates that involve at least one changed file.

Skip this step if it finds nothing.

## Step 3: Run knip (Unused Code Detection)

```bash
npx knip
```

knip runs on the full project but **filter its output** to only report issues in changed files. Ignore issues in files that weren't touched on this branch.

Skip this step if no issues are found in changed files.

## Step 4: Fix Issues Found

For each issue found in changed files:
- **Duplicate code**: Extract to shared utility or component
- **Unused files**: Delete them (only if they were added on this branch)
- **Unused dependencies**: Remove from package.json
- **Unused exports**: Remove the export or delete if truly unused

Do NOT fix issues in files that weren't changed on this branch — stay scoped.

## Step 5: Run Code Simplifier

Run the code-simplifier agent (via Task tool with `subagent_type: "code-simplifier:code-simplifier"`) scoped to the changed files. Pass the list of changed files as context so it only simplifies code in those files.

## Step 6: Commit Cleanup

If any changes were made, commit them:

```bash
git add -A
git commit -m "refactor: code quality cleanup"
```

If no issues were found and no changes were made, tell the user "Code looks clean — no refactoring needed." and stop.

## Guidelines

- Stay scoped to branch changes — never modify files that weren't touched on this branch
- Don't over-optimize — focus on clear wins (duplicates, dead code, simplification)
- If jscpd or knip produce too much noise, use judgment to filter to actionable items
