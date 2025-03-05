#!/bin/bash
# Ensure the script stops if any command fails
set -e

# Start the services concurrently
concurrently --kill-others \
  "cd services/user-service && yarn start" \
  "cd services/expense-service && yarn start"