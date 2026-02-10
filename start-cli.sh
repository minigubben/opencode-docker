#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

HOST_ALLOWED_PATH_OVERRIDE=""

if [ "$#" -gt 0 ] && [ -d "$1" ]; then
  HOST_ALLOWED_PATH_OVERRIDE="$(CDPATH= cd -- "$1" && pwd -P)"
  shift
fi

mkdir -p \
  "$SCRIPT_DIR/opencode-config" \
  "$SCRIPT_DIR/opencode-data" \
  "$SCRIPT_DIR/opencode-state" \
  "$SCRIPT_DIR/allowed"

if [ -n "$HOST_ALLOWED_PATH_OVERRIDE" ]; then
  HOST_ALLOWED_PATH="$HOST_ALLOWED_PATH_OVERRIDE" docker compose --project-directory "$SCRIPT_DIR" run --rm opencode-cli "$@"
else
  docker compose --project-directory "$SCRIPT_DIR" run --rm opencode-cli "$@"
fi
