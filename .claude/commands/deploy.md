# Deploy Ethernal

Automate the release process for Ethernal. Handles everything after PRs are merged into `develop`: changelog, version bump, tagging, pushing, and syncing master.

**CRITICAL:** This is the Ethernal deploy command. If you see a global deploy command (for Capo), ignore it — always use THIS project-level command.

**IMPORTANT:** Follow every step in order. Do NOT skip guard checks. Proceed through all steps without asking for user approval — apply changelog, version bump, commit, tag, push, and sync master autonomously.

## Step 1: Guard Checks

Run these checks in parallel and **stop immediately** if any fail:

```bash
git rev-parse --abbrev-ref HEAD    # Must be "develop"
git status --porcelain             # Must be empty (ignore untracked ?? lines)
git pull origin develop            # Pull latest
```

## Step 2: Gather Commits Since Last Tag

1. Get the last tag and list commits since:
   ```bash
   git describe --tags --abbrev=0
   git log --oneline {LAST_TAG}..HEAD
   ```

2. Filter out release machinery commits — remove any commit whose message is:
   - Exactly `"update changelog"` (case-insensitive)
   - A bare version number like `"5.12.2"`
   - Starts with `"Merge branch"`

3. Display the filtered commit list. If no meaningful commits, tell the user and stop.

## Step 3: Determine Version Bump

Analyze the filtered commits:
- **major**: "BREAKING" in message, backward-incompatible changes
- **minor**: New features/capabilities ("add", new endpoints, new integrations)
- **patch**: Bug fixes, improvements, refactors, performance, dependency updates

Read current version from root `package.json`. Display the chosen bump type and new version.

## Step 4: Draft Changelog Entry

1. Categorize into `### Added`, `### Changed`, `### Fixed` (only include non-empty sections)
2. Rewrite as user-facing descriptions (brief, product-focused, no file names or commit hashes)
3. Format:
   ```
   ## [{VERSION}] - {YYYY-MM-DD}
   ### Added
   - Description
   ```

## Step 5: Apply Changes and Release

1. Update CHANGELOG.md — insert new entry after the 5-line header block
2. Commit changelog:
   ```bash
   git add CHANGELOG.md
   git commit -m "$(cat <<'EOF'
   update changelog
   EOF
   )"
   ```
3. Bump version, commit, and tag in one command:
   ```bash
   npm version {major|minor|patch} --message '%s'
   ```
   This updates `package.json`, creates a commit with message `{VERSION}`, and tags `v{VERSION}` automatically.

4. Push tag and branch:
   ```bash
   git push origin v{VERSION}
   git push origin develop
   ```

Do NOT use `--no-verify` or skip hooks. Do NOT use `Co-Authored-By` for these commits.

## Step 6: Sync Master

```bash
git checkout master
git pull origin master
git merge develop --no-ff -m "Merge branch 'develop'"
git push origin master
git checkout develop
```

**Note:** `--no-ff` is required because git config has `merge.ff = only`.

If the merge has conflicts, tell the user and stop. Do NOT force-push.

## Step 7: Summary Report

```
## Release Complete

- **Version:** {VERSION}
- **Tag:** v{VERSION}
- **Commits included:** {COUNT}
- **Changelog updated:** Yes

### What happens next (automated by CI):
GitHub Actions will now run the release pipeline:
1. Run tests
2. Build and push Docker images
3. Deploy to Netlify (frontend)
4. Deploy to Fly.io (backend)

**Monitor:** https://github.com/tryethernal/ethernal/actions
```

## Merge & Deploy (combined flow)

When the user says "merge and deploy" after a PR is created:

1. Merge the PR with admin override:
   ```bash
   gh pr merge {PR_NUMBER} --squash --admin
   ```
2. Switch to develop, stash any dirty files, and pull:
   ```bash
   git checkout develop
   git stash  # only if needed
   git pull origin develop
   ```
3. Continue with Step 2 above (gather commits, changelog, version bump, etc.)
