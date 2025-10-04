#!/usr/bin/env bash
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE_BIN_DIR="$REPO_ROOT/node-v20.10.0-darwin-x64/bin"

if [ -d "$NODE_BIN_DIR" ]; then
  export PATH="$NODE_BIN_DIR:$PATH"
fi

cd "$REPO_ROOT"

if ! command -v npm >/dev/null 2>&1; then
  echo "npm not found on PATH. Install Node.js or adjust PATH." >&2
  exit 1
fi

npm test "$@"
