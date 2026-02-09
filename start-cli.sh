#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

mkdir -p \
  "$SCRIPT_DIR/opencode-config" \
  "$SCRIPT_DIR/opencode-data" \
  "$SCRIPT_DIR/opencode-state" \
  "$SCRIPT_DIR/allowed"

docker compose --project-directory "$SCRIPT_DIR" run --rm opencode-cli "$@"
