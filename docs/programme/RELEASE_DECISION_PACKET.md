# Current release decision packet

## Current verdict

- `main` is canonical and contains the merged RC, hardening, pre-Mac, and two-set implementation; PR #19 brought the latest feature head `4eb38ecf21f23c03383435a2c021d47cb9df4218` into the release line.
- Source version remains `0.1.0`.
- `v0.1.0-rc.7` is published from exact source `0c4969ef5dea2ae7a5de6950fe03c707649a8073`; the public tag and `SOURCE_SHA` agree.
- Published `v0.1.0-rc.1` through `v0.1.0-rc.7` remain immutable with their original assets.
- No stable release is approved or claimed.
- The owner-authorized rc.7 publication completed through exact-main Verify `34880045104`, repository truth `34880045074`, guarded dry run `34880779961`, and publication `34880968632` at `2026-09-14T18:28:52Z`.
- All nine public assets were downloaded. `SHA256SUMS` verifies all eight published payloads; the Mac ZIP SHA-256 is `f89508e83f6fa6d0c0a5cf8f51395dc852230579672fd1132708b081025f2c49`.
- The one-use rc.7 publication authorization has been exercised. Stable v1 and every later tag remain unauthorized and require a new owner decision. Publication does not itself establish local installation.

The preceding rc.6 publication remains recorded by exact-main verification `33296016674`, repository truth `33296016673`, dry run `33296253222`, and publication `33296294623`.

The preceding rc.5 publication remains recorded by exact-main verification `33292252219`, repository truth `33292252221`, dry run `33292506974`, and publication `33292575588`.

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
