# Deploy Ethernal

Automate the release process for Ethernal. This command handles everything after PRs are merged into `develop`: changelog, version bump, tagging, pushing, and syncing master.

**IMPORTANT:** Follow every step in order. Do NOT skip guard checks. Do NOT commit or push without explicit user approval.

## Step 1: Guard Checks

Run these checks and **stop immediately** if any fail:

1. Confirm current branch is `develop`:
   ```bash
   git rev-parse --abbrev-ref HEAD
   ```
   If not `develop`, tell the user: "You must be on the `develop` branch to deploy. Current branch: {branch}" and stop.

2. Confirm working tree is clean:
   ```bash
   git status --porcelain
   ```
   If there's output, tell the user: "Working tree is not clean. Please commit or stash changes first." and stop.

3. Pull latest from origin:
   ```bash
   git pull origin develop
   ```

## Step 2: Gather Commits Since Last Tag

1. Get the last tag:
   ```bash
   git describe --tags --abbrev=0
   ```

2. List commits since that tag:
   ```bash
   git log --oneline {LAST_TAG}..HEAD
   ```

3. Filter out release machinery commits — remove any commit whose message is:
   - Exactly `"update changelog"` (case-insensitive)
   - A bare version number like `"5.12.2"`
   - Starts with `"Merge branch"`

4. Display the filtered commit list to the user. If there are no meaningful commits, tell the user there's nothing to release and stop.

## Step 3: Determine Version Bump

Analyze the filtered commits to determine the semver bump:
- **major**: Commits with "BREAKING" in the message, major API removals, or backward-incompatible changes
- **minor**: Commits that add new features or capabilities (new endpoints, new components, new integrations, "add" in message)
- **patch**: Bug fixes, improvements, refactors, performance changes, dependency updates

**IMPORTANT:** Read the current version from root `package.json`, NOT from git tags (there is an orphaned v5.13.0 tag that is ahead of the actual version).

Display the chosen bump type and the resulting new version number to the user. Do not ask — just inform them. Example: "Version bump: patch (5.12.2 → 5.12.3)"

## Step 4: Draft Changelog Entry

1. Categorize the filtered commits into these sections (only include sections that have entries):
   - `### Added` — new features, new endpoints, new integrations
   - `### Changed` — improvements, refactors, behavior changes, dependency updates
   - `### Fixed` — bug fixes

2. Rewrite each commit as a user-facing description:
   - Match the tone of existing CHANGELOG.md entries (brief, product-focused)
   - Don't mention internal details, file names, or implementation specifics
   - Group related commits into a single entry when appropriate
   - Don't include commit hashes

3. Format the entry:
   ```
   ## [{VERSION}] - {YYYY-MM-DD}
   ### Added
   - Description of new feature

   ### Changed
   - Description of change

   ### Fixed
   - Description of fix
   ```

4. Show the draft to the user and ask for approval. The user may edit the draft or ask for changes. Do NOT proceed until the user approves.

## Step 5: Apply Changes

1. Read the current CHANGELOG.md
2. Insert the new entry after line 5 (after the 5-line header block: title, description, blank line, format link, semver link). Add a blank line before the new entry if needed.
3. Update the `"version"` field in the root `package.json` (NOT `run/package.json`)

## Step 6: Commit, Tag, and Push

Execute these commands in sequence. Each must succeed before the next:

```bash
# Commit changelog
git add CHANGELOG.md
git commit -m "update changelog"

# Commit version bump
git add package.json
git commit -m "{VERSION}"

# Create annotated tag
git tag -a v{VERSION} -m "{VERSION}"

# Push tag first, then branch
git push origin v{VERSION}
git push origin develop
```

**Use a heredoc for commit messages** to ensure proper formatting:
```bash
git commit -m "$(cat <<'EOF'
update changelog
EOF
)"
```

Do NOT use `--no-verify` or skip any hooks. Do NOT use `Co-Authored-By` for these commits — they follow the project's existing convention of simple messages.

## Step 7: Sync Master

```bash
git checkout master
git pull origin master
git merge develop -m "Merge branch 'develop'"
git push origin master
git checkout develop
```

If the merge has conflicts, tell the user and stop. Do NOT force-push or use `--force`.

## Step 8: Summary Report

Display a summary:

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
