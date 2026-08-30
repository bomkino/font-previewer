# Changelog

## 0.1.0-rc.5 — 2026-08-30

### Added

- Added pitch.dog Type System 13.0.0 from exact commit `786b4a2b671182319320f922b8de8f927ea3a002` as the interface typography source, with seven governed CC0-1.0 WOFF2 assets bundled locally.
- Added Phosphor Icons for React 2.1.10 and replaced improvised text marks and one-off SVGs across navigation, review states, source health, page modes, scale controls, status, and Handoff preflight.
- Added one reusable font-binary auditor for renderer, macOS app, Linux portable, and Debian package layouts.

### Changed

- Replaced platform-dependent interface fallbacks with the pitch.dog Head, Body, Body Alt, and Eyebrow roles while leaving imported Candidate rendering under its existing isolated `FontPreviewer_<hash>` families.
- Introduced a 4 px spacing scale, 56 px primary control geometry, consistent padding, gaps, and radii, stable scrollbars, and a narrower responsive Studio/titlebar layout at high interface scales.
- Corrected font-intake copy to describe the supported file/folder chooser instead of promising an unimplemented drop interaction.

### Hardened

- Made builds and packages require all seven approved UI fonts at their exact byte sizes and SHA-256 digests, in the sole approved renderer-assets directory, while rejecting duplicates, omissions, disguised font magic, and every other font binary.
- Made release preparation extract and inspect the macOS ZIP, Linux portable archive, and Debian package independently before assembly.
- Made both displayed Host journeys wait for PD Body Roman, PD Body Italic, PD Head, and PD Eyebrow to load before visual evidence is captured.
- Restricted Studio review shortcuts to the Review stage and the currently visible filtered/search result set, preventing hidden or off-stage Candidate mutations.
- Unified Compare's live blind/reveal state with Inspector redaction, preventing unsaved blind comparisons from leaking Candidate identity in the side panel.
- Preserved the privacy boundary between fixed application-interface fonts and user Sources, Faces, Candidates, local Bindings, and permission-gated Handoff copies.

### Not claimed

- Attended VoiceOver or Orca usability.
- Human approval of every layout, typeface, script, or reading-size relationship.
- Independent clean-machine reconstruction or universal Mac/Linux behavior.
- Developer ID signing, notarisation, stapling, or Gatekeeper acceptance.

## 0.1.0-rc.4 — 2026-08-28

### Added

- Added a second Simple page format, **Body Copy**, with one included font per 5,152 × 2,160 reading page instead of four fonts on one board.
- Added three original two-paragraph reading samples, custom copy, live character guidance, and full-text page previews without ellipsis.
- Applied one shared fitted reading size across every Body Copy page so families can be compared without accidental size bias.
- Added first-class transactional `Body Copy/Body_XX.png` export on both desktop Hosts while preserving the original four-up Boards and optional index pages.

### Changed

- Made the Simple journey begin with one oversized **Boards / Body Copy** format choice while keeping font intake, styles, casing, axes, order, inclusion, sizing, and export in one legible flow.
- Gave the Simple workspace a more spacious editorial composition, larger controls, stronger hierarchy, warmer reading surfaces, and less nested chrome.
- Kept copy and font decisions live across Simple and Studio, so the deeper workspace remains available without making users rebuild a comparison.

### Hardened

- Made both Hosts reject mixed, impossible, or count-mismatched Simple export manifests before writing a Handoff.
- Canonicalized macOS export roots and output paths before deriving manifest and checksum entries, including destinations reached through `/var` and `/private/var` aliases.
- Made text fitting scale-invariant by measuring untransformed layout pixels, and invalidated stale fit results whenever a specimen frame resizes.
- Made recovery confirmation monotonic across workspace cycles, so returning Handoff after export must earn a new durable acknowledgement before it can report ready.
- Added public-seam coverage for Body Copy samples, limits, full-text rendering, exact page manifests, transactional export, mixed-manifest refusal, and shared Studio state.
- Extended displayed macOS evidence to Body Copy composition, exact-size exports, Studio state travel, and overflow/touch-target checks at 80% and 140% interface scale; exact-head Linux evidence remains a release gate.

### Not claimed

- Attended VoiceOver or Orca usability.
- Human approval of every typeface, script, or reading-size relationship.
- Independent clean-machine reconstruction or universal Mac/Linux behavior.
- Developer ID signing, notarisation, stapling, or Gatekeeper acceptance.

## 0.1.0-rc.3 — 2026-08-28

### Added

- Restored the original low-friction path as the default Simple mode: add font files/folders or choose installed families and styles, see four-up boards immediately, tune only when useful, then export.
- Added high-resolution 5,152 × 2,160 four-font boards, optional 12-font index pages, the original four-colour comparison surface, stress text, five casing modes including AP Title, variable-axis controls, reordering, include/skip, and full-size previews.
- Added one 80–140% interface-scale control, plus keyboard increase/decrease/reset commands, across Simple and Studio.
- Added family-first installed-font browsing with style detail in both interface modes.

### Changed

- Rebuilt Simple around oversized editorial hierarchy, larger controls, consistent square geometry, generous padding, one clear action sequence, and dark mode by default.
- Rebuilt Studio’s Review, Compare, System, and Handoff surfaces with contextual panes, labelled decisions, larger touch targets, calmer navigation, full-width Handoff, and no candidate/title ellipsis in verified states.
- Made imported fonts/styles, copy, casing, axes, ordering, include/skip decisions, and comparison sizing travel between Simple and Studio through one shared session.
- Shared the same Same size, Fit each, and Lock line breaks logic across Simple boards and Studio Compare.

