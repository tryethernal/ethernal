#!/bin/bash
set -e

case "$1" in
  on)
    echo "Stopping workers (jobs will queue in Redis)..."
    flyctl scale count hworker=0 mworker=0 lpworker=0 phworker=0 -a ethernal
    echo "Workers stopped. API still running."
    flyctl status -a ethernal
    ;;
  off)
    echo "Starting workers (will drain queued jobs)..."
    flyctl scale count hworker=3 mworker=1 lpworker=2 phworker=1 -a ethernal
    echo "Workers restored."
    flyctl status -a ethernal
    ;;
  *)
    echo "Usage: $0 {on|off}"
    echo "  on  - Stop workers for maintenance (jobs queue in Redis)"
    echo "  off - Restart workers (drain backlog)"
    exit 1
    ;;
esac
