# Current Font Previewer implementation report

## Repository truth

- Canonical branch: `main`
- Source version: `0.1.0`
- Published baseline: `v0.1.0-rc.6` at exact source `f1aa382c8265b4884261c4308a4a5d37077a5242`
- Current source: preparing `v0.1.0-rc.7`; exact-head verification, package evidence, and publication readback remain required
- Prior prereleases: immutable `v0.1.0-rc.5`, `v0.1.0-rc.4`, `v0.1.0-rc.3`, `v0.1.0-rc.2`, and `v0.1.0-rc.1`
- Stable release: not approved or claimed

The published baseline is represented on `main`. Body Copy and its release-blocking scale/recovery repairs reached `main` through PRs #11, #12, and #13; the pitch.dog typography, Phosphor icon, spacing, privacy, and package-integrity work reached `main` through PR #15; exact caret, container-fit, and disclosure-motion polish reached `main` through PR #17. The source behavior described below includes the prepared two-set candidate; it is not evidence that `rc.7` has reached `main`, been published, or been installed.

The detailed autonomous hardening report that originally described an isolated, unmerged branch is preserved unchanged at [`../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md`](../docs/archive/2026-08-27/APP_REPORT_RC_EVIDENCE.md). It is historical evidence, not current repository status.

## Active product

Font Previewer is one local typography-decision product delivered through:

- an AppKit/WKWebView/CoreText Host on macOS;
- an Electron/Fontconfig Host on Linux;
- one shared Study v5 domain with a Simple set → add → pages → tune → export view and the deeper Review → Compare → System → Handoff Studio.

Simple has independent **Headlines + subheadlines** and **Body Copy** Candidate sets. Each set stores its copy and fit policy in the portable Study. Sources, Faces, Candidate casing/axes/order/decisions, and the active set's copy and comparison policy remain available in Studio through the same session. Explicit duplication or cross-set copying creates a new Unreviewed Candidate with independent settings, not another Source binary or a synchronized document.

Body Copy renders one full-text reading page per included font at one shared fitted size; Headlines retains the original four-up colour comparison and optional index pages. Either set or both can be exported in one Handoff. Preview and Tune each browse 12 Candidates per batch, without reducing the full export count. The Simple registry needs at most 24 Source resources across those batches and starts at most four loads concurrently. Stable Source identities avoid reloads during semantic edits; sequential PNG rendering releases temporary font and canvas resources.

Single-face variable imports use default axes and selectable named styles rather than enumerating named instances as extra Faces. Supported historical variable Candidates are retained; actual collections remain metadata-only. Index centering uses measured ink bounds, and PNG rendering retains Candidate variation and feature settings.

Export flushes the focused title/text edit before capturing its immutable session. Editing and native Mac Quit/window close are held during the transaction; Simple's Cmd-E route honours the current set and visible Source-copy acknowledgement. Opening a saved Studio comparison restores its Recipe, tray, and policy without changing the stored Simple set configurations.

Study v4 migrates to v5 with existing Candidates in Headlines and Body Copy empty. Save retains v5; users who need `rc.6` compatibility must keep the original document. Interface mode, sample preference, interface scale, stress visibility, and unsaved export toggles remain presentation preferences, not a second Study authority.

Application chrome uses seven exact CC0-1.0 WOFF2 files from pitch.dog Type System v13 and one Phosphor icon adapter. Candidate specimens retain isolated generated families. One reusable audit requires the approved UI-font locations, sizes, and SHA-256 digests in every build/package surface and rejects all other font binaries.

The prepared icon family replaces the coral loupe with a capital A whose hammock crossbar holds a lowercase a, using responsive crops for small app and favicon placements. It does not change the dark-first interface or the UI-font allowlist.

The root `macos/` SwiftUI/CoreText application is a preserved reference, not an active package or second product.

## Automated verification

Permanent application verification is defined by [`.github/workflows/verify.yml`](../.github/workflows/verify.yml). It checks the exact pull-request head or push SHA and covers:

- version consistency, strict TypeScript, public-seam tests, production builds, SBOM, and npm audit;
- malformed protocol and Study inputs, migrations, installed Catalog, cancellation, recovery, and transactional Handoff;
- accessibility semantics, forced-colours, reduced motion, focus restoration, keyboard behavior, centered icons/carets, panel alignment, and overflow;
- family/style selection, Simple-to-Studio state travel, 80–140% interface scaling, minimum touch sizes, long-copy containment, four-up colour boards, one-font Body Copy pages, full text, shared reading size, stress characters, AP Title, and shared comparison sizing;
- displayed Electron and WKWebView journeys;
- forced Electron renderer recovery and the honestly labelled WKWebView termination-callback simulation;
- Linux X11 and native Wayland/Ozone evidence;
- Linux `.deb` and portable package assembly, reproducibility, install/launch/remove journeys, sandbox ownership, and residue checks;
- macOS app assembly, hardened runtime, ad-hoc signature verification, archive round trip, and checksums;
- package inventory, private-path, credential-marker, source-map, licence, notice, SBOM, and exact seven-font allowlist checks.

Published-baseline workflow evidence is recorded in [`../docs/maintenance/REPOSITORY_STATE.md`](../docs/maintenance/REPOSITORY_STATE.md), the exact-SHA `SOURCE_SHA` release asset, and the release-linked Actions runs. It does not transfer to `rc.7`. The candidate additionally requires the two-set, migration, variable-font, pagination, index, export-lifecycle, and resource-registry gates in [`../docs/QA.md`](../docs/QA.md). No new native measurement, reference-hardware latency, or RAM improvement is asserted here; exact-head workflow and package receipts must establish the candidate's results.

## Release machinery

[`.github/workflows/release.yml`](../.github/workflows/release.yml) is manual only. It requires:

- an exact full SHA that is the current `main` head;
- a successful exact-SHA verification run;
- a new prerelease tag matching source version;
- verified source-SHA manifests, checksums, package contents, notices, SBOM, and release notes;
- an explicit publication boolean and exact tag confirmation before any GitHub release write.

The default path creates a downloadable dry-run bundle. It refuses existing tags and releases. The published `v0.1.0-rc.6` baseline completed through exact-main verification run `33296016674`, guarded dry run `33296253222`, and publication run `33296294623`; those receipts do not verify a later candidate. The owner has requested the next prerelease, and its prepared payload is [`../docs/releases/v0.1.0-rc.7.md`](../docs/releases/v0.1.0-rc.7.md). Publication still requires the candidate's exact-source checks and new workflow receipts. No stable `v1.0.0` claim follows.

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
