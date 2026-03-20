# Tweet Pipeline Isolation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Separate the tweet pipeline from the shared git checkout so it runs standalone at `/opt/tweet-pipeline/`, eliminating git lock conflicts with the blog pipeline.

**Architecture:** Remove all git operations from tweet pipeline scripts. Replace local filesystem reads of blog content with GitHub API calls (cached per run). Deploy via rsync instead of git pull.

**Tech Stack:** Bash, Node.js (ESM), GitHub CLI (`gh api`), rsync, systemd

**Spec:** `docs/superpowers/specs/2026-03-20-tweet-pipeline-isolation-design.md`

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `tweet-pipeline/draft.sh` | Remove git ops, npm ci, fix blog_cover image path |
| Modify | `tweet-pipeline/promote-blog.sh` | Replace local file scan with GitHub API |
| Modify | `tweet-pipeline/scan-newsletter.sh` | Remove unused REPO_DIR |
| Modify | `tweet-pipeline/lib/source-selector.js` | Replace readdirSync with GitHub API + cache |
| Modify | `tweet-pipeline/lib/source-selector.test.js` | Update tests for new GitHub API functions |
| Modify | `tweet-pipeline/tweet-draft.service` | Update paths |
| Modify | `tweet-pipeline/tweet-publish.service` | Update paths |
| Modify | `tweet-pipeline/tweet-engagement.service` | Update paths |
| Modify | `tweet-pipeline/scan-newsletter.service` | Update paths |
| Modify | `tweet-pipeline/DEPLOY.md` | Update all paths and document deploy.sh |
| Create | `tweet-pipeline/deploy.sh` | Rsync pipeline to server |

---

### Task 1: Create deploy.sh

**Files:**
- Create: `tweet-pipeline/deploy.sh`

- [ ] **Step 1: Create the deploy script**

```bash
#!/usr/bin/env bash
# Deploy tweet pipeline to Hetzner server as standalone directory
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "Deploying tweet pipeline to 157.90.154.200:/opt/tweet-pipeline/..."

rsync -avz --delete \
  --exclude='.promoted-articles' \
  --exclude='.newsletter-source.json' \
  --exclude='.blog-candidate.json' \
  --exclude='.processed-threads' \
  --exclude='.source.json' \
  --exclude='.research.md' \
  --exclude='.draft.json' \
  --exclude='node_modules' \
  "$SCRIPT_DIR/" blog@157.90.154.200:/opt/tweet-pipeline/

echo "Installing dependencies..."
ssh blog@157.90.154.200 "cd /opt/tweet-pipeline && npm ci --silent && npx playwright install chromium --with-deps"

echo "Done. Run the following on the server to update systemd units:"
echo "  cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/"
echo "  systemctl --user daemon-reload"
echo "  systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer"
```

- [ ] **Step 2: Make it executable**

Run: `chmod +x tweet-pipeline/deploy.sh`

- [ ] **Step 3: Commit**

```bash
git add tweet-pipeline/deploy.sh
git commit -m "feat(tweet-pipeline): add deploy.sh for standalone server deployment"
```

---

### Task 2: Remove git operations from draft.sh

**Files:**
- Modify: `tweet-pipeline/draft.sh`

- [ ] **Step 1: Remove REPO_DIR variable**

Delete line 8:
```bash
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
```

- [ ] **Step 2: Replace git pull block and npm ci with cd to SCRIPT_DIR**

Replace lines 93-102:
```bash
cd "$REPO_DIR"

# Pull latest
log "Pulling latest changes..."
git fetch origin develop 2>&1 | tee -a "$LOG_FILE"
git reset --hard origin/develop 2>&1 | tee -a "$LOG_FILE"

# Install pipeline deps
cd tweet-pipeline
npm ci --silent 2>&1 | tee -a "$LOG_FILE"
```

With:
```bash
cd "$SCRIPT_DIR"
```

- [ ] **Step 3: Replace blog_cover image path with live site download**

