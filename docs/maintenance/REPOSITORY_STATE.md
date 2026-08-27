# Font Previewer repository state

Last reviewed: 2026-08-27

## Purpose

Font Previewer is a local typography decision tool. The active product is the shared Review → Compare → System → Handoff Studio delivered through macOS AppKit/WKWebView and Linux Electron Hosts. It does not contain FontBlind transformation or font-packaging engines.

## Canonical source

- Canonical branch: `main`
- Default branch: `main`
- Source version: `0.1.0`
- Verified product base before repository-only canonicalisation: `f1a6df73246eab2d52b0ac582af8e9f737fcafd0`
- Current source posture: unreleased `v0.1.0-rc.2` candidate
- Latest published release: `v0.1.0-rc.1`
- Published tag commit: `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Stable release: none

The exact final `main` SHA and exact-head workflow runs are recorded in [`REPOSITORY_CLEANUP_2026-08-27.md`](REPOSITORY_CLEANUP_2026-08-27.md) after canonicalisation. The RC, hardening, and pre-Mac product work entered `main` through PRs #1, #2, and #3.

## Platform posture

| Platform | Posture | Automated evidence | Not claimed |
|---|---|---|---|
| macOS 13+ arm64 | Prerelease | AppKit/WKWebView build and displayed journey; native menus/panels; package ZIP round trip; hardened runtime; ad-hoc signature and checksum verification | Developer ID, notarisation, stapling, Gatekeeper acceptance, attended VoiceOver, independent machines |
| Ubuntu/Debian x64 | Prerelease | Electron X11 displayed journey; native Wayland/Ozone smoke; `.deb` and portable assembly; reproducibility; install/launch/remove and residue checks | Universal Linux support, attended Orca, broad distro/compositor/driver acceptance, independent machines |
| Browser | Development fallback | Studio development build | Native Catalog, durable recovery, transactional Handoff, supported distribution |

## Completed automated gates

- Source/package/version consistency.
- Strict TypeScript and public-seam test suite.
- Production Studio, Electron main, and preload builds.
- Study migration and malformed document/protocol rejection.
- Installed Catalog indexing, paging, cancellation, bounded workloads, and opaque preview capabilities.
- Recovery, atomic Save, transactional Handoff, injected failure cleanup, and focus restoration.
- Forced Electron renderer recovery; labelled WKWebView termination-callback simulation.
- Keyboard, semantic accessibility, forced-colours, and reduced-motion checks.
- Linux X11 and Wayland/Ozone evidence.
- Linux package reproducibility, install/remove, sandbox ownership, checksums, and residue audit.
- macOS package assembly, ad-hoc signature integrity, archive round trip, and checksums.
- SBOM, npm audit, notices/licence, package inventory, path/credential/source-map scans, and font-binary exclusion.

## Remaining human and physical gates

- Attended VoiceOver and Orca.
- Human typography, native-interface, and competent complex-script review.
- Independent clean-machine Study/Handoff reconstruction.
- Reference-hardware import, scrolling, long-session, and memory measurements.
- Hostile cross-format font corpus beyond current synthetic/malformed fixtures.
- Induced WKWebView content-process termination on a packaged real session.
- Developer ID signing/notarisation only if that distribution path is deliberately adopted.

These gates prohibit stable `v1.0.0`, broad support claims, attended accessibility claims, and production signing/notarisation claims. They do not make current verified source unsuitable for canonical `main`.

## Release posture

The latest public prerelease remains intact. Current source is newer and unreleased. `.github/workflows/release.yml` is manual, exact-SHA guarded, exact-run guarded, non-overwriting, and dry-run first. No automatic release occurs on a push, PR, tag, or successful verification run.

## Current documents

- Build and package: [`../../app/README.md`](../../app/README.md)
- Installation: [`../../app/INSTALL.md`](../../app/INSTALL.md)
- Current implementation: [`../../app/REPORT.md`](../../app/REPORT.md)
- Architecture: [`../ARCHITECTURE.md`](../ARCHITECTURE.md)
- QA and human gates: [`../QA.md`](../QA.md)
- Security: [`../../SECURITY.md`](../../SECURITY.md)
- Contribution: [`../../CONTRIBUTING.md`](../../CONTRIBUTING.md)
- Branch policy: [`BRANCH_POLICY.md`](BRANCH_POLICY.md)
- Release policy: [`RELEASE_POLICY.md`](RELEASE_POLICY.md)
- Cleanup receipt: [`REPOSITORY_CLEANUP_2026-08-27.md`](REPOSITORY_CLEANUP_2026-08-27.md)
