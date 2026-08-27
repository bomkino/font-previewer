#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPO_DIR="$(cd "$APP_DIR/.." && pwd)"
SOURCE="$APP_DIR/macos/FontPreviewerHost.swift"
PLIST="$APP_DIR/macos/Info.plist"
STUDIO="$APP_DIR/dist/renderer"
ICON_MASTER="$APP_DIR/assets/icon/font-previewer-icon-square.png"
OUTPUT_DIR="${FONT_PREVIEWER_MAC_OUTPUT_DIR:-$APP_DIR/output/macos-host}"
APP="$OUTPUT_DIR/Font Previewer.app"

for tool in xcrun codesign ditto plutil shasum iconutil sips; do
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
if [[ ! -s "$ICON_MASTER" ]]; then
  echo "Missing app icon master: $ICON_MASTER" >&2
  exit 66
fi
if [[ -e "$APP" ]]; then
  echo "Refusing to overwrite existing app: $APP" >&2
  exit 73
fi

mkdir -p "$OUTPUT_DIR"
TEMP_ROOT="$(mktemp -d "${TMPDIR:-/tmp}/font-previewer-mac.XXXXXX")"
cleanup() {
  if [[ "$TEMP_ROOT" == "${TMPDIR:-/tmp}"/font-previewer-mac.* && -d "$TEMP_ROOT" ]]; then
    rm -rf -- "$TEMP_ROOT"
  fi
}
trap cleanup EXIT

ARCHITECTURE="$(uname -m)"
case "$ARCHITECTURE" in
  arm64|x86_64) ;;
  *) echo "Unsupported macOS architecture: $ARCHITECTURE" >&2; exit 69 ;;
esac

BINARY="$TEMP_ROOT/FontPreviewer"
xcrun --sdk macosx swiftc \
  -swift-version 5 \
  -O \
  -parse-as-library \
  -target "$ARCHITECTURE-apple-macosx13.0" \
  -framework AppKit \
  -framework CoreText \
  -framework CryptoKit \
  -framework UniformTypeIdentifiers \
  -framework WebKit \
  "$SOURCE" \
  -o "$BINARY"

mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources/Studio"
ditto "$BINARY" "$APP/Contents/MacOS/FontPreviewer"
ditto "$PLIST" "$APP/Contents/Info.plist"
ditto "$STUDIO" "$APP/Contents/Resources/Studio"
ditto "$REPO_DIR/LICENSE" "$APP/Contents/Resources/LICENSE.txt"
ditto "$APP_DIR/THIRD_PARTY_NOTICES.md" "$APP/Contents/Resources/THIRD_PARTY_NOTICES.md"
ditto "$APP_DIR/DEPENDENCIES.md" "$APP/Contents/Resources/DEPENDENCIES.md"
ditto "$APP_DIR/INSTALL.md" "$APP/Contents/Resources/INSTALL.md"
ditto "$APP_DIR/sbom.cdx.json" "$APP/Contents/Resources/sbom.cdx.json"
ICONSET="$TEMP_ROOT/FontPreviewer.iconset"
mkdir -p "$ICONSET"
for points in 16 32 128 256 512; do
  sips -z "$points" "$points" "$ICON_MASTER" --out "$ICONSET/icon_${points}x${points}.png" >/dev/null
  pixels=$((points * 2))
  sips -z "$pixels" "$pixels" "$ICON_MASTER" --out "$ICONSET/icon_${points}x${points}@2x.png" >/dev/null
done
iconutil -c icns "$ICONSET" -o "$APP/Contents/Resources/FontPreviewer.icns"
plutil -lint "$APP/Contents/Info.plist" >/dev/null
codesign --force --sign - --options runtime --identifier dog.pitch.fontpreviewer "$APP"
codesign --verify --deep --strict --verbose=2 "$APP"

ARCHIVE="$OUTPUT_DIR/Font Previewer.zip"
ditto -c -k --sequesterRsrc --keepParent "$APP" "$ARCHIVE"
(
  cd "$OUTPUT_DIR"
  shasum -a 256 "Font Previewer.zip" > "Font Previewer.zip.sha256"
)

echo "$APP"
