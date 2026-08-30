# Current Font Previewer implementation report

## Repository truth

- Canonical branch: `main`
- Source version: `0.1.0`
- Current release posture: published `v0.1.0-rc.5` at exact source `06657ebdc1e14436d6ddbed763e12602603a84fa`
- Prior prereleases: immutable `v0.1.0-rc.4`, `v0.1.0-rc.3`, `v0.1.0-rc.2`, and `v0.1.0-rc.1`
- Stable release: not approved or claimed

The RC, hardening, and pre-Mac implementation are represented on `main`. Body Copy and its release-blocking scale/recovery repairs reached `main` through PRs #11, #12, and #13; the pitch.dog typography, Phosphor icon, spacing, privacy, and package-integrity work reached `main` through PR #15. No current product implementation remains intentionally based on old branch names.

The detailed autonomous hardening report that originally described an isolated, unmerged branch is preserved unchanged at [`../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md`](../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md). It is historical evidence, not current repository status.

## Active product

Font Previewer is one local typography-decision product delivered through:

- an AppKit/WKWebView/CoreText Host on macOS;
- an Electron/Fontconfig Host on Linux;
- one shared Study v4 domain with a Simple add → Boards or Body Copy → tune → export view and the deeper Review → Compare → System → Handoff Studio.

Simple and Studio share imported fonts/styles, live copy, casing, axes, candidate order, review/include decisions, and the active comparison sizing policy. Body Copy renders one full-text reading page per included font at one shared fitted size; Boards retains the original four-up comparison. Interface mode, page format, sample preference, interface scale, stress visibility, and unsaved export toggles remain local presentation preferences; saving a Comparison Set makes its policy portable Study data.

Application chrome uses seven exact CC0-1.0 WOFF2 files from pitch.dog Type System v13 and one Phosphor icon adapter. Candidate specimens retain isolated generated families. One reusable audit requires the approved UI-font locations, sizes, and SHA-256 digests in every build/package surface and rejects all other font binaries.

The root `macos/` SwiftUI/CoreText application is a preserved reference, not an active package or second product.

## Automated verification

Permanent application verification is defined by [`.github/workflows/verify.yml`](../.github/workflows/verify.yml). It checks the exact pull-request head or push SHA and covers:

- version consistency, strict TypeScript, public-seam tests, production builds, SBOM, and npm audit;
- malformed protocol and Study inputs, migrations, installed Catalog, cancellation, recovery, and transactional Handoff;
- accessibility semantics, forced-colours, reduced motion, focus restoration, and keyboard behavior;
- family/style selection, Simple-to-Studio state travel, 80–140% interface scaling, minimum touch sizes, long-copy containment, four-up colour boards, one-font Body Copy pages, full text, shared reading size, stress characters, AP Title, and shared comparison sizing;
- displayed Electron and WKWebView journeys;
- forced Electron renderer recovery and the honestly labelled WKWebView termination-callback simulation;
- Linux X11 and native Wayland/Ozone evidence;
- Linux `.deb` and portable package assembly, reproducibility, install/launch/remove journeys, sandbox ownership, and residue checks;
- macOS app assembly, hardened runtime, ad-hoc signature verification, archive round trip, and checksums;
- package inventory, private-path, credential-marker, source-map, licence, notice, SBOM, and exact seven-font allowlist checks.

Current workflow evidence is recorded in [`../docs/maintenance/REPOSITORY_STATE.md`](../docs/maintenance/REPOSITORY_STATE.md), the exact-SHA `SOURCE_SHA` release asset, and the release-linked Actions runs. The older cleanup receipt remains historical evidence for the canonicalisation that preceded this release.

## Release machinery

[`.github/workflows/release.yml`](../.github/workflows/release.yml) is manual only. It requires:

- an exact full SHA that is the current `main` head;
- a successful exact-SHA verification run;
- a new prerelease tag matching source version;
- verified source-SHA manifests, checksums, package contents, notices, SBOM, and release notes;
- an explicit publication boolean and exact tag confirmation before any GitHub release write.

The default path creates a downloadable dry-run bundle. It refuses existing tags and releases. The owner-authorized `v0.1.0-rc.5` publication completed through exact-main verification run `33292252219`, guarded dry run `33292506974`, and publication run `33292575588`. The one-use authority is exercised and does not extend to stable `v1.0.0` or a later tag.

## Remaining human and physical gates

Automated success does not close:

1. attended VoiceOver and Orca journeys;
2. human typography and native-interface review with legally held production fonts;
3. competent complex-script review;
4. independent clean-machine reconstruction and broader reference-hardware performance;
5. hostile cross-format font containment beyond current automated fixtures;
6. induced WKWebView content-process termination on a real packaged session.

Developer ID signing, notarisation, stapling, and Gatekeeper acceptance are deliberately outside this free prerelease path, not hidden completion claims.

These gates block stable `v1.0.0` and any stronger support claim. They do not block keeping verified prerelease code on `main`.

## Product boundary

Font Previewer does not contain FontBlind’s anonymisation, transformation, mechanical oblique, interpolation, or font-packaging engines. Architectural lessons may be documented, but code and product UI are not shared.
