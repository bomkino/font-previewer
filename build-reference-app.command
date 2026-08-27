#!/bin/zsh
set -euo pipefail

APP_DIR="${0:A:h}"
PACKAGE_DIR="$APP_DIR/macos"
SUPPORT_DIR="$PACKAGE_DIR/Support"
INSTALL_APP=0
RUN_TESTS=1

while (( $# )); do
  case "$1" in
    --install-reference) INSTALL_APP=1 ;;
    --skip-tests) RUN_TESTS=0 ;;
    *)
      print -u2 "Usage: ${0:t} [--install-reference] [--skip-tests]"
      exit 64
      ;;
  esac
  shift
done

for tool in swift xcrun xcode-select codesign ditto plutil iconutil shasum file; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    print -u2 "Missing required macOS build tool: $tool"
    exit 69
  fi
done

if [[ "$(xcode-select -p)" == "/Library/Developer/CommandLineTools" ]]; then
  print -u2 "Preserved SwiftUI reference requires full Xcode. Active AppKit/WKWebView product builds with Command Line Tools."
  exit 69
fi

ARCHITECTURE="$(uname -m)"
case "$ARCHITECTURE" in
  arm64|x86_64) ;;
  *) print -u2 "Unsupported macOS architecture: $ARCHITECTURE"; exit 69 ;;
esac

TEMP_BASE="${TMPDIR:-/tmp}"
TEMP_BASE="${TEMP_BASE%/}"
BUILD_ROOT="$(mktemp -d "$TEMP_BASE/font-previewer-reference.XXXXXX")"
INSTALL_STAGING=""

cleanup() {
  if [[ -n "$INSTALL_STAGING" && "$INSTALL_STAGING" == /Applications/.Font\ Previewer\ Reference.install.* && -e "$INSTALL_STAGING" ]]; then
    rm -rf -- "$INSTALL_STAGING"
  fi
  if [[ "$BUILD_ROOT" == "$TEMP_BASE"/font-previewer-reference.* && -d "$BUILD_ROOT" ]]; then
    rm -rf -- "$BUILD_ROOT"
  fi
}
trap cleanup EXIT

if (( RUN_TESTS )); then
  swift test --package-path "$PACKAGE_DIR"
  swift run --package-path "$PACKAGE_DIR" -c release FontPreviewerSmoke --output "$BUILD_ROOT/smoke"
fi

SCRATCH="$BUILD_ROOT/swift-build"
swift build --package-path "$PACKAGE_DIR" --scratch-path "$SCRATCH" -c release --product FontPreviewer
BIN_PATH="$(swift build --package-path "$PACKAGE_DIR" --scratch-path "$SCRATCH" -c release --show-bin-path)"
EXECUTABLE="$BIN_PATH/FontPreviewer"
test -x "$EXECUTABLE"

BUNDLE="$BUILD_ROOT/Font Previewer Reference.app"
CONTENTS="$BUNDLE/Contents"
mkdir -p "$CONTENTS/MacOS" "$CONTENTS/Resources"
ditto "$EXECUTABLE" "$CONTENTS/MacOS/FontPreviewer"
cp "$SUPPORT_DIR/Info.plist" "$CONTENTS/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleDisplayName Font Previewer Reference' "$CONTENTS/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleName Font Previewer Reference' "$CONTENTS/Info.plist"
/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier dog.pitch.fontpreviewer.reference' "$CONTENTS/Info.plist"
plutil -lint "$CONTENTS/Info.plist" >/dev/null

ICONSET="$BUILD_ROOT/FontPreviewer.iconset"
xcrun swift "$SUPPORT_DIR/make_icon.swift" "$ICONSET"
iconutil -c icns "$ICONSET" -o "$CONTENTS/Resources/FontPreviewer.icns"
codesign --force --sign - --identifier dog.pitch.fontpreviewer.reference "$BUNDLE"
codesign --verify --deep --strict --verbose=2 "$BUNDLE"

ARTIFACT_DIR="$APP_DIR/output/macos-reference-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$ARTIFACT_DIR"
ditto "$BUNDLE" "$ARTIFACT_DIR/Font Previewer Reference.app"
ditto -c -k --sequesterRsrc --keepParent "$BUNDLE" "$ARTIFACT_DIR/Font Previewer Reference.zip"
(
  cd "$ARTIFACT_DIR"
  shasum -a 256 "Font Previewer Reference.zip" > "Font Previewer Reference.zip.sha256"
  shasum -a 256 -c "Font Previewer Reference.zip.sha256"
)

if (( INSTALL_APP )); then
  INSTALL_TARGET="/Applications/Font Previewer Reference.app"
  if [[ -L "$INSTALL_TARGET" || -e "$INSTALL_TARGET" ]]; then
    print -u2 "Refusing to replace existing reference app: $INSTALL_TARGET"
    exit 73
  fi
  INSTALL_STAGING="/Applications/.Font Previewer Reference.install.$$"
  test ! -e "$INSTALL_STAGING"
  ditto "$BUNDLE" "$INSTALL_STAGING"
  codesign --verify --deep --strict --verbose=2 "$INSTALL_STAGING"
  mv "$INSTALL_STAGING" "$INSTALL_TARGET"
  INSTALL_STAGING=""
  print "Installed preserved reference: $INSTALL_TARGET"
fi

print "Preserved reference packaged: $ARTIFACT_DIR"
