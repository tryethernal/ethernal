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
  draft.sh                         (no git operations)
  publish.sh                       (no git operations)
  promote-blog.sh                  (reads blog via GitHub API)
  engagement-bridge.sh             (unchanged, already standalone)
  scan-newsletter.sh               (remove unused REPO_DIR)
  lib/source-selector.js           (reads blog via GitHub API)
  lib/twitter.js                   (unchanged)
  prompts/                         (unchanged)
  mcp.json, package.json, etc.     (unchanged)
```

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
  --exclude='node_modules' \
  tweet-pipeline/ blog@157.90.154.200:/opt/tweet-pipeline/
ssh blog@157.90.154.200 "cd /opt/tweet-pipeline && npm ci --silent"
```

State files (`.promoted-articles`, `.newsletter-source.json`, `.blog-candidate.json`, `.processed-threads`) are excluded from rsync to preserve server state across deploys.

### 2. Remove git operations from tweet pipeline scripts

**`draft.sh`:**
- Remove `REPO_DIR` variable (line 8)
- Remove `cd "$REPO_DIR"` (line 93)
- Remove `git fetch origin develop` (line 97)
- Remove `git reset --hard origin/develop` (line 98)
- Change `cd tweet-pipeline` (line 101) to `cd "$SCRIPT_DIR"` (already in the right directory)
- `npm ci` stays (runs from `/opt/tweet-pipeline/`)

**`promote-blog.sh`:**
- Remove `REPO_DIR`, `BLOG_DIR`, `IMAGE_DIR` variables (lines 7, 10, 11)
- Remove `cd "$REPO_DIR"` and git fetch/merge block (lines 59-61)
- Replace local file scan (lines 71-98) with GitHub API calls:
  - List blog files: `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog --jq '.[].name'`
  - Fetch each file's content: `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog/{filename} --jq '.content' | base64 -d`
  - Parse frontmatter with the same grep/sed logic
- Replace local cover image read (lines 132-139) with download from live site:
  - `curl -sf "https://tryethernal.com/blog/images/${SLUG}.webp" -o "$TMPDIR/${SLUG}.webp"`
  - Fall back to `.png`, `.jpg` if `.webp` not found

**`scan-newsletter.sh`:**
- Remove `REPO_DIR` variable (line 7) -- unused but references the old path

### 3. Refactor `source-selector.js` to use GitHub API

Replace `fetchBlogArticles()` and `fetchPublishedBlogTitles()` filesystem reads with GitHub API calls:

```javascript
function fetchBlogFilesFromGitHub() {
    try {
        const listing = execSync(
            'gh api repos/tryethernal/ethernal/contents/blog/src/content/blog --jq "[.[] | select(.name | endswith(\\".md\\")) | .name]"',
            { encoding: 'utf-8', timeout: 15000 }
        );
        const filenames = JSON.parse(listing);
        const articles = [];

        for (const filename of filenames) {
            const content = execSync(
                `gh api repos/tryethernal/ethernal/contents/blog/src/content/blog/${filename} --jq '.content' | base64 -d`,
                { encoding: 'utf-8', timeout: 10000 }
            );
            const parsed = parseArticleFrontmatter(content, filename);
            if (parsed) articles.push(parsed);
        }

        return articles;
    } catch {
        return [];
    }
}
```

- `fetchBlogArticles()` calls `fetchBlogFilesFromGitHub()` then applies the 48h cutoff filter
- `fetchPublishedBlogTitles()` calls `fetchBlogFilesFromGitHub()` then applies the days cutoff filter
- `BLOG_DIR` constant removed
- `parseArticleFrontmatter()` and all dedup logic unchanged

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

1. Make all code changes in a branch
2. Deploy to server: `bash tweet-pipeline/deploy.sh`
3. SSH to server and update systemd services:
   ```bash
   cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/
   systemctl --user daemon-reload
   systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer
   ```
4. Verify: `systemctl --user status tweet-draft.timer`
5. Close GitHub issue #780
6. Optionally clean up `/opt/ethernal-blog-stack/tweet-pipeline/` (no longer used by any service)

## Risk

- **GitHub API rate limits**: The tweet pipeline makes at most ~15 API calls per source selection (list + fetch each file). At 5 runs/day, that's ~75 calls/day. GitHub allows 5,000/hour for authenticated users. No risk.
- **Blog content freshness**: GitHub API reads from `develop` branch (default). Blog pipeline pushes drafts to `develop`. So the tweet pipeline sees new articles as soon as they're pushed. Same freshness as the current `git pull` approach.
- **Cover image availability**: Downloaded from the live site. If an article is published but not yet deployed, the image won't be available. This is the same as the current behavior (promote-blog.sh already checks the live URL before promoting).
