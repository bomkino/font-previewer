#!/bin/zsh
set -euo pipefail

REPOSITORY_DIR="${0:A:h}"
APP_DIR="$REPOSITORY_DIR/app"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/font-previewer-run.XXXXXX")"

cleanup() {
  if [[ "$TEMP_ROOT" == "${TMPDIR:-/tmp}"/font-previewer-run.* && -d "$TEMP_ROOT" ]]; then
    rm -rf -- "$TEMP_ROOT"
  fi
}
trap cleanup EXIT

if [[ -n "${FONT_PREVIEWER_MAC_EVIDENCE_DIR:-}" || -n "${FONT_PREVIEWER_EVIDENCE_DIR:-}" ]]; then
  print -u2 "Refusing destructive evidence mode in the normal run command."
  exit 64
fi

cd "$APP_DIR"
npm ci
npm run build
FONT_PREVIEWER_MAC_OUTPUT_DIR="$TEMP_ROOT/output" ./scripts/build-macos-host.sh
open -W "$TEMP_ROOT/output/Font Previewer.app"
