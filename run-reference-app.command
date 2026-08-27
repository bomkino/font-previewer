#!/bin/zsh
set -euo pipefail

REPOSITORY_DIR="${0:A:h}"
cd "$REPOSITORY_DIR/macos"
exec swift run FontPreviewer
