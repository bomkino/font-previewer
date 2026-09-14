# Font Previewer repository state

Last reviewed: 2026-09-15

## Purpose

Font Previewer is a local typography decision tool. The active product is one shared Study with a Simple Add → Boards or Body Copy → Tune → Export view and a deeper Review → Compare → System → Handoff Studio, delivered through macOS AppKit/WKWebView and Linux Electron Hosts. It does not contain FontBlind transformation or font-packaging engines.

## Canonical source

- Canonical branch: `main`
- Default branch: `main`
- Source version: `0.1.0`
- Current product posture: published `v0.1.0-rc.7` prerelease
- Latest published release: [`v0.1.0-rc.7`](https://github.com/bomkino/font-previewer/releases/tag/v0.1.0-rc.7)
- Exact latest-published source: `0c4969ef5dea2ae7a5de6950fe03c707649a8073`, confirmed by both tag and public `SOURCE_SHA`
- Prior published releases: immutable `v0.1.0-rc.1` through `v0.1.0-rc.6`
- Stable release: none

## Completed release: simple-font-sets

The owner authorized rc.7, local installation, and repository/documentation cleanup on 2026-09-14. [PR #19](https://github.com/bomkino/font-previewer/pull/19) merged the change from base `abe234eedfc74d82f475c674d7797ce15019fe95`; its verified head `4eb38ecf21f23c03383435a2c021d47cb9df4218` and squash-merged release source have identical trees. The temporary feature branch was removed locally and remotely. Subsequent release-truth documentation does not change the published package identity.

Rc.7 adds independent Headlines and Body Copy sets in Study v5, duplication and named styles, either/both exports, centered index ink, bounded preview/font/export resources, and the revised app icon. Existing v4 documents migrate without deleting original Candidates. Saved Studio comparisons retain their displayed custom copy without rewriting either Simple set or a shared Recipe.

Simple Preview and Tune each browse 12 Candidates. Their interactive registry retains at most 24 Source resources and starts four font loads concurrently. Body previews match within the visible batch; export fits the entire included set once and renders pages sequentially. These are implementation bounds and verified lifecycle changes, not an all-app RAM ceiling or universal performance claim.

The existing rc.6 interface-fit work and checksum-pinned pitch.dog Type System v13 remain intact. Published tags and releases remain immutable. The remaining stronger-support and stable-release gates are listed below.

## Current release evidence

- Local M2/8 GB verification passes: 76 tests discovered, 73 passed, three Linux-only skips, strict types, bundle/font/privacy audit, SBOM, and zero npm vulnerabilities. The exact published source passes both hosted platforms and the 500-Face/2,000-operation/100-recovery diagnostic.
- The release-source native AppKit/WKWebView evidence journey passes Simple and Studio at 80–140% scale, with minimum measured controls above 44 px at 80%, no asserted editor/page/header/workspace overflow, no title/candidate truncation in the asserted states, and no horizontal overflow.
- Both Hosts pass productive-control height, centered icon/select/disclosure carets, caret inset, panel/tray geometry, focus-safe inertness, and overflow gates. Mac verifies reduced motion; Linux records real intermediate disclosure frames and caret return.
- The native 22-state journey proves installed family/style browsing, four-up colour boards, full text, stress characters, AP Title, axes, modal focus, scaling, and Simple/Studio state travel. Body Copy renders 12 then eight distinct previews while exporting all 20; the combined transaction exports five Boards, two Index pages, and 20 Body pages with valid checksums.
- A real variable Source imports 14 descriptors as one physical Face with 14 complete named styles. Actual width-axis PNGs differ: local index ink widths 645/721 px, hosted 645/722 px. Centering error is at most two output pixels horizontally; a one-column antialias-threshold difference explains the host variance. Temporary export FontFaces return to zero.
- Both Hosts reject inconsistent or out-of-scope Simple manifests. Three malformed native numeric/boolean manifests leave prior PNGs byte-identical and no failed staging. macOS canonicalizes export roots and outputs before deriving relative paths.
- The native transaction fault proves failed Handoff staging is removed and the prior export remains byte-identical.
- Exact-main verification [`34880045104`](https://github.com/bomkino/font-previewer/actions/runs/34880045104) passed both Hosts, Linux X11/Wayland, forced renderer recovery, package reproducibility, and installed/archive round trips; repository truth [`34880045074`](https://github.com/bomkino/font-previewer/actions/runs/34880045074) also passed.
- Guarded dry run [`34880779961`](https://github.com/bomkino/font-previewer/actions/runs/34880779961) and publication [`34880968632`](https://github.com/bomkino/font-previewer/actions/runs/34880968632) published the non-overwriting prerelease on 2026-09-14 UTC.
- All nine public assets were freshly downloaded. `SHA256SUMS` validates all eight payloads; the tag and `SOURCE_SHA` both identify `0c4969ef5dea2ae7a5de6950fe03c707649a8073`.

The exact IDs above point back to GitHub Actions; artifacts and the source SHA remain independently readable from the immutable release.

## Local installation readback

The exact public Mac ZIP was installed on M2/8 GB hardware on 2026-09-15 IST, not rebuilt locally. Its SHA-256 is `f89508e83f6fa6d0c0a5cf8f51395dc852230579672fd1132708b081025f2c49`. Every installed bundle file matches the extracted public bundle; the arm64 executable and deep/strict ad-hoc signature pass. The app launches with the new icon, restores unsaved work, and switches between the two Simple sets. Prior app and recovery backups are retained outside the application directory; private Study content is not part of public release evidence.

## Current GitHub maintenance state

- The product change is merged through PR #19; its feature branch is removed after tree-equivalence verification. Release-truth maintenance stays documentation-only.
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
- Exact productive-control height, icon/caret centering, caret inset, panel/tray alignment, panel overflow, disclosure semantics, inertness, caret rotation, and enabled/reduced-motion checks.
- Linux X11 and Wayland/Ozone evidence.
- Linux package reproducibility, install/remove, sandbox ownership, checksums, and residue audit.
- macOS package assembly, ad-hoc signature integrity, archive round trip, and checksums.
- SBOM, npm audit, notices/licence, package inventory, path/credential/source-map scans, and an exact seven-font UI allowlist that rejects every other font binary.
- Simple/Studio mode switching, independent set copy and sizing, shared Candidate decisions, interface scaling, long-copy containment, either-set or combined four-up/index and Body Copy export, and rebuilt Studio stage geometry.

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

`v0.1.0-rc.7` is the latest public prerelease. Its one-use publication authorization was exercised after exact-head and exact-main verification, package checks, and the guarded dry run. `.github/workflows/release.yml` remains manual, exact-SHA guarded, exact-run guarded, non-overwriting, and dry-run first; no push, PR, tag, or successful verification run publishes automatically. Stable `v1.0.0` and any later tag require a new owner decision.

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
