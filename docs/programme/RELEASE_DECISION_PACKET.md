# Current release decision packet

## Current verdict

- `main` is canonical and contains the merged RC, hardening, and pre-Mac implementation.
- Source version remains `0.1.0`.
- `v0.1.0-rc.4` is published from exact source `b0950402316253cc9cb7bf7a6ec86ea5f669184f`.
- Published `v0.1.0-rc.1` through `v0.1.0-rc.4` remain immutable with their original assets.
- `v0.1.0-rc.5` source is the prepared candidate; it remains untagged and unpublished until exact-main verification and the guarded dry run pass.
- No stable release is approved or claimed.
- The owner-authorized rc.4 publication completed through exact-main verification `33151448579`, dry run `33151866338`, and publication `33151987068`.
- The rc.4 authorization has been exercised. The owner granted one-use authorization for guarded `v0.1.0-rc.5` publication on 2026-08-30; it is conditional on the exact-main verification and dry-run gates and does not authorize stable v1 or a later tag.

The prior owner decision that authorized the first prerelease while work remained isolated on an RC branch is preserved unchanged at [`../archive/2026-08-27/RELEASE_DECISION_PACKET_PRE_MAIN.md`](../archive/2026-08-27/RELEASE_DECISION_PACKET_PRE_MAIN.md). Its branch instructions are historical and do not override current `main`.

## Product and platform boundary

| Area | Current decision |
|---|---|
| UI/renderer | Shared Simple + Studio session; WKWebView/CoreText on Mac and Chromium on Linux; no raster-parity claim |
| Formats | Full preview for OTF/TTF/WOFF/WOFF2; metadata-only TTC/OTC/DFONT |
| Linux variables | Axes and named instances required; parsed in a bounded child process |
| Durability | Host recovery mirror plus explicit Save |
| Font containment | Sandboxed browser content process plus bounded metadata/parser children; broad hostile-corpus proof still required for stable V1 |
| macOS distribution | GitHub ZIP, macOS 13+ arm64, hardened runtime, ad-hoc signature, no Developer ID/notarisation; use a checksum-verified per-app Privacy & Security exception if macOS blocks launch |
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
