# Font Previewer application

This directory contains the active shared Studio and the two desktop Hosts. The root `macos/` directory is a preserved native reference, not this application.

## Layout

- `src/` — React/TypeScript Studio, Study v4 domain, Family Groups, runtime font registry, and HostBridge protocol.
- `electron/` — sandboxed Linux Host, bounded font inspection, transactional Handoff, storage, preload, and displayed evidence runner.
- `macos/FontPreviewerHost.swift` — AppKit/WKWebView Host with CoreText discovery, native menus/panels, persistence, export, and displayed evidence runner.
- `tests/` — public-seam domain, protocol, Catalog, grouping, migration, recovery, Handoff, accessibility, and Host tests.
- `scripts/` — deterministic test/build cleanup, version checks, SBOM generation, package audits, Linux packaging, and macOS assembly.

Source version is `0.1.0`. Current `main` is preparing the unreleased `v0.1.0-rc.2` candidate; the latest published prerelease is `v0.1.0-rc.1`.

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

The full hosted gate is [`.github/workflows/verify.yml`](../.github/workflows/verify.yml). It adds displayed Electron and WKWebView journeys, Catalog and migration tests, malformed-input rejection, recovery and transactional Handoff fault injection, forced Electron renderer recovery, accessibility semantics, X11 and native Wayland/Ozone evidence, package round trips, package-content/privacy audits, checksums, reproducibility, and macOS ad-hoc signature verification.

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

The Mac package enables hardened runtime and is signed ad hoc for integrity checks. It is not Developer-ID signed or notarised. No Gatekeeper acceptance claim follows from CI.

Both package paths include the project licence, third-party notices, installation guidance, and SBOM. Linux additionally retains required Electron/Chromium licence payloads.

## Evidence controls

`FONT_PREVIEWER_EVIDENCE_DIR` and `FONT_PREVIEWER_MAC_EVIDENCE_DIR` are CI evidence controls. They run a destructive fixture journey and exit; do not set them for normal use.

See [`REPORT.md`](REPORT.md) for current implementation status and [`../docs/maintenance/REPOSITORY_STATE.md`](../docs/maintenance/REPOSITORY_STATE.md) for canonical repository truth.
