# Font Previewer application

This directory contains the v0.1 shared Studio and both thin desktop Hosts.

## Layout

- `src/` — React/TypeScript Studio, Study v4 domain, Family Groups, runtime font registry, and HostBridge protocol.
- `electron/` — sandboxed Linux Host, font inspection, transactional Handoff, storage, preload, and displayed evidence runner.
- `macos/FontPreviewerHost.swift` — AppKit/WKWebView Host with CoreText discovery, native menus/panels, persistence, export, and displayed evidence runner.
- `tests/` — public-seam domain, protocol, Catalog, grouping, Host utility, and rendered-surface tests.
- `scripts/` — SBOM, Linux packaging, and macOS app assembly.

## Prerequisites

- Node.js 24+
- Linux: Fontconfig, GTK/Electron runtime libraries, and `dpkg-deb` for `.deb` assembly
- macOS: macOS 13+ and Apple command-line developer tools

Install the exact lockfile and Electron binary:

```bash
npm ci
npm run electron:install
```

Electron binary acquisition is explicit; the package does not download it during `npm ci`.

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

The browser fallback can import browser-readable files and download a Study, but it deliberately reports native Catalog, recovery, source reveal, and transactional Handoff as unavailable.

## Verification

```bash
npm run verify
```

This runs strict renderer types, public-seam tests, the production Studio bundle, Electron main/preload compilation, CycloneDX generation, and `npm audit --audit-level=high`.

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

macOS:

```bash
npm run build
./scripts/build-macos-host.sh
```

Outputs under `output/macos-host/`:

- `Font Previewer.app`
- `Font Previewer.zip`
- `Font Previewer.zip.sha256`

The current Mac package is ad-hoc signed for verification. Developer ID signing, hardened runtime, notarization, and stapling are intentionally not claimed.

Both package paths include the project licence and third-party notices. Linux additionally retains Electron/Chromium licence payloads.

## Displayed evidence

`.github/workflows/release-candidate.yml` runs the exact branch tree on Ubuntu 24.04 under Xvfb/D-Bus and on a macOS 14 arm64 runner. It hard-fails on malformed bridge acceptance, missing native routes, unnamed controls, page overflow or Inspector-help collision, Catalog path leakage or implicit Study mutation, font-load failure, reload/focus loss, broken checksums, missing notices, or package-integrity errors. Each Host retains six states, including a dedicated installed-Catalog view.

`FONT_PREVIEWER_EVIDENCE_DIR` and `FONT_PREVIEWER_MAC_EVIDENCE_DIR` are CI evidence controls. They run a destructive fixture journey and quit; do not set them for normal use.

See [`REPORT.md`](REPORT.md) for the exact verified commit and remaining human gates.
