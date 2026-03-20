# Tweet Pipeline Isolation Design

**Date:** 2026-03-20
**Problem:** Blog and tweet pipelines share `/opt/ethernal-blog-stack/` (single git checkout). Both run `git fetch/pull/reset` on startup. Tweet pipeline runs 5x/day, blog every 2 days. Concurrent git operations cause `index.lock` conflicts (see GitHub issue #780).

**Solution:** Deploy tweet pipeline as a standalone directory (`/opt/tweet-pipeline/`) with no `.git`. Replace local blog file reads with GitHub API calls. Add a deploy script for pushing changes to the server.

## Architecture

### Before
```
/opt/ethernal-blog-stack/          (single git clone, shared)
  blog/pipeline/draft.sh           (blog pipeline - git pull on startup)
  tweet-pipeline/draft.sh          (tweet pipeline - git fetch/reset on startup)
  tweet-pipeline/publish.sh
  tweet-pipeline/promote-blog.sh   (reads blog/src/content/blog/*.md locally)
  tweet-pipeline/lib/source-selector.js  (reads blog dir via readdirSync)
```

### After
```
/opt/ethernal-blog-stack/          (git clone, blog pipeline only)
  blog/pipeline/draft.sh           (unchanged)

/opt/tweet-pipeline/               (standalone, no .git)
  draft.sh                         (no git operations, no npm ci)
  publish.sh                       (no changes beyond path, calls promote-blog.sh)
  promote-blog.sh                  (reads blog via GitHub API)
  engagement-bridge.sh             (script logic unchanged, service paths updated)
  scan-newsletter.sh               (remove unused REPO_DIR)
  lib/source-selector.js           (reads blog via GitHub API, with temp file cache)
  lib/twitter.js                   (unchanged)
  prompts/                         (unchanged)
  mcp.json, package.json, etc.     (unchanged)
```

## Prerequisites

- **`gh` CLI authentication on Hetzner server**: The server already has `gh` authenticated (used for `report_failure` in all scripts). After isolation, `gh api` calls are on the critical path for source selection and blog promotion, so auth must be verified before cutover. Confirm with: `ssh blog@157.90.154.200 "gh auth status"`.

## Changes

### 1. Deploy script (`tweet-pipeline/deploy.sh`)

New script in the repo that rsyncs the tweet pipeline to the server:

```bash
#!/usr/bin/env bash
set -euo pipefail
rsync -avz --delete \
  --exclude='.promoted-articles' \
  --exclude='.newsletter-source.json' \
  --exclude='.blog-candidate.json' \
  --exclude='.processed-threads' \
  --exclude='.source.json' \
  --exclude='.research.md' \
  --exclude='.draft.json' \
  --exclude='node_modules' \
  tweet-pipeline/ blog@157.90.154.200:/opt/tweet-pipeline/
ssh blog@157.90.154.200 "cd /opt/tweet-pipeline && npm ci --silent && npx playwright install chromium --with-deps"
```

State files and mid-run working files are excluded from rsync to preserve server state and avoid disrupting in-progress runs. Playwright chromium binary is installed on deploy to stay in sync with `package.json` version bumps.

### 2. Remove git operations from tweet pipeline scripts

**`draft.sh`:**
- Remove `REPO_DIR` variable (line 8)
- Remove `cd "$REPO_DIR"` (line 93)
- Remove `git fetch origin develop` (line 97)
- Remove `git reset --hard origin/develop` (line 98)
- Remove `cd tweet-pipeline` and `npm ci` (lines 101-102) -- deps are installed at deploy time, not on every run
- Fix blog cover image path (line 374-383): replace `$REPO_DIR/blog/public/images/${SLUG}.png` with a download from the live site:
  ```bash
  TMPIMG=$(mktemp --suffix=.webp)
  for EXT in webp png jpg; do
    if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
      IMAGE_PATH="$TMPIMG"
      break
    fi
  done
  ```

**`promote-blog.sh`:**
- Remove `REPO_DIR`, `BLOG_DIR`, `IMAGE_DIR` variables (lines 7, 10, 11)
- Remove `cd "$REPO_DIR"` and git fetch/merge block (lines 59-61)
- Replace local file scan (lines 71-98) with GitHub API calls:
  - List blog files: `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog --jq '.[].name'`
  - Fetch each file's content: `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog/{filename} --jq '.content' | tr -d '\n' | base64 -d`
  - Parse frontmatter with the same grep/sed logic
- Replace local cover image read (lines 132-139) with download from live site, trying webp first:
  ```bash
  TMPIMG=$(mktemp)
  for EXT in webp png jpg; do
    if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
      COVER_IMAGE="$TMPIMG"
      break
    fi
  done
  ```

**`scan-newsletter.sh`:**
- Remove `REPO_DIR` variable (line 7) -- unused but references the old path

**`publish.sh`:**
- No code changes needed. It calls `"$SCRIPT_DIR/promote-blog.sh"` which resolves correctly from `/opt/tweet-pipeline/`. Only the systemd service paths change.

### 3. Refactor `source-selector.js` to use GitHub API with caching

Replace `fetchBlogArticles()` and `fetchPublishedBlogTitles()` filesystem reads with GitHub API calls. Use the Git Trees API to fetch all blog files in a single request, and cache results in a temp file to avoid repeated API calls across multiple `node -e` invocations within a single `draft.sh` run.

```javascript
import { tmpdir } from 'node:os';

const BLOG_CACHE_FILE = join(tmpdir(), 'tweet-pipeline-blog-cache.json');
const BLOG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Fetches blog articles from GitHub API with temp file caching.
 * Uses the Git Trees API to fetch the directory listing in one call,
 * then fetches individual files for content.
 * Cache is shared across node invocations within the same draft.sh run.
 */
function fetchBlogFilesFromGitHub() {
    // Check cache first
    try {
        const stat = statSync(BLOG_CACHE_FILE);
        if (Date.now() - stat.mtimeMs < BLOG_CACHE_TTL_MS) {
            return JSON.parse(readFileSync(BLOG_CACHE_FILE, 'utf-8'));
        }
    } catch { /* no cache or expired */ }

    try {
        // List .md files via Contents API
        const listing = execSync(
            'gh api repos/tryethernal/ethernal/contents/blog/src/content/blog' +
            ' --jq \'[.[] | select(.name | endswith(".md")) | .name]\'',
            { encoding: 'utf-8', timeout: 15000 }
        );
        const filenames = JSON.parse(listing);
        const articles = [];

        for (const filename of filenames) {
            const content = execSync(
                `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog/${filename}` +
                ` --jq '.content' | tr -d '\\n' | base64 -d`,
                { encoding: 'utf-8', timeout: 10000 }
            );
            const parsed = parseArticleFrontmatter(content, filename);
            if (parsed) articles.push(parsed);
        }

        // Write cache
        writeFileSync(BLOG_CACHE_FILE, JSON.stringify(articles));
        return articles;
    } catch {
        return [];
    }
}
```

- `fetchBlogArticles()` calls `fetchBlogFilesFromGitHub()` then applies the 48h cutoff filter
- `fetchPublishedBlogTitles()` calls `fetchBlogFilesFromGitHub()` then applies the days cutoff filter
- `REPO_ROOT` and `BLOG_DIR` constants removed
- `parseArticleFrontmatter()` and all dedup logic unchanged
- Add `statSync`, `writeFileSync` to the `fs` import

### 4. Update systemd services

All tweet pipeline services update paths:

- `ExecStart`: `/opt/ethernal-blog-stack/tweet-pipeline/...` to `/opt/tweet-pipeline/...`
- `WorkingDirectory`: `/opt/ethernal-blog-stack` to `/opt/tweet-pipeline`

Affected services:
- `tweet-draft.service`
- `tweet-publish.service`
- `tweet-engagement.service`
- `scan-newsletter.service`

### 5. Update DEPLOY.md

Update all paths in `tweet-pipeline/DEPLOY.md` to reference `/opt/tweet-pipeline/` and document the new `deploy.sh` workflow.

## What doesn't change

- Blog pipeline (`blog/pipeline/`) is untouched -- keeps its git clone at `/opt/ethernal-blog-stack/`
- Tweet queue directory (`/home/blog/tweet-queue/`) stays the same
- Env file (`/opt/blog-pipeline.env`) stays shared -- both pipelines read from it
- Claude auth (`/home/blog/.claude-key`) stays shared
- All timer schedules unchanged
- All prompts unchanged
- Twitter posting logic unchanged
- PostHog tracking unchanged

## Deployment steps

1. Make all code changes in a branch, merge to `develop`
2. Verify `gh` auth on server: `ssh blog@157.90.154.200 "gh auth status"`
3. Create target directory: `ssh blog@157.90.154.200 "mkdir -p /opt/tweet-pipeline"`
4. Deploy to server: `bash tweet-pipeline/deploy.sh`
5. SSH to server and update systemd services:
   ```bash
   cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer
   ```
6. Verify: `systemctl --user status tweet-draft.timer`
7. Test a manual draft run: `/opt/tweet-pipeline/draft.sh 1`
8. Close GitHub issue #780
9. Clean up `/opt/ethernal-blog-stack/tweet-pipeline/` (no longer used by any service)

## Risk

- **GitHub API latency**: `fetchBlogFilesFromGitHub()` makes 1 listing + N file fetches (~10-16 serial HTTP requests at ~200-500ms each). With the 5-minute temp file cache, this overhead only occurs once per `draft.sh` run (not 2-3x). Adds 2-8 seconds total, acceptable for a pipeline that runs Claude for minutes.
- **GitHub API rate limits**: ~15 API calls per cache miss, at most 5 cache misses/day = ~75 calls/day. GitHub allows 5,000/hour for authenticated users. No risk.
- **Blog content freshness**: GitHub API reads from `develop` branch (default). Blog pipeline pushes drafts to `develop`. So the tweet pipeline sees new articles as soon as they're pushed. Same freshness as the current `git pull` approach.
- **Cover image availability**: Downloaded from the live site. If an article is published but not yet deployed, the image won't be available. This is the same as the current behavior (promote-blog.sh already checks the live URL before promoting).
- **Deploy during active run**: `rsync --delete` excludes state files and mid-run working files (`.source.json`, `.research.md`, `.draft.json`). The flock in `draft.sh` does not protect against external rsync, but the exclusion list covers all known working files. Risk is minimal.