Replace lines 374-383:
```bash
  if [ "$IMAGE_TYPE" = "blog_cover" ]; then
    # Use existing blog cover image
    SLUG=$(echo "$IMAGE_SPEC" | jq -r '.slug // empty')
    COVER_PATH="$REPO_DIR/blog/public/images/${SLUG}.png"
    if [ -f "$COVER_PATH" ]; then
      IMAGE_PATH="$COVER_PATH"
      log "Using blog cover image: $IMAGE_PATH"
    else
      log "WARNING: Blog cover not found at $COVER_PATH — continuing without image"
    fi
```

With:
```bash
  if [ "$IMAGE_TYPE" = "blog_cover" ]; then
    # Download blog cover image from live site
    SLUG=$(echo "$IMAGE_SPEC" | jq -r '.slug // empty')
    TMPIMG=$(mktemp /tmp/tweet-cover-XXXXXX)
    FOUND_COVER=false
    for EXT in webp png jpg; do
      if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
        IMAGE_PATH="$TMPIMG"
        FOUND_COVER=true
        log "Downloaded blog cover image: ${SLUG}.${EXT}"
        break
      fi
    done
    if [ "$FOUND_COVER" = "false" ]; then
      rm -f "$TMPIMG"
      log "WARNING: Blog cover not found on live site for $SLUG — continuing without image"
    fi
```

- [ ] **Step 4: Verify the script parses correctly**

Run: `bash -n tweet-pipeline/draft.sh`
Expected: No output (clean parse)

- [ ] **Step 5: Commit**

```bash
git add tweet-pipeline/draft.sh
git commit -m "feat(tweet-pipeline): remove git ops and npm ci from draft.sh

Replace blog_cover local path with live site download.
Dependencies are now installed at deploy time via deploy.sh."
```

---

### Task 3: Refactor source-selector.js to use GitHub API

**Files:**
- Modify: `tweet-pipeline/lib/source-selector.js`
- Modify: `tweet-pipeline/lib/source-selector.test.js`

- [ ] **Step 1: Update imports in source-selector.js**

Replace line 8:
```javascript
import { readFileSync, readdirSync } from 'node:fs';
```
With:
```javascript
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
```

- [ ] **Step 2: Replace REPO_ROOT and BLOG_DIR constants with cache constants**

Replace lines 13-14:
```javascript
const REPO_ROOT = resolve(__dirname, '..', '..');
const BLOG_DIR = join(REPO_ROOT, 'blog', 'src', 'content', 'blog');
```
With:
```javascript
const BLOG_CACHE_FILE = join(tmpdir(), 'tweet-pipeline-blog-cache.json');
const BLOG_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
```

- [ ] **Step 3: Add fetchBlogFilesFromGitHub function**

Add after the `BLOG_CACHE_TTL_MS` line:

```javascript
/**
 * Fetches published blog articles from GitHub API with temp file caching.
 * Lists .md files in the blog content directory, fetches each file's content,
 * and parses frontmatter. Results are cached for 5 minutes to avoid repeated
 * API calls across multiple node invocations within a single draft.sh run.
 * @returns {Array<{title: string, description: string, slug: string, date: Date, tags: string[]}>}
 */
function fetchBlogFilesFromGitHub() {
    // Check cache first
    try {
        const stat = statSync(BLOG_CACHE_FILE);
        if (Date.now() - stat.mtimeMs < BLOG_CACHE_TTL_MS) {
            const cached = JSON.parse(readFileSync(BLOG_CACHE_FILE, 'utf-8'));
            // Restore Date objects from JSON serialization
            return cached.map(a => ({ ...a, date: new Date(a.date) }));
        }
    } catch { /* no cache or expired */ }

    try {
        const listing = execSync(
            'gh api repos/tryethernal/ethernal/contents/blog/src/content/blog' +
            " --jq '[.[] | select(.name | endswith(\".md\")) | .name]'",
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

- [ ] **Step 4: Replace fetchBlogArticles to use GitHub API**

Replace the existing `fetchBlogArticles()` function (lines 308-327):
```javascript
/**
 * Reads published blog articles, excluding those published in the last 48h
 * (promo tweet covers them). Uses GitHub API instead of local filesystem.
 * @returns {Array<{title: string, description: string, slug: string, date: Date, tags: string[]}>}
 */
