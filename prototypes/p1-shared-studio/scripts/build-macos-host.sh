#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROTOTYPE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
SOURCE="$PROTOTYPE_DIR/macos/P1MacHost.swift"
PLIST="$PROTOTYPE_DIR/macos/Info.plist"
STUDIO="$PROTOTYPE_DIR/dist/renderer"
OUTPUT_DIR="${P1_MAC_OUTPUT_DIR:-$PROTOTYPE_DIR/output/macos-host}"
APP="$OUTPUT_DIR/Font Previewer P1.app"

for tool in xcrun codesign ditto plutil shasum; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required macOS build tool: $tool" >&2
    exit 69
  fi
done

if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "The WKWebView Host must be built on macOS." >&2
  exit 69
fi
if [[ ! -s "$STUDIO/index.html" ]]; then
  echo "Build the shared Studio before the macOS Host." >&2
  exit 66
fi
if [[ -e "$APP" ]]; then
  echo "Refusing to overwrite existing app: $APP" >&2
  exit 73
fi

mkdir -p "$OUTPUT_DIR"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/font-previewer-p1-mac.XXXXXX")"
cleanup() {
  if [[ "$TEMP_ROOT" == "${TMPDIR:-/tmp}"/font-previewer-p1-mac.* && -d "$TEMP_ROOT" ]]; then
    rm -rf -- "$TEMP_ROOT"
  fi
}
trap cleanup EXIT

ARCHITECTURE="$(uname -m)"
case "$ARCHITECTURE" in
  arm64|x86_64) ;;
  *) echo "Unsupported macOS architecture: $ARCHITECTURE" >&2; exit 69 ;;
esac

BINARY="$TEMP_ROOT/FontPreviewerP1"
xcrun --sdk macosx swiftc \
  -swift-version 5 \
  -O \
  -parse-as-library \
  -target "$ARCHITECTURE-apple-macosx13.0" \
  -framework AppKit \
  -framework UniformTypeIdentifiers \
  -framework WebKit \
  "$SOURCE" \
  -o "$BINARY"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/Studio"
ditto "$BINARY" "$APP/Contents/MacOS/FontPreviewerP1"
ditto "$PLIST" "$APP/Contents/Info.plist"
ditto "$STUDIO" "$APP/Contents/Resources/Studio"
plutil -lint "$APP/Contents/Info.plist" >/dev/null
codesign --force --sign - --identifier dog.pitch.fontpreviewer.p1 "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

ARCHIVE="$OUTPUT_DIR/Font Previewer P1.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ARCHIVE"
shasum -a 256 "$ARCHIVE" > "$ARCHIVE.sha256"

echo "$APP"
