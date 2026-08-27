#!/bin/zsh
set -euo pipefail

REPOSITORY_DIR="${0:A:h}"
if [[ "$(xcode-select -p)" == "/Library/Developer/CommandLineTools" ]]; then
  print -u2 "Preserved SwiftUI reference requires full Xcode. Active AppKit/WKWebView product builds with Command Line Tools."
  exit 69
fi
cd "$REPOSITORY_DIR/macos"
exec swift run FontPreviewer
