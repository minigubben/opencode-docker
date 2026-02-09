#!/usr/bin/env sh
set -eu

docker compose up -d --build opencode-web

INTERNAL_PORT="${OPENCODE_WEB_INTERNAL_PORT:-4097}"
MAPPED_PORT="$(docker compose port opencode-web "$INTERNAL_PORT")"
printf 'Open: http://%s\n' "$MAPPED_PORT"