function fetchBlogArticles() {
    try {
        const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);
        return fetchBlogFilesFromGitHub().filter(a => a.date <= cutoff);
    } catch {
        return [];
    }
}
```

- [ ] **Step 5: Replace fetchPublishedBlogTitles to use GitHub API**

Replace the existing `fetchPublishedBlogTitles()` function (lines 231-249):
```javascript
/**
 * Returns titles of published blog articles from the last N days.
 * Used by the dedup check in draft.sh to cross-reference against blog content.
 * @param {number} [days=60] - How many days back to look.
 * @returns {string[]} Array of article titles.
 */
export function fetchPublishedBlogTitles(days = 60) {
    try {
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
        return fetchBlogFilesFromGitHub()
            .filter(a => a.date >= cutoff)
            .map(a => a.title);
    } catch {
        return [];
    }
}
```

- [ ] **Step 6: Update the `selectSource('blog')` test**

The test at line 116-122 calls `selectSource('blog', [])` which now invokes `fetchBlogFilesFromGitHub()` and makes real `gh api` calls. Since `fetchBlogArticles()` gracefully returns `[]` on failure (which falls back to feature tips), the test still passes but is now testing the fallback path in environments without `gh` auth. Update the test comment to reflect this:

In `tweet-pipeline/lib/source-selector.test.js`, replace lines 116-122:
```javascript
        it('returns a blog source when sourceType is blog', () => {
            // This reads actual files from disk; just verify it returns something
            const result = selectSource('blog', []);
            // May return a blog article or fall back to features
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
        });
```
With:
```javascript
        it('returns a blog source when sourceType is blog', () => {
            // Uses GitHub API (falls back to feature tips without gh auth)
            const result = selectSource('blog', []);
            // Returns a blog article or falls back to features
            assert.ok(result !== null);
            assert.ok(typeof result.title === 'string');
        });
```

Run: `cd tweet-pipeline && node --test lib/source-selector.test.js`
Expected: All existing tests pass (blog test exercises fallback path in local env)

- [ ] **Step 7: Commit**

```bash
git add tweet-pipeline/lib/source-selector.js
git commit -m "feat(tweet-pipeline): replace local blog reads with GitHub API

fetchBlogArticles() and fetchPublishedBlogTitles() now use gh api
to fetch blog content from GitHub instead of reading local filesystem.
Results are cached in /tmp for 5 minutes to avoid repeated API calls
across multiple node invocations within a single draft.sh run."
```

---

### Task 4: Refactor promote-blog.sh to use GitHub API

**Files:**
- Modify: `tweet-pipeline/promote-blog.sh`

- [ ] **Step 1: Remove REPO_DIR, BLOG_DIR, IMAGE_DIR variables and git operations**

Delete these 3 lines (7, 10, 11), keeping SCRIPT_DIR/ENV_FILE/PROMPTS_DIR:

Delete line 7:
```bash
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
```

Delete line 10:
```bash
BLOG_DIR="$REPO_DIR/blog/src/content/blog"
```

Delete line 11:
```bash
IMAGE_DIR="$REPO_DIR/blog/public/images"
```

- [ ] **Step 2: Remove git fetch/merge block**

Delete lines 58-61:
```bash
# Pull latest to get updated articles and images
cd "$REPO_DIR"
git fetch origin develop 2>&1 | tee -a "$LOG_FILE" || true
git merge --ff-only FETCH_HEAD 2>&1 | tee -a "$LOG_FILE" || log "WARNING: git merge failed — using existing checkout"
```

- [ ] **Step 3: Replace local file scan with GitHub API**

Replace lines 69-98 (the `# Scan for published articles` block through frontmatter extraction):

