#!/usr/bin/env sh
set -eu

SERVICE="${1:-opencode-web}"
docker compose logs -f "$SERVICE"
