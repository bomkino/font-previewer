#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
REPOSITORY_DIR="$(cd "$APP_DIR/.." && pwd)"
INSTALL_APP=1

if [[ "${1:-}" == "--no-install" && $# -eq 1 ]]; then
  INSTALL_APP=0
elif [[ $# -ne 0 ]]; then
  echo "Usage: build-font-previewer-app.command [--no-install]" >&2
  exit 64
fi

if [[ "$(uname -s)" != "Darwin" || "$(uname -m)" != "arm64" ]]; then
  echo "This active Mac package requires Apple Silicon and macOS." >&2
  exit 69
fi

for tool in node npm git xcrun codesign ditto plutil shasum unzip file lipo otool pgrep; do
  if ! command -v "$tool" >/dev/null 2>&1; then
    echo "Missing required build tool: $tool" >&2
    exit 69
  fi
done

if [[ -n "${FONT_PREVIEWER_MAC_EVIDENCE_DIR:-}" || -n "${FONT_PREVIEWER_EVIDENCE_DIR:-}" ]]; then
  echo "Refusing destructive evidence mode in the normal build/install command." >&2
  exit 64
fi

if [[ -n "$(git -C "$REPOSITORY_DIR" status --porcelain --untracked-files=normal)" ]]; then
  echo "Refusing release-style build from a dirty checkout." >&2
  exit 65
fi

SOURCE_SHA="$(git -C "$REPOSITORY_DIR" rev-parse HEAD^{commit})"
SHORT_SHA="${SOURCE_SHA:0:12}"
BUILD_STAMP="$(date +%Y%m%d-%H%M%S)"
TEMP_BASE="${TMPDIR:-/tmp}"
TEMP_BASE="${TEMP_BASE%/}"
RUN_ROOT="$(mktemp -d "$TEMP_BASE/font-previewer-active.XXXXXX")"
BUILD_OUTPUT="$RUN_ROOT/build"
EXTRACT_ROOT="$RUN_ROOT/extracted"
INSTALL_STAGING=""
INSTALL_TARGET="/Applications/Font Previewer.app"
BACKUP=""
INSTALL_REPLACED=0

cleanup() {
  local exit_code=$?
  if [[ "$exit_code" -ne 0 && "$INSTALL_REPLACED" -eq 1 ]]; then
    if [[ "$INSTALL_TARGET" == "/Applications/Font Previewer.app" && -d "$INSTALL_TARGET" && ! -L "$INSTALL_TARGET" ]]; then
      rm -rf -- "$INSTALL_TARGET"
    fi
    if [[ -n "$BACKUP" && "$BACKUP" == /Applications/Font\ Previewer.backup-*.app && -d "$BACKUP" ]]; then
      mv "$BACKUP" "$INSTALL_TARGET"
    fi
  fi
  if [[ -n "$INSTALL_STAGING" && "$INSTALL_STAGING" == /Applications/.Font\ Previewer.install.* && -e "$INSTALL_STAGING" ]]; then
    rm -rf -- "$INSTALL_STAGING"
  fi
  if [[ "$RUN_ROOT" == "$TEMP_BASE"/font-previewer-active.* && -d "$RUN_ROOT" ]]; then
    rm -rf -- "$RUN_ROOT"
  fi
}
trap cleanup EXIT

verify_app() {
  local candidate="$1"
  local executable="$candidate/Contents/MacOS/FontPreviewer"
  local signature_info
  local architecture_info

  test -d "$candidate"
  test -x "$executable"
  test -s "$candidate/Contents/Resources/Studio/index.html"
  test -s "$candidate/Contents/Resources/LICENSE.txt"
  test -s "$candidate/Contents/Resources/THIRD_PARTY_NOTICES.md"
  test -s "$candidate/Contents/Resources/DEPENDENCIES.md"
  test -s "$candidate/Contents/Resources/INSTALL.md"
  test -s "$candidate/Contents/Resources/sbom.cdx.json"
  test -s "$candidate/Contents/Resources/FontPreviewer.icns"
  plutil -lint "$candidate/Contents/Info.plist" >/dev/null
  test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleIdentifier' "$candidate/Contents/Info.plist")" = "dog.pitch.fontpreviewer"
  test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleShortVersionString' "$candidate/Contents/Info.plist")" = "0.1.0"
  test "$(/usr/libexec/PlistBuddy -c 'Print :CFBundleVersion' "$candidate/Contents/Info.plist")" = "1"
  test "$(/usr/libexec/PlistBuddy -c 'Print :LSMinimumSystemVersion' "$candidate/Contents/Info.plist")" = "13.0"

  file "$executable" | grep -q 'arm64'
  architecture_info="$(lipo -archs "$executable")"
  [[ " $architecture_info " == *" arm64 "* ]]
  codesign --verify --deep --strict --verbose=2 "$candidate"
  signature_info="$(codesign -d --verbose=4 "$candidate" 2>&1)"
  grep -q 'Signature=adhoc' <<<"$signature_info"
  grep -Eq 'flags=.*runtime' <<<"$signature_info"
  if codesign -d --entitlements :- "$candidate" 2>/dev/null | grep -q 'com.apple.security.app-sandbox'; then
    echo "Unexpected App Sandbox entitlement in GitHub-only v0.1 package." >&2
    return 1
  fi

  while IFS= read -r dependency; do
    case "$dependency" in
      @*|/System/Library/*|/usr/lib/*) ;;
      /*)
        echo "Unexpected absolute Mach-O dependency: $dependency" >&2
        return 1
        ;;
    esac
  done < <(otool -L "$executable" | tail -n +2 | awk '{ print $1 }')

  if find "$candidate" -type f \( -name '*.map' -o -name '*.otf' -o -name '*.ttf' -o -name '*.ttc' -o -name '*.otc' -o -name '*.woff' -o -name '*.woff2' -o -name '*.dfont' \) -print -quit | grep -q .; then
    echo "Package contains a source map or font binary." >&2
    return 1
  fi
  if find "$candidate" \( -name '.git' -o -name 'node_modules' -o -name 'tests' -o -name '__tests__' -o -name '.DS_Store' \) -print -quit | grep -q .; then
    echo "Package contains build, test, cache, or source residue." >&2
    return 1
  fi
  if grep -RIlE '(/Users/|/Volumes/|gh[opsu]_[A-Za-z0-9_]{20,}|BEGIN [A-Z ]*PRIVATE KEY)' "$candidate/Contents/Resources" >/dev/null; then
    echo "Package resources contain a private path or credential marker." >&2
    return 1
  fi
}

cd "$APP_DIR"
npm ci
npm run electron:install
npm run verify
FONT_PREVIEWER_MAC_OUTPUT_DIR="$BUILD_OUTPUT" ./scripts/build-macos-host.sh

BUILT_APP="$BUILD_OUTPUT/Font Previewer.app"
BUILT_ZIP="$BUILD_OUTPUT/Font Previewer.zip"
BUILT_CHECKSUM="$BUILD_OUTPUT/Font Previewer.zip.sha256"
verify_app "$BUILT_APP"
(
  cd "$BUILD_OUTPUT"
  shasum -a 256 -c "Font Previewer.zip.sha256"
)
unzip -tq "$BUILT_ZIP" >/dev/null
mkdir -p "$EXTRACT_ROOT"
ditto -x -k "$BUILT_ZIP" "$EXTRACT_ROOT"
EXTRACTED_APP="$EXTRACT_ROOT/Font Previewer.app"
verify_app "$EXTRACTED_APP"

BUILT_EXECUTABLE_SHA="$(shasum -a 256 "$BUILT_APP/Contents/MacOS/FontPreviewer" | awk '{ print $1 }')"
EXTRACTED_EXECUTABLE_SHA="$(shasum -a 256 "$EXTRACTED_APP/Contents/MacOS/FontPreviewer" | awk '{ print $1 }')"
test "$BUILT_EXECUTABLE_SHA" = "$EXTRACTED_EXECUTABLE_SHA"

ARTIFACT_DIR="$APP_DIR/output/macos-host-$BUILD_STAMP-$SHORT_SHA"
if [[ -e "$ARTIFACT_DIR" ]]; then
  echo "Refusing to overwrite artifact directory: $ARTIFACT_DIR" >&2
  exit 73
fi
mkdir -p "$ARTIFACT_DIR"
ditto "$EXTRACTED_APP" "$ARTIFACT_DIR/Font Previewer.app"
ditto "$BUILT_ZIP" "$ARTIFACT_DIR/Font Previewer.zip"
ditto "$BUILT_CHECKSUM" "$ARTIFACT_DIR/Font Previewer.zip.sha256"
printf '%s\n' "$SOURCE_SHA" > "$ARTIFACT_DIR/SOURCE_SHA"
verify_app "$ARTIFACT_DIR/Font Previewer.app"
(
  cd "$ARTIFACT_DIR"
  shasum -a 256 -c "Font Previewer.zip.sha256"
)

if (( INSTALL_APP )); then
  if [[ -L "$INSTALL_TARGET" ]]; then
    echo "Refusing to replace symlink at $INSTALL_TARGET" >&2
    exit 73
  fi
  if pgrep -f '^/Applications/Font Previewer\.app/Contents/MacOS/FontPreviewer([[:space:]]|$)' >/dev/null 2>&1; then
    echo "Quit the installed Font Previewer app before replacement." >&2
    exit 75
  fi

  INSTALL_STAGING="/Applications/.Font Previewer.install.$$"
  test ! -e "$INSTALL_STAGING"
  ditto "$ARTIFACT_DIR/Font Previewer.app" "$INSTALL_STAGING"
  verify_app "$INSTALL_STAGING"

  if [[ -e "$INSTALL_TARGET" ]]; then
    BACKUP="/Applications/Font Previewer.backup-$BUILD_STAMP.app"
    if [[ -e "$BACKUP" ]]; then
      echo "Refusing to overwrite existing backup: $BACKUP" >&2
      exit 73
    fi
    mv "$INSTALL_TARGET" "$BACKUP"
  fi
  if ! mv "$INSTALL_STAGING" "$INSTALL_TARGET"; then
    if [[ -n "$BACKUP" && ! -e "$INSTALL_TARGET" && -e "$BACKUP" ]]; then
      mv "$BACKUP" "$INSTALL_TARGET"
    fi
    echo "Install failed; previous app restored when present." >&2
    exit 73
  fi
  INSTALL_STAGING=""
  INSTALL_REPLACED=1
  verify_app "$INSTALL_TARGET"
  INSTALLED_EXECUTABLE_SHA="$(shasum -a 256 "$INSTALL_TARGET/Contents/MacOS/FontPreviewer" | awk '{ print $1 }')"
  test "$INSTALLED_EXECUTABLE_SHA" = "$BUILT_EXECUTABLE_SHA"
  INSTALL_REPLACED=0

  open -n "$INSTALL_TARGET"
  INSTALLED_PID=""
  for _ in $(seq 1 100); do
    INSTALLED_PID="$(pgrep -f '^/Applications/Font Previewer\.app/Contents/MacOS/FontPreviewer([[:space:]]|$)' | head -1 || true)"
    [[ -n "$INSTALLED_PID" ]] && break
    sleep 0.1
  done
  if [[ -z "$INSTALLED_PID" ]]; then
    echo "Installed app did not launch from /Applications." >&2
    exit 70
  fi
  echo "Installed and launched: $INSTALL_TARGET (PID $INSTALLED_PID)"
  [[ -n "$BACKUP" ]] && echo "Previous app preserved: $BACKUP"
fi

echo "Active AppKit/WKWebView package: $ARTIFACT_DIR"
echo "Source SHA: $SOURCE_SHA"
echo "Executable SHA-256: $BUILT_EXECUTABLE_SHA"
echo "Ad-hoc signed with hardened runtime. Not Developer-ID signed or notarized."