```bash
# Scan for published articles via GitHub API
PROMOTED=0

# List blog markdown files from GitHub
BLOG_FILES=$(gh api repos/tryethernal/ethernal/contents/blog/src/content/blog \
  --jq '[.[] | select(.name | endswith(".md")) | .name] | .[]' 2>/dev/null) || {
  log "WARNING: Failed to list blog files from GitHub API"
  BLOG_FILES=""
}

for FILENAME in $BLOG_FILES; do
  # Fetch file content from GitHub API
  ARTICLE_CONTENT=$(gh api "repos/tryethernal/ethernal/contents/blog/src/content/blog/${FILENAME}" \
    --jq '.content' 2>/dev/null | tr -d '\n' | base64 -d 2>/dev/null) || continue

  # Check status: published
  STATUS=$(echo "$ARTICLE_CONTENT" | grep '^status:' | head -1 | sed 's/^status: *//')
  if [ "$STATUS" != "published" ]; then
    continue
  fi

  # Extract slug
  SLUG="${FILENAME%.md}"

  # Skip if already promoted
  if grep -qF "$SLUG" "$PROMOTED_FILE" 2>/dev/null; then
    continue
  fi

  # Skip if article is not live yet
  PAGE_TITLE=$(curl -sf "https://tryethernal.com/blog/${SLUG}" 2>/dev/null | grep -o '<title>[^<]*</title>' || true)
  if [ -z "$PAGE_TITLE" ] || echo "$PAGE_TITLE" | grep -q '^<title>On-Chain Engineering | On-Chain Engineering</title>$'; then
    log "Skipping $SLUG — not live at tryethernal.com yet"
    continue
  fi

  # Extract frontmatter fields
  TITLE=$(echo "$ARTICLE_CONTENT" | grep '^title:' | head -1 | sed 's/^title: *"//;s/"$//')
  DESCRIPTION=$(echo "$ARTICLE_CONTENT" | grep '^description:' | head -1 | sed 's/^description: *"//;s/"$//')

  log "Promoting: $TITLE ($SLUG)"
```

The rest of the script (Claude hook generation, tweet posting) stays the same starting from line 99 (`log "Promoting: $TITLE ($SLUG)"`).

- [ ] **Step 4: Replace local cover image read with live site download**

Replace lines 132-139:
```bash
  COVER_IMAGE=""
  for EXT in png webp jpg; do
    if [ -f "$IMAGE_DIR/${SLUG}.${EXT}" ]; then
      COVER_IMAGE="$IMAGE_DIR/${SLUG}.${EXT}"
      break
    fi
  done
```
With:
```bash
  # Download cover image from live site
  COVER_IMAGE=""
  TMPIMG=$(mktemp /tmp/promo-cover-XXXXXX)
  for EXT in webp png jpg; do
    if curl -sf "https://tryethernal.com/blog/images/${SLUG}.${EXT}" -o "$TMPIMG"; then
      COVER_IMAGE="$TMPIMG"
      break
    fi
  done
  if [ -z "$COVER_IMAGE" ]; then
    rm -f "$TMPIMG"
  fi
```

- [ ] **Step 5: Add cleanup for temp image at end of each loop iteration**

After the PostHog event block (line 196), before `PROMOTED=$((PROMOTED + 1))`, add:
```bash
  # Clean up temp cover image
  [ -n "$COVER_IMAGE" ] && rm -f "$COVER_IMAGE"
```

- [ ] **Step 6: Verify the script parses correctly**

Run: `bash -n tweet-pipeline/promote-blog.sh`
Expected: No output (clean parse)

- [ ] **Step 7: Commit**

```bash
git add tweet-pipeline/promote-blog.sh
git commit -m "feat(tweet-pipeline): replace local blog reads with GitHub API in promote-blog.sh

Fetch article list and content from GitHub API instead of local filesystem.
Download cover images from live site instead of local blog/public/images/.
Removes all git operations (fetch/merge) from the script."
```

---

### Task 5: Clean up scan-newsletter.sh

