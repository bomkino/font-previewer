# Font Previewer application

This directory contains the active shared Simple + Studio renderer and the two desktop Hosts. The root `macos/` directory is a preserved native reference, not this application.

## Layout

- `src/` — React/TypeScript Simple + Studio views, shared Study v4 domain, four-up and Body Copy renderers, Family Groups, runtime font registry, and HostBridge protocol.
- `electron/` — sandboxed Linux Host, bounded font inspection, transactional Handoff, storage, preload, and displayed evidence runner.
- `macos/FontPreviewerHost.swift` — AppKit/WKWebView Host with CoreText discovery, native menus/panels, persistence, export, and displayed evidence runner.
- `tests/` — public-seam domain, protocol, Catalog, grouping, migration, recovery, Handoff, accessibility, and Host tests.
- `scripts/` — deterministic test/build cleanup, version checks, SBOM generation, package audits, Linux packaging, and macOS assembly.
- `assets/icon/` and `public/` — the source icon pair and mechanically derived native/browser icon family.

Source version is `0.1.0`. The latest published prerelease is [`v0.1.0-rc.6`](https://github.com/bomkino/font-previewer/releases/tag/v0.1.0-rc.6), built from exact source `f1aa382c8265b4884261c4308a4a5d37077a5242`. Its tag, public `SOURCE_SHA`, and freshly downloaded checksum manifest agree. No stable release is designated.

## Product paths

Simple is the default front door:

1. add local font files/folders or open the installed-font Catalog;
2. choose a family, individual source/style, or the whole family;
3. choose four-up **Boards** or one-font **Body Copy** pages and see the result immediately;
4. edit copy, choose an authored reading sample, show stress characters, and tune casing, axes, order, inclusion, and sizing;
5. export verified 5,152 × 2,160 Boards plus optional index pages, or one Body Copy page per included font.

Studio reads the same Study and adds Review, saved Compare sets, blind comparison, System Roles, and full Handoff controls. Switching modes does not duplicate or translate font decisions.

The titlebar scale control changes the complete interface from 80–140% in 10% steps. `Cmd/Ctrl +`, `Cmd/Ctrl -`, and `Cmd/Ctrl 0` increase, decrease, and reset it.

## Bundled interface typography

The application bundles seven SHA-256-allowlisted WOFF2 assets from pitch.dog Type System v13, pinned to source commit `786b4a2b671182319320f922b8de8f927ea3a002`. They style application chrome only and remain separate from every imported Source, Face, Candidate, local Source Binding, and Handoff.

The seven font binaries are CC0-1.0. The surrounding type-system CSS and code remain pitch.dog-owned material and are not relicensed by this repository's MIT licence. Bundling known interface fonts does not permit Font Previewer to copy or redistribute a user's fonts; Source copying still requires the existing explicit Handoff acknowledgement and selected policy.

## Prerequisites

- Node.js `24.19.0` or compatible Node.js 24
- Linux: Fontconfig, GTK/Electron runtime libraries, and `dpkg-deb` for `.deb` assembly
- macOS: macOS 13+ and Apple command-line developer tools

Install the exact lockfile and Electron binary:

```bash
npm ci
npm run electron:install
```

Electron acquisition is explicit; `npm ci` does not silently download the runtime.

## Development

Renderer-only browser fallback:

```bash
npm run dev
```

Linux desktop Host:

```bash
npm run build
npm run electron
```

The browser fallback can import browser-readable files and download a Study. It deliberately reports native Catalog, recovery, source reveal, and transactional Handoff as unavailable.

## Verification

```bash
npm run verify
```

This runs:

1. version-surface consistency;
2. strict renderer types;
3. public-seam tests;
4. production Studio bundle;
5. Electron main/preload compilation;
6. bundle inventory and private-data checks;
7. CycloneDX SBOM generation;
8. `npm audit --audit-level=high`.

The full hosted gate is [`.github/workflows/verify.yml`](../.github/workflows/verify.yml). It adds displayed Electron and WKWebView journeys, exact control/caret/panel geometry, disclosure motion, Catalog and migration tests, malformed-input rejection, recovery and transactional Handoff fault injection, forced Electron renderer recovery, accessibility semantics, X11 and native Wayland/Ozone evidence, package round trips, package-content/privacy audits, checksums, reproducibility, and macOS ad-hoc signature verification.

## Package candidates

Linux:

```bash
npm run package:linux
cd release
sha256sum -c checksums.sha256
```

Outputs:

- `Font-Previewer-0.1.0-linux-x64.tar.gz`
- `font-previewer_0.1.0_amd64.deb`
- `checksums.sha256`

macOS active Host package from the repository root:

```bash
./build-font-previewer-app.command --no-install
```

Each run writes a timestamped, exact-source output directory under `app/output/` containing:

- `Font Previewer.app`
- `Font Previewer.zip`
- `Font Previewer.zip.sha256`

The Mac package enables hardened runtime and is signed ad hoc for integrity checks. It is not Developer-ID signed or notarised. No Gatekeeper acceptance claim follows from CI.

Omit `--no-install` to stage a verified copy into `/Applications/Font Previewer.app` and launch it. The script refuses dirty source, running-app replacement, unsafe symlink destinations, or a package that fails checksum, extraction, inventory, architecture, or signature checks. Use `./build-reference-app.command` only for the preserved SwiftUI reference; it requires full Xcode.

Both package paths include the project licence, third-party notices, installation guidance, and SBOM. Linux additionally retains required Electron/Chromium licence payloads.

## Evidence controls

`FONT_PREVIEWER_EVIDENCE_DIR` and `FONT_PREVIEWER_MAC_EVIDENCE_DIR` are CI evidence controls. They run a destructive fixture journey and exit; do not set them for normal use.

See [`REPORT.md`](REPORT.md) for current implementation status and [`../docs/maintenance/REPOSITORY_STATE.md`](../docs/maintenance/REPOSITORY_STATE.md) for canonical repository truth.
