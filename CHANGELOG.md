# Changelog

## 0.1.0-rc.2 — 2026-08-28

### Changed

- Made `main` the canonical home of the merged RC, hardening, and pre-Mac implementation.
- Replaced branch-era verification with one exact-head macOS/Linux workflow on `main` and pull requests.
- Added source-SHA manifests to package artifacts and made artifact names identify the exact verified commit.
- Added a version-consistency gate covering npm metadata, lockfile, macOS bundle metadata, Linux package names, SBOM metadata, documentation, and CI.
- Added a manual, exact-SHA, exact-run, non-overwriting release-preparation workflow. Its default path produces a validated dry-run bundle; publication requires an explicit second confirmation.
- Clarified that current source is ahead of the published `v0.1.0-rc.1` prerelease.

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
