You are diagnosing a production worker crash on Ethernal (Fly.io app: ethernal).

Workers are not processing jobs. Your job is to:
1. Determine the root cause
2. Decide if a rollback will fix it
3. Output a structured decision

## Step 1: Gather evidence

Run these commands:
- `fly logs -a ethernal --no-tail 2>&1 | tail -100` — recent crash logs
- `fly machines list -a ethernal --json 2>&1 | python3 -c "import sys,json; [print(f'{m[\"id\"]} {m[\"config\"][\"metadata\"][\"fly_process_group\"]} {m[\"state\"]}') for m in json.loads(sys.stdin.read())]"` — machine states
- `fly releases -a ethernal --json 2>&1 | python3 -c "import sys,json; rs=json.loads(sys.stdin.read())[:3]; [print(f'v{r[\"Version\"]} {r[\"ImageRef\"]} {r[\"CreatedAt\"]}') for r in rs]"` — last 3 releases
- `redis-cli -u $REDIS_URL --no-auth-warning LLEN bull:blockSync:wait` — waiting jobs
- `redis-cli -u $REDIS_URL --no-auth-warning LLEN bull:blockSync:active` — active jobs

## Step 2: Analyze

Look for patterns:
- **uncaughtException at startup** (missing module, syntax error) = code/build issue, ROLLBACK
- **OOM / memory errors** = resource issue, DON'T ROLLBACK
- **Redis/Postgres connection errors** = infra issue, DON'T ROLLBACK
- **Individual job failures** (not startup crash) = job-level bug, DON'T ROLLBACK

## Step 3: Cross-reference with release

If the latest release is different from the previous one, check what changed:
- `gh api repos/tryethernal/ethernal/releases --jq '.[0:2] | .[] | .tag_name'`
- If the crash started after a deploy, rollback is likely the fix.

## Step 4: Output your decision

At the END of your response, output exactly one of these lines:

If rollback needed:
```
ROLLBACK:yes
ROLLBACK_VERSION:<previous-version-number>
ROOT_CAUSE:<one-line summary>
```

If rollback NOT needed:
```
ROLLBACK:no
ROOT_CAUSE:<one-line summary>
RECOMMENDED_ACTION:<what should be done>
```