**Files:**
- Modify: `tweet-pipeline/scan-newsletter.sh`

- [ ] **Step 1: Remove REPO_DIR variable**

Delete line 7:
```bash
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
```

- [ ] **Step 2: Verify the script parses correctly**

Run: `bash -n tweet-pipeline/scan-newsletter.sh`
Expected: No output (clean parse)

- [ ] **Step 3: Commit**

```bash
git add tweet-pipeline/scan-newsletter.sh
git commit -m "chore(tweet-pipeline): remove unused REPO_DIR from scan-newsletter.sh"
```

---

### Task 6: Update systemd service files

**Files:**
- Modify: `tweet-pipeline/tweet-draft.service`
- Modify: `tweet-pipeline/tweet-publish.service`
- Modify: `tweet-pipeline/tweet-engagement.service`
- Modify: `tweet-pipeline/scan-newsletter.service`

- [ ] **Step 1: Update tweet-draft.service**

Replace:
```ini
ExecStart=/opt/ethernal-blog-stack/tweet-pipeline/draft.sh
WorkingDirectory=/opt/ethernal-blog-stack
```
With:
```ini
ExecStart=/opt/tweet-pipeline/draft.sh
WorkingDirectory=/opt/tweet-pipeline
```

- [ ] **Step 2: Update tweet-publish.service**

Replace:
```ini
ExecStart=/opt/ethernal-blog-stack/tweet-pipeline/publish.sh
WorkingDirectory=/opt/ethernal-blog-stack
```
With:
```ini
ExecStart=/opt/tweet-pipeline/publish.sh
WorkingDirectory=/opt/tweet-pipeline
```

- [ ] **Step 3: Update tweet-engagement.service**

Replace:
```ini
ExecStart=/opt/ethernal-blog-stack/tweet-pipeline/engagement-bridge.sh
WorkingDirectory=/opt/ethernal-blog-stack
```
With:
```ini
ExecStart=/opt/tweet-pipeline/engagement-bridge.sh
WorkingDirectory=/opt/tweet-pipeline
```

- [ ] **Step 4: Update scan-newsletter.service**

Replace:
```ini
ExecStart=/opt/ethernal-blog-stack/tweet-pipeline/scan-newsletter.sh
WorkingDirectory=/opt/ethernal-blog-stack
```
With:
```ini
ExecStart=/opt/tweet-pipeline/scan-newsletter.sh
WorkingDirectory=/opt/tweet-pipeline
```

- [ ] **Step 5: Commit**

```bash
git add tweet-pipeline/tweet-draft.service tweet-pipeline/tweet-publish.service tweet-pipeline/tweet-engagement.service tweet-pipeline/scan-newsletter.service
git commit -m "feat(tweet-pipeline): update systemd services to /opt/tweet-pipeline/"
```

---

### Task 7: Update DEPLOY.md

**Files:**
- Modify: `tweet-pipeline/DEPLOY.md`

- [ ] **Step 1: Rewrite DEPLOY.md with new paths and deploy.sh workflow**

Replace the entire file with:

