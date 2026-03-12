---
description: Dashboard showing blog pipeline health, quality metrics, and content calendar
---

# Blog Status Dashboard

Show a comprehensive overview of the blog content pipeline.

## Data Collection

1. **Articles** — List all `.md` files in `blog/src/content/blog/`. Read frontmatter to get title, date, status, and tags.
2. **Calendar** — Read `blog/CONTENT-CALENDAR.md` if it exists for scheduled topics.
3. **Feedback** — Read `~/.claude/projects/-Users-antoine-ethernal-ethernal/memory/blog-feedback-log.md` if it exists.

## Display

### Pipeline Status
| Status | Count | Articles |
|--------|-------|----------|
| Published | N | titles... |
| Draft | N | titles... |

### Publication Pace
- Target: 1 post every 2 days
- Actual: [calculate from publish dates in frontmatter]
- Status: On track / Behind / Ahead

### Next 5 Scheduled
| Date | Topic | Category | Research Done? |
|------|-------|----------|----------------|
(from CONTENT-CALENDAR.md)

### Backlog Health
- Total planned topics: N
- Days of coverage: N (at 1 per 2 days)
- Category distribution:
  | Category | Count |
  |----------|-------|

### Quality Metrics
- Average revisions per article: N
- Most common feedback themes: [from feedback log, list top 3]

### Action Items
List any issues:
- No content calendar? → Suggest running `/blog:plan`
- No posts scheduled for next 7 days? → Suggest running `/blog:plan`
- Draft older than 5 days? → Flag for review