### Hardened

- Validated renderer-produced board PNG structure, CRCs, dimensions, decoded size, and scanline filters in both desktop Hosts before transactional commit.
- Added native macOS evidence for Simple/Studio state travel, family/style dialogs, 80–140% scaling, minimum 44 px controls, long-copy containment, locked line breaks, stress characters, no truncation, contextual Studio chrome, and modal focus return.
- Made workspace-only changes such as stage, selection, tray, search, and scene recover independently; serialized Electron recovery writes and rejected obsolete renderer checkpoints before they can overwrite newer state.
- Preserved failed-export cleanup, prior-export byte identity, path-free Study data, opaque font capabilities, and explicit Source-copy permission.

### Not claimed

- Attended VoiceOver or Orca usability.
- Owner acceptance of every visual state or competent complex-script review.
- Independent clean-machine reconstruction or universal Mac/Linux behavior.
- Developer ID signing, notarisation, stapling, or Gatekeeper acceptance.

## 0.1.0-rc.2 — 2026-08-28

### Changed

- Made `main` the canonical home of the merged RC, hardening, and pre-Mac implementation.
- Replaced branch-era verification with one exact-head macOS/Linux workflow on `main` and pull requests.
- Added source-SHA manifests to package artifacts and made artifact names identify the exact verified commit.
- Added a version-consistency gate covering npm metadata, lockfile, macOS bundle metadata, Linux package names, SBOM metadata, documentation, and CI.
- Added a manual, exact-SHA, exact-run, non-overwriting release-preparation workflow. Its default path produces a validated dry-run bundle; publication requires an explicit second confirmation.
- Clarified that current source is ahead of the published `v0.1.0-rc.1` prerelease.
- Added an original pitch.dog app-icon family across the macOS bundle, Linux package, Studio chrome, favicons, and web manifest: a coral loupe reveals one letter's typographic character.
- Made the Studio's dark field the default presentation instead of conditioning it on the operating-system theme.

### Hardened

- Bounded Linux font metadata and variation inspection with forced termination, output ceilings, and normalized failures.
- Added synthetic hostile headers across supported font extensions, strict recovery-envelope parsing, interrupted-Handoff cleanup, and real forced Electron renderer-crash recovery.
- Denied renderer requests outside the bundled Studio, opaque font capabilities, and the explicit local development origin.
- Added forced-colours support while retaining reduced-motion behavior.
- Removed production source maps and added bundle/package inventory, private-path, credential-marker, and application-source-map audits.
- Embedded installation guidance, SBOM, dependency inventory, licence, and notices in package candidates.
- Made Linux tar/deb packaging reproducible from `SOURCE_DATE_EPOCH`.
- Added native Wayland/Ozone launch evidence alongside the full X11 displayed journey.
- Labelled the Mac web-content termination-callback simulation honestly.
- Made the AppKit/WKWebView Host the default Mac build, run, package, and install path while retaining the SwiftUI implementation as an explicit reference target.
- Rejected OTF, TTF, WOFF, and WOFF2 inputs when CoreText returns no font descriptors, before any preview capability is issued.
- Preserved native text-field undo, fixed Save after a focused draft edit, and flushed an acknowledged recovery checkpoint before ordinary quit or last-window close.
- Added a focusable welcome skip-link destination and a 100-card Review regression surface.
- Fixed the test launcher in paths containing square brackets and made zero-test runs fail closed.

### Not claimed

- Attended VoiceOver or Orca usability.
- Human typography, native-interface, or competent complex-script approval.
- Independent clean-machine reconstruction or broad reference-hardware acceptance.
- Broad hostile cross-format font containment beyond committed automated fixtures.
- Developer ID signing, notarisation, stapling, or Gatekeeper acceptance.

## 0.1.0-rc.1 — 2026-08-27

First public GitHub prerelease, fixed to commit `6ae51f5618387e1e4e39f4816f797da35aaee57b`.

### Added

- One shared Review → Compare → System → Handoff Studio across macOS AppKit/WKWebView and Linux Electron Hosts.
- Portable Study v4 with distinct Source, Binding, Face, Candidate, Recipe, Comparison Set, Font Use, Typography System, and Handoff concepts.
- Host-local recovery separate from intentional Save and guarded by monotonic revisions.
- Native menus, native file panels, relink/reveal, semantic undo/redo, reload recovery, and focus restoration.
- File/folder import with bounded canonical traversal and opaque font-preview capabilities.
- CoreText and Fontconfig installed-font Catalogs with server-side search, 10,000-entry bounds, pagination, bounded metadata cache, rebuild, and explicit Add-to-Study.
- Family Groups, Contact Sheet, Focus, Waterfall, blind Compare, fit policies, saved sets, deck scenes, system Roles, and contextual inspection.
- Transactional Handoff with PNG/PDF/summary/JSON/CSV options, staging, manifest, checksums, and permission-gated Source copying.
- Sandboxed Electron preload and bounded WKWebView content-world bridge.
- Linux `.deb` and portable archive plus an ad-hoc signed Mac app ZIP.
- CycloneDX SBOM, third-party notices, immutable CI action pins, displayed cross-Host evidence, accessibility semantics, and package-integrity gates.

## Historical reference

The root `macos/` SwiftUI/CoreText laboratory predates the standalone cross-platform product. Its native renderer, source watching, collections, variable controls, and transactional export remain an oracle; its schema and application are not the active Font Previewer package.
