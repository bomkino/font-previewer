# Font Previewer repository state

Last reviewed: 2026-08-30

## Purpose

Font Previewer is a local typography decision tool. The active product is one shared Study with a Simple Add → Boards or Body Copy → Tune → Export view and a deeper Review → Compare → System → Handoff Studio, delivered through macOS AppKit/WKWebView and Linux Electron Hosts. It does not contain FontBlind transformation or font-packaging engines.

## Canonical source

- Canonical branch: `main`
- Default branch: `main`
- Source version: `0.1.0`
- Current product posture: published `v0.1.0-rc.4` prerelease plus prepared `v0.1.0-rc.5` source; the later candidate is not yet tagged or published
- Latest published release: [`v0.1.0-rc.4`](https://github.com/bomkino/font-previewer/releases/tag/v0.1.0-rc.4)
- Exact latest-published source: `b0950402316253cc9cb7bf7a6ec86ea5f669184f`, confirmed by both tag and public `SOURCE_SHA`
- Prior published releases: immutable `v0.1.0-rc.3`, `v0.1.0-rc.2`, and `v0.1.0-rc.1`
- Stable release: none

Prepared `rc.5` source adopts the checksum-pinned pitch.dog Type System v13 interface fonts, Phosphor icons, a shared spacing/control contract, font-ready displayed evidence, exact seven-font package guards, scoped Review shortcuts, and live blind-comparison Inspector redaction. Until exact-main verification and guarded publication complete, the `rc.4` evidence and assets below remain the latest published release truth.

The RC, hardening, pre-Mac product work, canonicalisation, and Mac finalisation all reached `main` through reviewed pull requests. Published tags and releases remain immutable; exact source-to-package correspondence is carried by the release tag, workflow run, artifact names, checksums, and `SOURCE_SHA`.

## Current release evidence

- The complete release-source public-seam suite passes locally on Linux: 52 tests discovered, 51 passed, and one variable-font environment check skipped because no variable font is installed. Exact-candidate hosted macOS/Linux results remain a publication gate.
- The release-source native AppKit/WKWebView evidence journey passes Simple and Studio at 80–140% scale, with minimum measured controls above 44 px at 80%, no asserted editor/page/header/workspace overflow, no title/candidate truncation in the asserted states, and no horizontal overflow.
- The native journey proves installed family/style browsing, four-up board containment, one-font Body Copy composition and export, full text, one shared fitted reading size, four distinct colour quadrants, stress characters, AP Title, variable-axis controls, modal focus trapping/return, and shared copy/candidate/comparison-policy state across Simple and Studio.
- Both Hosts now reject mixed or impossible Simple export manifests. The macOS Host also canonicalizes export roots and outputs before deriving relative manifest/checksum paths.
- The native transaction fault proves failed Handoff staging is removed and the prior export remains byte-identical.
- Exact-source GitHub verification run [`33151448579`](https://github.com/bomkino/font-previewer/actions/runs/33151448579) passed both Hosts, Linux X11/Wayland, forced renderer recovery, package reproducibility, and installed/archive round trips on `main`.
- Guarded dry run [`33151866338`](https://github.com/bomkino/font-previewer/actions/runs/33151866338) and publication run [`33151987068`](https://github.com/bomkino/font-previewer/actions/runs/33151987068) assembled and published the non-overwriting prerelease.
- A fresh public download of all nine assets passed the published `SHA256SUMS`; the release tag and `SOURCE_SHA` both resolve to `b0950402316253cc9cb7bf7a6ec86ea5f669184f`.

The exact IDs above point back to GitHub Actions; artifacts and the source SHA remain independently readable from the immutable release.

## Current GitHub maintenance state

- Open release pull requests: none after publication and release-truth merge.
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
- SBOM, npm audit, notices/licence, package inventory, path/credential/source-map scans, and an exact seven-font UI allowlist that rejects every other font binary.
- Simple/Studio mode switching, shared font/style/copy decisions, shared fit policy, interface scaling, long-copy containment, mutually exclusive four-up/index or one-font Body Copy export, and rebuilt Studio stage geometry.

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

`v0.1.0-rc.4` remains the latest public prerelease. Its one-use publication authorization was exercised only after the Body Copy work, exact-head verification, local installation, documentation, and GitHub cleanup gates completed. The owner granted one-use authorization for guarded `v0.1.0-rc.5` publication on 2026-08-30; the exact-main verification and dry-run gates remain mandatory. `.github/workflows/release.yml` is manual, exact-SHA guarded, exact-run guarded, non-overwriting, and dry-run first; no push, PR, tag, or successful verification run publishes automatically. Stable `v1.0.0` and any later tag remain unauthorized.

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
