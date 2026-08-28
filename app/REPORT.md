# Current Font Previewer implementation report

## Repository truth

- Canonical branch: `main`
- Source version: `0.1.0`
- Current release posture: `v0.1.0-rc.3` release candidate; latest published prerelease is `v0.1.0-rc.2`
- Prior prerelease: `v0.1.0-rc.1` at `6ae51f5618387e1e4e39f4816f797da35aaee57b`
- Stable release: not approved or claimed

The RC, hardening, and pre-Mac implementation are represented on `main`. PRs #1, #2, and #3 are merged. No current product implementation remains intentionally based on those old branch names.

The detailed autonomous hardening report that originally described an isolated, unmerged branch is preserved unchanged at [`../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md`](../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md). It is historical evidence, not current repository status.

## Active product

Font Previewer is one local typography-decision product delivered through:

- an AppKit/WKWebView/CoreText Host on macOS;
- an Electron/Fontconfig Host on Linux;
- one shared Study v4 domain with a Simple add → boards → tune → export view and the deeper Review → Compare → System → Handoff Studio.

Simple and Studio share imported fonts/styles, copy, casing, axes, candidate order, review/include decisions, and the active comparison sizing policy. Interface mode, interface scale, stress visibility, and unsaved export toggles remain local presentation preferences; saving a Comparison Set makes its policy portable Study data.

The root `macos/` SwiftUI/CoreText application is a preserved reference, not an active package or second product.

## Automated verification

Permanent application verification is defined by [`.github/workflows/verify.yml`](../.github/workflows/verify.yml). It checks the exact pull-request head or push SHA and covers:

- version consistency, strict TypeScript, public-seam tests, production builds, SBOM, and npm audit;
- malformed protocol and Study inputs, migrations, installed Catalog, cancellation, recovery, and transactional Handoff;
- accessibility semantics, forced-colours, reduced motion, focus restoration, and keyboard behavior;
- family/style selection, Simple-to-Studio state travel, 80–140% interface scaling, minimum touch sizes, long-copy containment, four-up colour boards, stress characters, AP Title, and shared comparison sizing;
- displayed Electron and WKWebView journeys;
- forced Electron renderer recovery and the honestly labelled WKWebView termination-callback simulation;
- Linux X11 and native Wayland/Ozone evidence;
- Linux `.deb` and portable package assembly, reproducibility, install/launch/remove journeys, sandbox ownership, and residue checks;
- macOS app assembly, hardened runtime, ad-hoc signature verification, archive round trip, and checksums;
- package inventory, private-path, credential-marker, source-map, licence, notice, SBOM, and font-binary checks.

Current workflow evidence is recorded in [`../docs/maintenance/REPOSITORY_STATE.md`](../docs/maintenance/REPOSITORY_STATE.md), the exact-SHA `SOURCE_SHA` release asset, and the release-linked Actions runs. The older cleanup receipt remains historical evidence for the canonicalisation that preceded this release.

## Release machinery

[`.github/workflows/release.yml`](../.github/workflows/release.yml) is manual only. It requires:

- an exact full SHA that is the current `main` head;
- a successful exact-SHA verification run;
- a new prerelease tag matching source version;
- verified source-SHA manifests, checksums, package contents, notices, SBOM, and release notes;
- an explicit publication boolean and exact tag confirmation before any GitHub release write.

The default path creates a downloadable dry-run bundle. It refuses existing tags and releases. Publication requires the repository owner's explicit release instruction; that authorization has been supplied for the `v0.1.0-rc.3` candidate in this task.

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
