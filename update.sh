#!/usr/bin/env sh
set -eu

git pull
docker compose build --no-cache
