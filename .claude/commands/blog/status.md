---
description: Dashboard showing blog pipeline health, quality metrics, and content calendar
---

# Blog Status Dashboard

Show a comprehensive overview of the blog content pipeline.

## Data Collection

1. **Articles** — Use Inkwell `list_articles` to get all articles by status.
2. **Calendar** — Use Inkwell `list_notes` (tag: calendar) for scheduled topics.
3. **Backlog** — Use Inkwell `list_notes` (type: idea) for topic ideas.
4. **Feedback** — Use Inkwell `list_notes` (tag: feedback) for the feedback log.

## Display

### Pipeline Status
| Status | Count | Articles |
|--------|-------|----------|
| Published | N | titles... |
| Draft | N | titles... |

### Publication Pace
- Target: 1 post every 2 days
- Actual: [calculate from publish dates]
- Status: On track / Behind / Ahead

### Next 5 Scheduled
| Date | Topic | Category | Research Done? |
|------|-------|----------|----------------|

### Backlog Health
- Total ideas: N
- Days of coverage: N (at 1 per 2 days)
- Category distribution:
  | Category | Count |
  |----------|-------|

### Quality Metrics
- Average revisions per article: N
- One-shot rate (published without revision): N%
- Most common feedback themes: [list top 3]
- Last feedback pattern added to voice template: [date and rule]

### Action Items
List any issues:
- Backlog below 15? → Suggest running `/blog:plan`
- No posts scheduled for next 7 days? → Suggest running `/blog:plan`
- Draft older than 5 days? → Flag for review