```markdown
# Tweet Pipeline — Server Deployment

Target server: Hetzner `157.90.154.200`, user `blog`.

The tweet pipeline runs standalone at `/opt/tweet-pipeline/` (no git checkout).
Deploy changes from the repo via `deploy.sh`.

## First-time setup

### 1. Add Twitter credentials

Append to `/opt/blog-pipeline.env`:

\`\`\`bash
TWITTER_API_KEY=<your-key>
TWITTER_API_SECRET=<your-secret>
TWITTER_ACCESS_TOKEN=<your-token>
TWITTER_ACCESS_SECRET=<your-token-secret>
TWEET_QUEUE_DIR=/home/blog/tweet-queue
POSTHOG_API_KEY=<your-posthog-project-api-key>
\`\`\`

### 2. Create directories

\`\`\`bash
mkdir -p /home/blog/tweet-queue
mkdir -p /opt/tweet-pipeline
\`\`\`

### 3. Deploy from local machine

\`\`\`bash
bash tweet-pipeline/deploy.sh
\`\`\`

This rsyncs the pipeline, runs `npm ci`, and installs Playwright chromium.

### 4. Install systemd timers

\`\`\`bash
mkdir -p ~/.config/systemd/user

cp /opt/tweet-pipeline/*.service ~/.config/systemd/user/
cp /opt/tweet-pipeline/*.timer ~/.config/systemd/user/

systemctl --user daemon-reload
systemctl --user enable --now tweet-draft.timer
systemctl --user enable --now tweet-publish.timer
systemctl --user enable --now tweet-engagement.timer
systemctl --user enable --now scan-newsletter.timer
\`\`\`

Ensure lingering is enabled:

\`\`\`bash
sudo loginctl enable-linger blog
\`\`\`

## Deploying updates

After making changes to tweet pipeline code:

\`\`\`bash
bash tweet-pipeline/deploy.sh
\`\`\`

If systemd service/timer files changed, also run on the server:

\`\`\`bash
cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/
systemctl --user daemon-reload
systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer
\`\`\`

## Verify

\`\`\`bash
systemctl --user list-timers
systemctl --user status tweet-draft.timer
systemctl --user status tweet-publish.timer
systemctl --user status tweet-engagement.timer
systemctl --user status scan-newsletter.timer
\`\`\`

## Manual testing

\`\`\`bash
/opt/tweet-pipeline/draft.sh 1
/opt/tweet-pipeline/publish.sh
\`\`\`

Check logs:

\`\`\`bash
journalctl --user -u tweet-draft.service -f
journalctl --user -u tweet-publish.service -f
journalctl --user -u tweet-engagement.service -f
journalctl --user -u scan-newsletter.service -f
\`\`\`
```

- [ ] **Step 2: Commit**

```bash
git add tweet-pipeline/DEPLOY.md
git commit -m "docs(tweet-pipeline): update DEPLOY.md for standalone deployment"
```

---

### Task 8: Server deployment and verification

This task is manual — run on the Hetzner server after all code changes are merged.

- [ ] **Step 1: Verify gh auth on server**

Run: `ssh blog@157.90.154.200 "gh auth status"`
Expected: Shows authenticated user with access to `tryethernal/ethernal`

- [ ] **Step 2: Create target directory**

Run: `ssh blog@157.90.154.200 "mkdir -p /opt/tweet-pipeline"`

- [ ] **Step 3: Deploy**

Run: `bash tweet-pipeline/deploy.sh`
Expected: rsync completes, npm ci succeeds, playwright installs

- [ ] **Step 4: Update systemd services on server**

```bash
ssh blog@157.90.154.200 "cp /opt/tweet-pipeline/*.service /opt/tweet-pipeline/*.timer ~/.config/systemd/user/ && systemctl --user daemon-reload && systemctl --user restart tweet-draft.timer tweet-publish.timer tweet-engagement.timer scan-newsletter.timer"
```

- [ ] **Step 5: Verify timers are running**

Run: `ssh blog@157.90.154.200 "systemctl --user list-timers"`
Expected: All four timers listed with correct next-fire times

- [ ] **Step 6: Test a manual draft run**

Run: `ssh blog@157.90.154.200 "/opt/tweet-pipeline/draft.sh 1"`
Expected: Completes without git errors, selects a source, runs Claude phases

- [ ] **Step 7: Remove stale git index.lock**

Run: `ssh blog@157.90.154.200 "rm -f /opt/ethernal-blog-stack/.git/index.lock"`

- [ ] **Step 8: Clean up old tweet-pipeline directory on server**

Run: `ssh blog@157.90.154.200 "rm -rf /opt/ethernal-blog-stack/tweet-pipeline"`

This directory is no longer used by any systemd service.

- [ ] **Step 9: Close GitHub issue #780**

Run: `gh issue close 780 --repo tryethernal/ethernal --comment "Fixed: tweet pipeline now runs standalone at /opt/tweet-pipeline/ — no shared git checkout."`
