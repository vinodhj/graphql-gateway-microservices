#!/bin/bash
# ws-add-prod.sh: Installs one or more production dependencies into multiple specified workspaces.
#
# Usage:
#   ./ws-add-prod.sh <workspace-name> [<workspace-name> ...] -- <package> [<package>...]
#
# Example:
#   ./ws-add-prod.sh gateway user-service expense-service -- @graphql-yoga some-other-package
#
# This script treats "gateway" as a special case located at "./gateway", 
# and any other workspace is assumed to be located under "./services/<workspace-name>".

if [ "$#" -lt 3 ]; then
  echo "Usage: $0 <workspace-name> [<workspace-name> ...] -- <package> [<package>...]"
  exit 1
fi

workspaces=()
packages=()
separator_found=false

for arg in "$@"; do
  if [ "$arg" = "--" ]; then
    separator_found=true
    continue
  fi

  if [ "$separator_found" = false ]; then
    workspaces+=("$arg")
  else
    packages+=("$arg")
  fi
done

if [ "${#workspaces[@]}" -eq 0 ] || [ "${#packages[@]}" -eq 0 ]; then
  echo "Usage: $0 <workspace-name> [<workspace-name> ...] -- <package> [<package>...]"
  exit 1
fi

echo "Workspaces: ${workspaces[@]}"
echo "Packages to add: ${packages[@]}"

for ws in "${workspaces[@]}"; do
  # If the workspace is "gateway", its path is "./gateway", otherwise it's "./services/<ws>"
  if [ "$ws" = "gateway" ]; then
    ws_path="gateway"
  else
    ws_path="services/$ws"
  fi
  
  if [ -d "$ws_path" ]; then
    echo "Installing in workspace: $ws_path"
    (cd "$ws_path" && bun add "${packages[@]}")
  else
    echo "Workspace directory not found: $ws_path"
  fi
done
