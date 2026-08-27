#!/bin/zsh
set -euo pipefail

REPOSITORY_DIR="${0:A:h}"
exec "$REPOSITORY_DIR/app/scripts/build-and-install-macos-host.sh" "$@"
