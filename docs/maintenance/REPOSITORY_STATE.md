# Font Previewer repository state

Last reviewed: 2026-08-28

## Purpose

Font Previewer is a local typography decision tool. The active product is one shared Study with a Simple Add → Boards → Tune → Export view and a deeper Review → Compare → System → Handoff Studio, delivered through macOS AppKit/WKWebView and Linux Electron Hosts. It does not contain FontBlind transformation or font-packaging engines.

## Canonical source

- Canonical branch: `main`
- Default branch: `main`
- Source version: `0.1.0`
- Current source posture: `v0.1.0-rc.3` release candidate, not yet published
- Latest published release: `v0.1.0-rc.2`
- Intended candidate source: the exact future `main` commit accepted by the full verification workflow
- Exact latest-published source: the commit named by the immutable `v0.1.0-rc.2` tag and `SOURCE_SHA` release asset
- Prior published release: `v0.1.0-rc.1` at `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Stable release: none

The RC, hardening, pre-Mac product work, canonicalisation, and Mac finalisation all reached `main` through reviewed pull requests. Published tags and releases remain immutable; exact source-to-package correspondence is carried by the release tag, workflow run, artifact names, checksums, and `SOURCE_SHA`.

## Current candidate evidence

- The complete local public-seam suite passes: 43 tests, 40 passed and three Linux-only tests skipped on macOS.
- The native AppKit/WKWebView evidence journey passes Simple and Studio at 80–140% scale, with minimum measured controls of 44 px at 80%, no title/candidate truncation in the asserted states, and no horizontal overflow.
- The native journey proves installed family/style browsing, four-up board containment, four distinct colour quadrants, stress characters, AP Title, variable-axis controls, modal focus trapping/return, and shared candidate-count and comparison-policy state across Simple and Studio.
- The native transaction fault proves failed Handoff staging is removed and the prior export remains byte-identical.
- Exact-head GitHub verification and release publication remain separate pending gates. Local evidence is not substituted for them.

Run IDs, conclusions, artifacts, and the source SHA remain available in GitHub Actions and the immutable release rather than being copied into a self-referential source file.

## Current GitHub maintenance state

- Open release pull requests: none at this review point; the candidate must still reach `main` through the branch policy.
- Open stable-v1 gates: issues [#5](https://github.com/bomkino/font-previewer/issues/5), [#6](https://github.com/bomkino/font-previewer/issues/6), and [#7](https://github.com/bomkino/font-previewer/issues/7).
- `main` is the only permanent branch. Temporary candidate branches must be deleted after their useful patch reaches `main`.
- Merged working branches delete automatically. `main` rejects force-push and deletion, including for administrators.
- Required checks are not attached to branch protection because the workflows are deliberately path-filtered; missing checks would deadlock unrelated maintenance changes.
- The unused repository wiki and classic-project surfaces are disabled. Issues remain enabled.
- Private vulnerability reporting, vulnerability alerts, Dependabot security updates, secret scanning, and secret-scanning push protection are enabled.

## Platform posture

| Platform | Posture | Automated evidence | Not claimed |
|---|---|---|---|
| macOS 13+ arm64 | Prerelease | AppKit/WKWebView build and displayed journey; native menus/panels; package ZIP round trip; hardened runtime; ad-hoc signature and checksum verification | Developer ID, notarisation, stapling, Gatekeeper acceptance, attended VoiceOver, independent machines |
| Ubuntu/Debian x64 | Prerelease | Electron X11 displayed journey; native Wayland/Ozone smoke; `.deb` and portable assembly; reproducibility; install/launch/remove and residue checks | Universal Linux support, attended Orca, broad distro/compositor/driver acceptance, independent machines |
| Browser | Development fallback | Studio development build | Native Catalog, durable recovery, transactional Handoff, supported distribution |

## Completed local automated gates

- Source/package/version consistency.
- Strict TypeScript and public-seam test suite.
- Production Studio, Electron main, and preload builds.
- Study migration and malformed document/protocol rejection.
- Installed Catalog indexing, paging, cancellation, bounded workloads, and opaque preview capabilities.
- Recovery, atomic Save, transactional Handoff, injected failure cleanup, and focus restoration.
- Workspace-only recovery checkpoints, serialized Electron recovery writes, forced Electron renderer recovery, and the labelled WKWebView termination-callback simulation.
- Keyboard, semantic accessibility, forced-colours, and reduced-motion checks.
- Linux X11 and Wayland/Ozone evidence.
- Linux package reproducibility, install/remove, sandbox ownership, checksums, and residue audit.
- macOS package assembly, ad-hoc signature integrity, archive round trip, and checksums.
- SBOM, npm audit, notices/licence, package inventory, path/credential/source-map scans, and font-binary exclusion.
- Simple/Studio mode switching, shared font/style decisions, shared fit policy, interface scaling, long-copy containment, four-up/index board export, and rebuilt Studio stage geometry.

## Remaining human and physical gates

- Attended VoiceOver and Orca.
- Human typography, native-interface, and competent complex-script review.
- Independent clean-machine Study/Handoff reconstruction.
- Reference-hardware import, scrolling, long-session, and memory measurements.
- Broader hostile cross-format font corpus beyond the retained disposable 24-case/mutated-font run.
- Induced WKWebView content-process termination on a packaged real session.
- Developer ID signing/notarisation is outside the current free distribution path; it would require a separate future decision.

These gates prohibit stable `v1.0.0`, broad support claims, attended accessibility claims, and production signing/notarisation claims. They do not make current verified source unsuitable for canonical `main`.

## Release posture

`v0.1.0-rc.2` remains the latest public prerelease. `v0.1.0-rc.3` is the current candidate. `.github/workflows/release.yml` remains manual, exact-SHA guarded, exact-run guarded, non-overwriting, and dry-run first. No later release occurs automatically on a push, PR, tag, or successful verification run.

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
