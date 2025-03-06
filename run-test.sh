#!/bin/bash
# run-test.sh: Run tests concurrently for all workspaces
set -e

concurrently --kill-others \
  "cd services/user-service && bun run test" \
  "cd services/expense-service && bun run test" \
  "cd gateway && bun run test"
