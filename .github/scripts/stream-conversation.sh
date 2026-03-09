#!/usr/bin/env bash
# stream-conversation.sh
#
# Streams Claude conversation turns from claude-execution-output.json to a webhook
# as they are produced. Runs as a background sidecar during GitHub Actions workflows.
#
# Required env vars:
#   WEBHOOK_URL        - Full webhook URL for appendTurns POST
#   WEBHOOK_SECRET     - Auth token for the webhook
#   WORKFLOW_RUN_ID    - GitHub Actions run ID
#   GITHUB_ISSUE_NUMBER - Issue number (identifies the pipeline run)
#
# Optional env vars:
#   LOG_FILE           - Path to claude-execution-output.json
#                        (default: /home/runner/work/_temp/claude-execution-output.json)

set -euo pipefail

LOG_FILE="${LOG_FILE:-/home/runner/work/_temp/claude-execution-output.json}"
OFFSET_FILE="/tmp/streamer-offset"
POLL_INTERVAL=5
MAX_WAIT=300  # 5 minutes

# Initialize offset
echo "0" > "$OFFSET_FILE"

# Wait for the log file to appear
echo "[streamer] Waiting for $LOG_FILE to appear..."
elapsed=0
while [ ! -f "$LOG_FILE" ]; do
  sleep 2
  elapsed=$((elapsed + 2))
  if [ "$elapsed" -ge "$MAX_WAIT" ]; then
    echo "[streamer] Timed out waiting for log file after ${MAX_WAIT}s. Exiting."
    exit 0
  fi
done
echo "[streamer] Log file detected after ${elapsed}s."

# Main streaming loop
while true; do
  sleep "$POLL_INTERVAL"

  PREV_OFFSET=$(cat "$OFFSET_FILE" 2>/dev/null || echo "0")

  # Extract turns and POST new ones
  python3 << 'PYEOF' || true
import json
import os
import subprocess
import sys

log_file = os.environ["LOG_FILE"]
offset_file = os.environ["OFFSET_FILE"]
webhook_url = os.environ["WEBHOOK_URL"]
webhook_secret = os.environ["WEBHOOK_SECRET"]
workflow_run_id = os.environ["WORKFLOW_RUN_ID"]
issue_number = os.environ["GITHUB_ISSUE_NUMBER"]

prev_offset = int(open(offset_file).read().strip())

try:
    with open(log_file) as f:
        data = json.load(f)
except (json.JSONDecodeError, IOError) as e:
    # File may be mid-write, skip this iteration
    print(f"[streamer] JSON parse error (file may be mid-write): {e}", file=sys.stderr)
    sys.exit(0)

log = []
messages = data if isinstance(data, list) else [data]
for msg in messages:
    if not isinstance(msg, dict):
        continue
    role = msg.get("role", msg.get("type", ""))
    if role in ("system", "preset"):
        continue
    content = msg.get("content", [])
    if isinstance(content, str):
        log.append({"role": role, "text": content})
        continue
    if not isinstance(content, list):
        content = [content] if isinstance(content, dict) else []
    for block in content:
        if not isinstance(block, dict):
            continue
        btype = block.get("type", "")
        if btype == "text":
            log.append({"role": role, "text": block.get("text", "")})
        elif btype == "tool_use":
            inp = block.get("input", {})
            log.append({
                "role": role,
                "tool": block.get("name", ""),
                "input": (inp.get("command") or inp.get("description") or str(inp))[:500]
            })
        elif btype == "tool_result":
            cv = block.get("content", "")
            if isinstance(cv, list):
                cv = " ".join(b.get("text", "") for b in cv if isinstance(b, dict))
            log.append({"role": "tool", "output": str(cv)[:1000]})

total = len(log)
if total <= prev_offset:
    # No new turns
    sys.exit(0)

new_turns = log[prev_offset:]
print(f"[streamer] Sending {len(new_turns)} new turns (offset {prev_offset} -> {total})")

payload = json.dumps({
    "workflowRunId": int(workflow_run_id),
    "githubIssueNumber": int(issue_number),
    "appendTurns": new_turns
})

result = subprocess.run(
    [
        "curl", "-s", "-o", "/dev/null", "-w", "%{http_code}",
        "-X", "POST", webhook_url,
        "-H", "Content-Type: application/json",
        "-H", f"Authorization: Bearer {webhook_secret}",
        "-d", payload
    ],
    capture_output=True, text=True
)

http_code = result.stdout.strip()
if http_code.startswith("2"):
    # Success - update offset
    with open(offset_file, "w") as f:
        f.write(str(total))
    print(f"[streamer] POST succeeded ({http_code}), offset updated to {total}")
else:
    print(f"[streamer] POST failed with HTTP {http_code}", file=sys.stderr)
    if result.stderr:
        print(f"[streamer] curl stderr: {result.stderr}", file=sys.stderr)

PYEOF
done
