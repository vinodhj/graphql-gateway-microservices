#!/bin/bash
# Ensure the script stops if any command fails
set -e

# Start the services concurrently
concurrently --kill-others \
  "cd services/user-service && bun dev" \
  "cd services/expense-service && bun dev" \
  "cd ./gateway && bun dev"