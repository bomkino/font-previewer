# Current release decision packet

## Current verdict

- `main` is canonical and contains the merged RC, hardening, and pre-Mac implementation.
- Source version remains `0.1.0`.
- The next candidate tag is `v0.1.0-rc.2`.
- The latest published prerelease, `v0.1.0-rc.1`, remains fixed to `6ae51f5618387e1e4e39f4816f797da35aaee57b` with its original assets.
- No stable release is approved or claimed.
- This repository cleanup does **not** authorize publication of `v0.1.0-rc.2`.

The prior owner decision that authorized the first prerelease while work remained isolated on an RC branch is preserved unchanged at [`../archive/2026-08-27/RELEASE_DECISION_PACKET_PRE_MAIN.md`](../archive/2026-08-27/RELEASE_DECISION_PACKET_PRE_MAIN.md). Its branch instructions are historical and do not override current `main`.

## Product and platform boundary

| Area | Current decision |
|---|---|
| UI/renderer | Shared semantic Studio; WKWebView/CoreText on Mac and Chromium on Linux; no raster-parity claim |
| Formats | Full preview for OTF/TTF/WOFF/WOFF2; metadata-only TTC/OTC/DFONT |
| Linux variables | Axes and named instances required; parsed in a bounded child process |
| Durability | Host recovery mirror plus explicit Save |
| Font containment | Sandboxed browser content process plus bounded metadata/parser children; broad hostile-corpus proof still required for stable V1 |
| macOS distribution | GitHub ZIP, macOS 13+ arm64, hardened runtime, ad-hoc signature, no Developer ID/notarisation |
| Linux distribution | GitHub `.deb` and portable tarball, x64, X11 and Wayland paths; no RPM or arm64 commitment |
| Handoff Sources | Copy only through the explicit rights acknowledgement and selected policy; retain opt-out and licence warning |
| Integrations | JSON/CSV handoff reference only; no live Figma integration |
| Connectivity | Local-only; no accounts, updater, analytics, or cloud processing |
| Evidence | Automate what can be automated; never convert automation into attended human claims |
| Versioning | Prerelease line remains `0.1.0`; stable `v1.0.0` waits for remaining human/reference gates |
| Publication | Manual only, exact-SHA and exact-run guarded, non-overwriting, explicit owner authorization required |

## Release preparation

`.github/workflows/release.yml` accepts an exact current-main SHA, an exact successful verification run, and a new prerelease tag. It verifies source/package versions, source-SHA manifests, checksums, package contents, SBOM, notices, licence, and release notes. The default action creates a dry-run bundle.

Publication requires both `publish=true` and an exact tag confirmation. The workflow refuses any existing tag or release. It never moves or overwrites published history.

## Required limitations in release notes

- No attended VoiceOver or Orca report.
- No attended native-window or typography review with legally held production fonts and competent complex-script readers.
- No independent Handoff reconstruction or broad independent clean-machine/reference-hardware report.
- No hostile cross-format font corpus or induced WKWebView content-process termination evidence.
- No Developer ID identity, notarisation, stapling, or Gatekeeper acceptance proof.
- Hosted X11/Wayland and package journeys are strong automated evidence, not universal Linux support.

These limitations block stable `v1.0.0` and stronger support language. They do not require verified prerelease code to remain on an obsolete branch.
