#!/usr/bin/env sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"

HOST_ALLOWED_PATH_OVERRIDE=""
OPENCODE_WORKDIR_OVERRIDE="/home/node/allowed"

DEFAULT_HOST_ALLOWED_PATH="./allowed"

if [ -f "$SCRIPT_DIR/.env" ]; then
  while IFS= read -r line; do
    case "$line" in
      ""|\#*)
        continue
        ;;
      HOST_ALLOWED_PATH=*)
        value="${line#HOST_ALLOWED_PATH=}"
        case "$value" in
          \"*\")
            value="${value#\"}"
            value="${value%\"}"
            ;;
          \'*\')
            value="${value#\'}"
            value="${value%\'}"
            ;;
        esac
        if [ -n "$value" ]; then
          DEFAULT_HOST_ALLOWED_PATH="$value"
        fi
        break
        ;;
    esac
  done < "$SCRIPT_DIR/.env"
fi

case "$DEFAULT_HOST_ALLOWED_PATH" in
  /*)
    DEFAULT_HOST_ALLOWED_PATH_ABS="$DEFAULT_HOST_ALLOWED_PATH"
    ;;
  *)
    DEFAULT_HOST_ALLOWED_PATH_ABS="$SCRIPT_DIR/$DEFAULT_HOST_ALLOWED_PATH"
    ;;
esac

if [ -d "$DEFAULT_HOST_ALLOWED_PATH_ABS" ]; then
  DEFAULT_HOST_ALLOWED_PATH_ABS="$(CDPATH= cd -- "$DEFAULT_HOST_ALLOWED_PATH_ABS" && pwd -P)"
fi

if [ "$#" -gt 0 ] && [ -d "$1" ]; then
  TARGET_DIR_ABS="$(CDPATH= cd -- "$1" && pwd -P)"

  case "$TARGET_DIR_ABS" in
    "$DEFAULT_HOST_ALLOWED_PATH_ABS")
      OPENCODE_WORKDIR_OVERRIDE="/home/node/allowed"
      ;;
    "$DEFAULT_HOST_ALLOWED_PATH_ABS"/*)
      TARGET_DIR_REL="${TARGET_DIR_ABS#"$DEFAULT_HOST_ALLOWED_PATH_ABS"/}"
      OPENCODE_WORKDIR_OVERRIDE="/home/node/allowed/$TARGET_DIR_REL"
      ;;
    *)
      HOST_ALLOWED_PATH_OVERRIDE="$(dirname -- "$TARGET_DIR_ABS")"
      TARGET_DIR_NAME="$(basename -- "$TARGET_DIR_ABS")"
      OPENCODE_WORKDIR_OVERRIDE="/home/node/allowed/$TARGET_DIR_NAME"
      ;;
  esac

  shift
fi

mkdir -p \
  "$SCRIPT_DIR/opencode-config" \
  "$SCRIPT_DIR/opencode-data" \
  "$SCRIPT_DIR/opencode-state" \
  "$SCRIPT_DIR/allowed"

if [ -n "$HOST_ALLOWED_PATH_OVERRIDE" ]; then
  HOST_ALLOWED_PATH="$HOST_ALLOWED_PATH_OVERRIDE" OPENCODE_WORKDIR="$OPENCODE_WORKDIR_OVERRIDE" docker compose --project-directory "$SCRIPT_DIR" run --rm opencode-cli "$@"
else
  OPENCODE_WORKDIR="$OPENCODE_WORKDIR_OVERRIDE" docker compose --project-directory "$SCRIPT_DIR" run --rm opencode-cli "$@"
fi
