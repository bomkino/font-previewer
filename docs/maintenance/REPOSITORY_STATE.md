# Font Previewer repository state

Last reviewed: 2026-08-28

## Purpose

Font Previewer is a local typography decision tool. The active product is the shared Review → Compare → System → Handoff Studio delivered through macOS AppKit/WKWebView and Linux Electron Hosts. It does not contain FontBlind transformation or font-packaging engines.

## Canonical source

- Canonical branch: `main`
- Default branch: `main`
- Remote `main` observed during this review: `806b419f00f6f0662783bef9b00c9bcfd526edb0`
- Observed tree: `116639a2679b37edf48005b0782b1b337371bf0c`
- Product-integration commit: `671e9feeebcf39c7333d5abf7296d24b9641e74b`
- Source version: `0.1.0`
- Verified product base before repository-only canonicalisation: `f1a6df73246eab2d52b0ac582af8e9f737fcafd0`
- Current source posture: unreleased `v0.1.0-rc.2` candidate
- Latest published release: `v0.1.0-rc.1`
- Published tag commit: `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Stable release: none

At the 2026-08-28 readback, remote `main` was a documentation-only child of the product-integration commit. Their `app/` subtree (`3fe70d8a3e66433cf14fcc24b7d2e202764cc301`) and workflow subtree (`f2f61bea38e243a52a08ed0353bd01cafa682766`) were identical; the only intervening file change was the cleanup receipt. The RC, hardening, and pre-Mac product work entered `main` through PRs #1, #2, and #3; repository canonicalisation entered through PR #4.

## Current workflow evidence

- [`Repository truth` run 33120587354](https://github.com/bomkino/font-previewer/actions/runs/33120587354) passed at exact readback `main` commit `806b419f00f6f0662783bef9b00c9bcfd526edb0`.
- [`Verify Font Previewer` run 33119845596](https://github.com/bomkino/font-previewer/actions/runs/33119845596) passed both macOS and Linux jobs at product-integration commit `671e9feeebcf39c7333d5abf7296d24b9641e74b` and published nine exact-SHA evidence/package artifacts.
- [`macOS reference` run 33119845491](https://github.com/bomkino/font-previewer/actions/runs/33119845491) passed at that same product-integration commit and published two exact-SHA artifacts.

The application and reference workflows did not run at `806b419f00f6f0662783bef9b00c9bcfd526edb0`: their path filters excluded the cleanup-receipt-only change. Their successful evidence therefore belongs to `671e9feeebcf39c7333d5abf7296d24b9641e74b`, whose application and workflow subtrees matched the readback `main`; it was not an exact-readback-head run.

## Current GitHub maintenance state

- Open pull requests: none; PRs #1 through #4 are merged.
- Open stable-v1 gates: issues [#5](https://github.com/bomkino/font-previewer/issues/5), [#6](https://github.com/bomkino/font-previewer/issues/6), and [#7](https://github.com/bomkino/font-previewer/issues/7).
- Eight reviewed non-`main` branches remain. Their recorded deletion dispositions are unchanged; no branch deletion was performed during this readback.
- `main` has no branch protection or repository ruleset, and automatic merged-branch deletion is disabled. These are repository-maintenance gaps, not product verification failures.

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
